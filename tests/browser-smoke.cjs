"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const http=require("node:http");
const {chromium,devices}=require("playwright");
const root=path.resolve(__dirname,".."),art=path.join(root,"test-artifacts");fs.mkdirSync(art,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml",".xml":"application/xml",".txt":"text/plain"};
function server(){return http.createServer((req,res)=>{let url;try{url=decodeURIComponent(new URL(req.url,"http://localhost").pathname)}catch{res.writeHead(400).end();return}let requested=url==="/"?"/index.html":url;if(requested.endsWith("/"))requested+="index.html";if(!path.extname(requested))requested+=".html";const file=path.resolve(root,"."+requested);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end("Not found: "+requested);return}res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream"});res.end(data)})})}
(async()=>{
 const app=server();await new Promise(ok=>app.listen(0,"127.0.0.1",ok));
 const base="http://127.0.0.1:"+app.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  const desktop=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  await desktop.goto(base+"/",{waitUntil:"domcontentloaded"});
  assert.ok(await desktop.locator("#hero-title").isVisible(),"desktop heading");
  assert.ok(await desktop.locator("#printer-model").isVisible(),"3D printer illustration");
  await desktop.screenshot({path:path.join(art,"home-desktop.png"),fullPage:true,animations:"disabled"});
  await desktop.locator("#symptom").selectOption("offline");
  await desktop.locator("#connection").selectOption("wifi");
  await desktop.locator("#diagnose-form button[type=submit]").click();
  assert.ok(await desktop.locator("#diagnose-result").isVisible(),"diagnosis result");
  assert.match(await desktop.locator("#result-body").innerText(),/wi-fi symbol/i);
  await desktop.goto(base+"/tools/connection-path",{waitUntil:"domcontentloaded"});
  await desktop.locator("#computer-ip").fill("192.168.1.24");
  await desktop.locator("#printer-ip").fill("192.168.1.88");
  await desktop.locator("#prefix").selectOption("24");
  await desktop.locator("#lab-form button[type=submit]").click();
  assert.match(await desktop.locator("#lab-title").innerText(),/Same calculated/);
  await desktop.locator("#printer-ip").fill("192.168.2.88");
  await desktop.locator("#lab-form button[type=submit]").click();
  assert.match(await desktop.locator("#lab-title").innerText(),/Different calculated/);
  await desktop.goto(base+"/tools/page-fit",{waitUntil:"domcontentloaded"});
  assert.equal(await desktop.locator("#fit-result").getAttribute("data-outcome"),"fits");
  await desktop.locator("#paper").selectOption("letter");
  assert.equal(await desktop.locator("#fit-result").getAttribute("data-outcome"),"does-not-fit");
  await desktop.screenshot({path:path.join(art,"paper-fit-desktop.png"),fullPage:true,animations:"disabled"});
  await desktop.goto(base+"/printer-offline-windows-11",{waitUntil:"domcontentloaded"});
  assert.ok(await desktop.locator(".pr-evidence").isVisible(),"original diagnostic section");
  await desktop.locator(".pr-notes summary").click();
  await desktop.locator('[data-pr-field="symptom"]').fill("Shows Offline in Windows");
  await desktop.locator("[data-pr-generate]").click();
  assert.match(await desktop.locator("[data-pr-output]").inputValue(),/Shows Offline in Windows/);
  // Confirm all categories actually receive the new 3D page structure, not just the homepage.
  const visualPages=[
    ["printer-offline-windows-11","wifi"],
    ["printer-driver-unavailable-windows-11","driver"],
    ["printer-printing-blank-pages","paper"],
    ["windows-11-disk-100-percent-usage","windows"],
    ["remote-assistance-safety","safety"]
  ];
  for(const [slug,scene] of visualPages){
    await desktop.goto(base+"/"+slug,{waitUntil:"domcontentloaded"});
    assert.ok(await desktop.locator(".nx-hero").isVisible(),slug+" animated hero is visible");
    assert.equal(await desktop.locator(".nx-hero").getAttribute("data-scene"),scene,slug+" illustration category");
    assert.ok(await desktop.locator(".nx-layout main h1").isVisible(),slug+" article is retained");
    assert.ok(await desktop.locator(".nx-inline-visual img").count()>0,slug+" has another in-article picture");
    assert.ok(await desktop.locator(".nx-visual-bottom img").count()>0,slug+" has a closing 3D illustration");
    assert.ok(await desktop.locator(".nx-outline a").count()>2,slug+" navigable table of contents");
    const image=await desktop.locator(".nx-hero .nx-scene").evaluate(el=>({loaded:el.complete&&el.naturalWidth>0,src:el.getAttribute("src")}));
    assert.ok(image.loaded,slug+" illustration actually loads: "+image.src);
    if(slug==="printer-offline-windows-11"||slug==="printer-driver-unavailable-windows-11"||slug==="printer-printing-blank-pages"){
      await desktop.screenshot({path:path.join(art,slug+"-desktop.png"),fullPage:true,animations:"disabled"});
    }
  }
  await desktop.goto(base+"/guides",{waitUntil:"domcontentloaded"});
  assert.equal(await desktop.locator(".nx-category-art").count(),5,"guide library has five 3D category visuals");
  await desktop.screenshot({path:path.join(art,"guides-3d-desktop.png"),fullPage:true,animations:"disabled"});
  // Regression: screenshot report showed white headings on white troubleshooting
  // tiles after the dark-site redesign. Check actual computed foreground/background
  // contrast, not merely the presence of a CSS class or page title.
  const contrastScenarios=[
    ["windows-pc-slow-errors",".diagnostic-card"],
    ["brother-printer-offline-windows-11",".status-panel"],
    ["canon-printer-not-found-wifi-windows-11",".connection-mode"],
    ["canon-printer-not-responding-windows-11",".diagnostic-step"],
    ["epson-printer-not-connecting-wifi",".flow-step"],
    ["epson-not-printing-black-ink",".nozzle-panel"],
    ["printer-printing-slowly-windows-11",".decision-card"],
    ["windows-11-slow-startup-fixes",".startup-step"],
    ["windows-11-disk-100-percent-usage",".disk-step"],
    ["wifi-keeps-disconnecting-windows-11",".wifi-step"],
    ["wifi-connected-no-internet-windows-11",".net-step"]
  ];
  for(const [slug,selector] of contrastScenarios){
    await desktop.goto(base+"/"+slug,{waitUntil:"domcontentloaded"});
    const results=await desktop.locator(selector).evaluateAll(els=>{
      const rgb=s=>{const m=s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return m?[Number(m[1]),Number(m[2]),Number(m[3])]:null};
      const luminance=c=>{const t=c.map(v=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return t[0]*.2126+t[1]*.7152+t[2]*.0722};
      const ratio=(a,b)=>{const l=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(l[0]+.05)/(l[1]+.05)};
      return els.slice(0,6).map(el=>{
        const background=rgb(getComputedStyle(el).backgroundColor);
        const text=el.querySelector("strong,small,p,span,h3");
        const foreground=text?rgb(getComputedStyle(text).color):null;
        return{background,foreground,contrast:background&&foreground?ratio(background,foreground):null,text:text?.textContent?.trim().slice(0,60)};
      });
    });
    assert.ok(results.length>0,"Missing contrast target "+slug+" "+selector);
    for(const item of results){
      assert.ok(item.contrast!==null&&item.contrast>=4.5,slug+" "+selector+" has insufficient text contrast "+JSON.stringify(item));
    }
    if(slug==="windows-pc-slow-errors"){
      await desktop.screenshot({path:path.join(art,"windows-card-contrast-desktop.png"),fullPage:true,animations:"disabled"});
    }
  }
  // Editorial copy and sample ink diagrams must remain visible on the dark theme.
  for(const [slug,selector] of [
    ["windows-pc-slow-errors",".pr-field-intro"],
    ["epson-not-printing-black-ink",".nozzle-pattern"],
    ["printer-faded-streaked-pages",".print-sample.bands"]
  ]){
    await desktop.goto(base+"/"+slug,{waitUntil:"domcontentloaded"});
    const textColor=await desktop.locator(selector).first().evaluate(el=>getComputedStyle(el).color);
    const rgb=(textColor.match(/[0-9]+/g)||[]).slice(0,3).map(Number);
    assert.ok(rgb.length===3&&rgb.reduce((sum,n)=>sum+n,0)>530,slug+" "+selector+" must be legible on the dark card: "+textColor);
  }
  await desktop.close();
  const mobile=await browser.newPage({...devices["Pixel 7"],viewport:{width:393,height:851}});
  await mobile.goto(base+"/",{waitUntil:"domcontentloaded"});
  assert.ok(await mobile.locator("#hero-title").isVisible(),"mobile heading");
  const dims=await mobile.evaluate(()=>({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  assert.ok(dims.content<=dims.viewport+3,"mobile horizontal overflow: "+JSON.stringify(dims));
  await mobile.locator("#menu-button").click();
  assert.equal(await mobile.locator("#menu-button").getAttribute("aria-expanded"),"true");
  assert.ok(await mobile.locator('#nav-links a[href="/guides"]').isVisible(),"mobile navigation");
  await mobile.screenshot({path:path.join(art,"home-mobile.png"),fullPage:true,animations:"disabled"});
  await mobile.emulateMedia({reducedMotion:"reduce"});
  const animation=await mobile.locator("#printer-model").evaluate(el=>getComputedStyle(el).animationName);
  assert.equal(animation,"none","reduced-motion option should disable model animation");
  await mobile.goto(base+"/tools/page-fit",{waitUntil:"domcontentloaded"});
  assert.ok(await mobile.locator("#paper-svg").isVisible(),"mobile preview");
  const toolsDims=await mobile.evaluate(()=>({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  assert.ok(toolsDims.content<=toolsDims.viewport+3,"mobile tool horizontal overflow: "+JSON.stringify(toolsDims));
  // Visit every published document at Android width, catching hidden overflow and runtime errors.
  const allPageFiles=fs.readdirSync(root).filter(p=>p.endsWith(".html")).concat(["tools/connection-path.html","tools/page-fit.html"]);
  const jsErrors=[];
  mobile.on("pageerror",err=>jsErrors.push(err.message));
  const overflow=[];
  for(const pageFile of allPageFiles){
    const route="/"+pageFile.replace(/\.html$/,"");
    const response=await mobile.goto(base+route,{waitUntil:"domcontentloaded"});
    assert.equal(response.status(),200,"HTTP 200 for "+route);
    const data=await mobile.evaluate(()=>({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth,title:document.title,h1:document.querySelector("h1")?.textContent?.trim()}));
    if(data.content>data.viewport+3)overflow.push({path:pageFile,...data});
    assert.ok(data.h1&&data.h1.length>5,"readable H1 for "+route);
  }
  // Every redesigned guide must show its visual header on mobile.
  for(const pageFile of allPageFiles.filter(p=>!["index.html","guides.html","tools/connection-path.html","tools/page-fit.html"].includes(p))){
    await mobile.goto(base+"/"+pageFile.replace(/\.html$/,""),{waitUntil:"domcontentloaded"});
    assert.ok(await mobile.locator(".nx-hero .nx-scene").isVisible(),pageFile+" mobile 3D hero");
  }
  await mobile.goto(base+"/printer-offline-windows-11",{waitUntil:"domcontentloaded"});
  const articleMotion=await mobile.locator(".nx-hero .nx-scene").evaluate(el=>getComputedStyle(el).animationName);
  assert.equal(articleMotion,"none","Article 3D art honors reduced-motion accessibility");
  await mobile.screenshot({path:path.join(art,"article-mobile-3d.png"),fullPage:true,animations:"disabled"});
  await mobile.goto(base+"/guides",{waitUntil:"domcontentloaded"});
  await mobile.screenshot({path:path.join(art,"guides-mobile-3d.png"),fullPage:true,animations:"disabled"});
  assert.deepEqual(overflow,[],"Pages with mobile horizontal overflow");
  assert.deepEqual(jsErrors,[],"Client-side script errors while opening guide library");
  // The original customer screenshot was taken on Android; protect that layout.
  await mobile.goto(base+"/windows-pc-slow-errors",{waitUntil:"domcontentloaded"});
  const phoneTiles=await mobile.locator(".diagnostic-card").evaluateAll(cards=>cards.map(card=>{
    const style=getComputedStyle(card);
    const title=card.querySelector("strong");
    return{background:style.backgroundColor,titleColor:title?getComputedStyle(title).color:""};
  }));
  assert.equal(phoneTiles.length,3,"Windows problem diagnostic should show all three cards");
  assert.ok(phoneTiles.every(t=>t.background==="rgb(32, 58, 84)"&&t.titleColor==="rgb(240, 248, 255)"),"Cards must be high-contrast on mobile: "+JSON.stringify(phoneTiles));
  await mobile.screenshot({path:path.join(art,"windows-cards-mobile-contrast-fixed.png"),fullPage:true,animations:"disabled"});
  await mobile.close();
  process.stdout.write("Browser smoke passed: every page opens at mobile width; 3D hero, menu, reduced motion, no overflow, diagnostics, page fit, local notes.\n");
 }finally{await browser.close();await new Promise(ok=>app.close(ok))}
})().catch(e=>{process.stderr.write(e.stack+"\n");process.exitCode=1});
