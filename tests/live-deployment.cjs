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
 ["/assets/future-2.css","nx-home-showcase"],
 ["/tools/connection-path","Printer Connection Lab"],
 ["/tools/page-fit","Paper Fit"],
 ["/editorial-policy","How we prepare and maintain"],
];
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
