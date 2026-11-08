"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const brands={
  hp:["hp-printer-offline-connected-wifi.html"],
  epson:["epson-printer-not-connecting-wifi.html","epson-not-printing-black-ink.html"],
  canon:["canon-printer-not-found-wifi-windows-11.html","canon-printer-not-responding-windows-11.html"],
  brother:["brother-printer-offline-windows-11.html"],
  dell:["dell-printer-not-connecting-wifi-windows-11.html"]
};
const toFile=u=>u==="/"? "index.html" : u.slice(1)+".html";
test("Every brand guide has clear manufacturer-specific hero text and original 360 model",()=>{
 for(const [brand,pages] of Object.entries(brands))for(const p of pages){
   const html=read(p);
   const hero=(html.match(/<section class="nx-hero pr-brand-hero"[\s\S]*?<\/section>/)||[])[0];
   assert.ok(hero,"brand hero missing "+p);
   assert.ok(hero.includes('data-brand="'+brand+'"'),p+" manufacturer mismatch");
   assert.ok(hero.includes('data-printer="'+brand+'"'),p+" viewer not brand matched");
   assert.ok(hero.includes('src="/assets/printer-concept-'+brand+'.svg"'),p+" original fallback not brand matched");
   assert.match(hero,/pr-brand-display/,"branded hero headline missing "+p);
   assert.match(hero,/pr-brand-subhead/,"branded intro missing "+p);
   assert.match(hero,/pr-brand-visual-id/,"label on illustration missing "+p);
   assert.match(hero,/not an official|Not an official/,"copyright and endorsement disclosure missing "+p);
   assert.match(html,/href="\/assets\/brand-hero.css/,"brand CSS missing "+p);
   assert.ok(!hero.includes("Trace the signal."),p+" still generic");
   const links=[...hero.matchAll(/<a\s+[^>]*href="(\/[^"]+)"/g)].map(m=>m[1]).filter(x=>!x.startsWith("#"));
   assert.ok(links.length>=6,"too few useful shortcuts on "+p);
   for(const link of links)assert.ok(fs.existsSync(path.join(root,toFile(link))),p+" links to nonexistent page "+link);
   assert.ok((html.match(/<h1\b/gi)||[]).length>=1,"article heading missing "+p);
 }
});
test("Each original brand illustration exists as vector artwork, never copied product media",()=>{
 for(const brand of Object.keys(brands)){
  const svg=read("assets/printer-concept-"+brand+".svg");
  assert.match(svg,/^<svg\b/);
  assert.ok(svg.includes(brand.toUpperCase()),"brand label missing "+brand);
  assert.match(svg,/Not an official manufacturer product photo/);
  assert.ok(svg.length>3000&&svg.length<18000,"SVGS should be original and small "+brand);
  assert.ok(!/<image\b|xlink:href|https?:\/\//i.test(svg.replace('xmlns="http://www.w3.org/2000/svg"','')),"No hotlinked or third-party images inside original vector "+brand);
 }
});
test("Plain-text brand labels on 3D concepts and accessible CSS remain functional",()=>{
 const js=read("assets/printer-360.mjs"),css=read("assets/brand-hero.css");
 assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",path.join(root,"assets/printer-360.mjs")]));
 for(const name of ["HP CONCEPT","EPSON CONCEPT","CANON CONCEPT","BROTHER CONCEPT","DELL CONCEPT"]){
  assert.ok(js.includes(name),"3D geometry label missing "+name);
 }
 assert.ok(css.includes("@media(max-width:580px)"),"mobile layout styling absent");
 assert.ok(css.includes('pr-brand-quicklinks a:focus-visible'),"keyboard focus styles absent");
 assert.ok(css.includes('color:#f6')||css.includes('color:#fff'),"headline contrast missing");
});
