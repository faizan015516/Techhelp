"use strict";
/*
 * Read-only, public-site debugging of AdSense Privacy & messaging display.
 * Does NOT click a consent option, collect cookies, modify the website, or
 * infer a Google-account problem from a blank dialog.
 */
const {chromium}=require("playwright");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../test-artifacts");fs.mkdirSync(root,{recursive:true});
const urls=[
 "https://printerresolve.com/?fc=alwaysshow&fctype=gdpr",
 "https://printerresolve.com/?fc=alwaysshow",
 "https://printerresolve.com/"
];
function relevant(u){return /googlesyndication|fundingchoices|googlefc|doubleclick|googleadservices|googleads|google-tag-manager/i.test(u)}
function redact(u){try{const x=new URL(u);return x.origin+x.pathname}catch{return String(u).slice(0,120)}}
async function run(browser,url,index){
 const context=await browser.newContext({viewport:{width:1366,height:900},locale:"en-GB",ignoreHTTPSErrors:false,acceptDownloads:false});
 const page=await context.newPage(),requests=[],errors=[];
 page.on("request",r=>{if(relevant(r.url()))requests.push({event:"request",method:r.method(),resourceType:r.resourceType(),url:redact(r.url())})});
 page.on("requestfailed",r=>{if(relevant(r.url()))requests.push({event:"failed",url:redact(r.url()),reason:r.failure()})});
 page.on("response",r=>{if(relevant(r.url()))requests.push({event:"response",status:r.status(),url:redact(r.url())})});
 page.on("console",m=>{if(m.type()==="error")errors.push(m.text().slice(0,500))});
 page.on("pageerror",e=>errors.push("pageerror "+e.message.slice(0,500)));
 const started=Date.now();
 let navigation;
 try{const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:35000});navigation={status:response?.status(),url:page.url()};}
 catch(e){navigation={error:e.message,url:page.url()}}
 await page.waitForTimeout(11000);
 const status=await page.evaluate(async()=>{
   const script=Array.from(document.querySelectorAll('script[src]')).filter(s=>/adsbygoogle|fundingchoices|googlefc/i.test(s.src)).map(s=>({origin:new URL(s.src).origin,path:new URL(s.src).pathname,publisherId:s.src.match(/ca-pub-\d+/)?.[0]||null}));
   const cmp={exists:typeof window.__tcfapi==="function"};
   if(cmp.exists){try{
     const result=await Promise.race([
      new Promise(resolve=>window.__tcfapi("ping",2,(v,success)=>resolve({success,value:v}))),
      new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),1800))
     ]);
     if(result?.value)cmp.ping={success:result.success,cmpLoaded:result.value.cmpLoaded,cmpStatus:result.value.cmpStatus,gdprApplies:result.value.gdprApplies,displayStatus:result.value.displayStatus,cmpId:result.value.cmpId};
     else cmp.ping=result;
   }catch(e){cmp.error=e.message}}
   const fcMarkers=[...document.querySelectorAll("[id],[class]")].filter(e=>(String(e.id)+" "+String(e.className)).toLowerCase().includes("googlefc")||(String(e.id)+" "+String(e.className)).includes("fc-consent")).length;
   const overlays=[...document.querySelectorAll('[role="dialog"],iframe')].map(e=>({tag:e.tagName,role:e.getAttribute("role"),src:e.tagName==="IFRAME"?new URL(e.src||location.href).origin:undefined,visible:!!(e.offsetWidth&&e.offsetHeight)}));
   return {title:document.title,script,cmp,hasGooglefc:!!window.googlefc,googlefcInactive:!!window.googlefcInactive,googlefcLoaded:!!window.googlefcLoaded,fcMarkers,overlays:overlays.slice(0,15),hasControlledMessagingFunction:typeof window.googlefc?.controlledMessagingFunction==="function"};
 });
 const screenshot=path.join(root,"ad-consent-public-test-"+index+".png");
 await page.screenshot({path:screenshot,fullPage:false,animations:"disabled"});
 const report={url,navigation,elapsedMs:Date.now()-started,status,requests:requests.slice(0,100),errors:errors.slice(0,25),screenshot:path.basename(screenshot),disclaimer:"Public-browser evidence only. Account-side message delivery and consent validity cannot be certified here."};
 await context.close();
 console.log("ADSENSE_CMP_PUBLIC_AUDIT "+JSON.stringify(report));
 return report;
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const reports=[];
  for(let i=0;i<urls.length;i++)reports.push(await run(browser,urls[i],i+1));
  fs.writeFileSync(path.join(root,"adsense-cmp-public-diagnostics.json"),JSON.stringify({checkedAt:new Date().toISOString(),reports},null,2));
  console.log("ADSENSE_CMP_PUBLIC_SUMMARY "+JSON.stringify(reports.map(r=>({url:r.url,adsenseTag:r.status.script.filter(s=>/adsbygoogle/.test(s.path)).map(s=>s.publisherId),tcf:r.status.cmp,googlefc:r.status.hasGooglefc,markers:r.status.fcMarkers,googleRequests:r.requests.length,errors:r.errors.length}))));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
