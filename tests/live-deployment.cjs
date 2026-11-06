"use strict";
const assert=require("node:assert/strict");
const base="https://printerresolve.com";
const expected=[
 ["/","nx-home-showcase"],
 ["/guides","nx-category-art"],
 ["/printer-offline-windows-11","nx-document"],
 ["/printer-driver-unavailable-windows-11","nx-hero"],
 ["/printer-printing-blank-pages","nx-inline-visual"],
 ["/assets/scene-wifi.svg","<svg"],
 ["/assets/scene-driver.svg","<svg"],
 ["/assets/future-2.css","2026-11-06 accessibility repair"],
 ["/windows-pc-slow-errors","diagnostic-card"],
 ["/windows-pc-slow-errors","pr-mobile-contrast-critical"],
 ["/windows-pc-slow-errors","20261106-contrast-4"],
 ["/tools/connection-path","Printer Connection Lab"],
 ["/tools/page-fit","Paper Fit"],
 ["/tools/print-path-lab","pp-form"],
 ["/hp-printer-offline-connected-wifi","hp-smart-tank-report"],
 ["/dell-printer-not-connecting-wifi-windows-11","dell-model-compatibility"],
 ["/epson-not-printing-black-ink","et2800-nozzle-check"],
 ["/canon-printer-not-responding-windows-11","canon-tr4700-print-notrespond"],
 ["/guides","id=\"choose-path\""],
 ["/printer-not-printing","four-test-isolation"],
 ["/printer-not-connecting-wifi","wifi-report-decision"],
 ["/printer-paper-jam-no-paper-stuck","jam-stage-matrix"],
 ["/printer-printing-slowly-windows-11","prt-timing-form"],
 ["/assets/print-timing-lab.js","function diagnose"],
 ["/","data-printer=\"home\""],
 ["/epson-printer-not-connecting-wifi","data-printer=\"epson\""],
 ["/epson-not-printing-black-ink","data-printer=\"epson\""],
 ["/canon-printer-not-found-wifi-windows-11","data-printer=\"canon\""],
 ["/canon-printer-not-responding-windows-11","data-printer=\"canon\""],
 ["/hp-printer-offline-connected-wifi","data-printer=\"hp\""],
 ["/brother-printer-offline-windows-11","data-printer=\"brother\""],
 ["/dell-printer-not-connecting-wifi-windows-11","data-printer=\"dell\""],
 ["/assets/printer-360.css","pr360-canvas"],
 ["/assets/printer-360.mjs","WebGLRenderer"],
 ["/privacy","Google Ads Settings"],
 ["/editorial-policy","How we prepare and maintain"],
];
// Read all canonical sitemap routes from the checked-out repository.
// A successful homepage alone does not establish that Google can fetch the inner articles.
const fs=require("node:fs");
const path=require("node:path");
const xml=fs.readFileSync(path.join(__dirname,"..","sitemap.xml"),"utf8");
const sitemapPaths=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
 .map(x=>new URL(x[1]))
 .filter(u=>u.origin===base)
 .map(u=>u.pathname);
for(const route of sitemapPaths){
 if(!expected.some(([p])=>p===route))expected.push([route,"<h1"]);
}
process.stdout.write("Production sitemap verification: "+sitemapPaths.length+" canonical routes.\\n");
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function get(path){const url=base+path+"?qa="+Date.now();const response=await fetch(url,{redirect:"follow",headers:{"Cache-Control":"no-cache","Pragma":"no-cache","User-Agent":"Mozilla/5.0 (compatible; PrinterResolveDeploymentCheck/1.0)"}});return{status:response.status,url:response.url,body:await response.text()}}
(async()=>{
 let success=false,failures=[];
 for(let attempt=1;attempt<=8;attempt++){
  failures=[];
  for(const [path,marker] of expected){
   try{const x=await get(path);if(x.status!==200||!x.body.includes(marker))failures.push(path+" returned "+x.status+", marker="+x.body.includes(marker)+", body length="+x.body.length)}
   catch(err){failures.push(path+": "+err.message)}
  }
  if(failures.length===0){success=true;break}
  process.stdout.write("Attempt "+attempt+" not fully deployed: "+failures.join("; ")+"\n");
  if(attempt<8)await delay(10000)
 }
 assert.ok(success,"Live deployment not verified. Check Cloudflare Pages deployment source/status and DNS: "+failures.join("; "));
 process.stdout.write("Live PrinterResolve FULL 3D verified: homepage multi-scene gallery, guide library, articles, category SVGs, shared 3D styles, labs and editorial policy.\n");
})().catch(err=>{process.stderr.write(err.stack+"\n");process.exitCode=1});
