"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {chromium,devices}=require("playwright");
const out=path.resolve(__dirname,"../test-artifacts");
fs.mkdirSync(out,{recursive:true});
const target="https://printerresolve.com/windows-pc-slow-errors";
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function luminance([r,g,b]){
 const a=[r,g,b].map(v=>{const s=v/255;return s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4)});
 return .2126*a[0]+.7152*a[1]+.0722*a[2];
}
function rgb(css){const v=css.match(/[0-9.]+/g)?.slice(0,3).map(Number);return v?.length===3?v:null}
function ratio(a,b){const x=rgb(a),y=rgb(b);if(!x||!y)return 0;const l=luminance(x),m=luminance(y);return (Math.max(l,m)+.05)/(Math.min(l,m)+.05)}
async function details(page){
 return page.evaluate(()=>{
  const card=[...document.querySelectorAll(".diagnostic-card")].map(el=>{
    const strong=el.querySelector("strong"),small=el.querySelector("small");
    return{background:getComputedStyle(el).backgroundColor,title:getComputedStyle(strong).color,detail:getComputedStyle(small).color};
  });
  const figure=document.querySelector(".diagnostic-flow"),caption=figure?.querySelector("figcaption");
  return{
   url:location.href,
   cssVersion:[...document.querySelectorAll('link[rel="stylesheet"]')].map(x=>x.getAttribute("href")).find(x=>x?.includes("future-2.css"))||null,
   inlineFallback:!!document.getElementById("pr-mobile-contrast-critical"),
   figureBackground:figure?getComputedStyle(figure).backgroundColor:null,
   captionColor:caption?getComputedStyle(caption).color:null,
   cards:card
  };
 });
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({...devices["Pixel 7"],viewport:{width:393,height:851}});
 try{
  let info=null;
  for(let attempt=1;attempt<=8;attempt++){
   await page.goto(target+"?liveContrast="+Date.now()+"-"+attempt,{waitUntil:"load",timeout:30000});
   info=await details(page);
   if(info.inlineFallback&&info.cssVersion?.includes("20261106-contrast-4"))break;
   if(attempt<8)await delay(9000);
  }
  assert.ok(info?.inlineFallback,"New HTML with inline contrast fix not yet available: "+JSON.stringify(info));
  assert.ok(info.cssVersion.includes("20261106-contrast-4"),"Versioned stylesheet not deployed: "+JSON.stringify(info));
  assert.equal(info.cards.length,3,"Expected three PC diagnostic cards");
  for(const [i,c] of info.cards.entries()){
   assert.ok(ratio(c.background,c.title)>=4.5,"Card "+i+" title contrast failed: "+JSON.stringify(c));
   assert.ok(ratio(c.background,c.detail)>=4.5,"Card "+i+" text contrast failed: "+JSON.stringify(c));
  }
  assert.ok(ratio(info.figureBackground,info.captionColor)>=4.5,"Figure heading contrast failed: "+JSON.stringify(info));
  await page.locator(".diagnostic-flow").screenshot({path:path.join(out,"LIVE-windows-cards-mobile.png"),animations:"disabled"});
  // The critical inline CSS must also work without the newer external theme CSS.
  await page.route("**/assets/future-2.css*",route=>route.abort());
  await page.goto(target+"?liveContrastFallback="+Date.now(),{waitUntil:"load",timeout:30000});
  const fallback=await details(page);
  for(const [i,c] of fallback.cards.entries()){
   assert.ok(ratio(c.background,c.title)>=4.5&&ratio(c.background,c.detail)>=4.5,"CSS outage fallback failed on card "+i+": "+JSON.stringify(c));
  }
  process.stdout.write("LIVE mobile contrast verified: "+JSON.stringify(info)+"; fallback verified.\n");
 }finally{await browser.close()}
})().catch(e=>{process.stderr.write(e.stack+"\n");process.exitCode=1});
