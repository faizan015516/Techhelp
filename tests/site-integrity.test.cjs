"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
function files(dir=""){let out=[];for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){if(e.name===".git"||e.name==="node_modules")continue;const rel=path.join(dir,e.name);if(e.isDirectory())out.push(...files(rel));else out.push(rel.replaceAll(path.sep,"/"));}return out}
const all=files(),known=new Set(all),pages=all.filter(x=>x.endsWith(".html"));
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const defaultOrigin="https://printerresolve.com";
function localTarget(url,source){if(/^(mailto:|tel:|data:|javascript:|#)/i.test(url))return null;let u;try{let base=source==="index.html" ? defaultOrigin+"/" : defaultOrigin+"/"+source.replace(/\.html$/,"");u=new URL(url,base)}catch{return null}
 if(u.origin!==defaultOrigin)return null;
 let p=decodeURIComponent(u.pathname);if(p==="/")return "index.html";
 p=p.replace(/^\//,"");if(p.endsWith("/"))p+="index.html";
 if(!/\.[a-z0-9]{1,6}$/i.test(p))p+=".html";
 return p}
function inlineLast(html){const tags=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];return tags.filter(x=>!x[0].includes("application/ld+json")).at(-1)?.[1]||""}
test("Site pages include titles, main content and viewport",()=>{for(const p of pages){const h=read(p);assert.match(h,/<!doctype html>/i,p+" doctype");assert.match(h,/<html\b[^>]*\blang=/i,p+" language");assert.match(h,/<title\b[^>]*>[\s\S]*?<\/title>/i,p+" title");assert.match(h,/<meta\b[^>]*name=["']viewport["']/i,p+" viewport");assert.match(h,/<main\b/i,p+" main");assert.match(h,/<\/main>/i,p+" closing main");assert.match(h,/<h1\b/i,p+" h1");}});
test("All internal navigation and asset references resolve",()=>{const errors=[];for(const p of pages){const h=read(p),tags=[...h.matchAll(/<(?:a|link|script|img|source)\b[^>]*>/gi)];for(const tag of tags){const attrs=[...tag[0].matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)];for(const match of attrs){const u=match[1],target=localTarget(u,p);if(target&&!known.has(target)){if(target==="refunds.html"&&known.has("_redirects"))continue;errors.push(p+" → "+u+" (expected "+target+")")}}}}assert.deepEqual(errors,[]);});
test("Canonical urls and sitemap entries point to existing files",()=>{const sitemap=read("sitemap.xml");const errors=[];for(const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)){const target=localTarget(m[1],"sitemap.xml");if(!target||!known.has(target))errors.push(m[1]+" => "+target);}assert.deepEqual(errors,[]);for(const p of pages.filter(x=>!x.startsWith("tools/"))){if(p==="index.html"||p==="guides.html")continue;assert.match(read(p),/rel=["']canonical["']/i,p+" canonical")};});
test("All educational articles include local-only note form and supporting script",()=>{const skip=new Set(["index.html","guides.html","about.html","editorial-policy.html","contact.html","privacy.html","terms.html","disclaimer.html","tools/connection-path.html","tools/page-fit.html","tools/print-path-lab.html"]);for(const p of pages){if(skip.has(p))continue;const h=read(p);assert.ok(h.includes('class="pr-notes"'),p+" note form");assert.ok(h.includes('/assets/guide-tools.js'),p+" script");}});
test("Core JavaScript is syntactically valid",()=>{for(const p of ["assets/experience.js","assets/guide-tools.js"]){assert.doesNotThrow(()=>new vm.Script(read(p),{filename:p}))}for(const p of ["tools/page-fit.html","tools/connection-path.html"]){assert.doesNotThrow(()=>new vm.Script(inlineLast(read(p)),{filename:p}))}});
test("Stylesheets have matched CSS blocks",()=>{for(const p of ["assets/experience.css","premium.css","trust.css"]){const s=read(p);assert.equal((s.match(/{/g)||[]).length,(s.match(/}/g)||[]).length,p)}});
function fakeEl(value=""){return {value,hidden:false,dataset:{},textContent:"",attrs:{},addEventListener(event,fn){this["on"+event]=fn},setAttribute(k,v){this.attrs[k]=v},requestSubmit(){this.onsubmit?.({preventDefault(){}})}}}
test("IPv4 calculator distinguishes same and different /24 networks",()=>{const ids=["lab-form","lab-result","lab-title","lab-message","lab-networks","computer-ip","printer-ip","prefix","same-sample","different-sample"];const m=Object.fromEntries(ids.map(id=>[id,fakeEl()]));m["computer-ip"].value="192.168.1.24";m["printer-ip"].value="192.168.1.88";m.prefix.value="24";const d={getElementById:id=>m[id]};vm.runInNewContext(inlineLast(read("tools/connection-path.html")),{document:d,Number,Math,parseInt});m["lab-form"].onsubmit({preventDefault(){}});assert.match(m["lab-title"].textContent,/Same calculated/);assert.match(m["lab-networks"].textContent,/192\.168\.1\.0\/24/);m["printer-ip"].value="192.168.2.88";m["lab-form"].onsubmit({preventDefault(){}});assert.match(m["lab-title"].textContent,/Different calculated/);});
test("Page fit tool compares A4 and Letter dimensions",()=>{const ids=["fit-form","fit-result","fit-title","fit-summary","fit-detail","paper","content-width","content-height","margin-left","margin-top","paper-rect","safe-rect","content-rect","page-label"];const m=Object.fromEntries(ids.map(id=>[id,fakeEl()]));Object.assign(m.paper,{value:"a4"});m["content-width"].value="190";m["content-height"].value="270";m["margin-left"].value="10";m["margin-top"].value="10";vm.runInNewContext(inlineLast(read("tools/page-fit.html")),{document:{getElementById:id=>m[id]},Number,Math});assert.equal(m["fit-result"].dataset.outcome,"fits");m.paper.value="letter";m["fit-form"].onsubmit({preventDefault(){}});assert.equal(m["fit-result"].dataset.outcome,"does-not-fit");assert.match(m["fit-detail"].textContent,/reduce the content/i);});
test("Website sitemap and crawl files are present",()=>{assert.ok(known.has("robots.txt"));assert.ok(known.has("ads.txt"));assert.match(read("robots.txt"),/sitemap/i);assert.match(read("ads.txt"),/pub-2393332073506347/);});

test("AdSense privacy notices and evidence-led diagnostic pages are included",()=>{
  const privacy=read("privacy.html");
  for(const pattern of [/third-party vendors/i,/prior visits/i,/adssettings\.google\.com/i,/consent management platform/i])assert.match(privacy,pattern);
  const lab=read("tools/print-path-lab.html");
  for(const pattern of [/<main\b/i,/id="pp-form"/,/id="pp-results"/,/support\.microsoft\.com/i,/learn\.microsoft\.com/i,/privacy/i])assert.match(lab,pattern);
  assert.match(read("guides.html"),/\/tools\/print-path-lab/);
  assert.match(read("sitemap.xml"),/\/tools\/print-path-lab/);
  assert.match(read("printer-offline-windows-11.html"),/Get-PrinterPort/);
  assert.match(read("printer-not-connecting-wifi.html"),/wifi-four-stages/);
  assert.match(read("printer-printing-blank-pages.html"),/blank-source-study/);
});

test("PrinterResolve has a consistent branded favicon on every page",()=>{
  assert.ok(known.has("favicon.svg"),"Missing scalable PrinterResolve favicon");
  assert.ok(known.has("favicon.ico"),"Missing legacy browser favicon");
  const graphic=read("favicon.svg");
  assert.match(graphic,/<svg\b/);
  assert.match(graphic,/PrinterResolve printer icon/);
  assert.match(graphic,/#173B59|#0B192B/);
  const icon=fs.readFileSync(path.join(root,"favicon.ico"));
  assert.ok(icon.length>1000,"ICO file unexpectedly small");
  assert.equal(icon.readUInt16LE(0),0,"ICO reserved field");
  assert.equal(icon.readUInt16LE(2),1,"ICO image type");
  assert.equal(icon.readUInt16LE(4),1,"ICO entry count");
  assert.equal(icon.readUInt8(6),32,"ICO width");
  assert.equal(icon.readUInt8(7),32,"ICO height");
  assert.equal(icon.readUInt32LE(14),icon.length-22,"ICO embedded image length");
  assert.equal(pages.length,39,"Expected all 39 published HTML pages");
  for(const p of pages){
    const html=read(p);
    assert.ok(html.includes('href="/favicon.ico?v=20261107-1"'),p+" missing fallback favicon");
    assert.ok(html.includes('href="/favicon.svg?v=20261107-1"'),p+" missing scalable favicon");
  }
});

test("Connection lab flags copied addresses, link-local and subnet boundaries", () => {
  const ids = ["lab-form", "lab-result", "lab-title", "lab-message", "lab-networks",
    "computer-ip", "printer-ip", "prefix", "same-sample", "different-sample"];
  const fields = Object.fromEntries(ids.map(id => [id, fakeEl()]));
  const page = read("tools/connection-path.html");
  vm.runInNewContext(inlineLast(page), {document: {getElementById: id => fields[id]}});
  const cases = [
    ["192.168.1.126", "192.168.1.129", 24, "same", "192.168.1.0/24"],
    ["192.168.1.126", "192.168.1.129", 25, "different", "192.168.1.128/25"],
    ["192.168.1.126", "192.168.1.126", 25, "check", "identical"],
    ["192.168.1.126", "192.168.1.127", 25, "check", "broadcast"],
    ["192.168.1.126", "192.168.1.255", 25, "different", "192.168.1.128/25"],
    ["192.168.1.128", "192.168.1.129", 31, "same", "192.168.1.128/31"],
    ["192.168.1.126", "169.254.1.2", 24, "check", "link-local"],
    ["169.254.1.1", "169.254.1.2", 16, "check", "Both"],
    ["127.0.0.1", "192.168.1.129", 24, "error", "Loopback"]
  ];
  for (const [computer, printer, prefix, type, clue] of cases) {
    fields["computer-ip"].value = computer;
    fields["printer-ip"].value = printer;
    fields.prefix.value = String(prefix);
    fields["lab-form"].requestSubmit();
    assert.equal(fields["lab-result"].dataset.type, type);
    const output = ["lab-title", "lab-message", "lab-networks"].map(id => fields[id].textContent).join(" ");
    assert.ok(output.includes(clue), output);
  }
  for (let prefix = 1; prefix <= 32; prefix++) {
    assert.ok(page.includes('value="' + prefix + '"'), "Missing prefix /" + prefix);
  }
});

test("Paper Fit rejects blank and impossible margins and clears the stale drawing", () => {
  const ids = ["fit-form", "fit-result", "fit-title", "fit-summary", "fit-detail",
    "paper", "content-width", "content-height", "margin-left", "margin-top",
    "paper-rect", "safe-rect", "content-rect", "page-label"];
  const fields = Object.fromEntries(ids.map(id => [id, fakeEl()]));
  fields.paper.value = "a4";
  fields["content-width"].value = "210";
  fields["content-height"].value = "297";
  fields["margin-top"].value = "0";
  fields["margin-left"].value = "0";
  vm.runInNewContext(inlineLast(read("tools/page-fit.html")), {document: {getElementById: id => fields[id]}});
  for (const [margin, outcome] of [["105", "invalid"], ["106", "invalid"], ["", "invalid"], ["0", "fits"]]) {
    fields["margin-left"].value = margin;
    fields["fit-form"].requestSubmit();
    assert.equal(fields["fit-result"].dataset.outcome, outcome);
    assert.equal(fields["content-rect"].attrs.visibility, outcome === "invalid" ? "hidden" : "visible");
    assert.doesNotMatch(fields["fit-detail"].textContent, /reduce the content to 0(?:\.0)?%/i);
  }
});
