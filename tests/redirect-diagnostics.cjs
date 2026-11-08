"use strict";
// Audit exact URLs previously reported as redirect errors by Google Search Console.
// Read-only network checks: never modifies DNS, Cloudflare or site content.
const cases = [
  ["http://printerresolve.com/", "https://printerresolve.com/"],
  ["https://www.printerresolve.com/", "https://printerresolve.com/"],
  ["https://printerresolve.com/printer-offline-windows-11.html", "https://printerresolve.com/printer-offline-windows-11"],
  ["https://printerresolve.com/printer-print-queue-stuck-windows-11.html", "https://printerresolve.com/printer-print-queue-stuck-windows-11"],
  ["https://printerresolve.com/hp-printer-offline-connected-wifi.html", "https://printerresolve.com/hp-printer-offline-connected-wifi"],
  // Search Console has recorded impressions for old .html variants and the retired refunds URL.
  ["https://printerresolve.com/printer-not-found-windows-11.html", "https://printerresolve.com/printer-not-found-windows-11"],
  ["https://printerresolve.com/find-install-printer-driver.html", "https://printerresolve.com/find-install-printer-driver"],
  ["https://printerresolve.com/printer-printing-blank-pages.html", "https://printerresolve.com/printer-printing-blank-pages"],
  ["https://printerresolve.com/printer-not-printing.html", "https://printerresolve.com/printer-not-printing"],
  ["https://printerresolve.com/refunds.html", "https://printerresolve.com/terms"]
];
async function check(start, expected) {
  let url=start;
  const seen=new Set();
  const steps=[];
  for(let i=0;i<7;i++) {
    if(seen.has(url))return {start,expected,steps,error:"redirect loop"};
    seen.add(url);
    let response;
    try{
      response=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(12000),headers:{"User-Agent":"Mozilla/5.0 (compatible; PrinterResolveRedirectAudit/1.0)","Cache-Control":"no-cache"}});
    }catch(e){return {start,expected,steps,error:e?.cause?.message || e?.message || String(e)}}
    const status=response.status;
    const location=response.headers.get("location");
    steps.push({url,status,location:location||null});
    if(status>=300&&status<400){
      if(!location)return{start,expected,steps,error:"redirect without Location"};
      try{url=new URL(location,url).href}catch(e){return{start,expected,steps,error:"invalid redirect Location"}}
      continue;
    }
    const ok=(status===200 && url===expected && steps.some(s=>s.status>=300 && s.status<400));
    return{start,expected,steps,ok,error:ok?null:("Expected redirect to "+expected+" and final 200; got "+status+" at "+url)};
  }
  return {start,expected,steps,error:"more than six redirects"};
}
(async()=>{
  let bad=0;
  for(const [from,to] of cases){
    const result=await check(from,to);
    console.log("REDIRECT_DIAGNOSTIC "+JSON.stringify(result));
    if(!result.ok)bad++;
  }
  console.log("REDIRECT_SUMMARY checked="+cases.length+" failed="+bad);
  if(bad)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
