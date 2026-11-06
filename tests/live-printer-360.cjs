"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {chromium,devices}=require("playwright");
const out=path.resolve(__dirname,"../test-artifacts");
fs.mkdirSync(out,{recursive:true});
const cases=[
 {url:"/",kind:"home",file:"LIVE-printer-360-home-desktop.png"},
 {url:"/epson-printer-not-connecting-wifi",kind:"epson",file:"LIVE-printer-360-epson-desktop.png"},
 {url:"/canon-printer-not-found-wifi-windows-11",kind:"canon",file:"LIVE-printer-360-canon-desktop.png"},
 {url:"/hp-printer-offline-connected-wifi",kind:"hp",file:"LIVE-printer-360-hp-desktop.png"}
];
async function verifyPage(page,{url,kind,file}){
 let error="";
 for(let attempt=1;attempt<=8;attempt++){
  await page.goto("https://printerresolve.com"+url+"?visualAudit="+Date.now()+"-"+attempt,{waitUntil:"domcontentloaded",timeout:30000});
  const widget=page.locator('.pr360[data-printer="'+kind+'"]');
  if(await widget.count()){
    try{await page.waitForFunction(k=>document.querySelector('.pr360[data-printer="'+k+'"] canvas.pr360-canvas')||document.querySelector('.pr360[data-printer="'+k+'"].pr360-fallback-only'),kind,{timeout:18000});
    }catch(e){error=e.message}
    const result=await widget.evaluate(el=>({ready:el.classList.contains("pr360-ready"),fallback:el.classList.contains("pr360-fallback-only"),hasCanvas:!!el.querySelector("canvas.pr360-canvas"),canvasWidth:el.querySelector("canvas")?.width||0,canvasHeight:el.querySelector("canvas")?.height||0,status:el.querySelector(".pr360-status")?.textContent}));
    if(!result.ready){
      error="Expected interactive 3D model; got "+JSON.stringify(result);
      // CDN or WebGL issue: don't conceal a static fallback as a successful viewer.
      if(attempt<8){await new Promise(r=>setTimeout(r,6000));continue}
    }else{
      assert.ok(result.hasCanvas&&result.canvasWidth>150&&result.canvasHeight>150,"3D canvas dimensions invalid "+JSON.stringify(result));
      const spin=widget.locator(".pr360-spin");
      await spin.click();
      assert.equal((await spin.textContent()).trim(),"Auto rotate");
      const canvas=widget.locator("canvas");
      await canvas.screenshot({path:path.join(out,file),animations:"disabled"});
      const before=await canvas.screenshot();
      await canvas.focus();
      await page.keyboard.press("ArrowRight");
      const after=await canvas.screenshot();
      assert.ok(!before.equals(after),"Pressing ArrowRight did not change the rendered printer for "+url);
      await widget.locator(".pr360-reset").click();
      await spin.click();
      assert.equal((await spin.textContent()).trim(),"Pause rotation");
      console.log("360_VISUAL_PASS "+JSON.stringify({url,kind,...result}));
      return;
    }
  }else error="New printer viewer not deployed for "+url;
  if(attempt<8)await new Promise(r=>setTimeout(r,6000));
 }
 throw new Error(error+" at "+url);
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader"]});
 try{
  const page=await browser.newPage({viewport:{width:1365,height:900},deviceScaleFactor:1});
  await page.addInitScript(()=>{window.scrollTo(0,0)});
  for(const spec of cases)await verifyPage(page,spec);
  const mobile=await browser.newPage({...devices["Pixel 7"],viewport:{width:393,height:851}});
  await verifyPage(mobile,{url:"/brother-printer-offline-windows-11",kind:"brother",file:"LIVE-printer-360-brother-mobile.png"});
  const scroll=await mobile.evaluate(()=>({w:document.documentElement.scrollWidth,v:window.innerWidth}));
  assert.ok(scroll.w<=scroll.v+2,"Mobile viewport overflow: "+JSON.stringify(scroll));
  console.log("360_VISUAL_SUMMARY 5 out of 5 3D viewers mounted and arrow-key rotation changed canvas; mobile layout fits");
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
