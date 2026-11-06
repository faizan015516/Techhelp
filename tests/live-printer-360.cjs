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
  const layout=await mobile.evaluate(()=>{
    const box=s=>document.querySelector(s)?.getBoundingClientRect();
    const button=box(".nx-hero-actions"),viewer=box(".pr360"),hero=box(".nx-hero-art");
    return {buttonBottom:button?.bottom,viewerTop:viewer?.top,heroTop:hero?.top,viewport:window.innerWidth,scrollWidth:document.documentElement.scrollWidth};
  });
  assert.ok(layout.viewerTop>=layout.buttonBottom+6,"Mobile 3D viewer overlaps hero actions: "+JSON.stringify(layout));
  assert.ok(layout.scrollWidth<=layout.viewport+2,"Mobile viewport overflow: "+JSON.stringify(layout));
  await mobile.locator(".nx-hero").screenshot({path:path.join(out,"LIVE-printer-360-brother-mobile-full-hero.png"),animations:"disabled"});
  await verifyPage(mobile,{url:"/",kind:"home",file:"LIVE-printer-360-home-mobile.png"});
  const homeLayout=await mobile.evaluate(()=>{
    const actions=document.querySelector(".hero-actions").getBoundingClientRect();
    const viewer=document.querySelector(".hero-art .pr360").getBoundingClientRect();
    return {actionsBottom:actions.bottom,viewerTop:viewer.top,scrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth};
  });
  assert.ok(homeLayout.viewerTop>=homeLayout.actionsBottom-3,"Home 3D collides with hero action buttons: "+JSON.stringify(homeLayout));
  assert.ok(homeLayout.scrollWidth<=homeLayout.viewport+2,"Home mobile overflow: "+JSON.stringify(homeLayout));
  await mobile.locator(".hero").screenshot({path:path.join(out,"LIVE-printer-360-home-mobile-full-hero.png"),animations:"disabled"});
  console.log("360_VISUAL_SUMMARY 6 out of 6 3D viewers mounted and keyboard rotation changed canvas; mobile hero layouts don't overlap");
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
