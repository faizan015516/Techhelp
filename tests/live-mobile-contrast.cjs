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
  // Regression: the guide library's formerly white-on-white symptom table.
  // Validate actual CSS computed colors against its opaque row and header
  // backgrounds, on desktop and on a mobile-sized viewport.
  for(const [layout,viewport] of [["desktop",{width:1365,height:900}],["mobile",{width:393,height:851}]]){
    const view=await browser.newPage({viewport});
    try{
      let check=null;
      for(let attempt=1;attempt<=8;attempt++){
        await view.goto("https://printerresolve.com/guides?contrastFix="+Date.now()+"-"+attempt,{waitUntil:"load",timeout:30000});
        check=await view.evaluate(()=>{
          const root=document.getElementById("choose-path");
          if(!root)return null;
          const one=(selector)=>{
            const el=root.querySelector(selector);
            if(!el)return null;
            const css=getComputedStyle(el);
            return {color:css.color,background:css.backgroundColor,text:(el.innerText||"").trim().slice(0,120)};
          };
          const tr=root.querySelector("tbody tr");
          const tr2=root.querySelector("tbody tr:nth-child(2)");
          const panel=getComputedStyle(root);
          return {fix:!!document.getElementById("pr-choose-path-contrast-fix"),
            panelBackground:panel.backgroundImage,
            heading:one("#choose-path-heading"),copy:one("p:not(.section-kicker)"),
            th:one("thead th"),firstRow:tr?getComputedStyle(tr).backgroundColor:null,
            secondRow:tr2?getComputedStyle(tr2).backgroundColor:null,
            td:one("tbody td"),link:one("tbody td a"),
            width:document.documentElement.scrollWidth,viewport:window.innerWidth};
        });
        if(check?.fix&&check.panelBackground?.includes("gradient"))break;
        if(attempt<8)await delay(8000);
      }
      assert.ok(check?.fix,"Guide contrast repair not deployed: "+JSON.stringify(check));
      assert.ok(check.panelBackground.includes("gradient"),"Guide symptom card is not dark: "+JSON.stringify(check));
      for(const [label,color] of [["heading",check.heading?.color],["copy",check.copy?.color]]){
        for(const bg of ["rgb(20, 43, 67)","rgb(14, 32, 52)"])
          assert.ok(ratio(color,bg)>=4.5,layout+" guide "+label+" contrast fails: "+JSON.stringify(check));
      }
      assert.ok(ratio(check.th?.background,check.th?.color)>=4.5,layout+" table headers unreadable: "+JSON.stringify(check));
      for(const bg of [check.firstRow,check.secondRow]){
        assert.ok(ratio(bg,check.td?.color)>=4.5,layout+" table data unreadable: "+JSON.stringify(check));
        assert.ok(ratio(bg,check.link?.color)>=4.5,layout+" focused links unreadable: "+JSON.stringify(check));
      }
      assert.ok(check.width<=check.viewport+2,layout+" page has horizontal overflow: "+JSON.stringify(check));
      await view.locator("#choose-path").screenshot({path:path.join(out,"LIVE-guide-symptom-contrast-"+layout+".png"),animations:"disabled",timeout:30000});
      process.stdout.write("LIVE_GUIDES_CONTRAST_PASS "+layout+" "+JSON.stringify(check)+"\\n");
    }finally{await view.close()}
  }
  process.stdout.write("LIVE mobile contrast verified: "+JSON.stringify(info)+"; fallback verified.\n");
 }finally{await browser.close()}
})().catch(e=>{process.stderr.write(e.stack+"\n");process.exitCode=1});
