"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");const path=require("node:path");
const {chromium,devices}=require("playwright");
const out=path.resolve(__dirname,"../test-artifacts");fs.mkdirSync(out,{recursive:true});
const base="https://printerresolve.com";
async function waitForRelease(page,url){
 let lastError="";
 for(let attempt=1;attempt<=8;attempt++){
  try{
   await page.goto(base+url+(url.includes("?")?"&":"?")+"discoveryAudit="+Date.now()+"-"+attempt,{waitUntil:"domcontentloaded",timeout:25000});
   await page.locator(".pr-discovery-controls .pr-top-search-input").waitFor({timeout:6500});
   // The header inputs are injected before the asynchronously loaded CSS finishes.
   // Do not mistake temporary unstyled geometry for a permanent mobile layout failure.
   await page.waitForFunction(()=>{
     const link=document.querySelector('link[href*="/assets/site-discovery.css"]');
     const control=document.querySelector(".pr-discovery-controls");
     const input=document.querySelector("#pr-top-site-search[role=combobox]");const form=document.querySelector(".pr-top-search");
     return !!(link?.sheet&&control&&["flex","grid"].includes(getComputedStyle(control).display)
       &&control.getBoundingClientRect().width>150&&form?.getBoundingClientRect().height>=52
       &&input&&parseFloat(getComputedStyle(input).fontSize)>=14
       &&document.querySelector("#pr-top-suggestions-list"));
   },null,{timeout:12000});
   return;
  }catch(error){lastError=error.message;}
  if(attempt<8)await new Promise(r=>setTimeout(r,8000));
 }
 throw new Error("New search UI not visible at "+url+" : "+lastError);
}
async function verifySuggestions(page){
 const input=page.locator(".pr-top-search-input");
 await input.fill("paper jam");
 const dropdown=page.locator(".pr-top-suggestions");
 await dropdown.waitFor({state:"visible",timeout:12000});
 await page.waitForFunction(()=>document.querySelectorAll('.pr-top-suggestion[role="option"]').length>0,null,{timeout:12000});
 const found=await dropdown.locator(".pr-top-suggestion").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("href")));
 assert.ok(found.includes("/printer-paper-jam-no-paper-stuck"),"Autocomplete missed paper jam: "+JSON.stringify(found));
 assert.equal(await input.getAttribute("aria-expanded"),"true");
 const geometry=await page.evaluate(()=>{
  const r=document.querySelector(".pr-top-suggestions").getBoundingClientRect();
  const form=document.querySelector(".pr-top-search").getBoundingClientRect();
  return {formHeight:form.height,dropdownWidth:r.width,viewport:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,popupLeft:r.left,popupRight:r.right};
 });
 assert.ok(geometry.formHeight>=52&&geometry.dropdownWidth>=200&&geometry.scrollWidth<=geometry.viewport+2&&geometry.popupLeft>=-1&&geometry.popupRight<=geometry.viewport+1,
  "Autocomplete clipped or top bar too small: "+JSON.stringify(geometry));
 await dropdown.screenshot({path:path.join(out,"LIVE-top-suggestions-"+page.viewportSize().width+".png"),animations:"disabled"});
 await input.press("ArrowDown");
 assert.equal(await input.getAttribute("aria-activedescendant"),"pr-top-suggestion-0");
 assert.equal(await dropdown.locator("#pr-top-suggestion-0").getAttribute("aria-selected"),"true");
 await input.press("Escape");
 assert.equal(await input.getAttribute("aria-expanded"),"false");
 assert.ok(await dropdown.isHidden(),"Escape failed to close suggestions");
 await input.fill("my printer won't print");
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.pr-top-suggestion')).some(a=>a.getAttribute("href")==="/printer-not-printing"),null,{timeout:7000});
 await input.press("Escape");
 console.log("SITE_AUTOCOMPLETE_PASS "+JSON.stringify({viewport:geometry.viewport,results:found.length,formHeight:geometry.formHeight,keyboard:true,naturalLanguage:true}));
}
async function verifySearch(page){
 const form=page.locator(".pr-top-search");
 await form.locator("input").fill("Epson WiFi");
 await form.locator("button").click();
 const dialog=page.locator(".pr-discovery-dialog");
 await dialog.waitFor();
 await page.waitForFunction(()=>document.querySelectorAll(".pr-discovery-dialog .pr-found-card").length>0,{timeout:10000});
 const cards=dialog.locator(".pr-found-card");
 const urls=await cards.evaluateAll(nodes=>nodes.map(x=>x.getAttribute("href")));
 assert.ok(urls.includes("/epson-printer-not-connecting-wifi"),"Epson Wi-Fi search did not find existing article "+JSON.stringify(urls));
 assert.ok(!urls.some(x=>x.startsWith("//")),"Unsafe search result URL");
 const total=await page.locator(".pr-discovery-dialog .pr-result-status").textContent();
 assert.ok(total.includes("matching page"),"Search result count missing");
 await page.keyboard.press("Escape");
 await page.waitForFunction(()=>!document.querySelector(".pr-discovery-dialog")?.open,null,{timeout:5000});
}
async function verifyPrinter(page){
 await page.locator(".pr-top-printer-button").click();
 const dialog=page.locator(".pr-discovery-dialog");
 await dialog.waitFor();
 assert.equal(await dialog.locator(".pr-brand-button").count(),6,"Five brands plus other/unsure required");
 await page.waitForFunction(()=>{
   const status=document.querySelector(".pr-discovery-dialog .pr-result-status");
   return status?.textContent&& !status.textContent.includes("Loading");
 },null,{timeout:12000});
 await dialog.locator('[data-brand="canon"]').click();
 await dialog.locator(".pr-change-printer").waitFor({state:"visible",timeout:5000});
 assert.match(await dialog.locator("#pr-dialog-title").textContent(),/Canon printer guides/);
 await dialog.locator(".pr-change-printer").click();
 assert.ok(await dialog.locator('[data-brand="epson"]').isVisible(),"Selecting a different printer should be possible");
 await dialog.locator('[data-brand="canon"]').click();
 await page.waitForFunction(()=>document.querySelectorAll(".pr-discovery-dialog .pr-found-card").length>0,{timeout:10000});
 const links=await dialog.locator(".pr-found-card").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("href")));
 assert.ok(links.includes("/canon-printer-not-found-wifi-windows-11"));
 assert.ok(links.includes("/canon-printer-not-responding-windows-11"));
 assert.ok(links.includes("/printer-not-printing"),"General troubleshooting should remain available");
 assert.ok(!links.includes("/epson-not-printing-black-ink"),"Choosing Canon should not show an Epson-specific guide");
 await dialog.locator("#pr-brand-filter").fill("offline");
 const filtered=await dialog.locator(".pr-found-card").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("href")));
 assert.ok(filtered.includes("/printer-offline-windows-11"),"Brand-specific filter does not include general offline guide");
 assert.ok(!filtered.includes("/canon-printer-not-responding-windows-11"),"Filter did not narrow by symptom");
 await dialog.locator(".pr-dialog-close").click();
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await waitForRelease(page,"/");
  await verifySuggestions(page);
  await verifySearch(page);
  await verifyPrinter(page);
  await page.locator(".pr-top-printer-button").click();
  await page.locator('.pr-brand-button[data-brand="epson"]').click();
  await page.locator(".pr-discovery-dialog").screenshot({path:path.join(out,"LIVE-printer-selector-desktop.png"),animations:"disabled"});
  await page.keyboard.press("Escape");
  await page.locator(".pr-top-search-input").fill("paper jam");
  await page.locator(".pr-top-search-button").click();
  await page.locator(".pr-discovery-dialog").screenshot({path:path.join(out,"LIVE-site-search-desktop.png"),animations:"disabled"});
  await page.keyboard.press("Escape");
  for(const route of ["/guides","/hp-printer-offline-connected-wifi","/tools/connection-path"]){
   await waitForRelease(page,route);
   assert.ok(await page.locator(".pr-top-printer-button").isVisible(),"Printer picker missing on "+route);
   assert.ok(await page.locator(".pr-top-search-input").isVisible(),"Search field missing on "+route);
  }
  const mobile=await browser.newPage({...devices["Pixel 7"],viewport:{width:393,height:851}});
  await waitForRelease(mobile,"/");
  await verifySuggestions(mobile);
  const m=await mobile.evaluate(()=>{
   const header=document.querySelector("header.site-header");
   const control=document.querySelector(".pr-discovery-controls");
   const r=control.getBoundingClientRect();
   return {viewport:window.innerWidth,scroll:document.documentElement.scrollWidth,searchVisible:r.width>200&&r.height>30,headerBottom:header.getBoundingClientRect().bottom,controlBottom:r.bottom};
  });
  assert.ok(m.searchVisible&&m.scroll<=m.viewport+2&&m.headerBottom>=m.controlBottom-2,"Mobile top navigation overflow/overlap: "+JSON.stringify(m));
  await verifyPrinter(mobile);
  await verifySearch(mobile);
  await mobile.locator(".pr-top-printer-button").click();
  await mobile.locator('.pr-brand-button[data-brand="hp"]').click();
  await mobile.locator(".pr-discovery-dialog").screenshot({path:path.join(out,"LIVE-printer-selector-mobile.png"),animations:"disabled"});
  await mobile.keyboard.press("Escape");
  console.log("SITE_DISCOVERY_VISUAL_PASS search works on home and mobile, Canon/HP picker returns actual guides; global top bar visible on guides, article and tools");
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
