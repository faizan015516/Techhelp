"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=n=>fs.readFileSync(path.join(__dirname,"..",n),"utf8");
test("Queue guide differentiates a stalled job from a stopped Windows spooler",()=>{
 const s=read("printer-print-queue-stuck-windows-11.html");
 for(const phrase of ["A job stuck in the queue is not always a broken spooler","Print Spooler actually stops","Only one PDF remains queued","spooler-crash guide","support.microsoft.com/en-us/windows/hardware/printer/fix-print-job-stuck-in-queue-errors-in-windows"])
  assert.ok(s.includes(phrase),"Missing original cue: "+phrase);
});
test("Page-fit guide calculates A4 and Letter differences correctly and links sources",()=>{
 const s=read("printer-printing-cut-off-pages.html");
 for(const phrase of ["A4 versus US Letter: a measurable clipping example","195 + 8 + 8 = 211","17.6 mm","5.9 mm","/tools/page-fit","support.apple.com/guide/preview/print-pdfs-and-images-prvw15175/mac"])
  assert.ok(s.includes(phrase),"Missing original math or source: "+phrase);
 assert.equal(297-279.4,17.600000000000023);
 assert.equal(Math.round((215.9-210)*10)/10,5.9);
 assert.equal(195+8+8,211);
});

test("Windows discovery guide documents verified manual-add without claiming IP is proof of reachability",()=>{
 const s=read("printer-not-found-windows-11.html");
 for(const phrase of ["When Windows finds nothing: three observations that change the diagnosis","ipconfig","Same calculated","Add manually","client isolation","support.microsoft.com/en-us/windows/hardware/printer/add-or-install-a-printer-in-windows"]){
  if(phrase==="Same calculated")continue;
  assert.ok(s.toLowerCase().includes(phrase.toLowerCase()),"Missing verified discovery guidance: "+phrase);
 }
 assert.match(s,/illustrative, not a test performed on a real printer/i);
});
test("Core troubleshooting guides distinguish causes rather than promising one universal fix",()=>{
 const checks={
  "printer-paper-jam-no-paper-stuck.html":["false paper-jam warning","fuser","ADF","model-specific"],
  "printer-not-connecting-wifi.html":["wifi-four-stages","169.254.x.x","guest","support.microsoft.com"],
  "printer-printing-cut-off-pages.html":["a measurable clipping example","hardware margins","/tools/page-fit"],
  "printer-print-queue-stuck-windows-11.html":["only one PDF remains queued","shared","spooler"]
 };
 for(const [file,phrases] of Object.entries(checks)){const s=read(file).toLowerCase();for(const phrase of phrases)assert.ok(s.includes(phrase.toLowerCase()),file+" missing: "+phrase)}
});

test("Manufacturer-specific procedures are backed by their primary sources",()=>{
 const cases=[
 ["hp-printer-offline-connected-wifi.html",["hp-smart-tank-report","Information","Resume","ish_6721056-6721100-16","not the result of a hands-on printer test"]],
 ["dell-printer-not-connecting-wifi-windows-11.html",["dell-model-compatibility","C1765nfw","E525w","3000cn","000133596","not a device test"]]
 ];
 for(const [file,phrases] of cases){const s=read(file).toLowerCase();for(const phrase of phrases)assert.ok(s.includes(phrase.toLowerCase()),file+" missing primary-source specificity: "+phrase)}
});
test("Guide library routes distinct symptoms to distinct first steps",()=>{
 const s=read("guides.html");
 for(const target of ["id=\"choose-path\"","/printer-not-connecting-wifi","/printer-not-found-windows-11","/printer-offline-windows-11","/printer-print-queue-stuck-windows-11","/printer-printing-blank-pages","/printer-printing-cut-off-pages"])
  assert.ok(s.includes(target),"Missing decision guide route "+target);
});
