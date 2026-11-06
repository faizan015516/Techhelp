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
 ["/tools/page-fit",'id="reference-sheets"'],
 ["/tools/connection-path","The two addresses are identical"],
 ["/printer-printing-cut-off-pages",'id="print-scale-test"'],
 ["/printer-not-connecting-wifi",'id="address-boundary"'],
 ["/wifi-keeps-disconnecting-windows-11",'id="wlan-session-check"'],
 ["/wifi-connected-no-internet-windows-11",'id="local-print-internet-check"'],
 ["/windows-11-disk-100-percent-usage",'id="disk-print-comparison"'],
 ["/windows-11-slow-startup-fixes",'id="sign-in-or-first-print"'],
 ["/editorial-policy",'id="published-software-test"'],
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
 ["/device-setup-installation","id=\"first-print-path-specific\""],
 ["/brother-printer-offline-windows-11","id=\"brother-report-interpretation\""],
 ["/remote-assistance-safety","id=\"remote-support-red-flags-decision\""],
 ["/windows-pc-slow-errors","id=\"printing-slow-windows-vs-printer\""],
 ["/printer-printing-blank-pages","data-diagnostic=\"blankpages\""],
 ["/printer-not-found-windows-11","data-diagnostic=\"discovery\""],
 ["/find-install-printer-driver","data-diagnostic=\"driverchoice\""],
 ["/printer-not-printing","data-diagnostic=\"printing\""],
 ["/printer-not-connecting-wifi","data-diagnostic=\"wifi\""],
 ["/printer-paper-jam-no-paper-stuck","data-diagnostic=\"jam\""],
 ["/printer-printing-cut-off-pages","data-diagnostic=\"clipping\""],
 ["/epson-printer-not-connecting-wifi","data-diagnostic=\"epsonwifi\""],
 ["/assets/guide-evidence-workbook.js","function advice("],
 ["/assets/guide-evidence-workbook.css","pr-diagnostic-workbook"],
 ["/printer-not-printing","class=\"pr-editorial-credit\""],
 ["/epson-not-printing-black-ink","class=\"pr-editorial-credit\""],
 ["/canon-printer-not-responding-windows-11","class=\"pr-editorial-credit\""],
 ["/privacy","working consent-management mechanism"],
 ["/about","about-accountable-publisher"],
 ["/editorial-policy","id=\"documentation-checks\""],
 ["/assets/editorial-attribution.css","pr-editorial-credit"],
 ["/editorial-policy","How we prepare and maintain"],
];
// Read all canonical sitemap routes from the checked-out repository.
// A successful homepage alone does not establish that Google can fetch the inner articles.
const fs=require("node:fs");
const path=require("node:path");
const {createHash}=require("node:crypto");
const digest=buffer=>createHash("sha256").update(buffer).digest("hex");
const referenceAssets=new Set([
 "/assets/print-scale-a4.pdf", "/assets/print-scale-letter.pdf",
 "/assets/print-scale-letter-unscaled.png", "/assets/print-scale-letter-fitted.png"
]);
for(const route of referenceAssets){
 const local=fs.readFileSync(path.join(__dirname,"..",route.slice(1)));
 expected.push([route,digest(local)]);
}
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
async function get(path){const url=base+path+"?qa="+Date.now();const response=await fetch(url,{redirect:"follow",headers:{"Cache-Control":"no-cache","Pragma":"no-cache","User-Agent":"Mozilla/5.0 (compatible; PrinterResolveDeploymentCheck/1.0)"}});return{status:response.status,url:response.url,body:referenceAssets.has(path)?digest(Buffer.from(await response.arrayBuffer())):await response.text()}}
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
