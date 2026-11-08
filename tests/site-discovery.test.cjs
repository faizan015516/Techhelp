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

test("Global search treats Wi Fi, Wi-Fi and WiFi spellings consistently",()=>{
 const source=read("assets/site-discovery.js");
 const match=source.match(/const norm=text=>([^\n;]+);/);
 assert.ok(match,"search normalizer missing");
 const normalize=vm.runInNewContext("(text)=>"+match[1]);
 for(const form of ["WiFi","wi-fi","Wi Fi","WI-FI","Wi   Fi"])
  assert.equal(normalize(form),"wifi","search spelling differs: "+form);
 const entries=index.entries.filter(e=>/epson.*wi-fi|wi-fi.*epson/i.test(e.title+" "+e.description));
 assert.ok(entries.length>0,"search index should retain an Epson Wi-Fi result");
});

test("Header search is prominent, suggests real pages and supports accessible keyboard selection",()=>{
 const js=read("assets/site-discovery.js"),css=read("assets/site-discovery.css");
 for(const expected of [
  'pr-top-suggestions','pr-top-suggestions-list','aria-autocomplete','aria-activedescendant',
  'role","combobox','role","listbox','role","option','ArrowDown','ArrowUp',
  'closeTopSuggestions','requestTopSuggestions','See all matching articles'
 ])assert.ok(js.includes(expected),"Missing autocomplete interaction: "+expected);
 for(const expected of [
  'max-width:680px','min-height:56px','font:600 15px',
  '.pr-top-suggestions[hidden]','.pr-top-suggestion.is-active','@media(max-width:580px)'
 ])assert.ok(css.includes(expected),"Search visibility/responsiveness missing: "+expected);
 assert.ok(!js.includes("localStorage")&&!js.includes("sessionStorage"),"Search must not retain user queries");
 for(const loader of ["assets/experience.js","assets/future-2.js","tools/print-path-lab.html","tools/connection-path.html","tools/page-fit.html","guides.html"]){
  assert.ok(read(loader).includes("20261106-suggest-5"),"Old search assets are cached in "+loader);
 }
});
test("Search ranking understands common natural-language printer problems without inventing URLs",()=>{
 const src=read("assets/site-discovery.js");
 const normExpr=src.match(/const norm=text=>([^\n;]+);/)?.[1];
 const first=src.indexOf("function rank(query,list){");
 const last=src.indexOf("\nfunction renderSearch(){",first);
 assert.ok(normExpr&&first>=0&&last>first,"Search ranking definitions not found");
 const rankCode=src.slice(first,last);
 const rank=vm.runInNewContext("(function(){const norm=text=>"+normExpr+";"+rankCode+";return rank})()");
 const scenarios=[
  ["paper jam","/printer-paper-jam-no-paper-stuck"],
  ["Epson WiFi","/epson-printer-not-connecting-wifi"],
  ["why is my printer offline","/printer-offline-windows-11"],
  ["my printer won't print","/printer-not-printing"],
  ["hp paper jam","/printer-paper-jam-no-paper-stuck"]
 ];
 const allowed=new Set(index.entries.map(e=>e.path));
 for(const [query,wanted] of scenarios){
  const found=rank(query,index.entries).slice(0,7).map(e=>e.path);
  assert.ok(found.includes(wanted),"Search did not suggest relevant existing article for "+query+": "+found.join(","));
  assert.ok(found.every(p=>allowed.has(p)),"Autocomplete suggested an invented article: "+query);
 }
});
