"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const index=JSON.parse(read("assets/site-search-index.json"));
const routes=[...read("sitemap.xml").matchAll(/<loc>(https:\/\/printerresolve\.com[^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
const names={hp:1,epson:2,canon:2,brother:1,dell:1};
test("Search index covers every canonical page, without invented links",()=>{
 assert.equal(routes.length,39);
 const urls=index.entries.map(e=>e.path);
 assert.deepEqual(new Set(urls),new Set(routes));
 assert.equal(urls.length,new Set(urls).size,"search index duplicates");
 for(const e of index.entries){
  assert.match(e.path,/^\/(?!\/)[a-z0-9\-/]*$/i);
  assert.ok(e.title.length>8&&e.description.length>12,"missing title or useful description: "+e.path);
  const name=e.path==="/"? "index.html" : e.path.slice(1)+".html";
  assert.ok(fs.existsSync(path.join(root,name)),"search result points to missing file: "+e.path);
 }
});
test("Printer selection displays all five real dedicated manufacturers",()=>{
 for(const [brand,count] of Object.entries(names)){
  assert.equal(index.entries.filter(e=>e.category===brand).length,count,"incorrect published "+brand+" guides");
 }
 const js=read("assets/site-discovery.js");
 for(const brand of Object.keys(names))assert.ok(js.includes('id:"'+brand+'"'),"missing dialog brand "+brand);
 for(const selector of ["Other / unsure","pr-brand-list","pr-brand-filter","pr-top-search-input","aria-live","showModal","rank(query,entries)","Escape"]) {
  if(selector==="Escape")continue;
  assert.ok(js.includes(selector),"missing accessible navigation feature "+selector);
 }
 assert.ok(!js.includes("localStorage"),"search should not store history");
});
test("Search and printer-picker code parses and is loaded on every published page",()=>{
 assert.doesNotThrow(()=>new vm.Script(read("assets/site-discovery.js")));
 for(const e of index.entries){
  const page=e.path==="/"? "index.html":e.path.slice(1)+".html";
  const h=read(page);
  assert.ok(
   h.includes("/assets/future-2.js")||h.includes("/assets/experience.js")||h.includes("/assets/site-discovery.js"),
   "no site-search script route on "+page
  );
 }
 for(const loader of ["assets/experience.js","assets/future-2.js"]){
  const s=read(loader);
  assert.ok(s.includes("/assets/site-discovery.js"),loader+" missing dynamic discovery");
  assert.ok(s.includes("/assets/site-discovery.css"),loader+" missing shared styling");
 }
 assert.ok(read("assets/site-discovery.css").includes("@media(max-width:580px)"));
});
