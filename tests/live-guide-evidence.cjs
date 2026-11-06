"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium,devices}=require("playwright");
const root=path.resolve(__dirname,"../test-artifacts");
fs.mkdirSync(root,{recursive:true});
const cases=[
 {route:"/printer-not-printing",topic:"printing",input:"internal",value:"no",expected:"on-device"},
 {route:"/printer-not-connecting-wifi",topic:"wifi",input:"status",value:"ssid",expected:"SSID"},
 {route:"/printer-paper-jam-no-paper-stuck",topic:"jam",input:"stage",value:"adf",expected:"ADF"},
 {route:"/printer-printing-cut-off-pages",topic:"clipping",input:"paper",value:"no",expected:"A4"},
 {route:"/epson-printer-not-connecting-wifi",topic:"epsonwifi",input:"code",value:"e8",expected:"IP"},
 {route:"/printer-printing-blank-pages",topic:"blankpages",input:"internal",value:"blank",expected:"internally generated"},
 {route:"/printer-not-found-windows-11",topic:"discovery",input:"connection",value:"usb",expected:"USB"},
 {route:"/find-install-printer-driver",topic:"driverchoice",input:"system",value:"arm",expected:"ARM-based"}
];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function view(page,record){
 const url="https://printerresolve.com"+record.route;
 for(let tries=0;tries<8;tries++){
  await page.goto(url+"?evidenceAudit="+Date.now()+"-"+tries,{waitUntil:"domcontentloaded",timeout:35000});
  if(await page.locator(".pr-diagnostic-workbook[data-diagnostic='"+record.topic+"']").count()===1)break;
  if(tries===7)throw new Error("Worksheet not deployed at "+url);
  await pause(8000);
 }
 await page.waitForFunction(()=>!!document.querySelector(".pr-diagnostic-workbook .pr-diagnostic-advice")?.textContent.trim(),null,{timeout:18000});
 const byline=page.locator(".pr-editorial-credit");
 await byline.waitFor({state:"visible",timeout:10000});
 const credit=await byline.evaluate(el=>{
  const css=getComputedStyle(el),box=el.getBoundingClientRect(),p=el.querySelector("p");
  return {background:css.backgroundImage,color:getComputedStyle(p).color,width:box.width,height:box.height,viewport:innerWidth,text:el.textContent};
 });
 assert.ok(credit.background.includes("gradient")&&credit.height>28,"Editorial credit is not visibly styled: "+JSON.stringify(credit));
 assert.ok(credit.width<=credit.viewport&&credit.text.includes("AI-assisted"),"Missing or overflowed truthful attribution "+JSON.stringify(credit));
 const panel=page.locator('.pr-diagnostic-workbook[data-diagnostic="'+record.topic+'"]');
 const choice=panel.locator('select[data-observation="'+record.input+'"]');
 await choice.selectOption(record.value);
 const actual=await panel.locator(".pr-diagnostic-advice").textContent();
 assert.ok(actual.includes(record.expected),record.topic+" unexpected branch "+actual);
 const info=await panel.evaluate(el=>{
  const sel=el.querySelector("select"),r=el.getBoundingClientRect(),p=el.querySelector(".pr-diagnostic-advice");
  const txt=getComputedStyle(p).color,background=getComputedStyle(el).backgroundColor;
  return {topic:el.dataset.diagnostic,width:r.width,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,selectorVisible:sel.getBoundingClientRect().width>100,resultColor:txt,background,gradient:getComputedStyle(el).backgroundImage};
 });
 assert.ok(info.selectorVisible,"Hidden/overlapped selector "+JSON.stringify(info));
 assert.ok(info.scrollWidth<=info.viewport+3,"Horizontal overflow "+JSON.stringify(info));
 assert.ok(info.gradient.includes("gradient"),"Expected dark gradient background panel "+JSON.stringify(info));
 await panel.screenshot({path:path.join(root,"LIVE-evidence-"+record.topic+"-"+page.viewportSize().width+".png"),animations:"disabled"});
 console.log("FLAGSHIP_EVIDENCE_PASS "+JSON.stringify({route:record.route,...info,advice:actual.slice(0,135)}));
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const desktop=await browser.newPage({viewport:{width:1320,height:930}});
  for(const r of cases)await view(desktop,r);
  const mobile=await browser.newPage({...devices["Pixel 7"],viewport:{width:393,height:851}});
  await view(mobile,cases[4]);
  await view(mobile,cases[2]);
  await view(mobile,cases[7]);
  await view(mobile,cases[5]);
  console.log("FLAGSHIP_EVIDENCE_SUMMARY 12/12 interactive panels and branching tested, no mobile horizontal overflow");
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
