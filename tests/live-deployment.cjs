"use strict";
const assert=require("node:assert/strict");
const base="https://printerresolve.com";
const expected=[
 ["/","The problem"],
 ["/guides","The complete library"],
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
 process.stdout.write("Live PrinterResolve verified: homepage, guides, IPv4 lab, paper-fit lab and editorial policy.\n");
})().catch(err=>{process.stderr.write(err.stack+"\n");process.exitCode=1});
