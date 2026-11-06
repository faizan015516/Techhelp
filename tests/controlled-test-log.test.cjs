"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const {analyze,formatRecord,tests,outcomes,actions}=require("../assets/controlled-test-log.js");
const base={model:"Epson ET-2800",test:"plain",before:"waiting",after:"printed",action:"destination",
 samePrinter:true,sameInput:true,sameConnection:true,oneChange:true};
test("Before/after recorder separates observed recovery from proven causal repair",()=>{
 const r=analyze(base);
 assert.equal(r.kind,"recovered");
 assert.equal(r.controlled,true);
 assert.match(r.why,/not proof of causation or a durable repair/);
 assert.match(r.next,/Verify a second ordinary print job/);
});
test("A spontaneous recovery is flagged as intermittent, not attributed to a fix",()=>{
 const r=analyze({...base,action:"none"});
 assert.equal(r.kind,"intermittent");
 assert.match(r.why,/intermittent or temporary/);
});
test("A changed printer, input, connection or multiple actions invalidates attribution",()=>{
 for(const p of ["samePrinter","sameInput","sameConnection","oneChange"]){
  const result=analyze({...base,[p]:false});
  assert.equal(result.kind,"not-comparable",p);
  assert.equal(result.controlled,false);
 }
});
test("No test, regression, no improvement and changed failure have distinct conclusions",()=>{
 assert.equal(analyze({...base,before:"unknown"}).kind,"incomplete");
 assert.equal(analyze({...base,after:"unknown"}).kind,"incomplete");
 assert.equal(analyze({...base,before:"printed",after:"error"}).kind,"regression");
 assert.equal(analyze({...base,before:"printed",after:"printed"}).kind,"stable");
 assert.equal(analyze({...base,before:"waiting",after:"waiting"}).kind,"unresolved");
 assert.equal(analyze({...base,before:"blank",after:"error"}).kind,"changed");
});
test("Private copyable notes are clear, limited and do not invent repair certificates",()=>{
 const text=formatRecord({...base,model:"Epson ET-2800\n private note"},analyze(base));
 assert.match(text,/This is my own report/);
 assert.match(text,/Same physical printer: Yes/);
 assert.match(text,/Model \/ family \(optional\): Epson ET-2800 private note/);
 assert.doesNotMatch(text,/\n private note/);
 assert.match(text,/No causality, device access, official certification or permanent repair is claimed/);
 for(const [label,obj] of [["test",tests],["outcome",outcomes],["action",actions]])assert.ok(Object.keys(obj).length>=4,label);
});
test("Controlled test form is discoverable and linked from the 3 priority guides",()=>{
 const html=read("tools/print-path-lab.html");
 const required=[
  'id="controlled-test-log"','id="pr-controlled-form"','id="pr-controlled-same-printer"',
  'id="pr-controlled-same-input"','id="pr-controlled-same-connection"',
  'id="pr-controlled-one-change"','id="pr-controlled-before"',
  'id="pr-controlled-after"','id="pr-controlled-action"',
  'id="pr-controlled-output"','id="pr-controlled-result"',
  'id="pr-controlled-copy"','aria-live="polite"',
  '/assets/controlled-test-log.js','/assets/controlled-test-log.css'
 ];
 for(const s of required)assert.ok(html.includes(s),"Missing test-log element "+s);
 for(const p of ["guides.html","printer-printing-blank-pages.html","printer-not-found-windows-11.html","find-install-printer-driver.html"]){
  assert.ok(read(p).includes("/tools/print-path-lab#controlled-test-log"),p+" missing deep link");
 }
});
test("New tool has no telemetry, external behavior, or browser persistence",()=>{
 const js=read("assets/controlled-test-log.js");
 for(const token of ["fetch(","XMLHttpRequest","sendBeacon","localStorage","sessionStorage","indexedDB","document.cookie"])
  assert.equal(js.includes(token),false,"Unexpected access: "+token);
 assert.doesNotThrow(()=>new vm.Script(js,{filename:"controlled-test-log.js"}));
 const css=read("assets/controlled-test-log.css");
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/:focus-visible/);
});
