/* PrinterResolve site discovery — accessible brand picker + full library search.
   Uses only the 39 verified URLs in assets/site-search-index.json.
   No account, external search provider, query logging or backend required. */
(function(){
"use strict";
if(document.documentElement.dataset.prDiscoveryReady)return;
document.documentElement.dataset.prDiscoveryReady="1";
const BRAND_INFO=[
 {id:"hp",name:"HP",example:"Smart Tank & other HP printers"},
 {id:"canon",name:"Canon",example:"PIXMA and TR-series examples"},
 {id:"epson",name:"Epson",example:"EcoTank and Wi-Fi guides"},
 {id:"brother",name:"Brother",example:"Windows Offline troubleshooting"},
 {id:"dell",name:"Dell",example:"Legacy model and Wi-Fi guides"},
 {id:"any",name:"Other / unsure",example:"Guides for printers of any brand"}
];
const featuredPaths=[
 "/printer-not-printing","/printer-not-connecting-wifi","/printer-offline-windows-11",
 "/printer-not-found-windows-11","/printer-print-queue-stuck-windows-11",
 "/printer-printing-blank-pages","/printer-paper-jam-no-paper-stuck"
];
const labels={printer:"Printer guide",hp:"HP",canon:"Canon",epson:"Epson",brother:"Brother",dell:"Dell",tool:"Interactive tool",windows:"Windows guide",info:"Information",library:"Library",home:"Home"};
let entries=null,loadPromise=null,dialog,results,dialogTitle,dialogIntro,status,searchBox,brandFilter,brandRegion,selectedBrand=null,currentMode="printer";
const norm=text=>String(text||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/wi[\\s-]?fi/g,"wifi").replace(/[^a-z0-9]+/g," ").trim();
const safePath=v=>/^\/(?!\/)[a-z0-9\-/]*$/i.test(v);
function fetchIndex(){
 if(entries)return Promise.resolve(entries);
 if(loadPromise)return loadPromise;
 loadPromise=fetch("/assets/site-search-index.json",{credentials:"same-origin"})
 .then(r=>{if(!r.ok)throw new Error("Library index unavailable ("+r.status+")");return r.json()})
 .then(index=>{
  if(!Array.isArray(index.entries))throw new Error("Invalid search index");
  const found=new Set();
  entries=index.entries.filter(e=>{
   if(!e||!safePath(e.path)||found.has(e.path)||typeof e.title!=="string"||typeof e.description!=="string")return false;
   found.add(e.path);return true;
  });
  if(!entries.length)throw new Error("Search index is empty");
  return entries;
 }).catch(err=>{loadPromise=null;throw err});
 return loadPromise;
}
function el(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
}
function makeCard(entry){
 const a=el("a","pr-found-card");a.href=entry.path;
 const category=el("span","pr-found-label",labels[entry.category]||"Guide");
 const heading=el("strong","pr-found-title",entry.title);
 const desc=el("span","pr-found-description",entry.description);
 const arrow=el("span","pr-found-arrow","↗");arrow.setAttribute("aria-hidden","true");
 a.append(category,heading,desc,arrow);return a;
}
function sectionHeading(text){
 const h=el("h3","pr-found-group-title",text);
 results.appendChild(h);
}
function renderCards(list,emptyText){
 if(!list.length){results.appendChild(el("p","pr-no-results",emptyText||"No matching articles. Try a different printer brand or issue."));return}
 for(const e of list)results.appendChild(makeCard(e));
}
function rank(query,list){
 const terms=norm(query).split(" ").filter(Boolean);
 if(!terms.length)return [];
 return list.map(e=>{
  const t=norm(e.title),d=norm(e.description),k=norm(e.keywords),c=norm(e.category);
  let score=0;
  for(const term of terms){
   const hitTitle=t.includes(term),hitDesc=d.includes(term),hitKeyword=k.includes(term),hitCat=c.includes(term);
   if(!(hitTitle||hitDesc||hitKeyword||hitCat))return null;
   score+=hitTitle?16:hitKeyword?8:hitCat?6:2;
   if(t.startsWith(term))score+=3;
  }
  if(t.includes(terms.join(" ")))score+=12;
  return {entry:e,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.entry.title.localeCompare(b.entry.title)).map(x=>x.entry);
}
function renderSearch(){
 if(!entries)return;
 results.replaceChildren();
 const query=searchBox.value.trim();
 let matches=[];
 if(query){
  matches=rank(query,entries);
  status.textContent=matches.length+" matching page"+(matches.length===1?"":"s")+" for “"+query+"”";
 }else{
  matches=featuredPaths.map(p=>entries.find(e=>e.path===p)).filter(Boolean);
  status.textContent="Popular starting points · Search all "+entries.length+" site pages";
 }
 renderCards(matches.slice(0,22),query?"Nothing matches that search. Try “Epson Wi-Fi”, “paper jam”, or “driver”.":"No guides are available right now.");
}
function renderBrand(){
 if(!entries)return;
 results.replaceChildren();
 brandRegion.querySelectorAll("button[data-brand]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.brand===selectedBrand)));
 if(!selectedBrand){
  status.textContent="Choose one of the "+(BRAND_INFO.length-1)+" listed printer brands or select “Other / unsure”.";
  results.appendChild(el("p","pr-no-results","The matching guides will appear here after you choose a printer. Exact button menus and driver procedures vary by model."));
  return;
 }
 const brandName=BRAND_INFO.find(b=>b.id===selectedBrand)?.name||"Other";
 const typed=norm(brandFilter.value);
 const matchesTerms=e=>{
  if(!typed)return true;
  const hay=norm(e.title+" "+e.description+" "+e.keywords);
  return typed.split(" ").filter(Boolean).every(t=>hay.includes(t));
 };
 const specific=entries.filter(e=>e.category===selectedBrand&&matchesTerms(e));
 const general=entries.filter(e=>["printer","tool"].includes(e.category)&&e.path!=="/guides"&&matchesTerms(e));
 status.textContent=(specific.length+general.length)+" relevant guide"+(specific.length+general.length===1?"":"s")+" for "+(selectedBrand==="any"?"any printer":brandName);
 if(specific.length){sectionHeading(brandName+" troubleshooting guides");renderCards(specific)}
 if(general.length){
  sectionHeading(selectedBrand==="any"?"Guides for printers of any brand":"Also useful for "+brandName+" printers");
  renderCards(general);
 }
 if(!specific.length&&!general.length)renderCards([],"No matching guide for that issue yet. Try clearing the issue filter or choose another printer.");
}
function ensureUI(){
 if(dialog)return;
 const overlay=el("dialog","pr-discovery-dialog");
 overlay.setAttribute("aria-labelledby","pr-dialog-title");
 overlay.innerHTML='<div class="pr-dialog-shell"><div class="pr-dialog-top"><div><p class="pr-dialog-kicker">PRINTERRESOLVE · FIND WHAT YOU NEED</p><h2 id="pr-dialog-title">Choose your printer</h2><p class="pr-dialog-intro">Start with a brand, then open the appropriate guide.</p></div><button class="pr-dialog-close" type="button" aria-label="Close dialog">×</button></div><div class="pr-dialog-printer"><p class="pr-dialog-section-title">Printers with dedicated guides</p><div class="pr-brand-list" role="group" aria-label="Available printer brands"></div><label class="pr-filter-label" for="pr-brand-filter">Narrow guides by problem <span>(optional)</span></label><input id="pr-brand-filter" class="pr-dialog-input" type="search" placeholder="Offline, Wi-Fi, ink, driver, paper jam…" autocomplete="off"><p class="pr-dialog-hint">We list only brands and guides that exist on this website. These are educational pages, not a complete manufacturer model database.</p></div><div class="pr-dialog-search" hidden><label class="pr-filter-label" for="pr-search-full">Search articles and tools</label><input id="pr-search-full" class="pr-dialog-input" type="search" placeholder="Try “Epson black ink” or “printer paper jam”" autocomplete="off"></div><div class="pr-dialog-result-zone"><p class="pr-result-status" role="status" aria-live="polite"></p><div class="pr-search-results"></div></div><div class="pr-dialog-foot"><a href="/guides">Browse all guides</a><a href="/printer-problem-checker">Not sure? Use problem checker</a></div></div>';
 document.body.appendChild(overlay);
 dialog=overlay;
 dialogTitle=dialog.querySelector("#pr-dialog-title");
 dialogIntro=dialog.querySelector(".pr-dialog-intro");
 status=dialog.querySelector(".pr-result-status");
 results=dialog.querySelector(".pr-search-results");
 searchBox=dialog.querySelector("#pr-search-full");
 brandFilter=dialog.querySelector("#pr-brand-filter");
 brandRegion=dialog.querySelector(".pr-brand-list");
 const list=brandRegion;
 for(const b of BRAND_INFO){
  const btn=el("button","pr-brand-button");btn.type="button";btn.dataset.brand=b.id;
  btn.setAttribute("aria-pressed","false");
  btn.appendChild(el("strong","pr-brand-name",b.name));
  btn.appendChild(el("span","pr-brand-description",b.example));
  list.appendChild(btn);
 }
 list.addEventListener("click",e=>{
  const btn=e.target.closest("button[data-brand]");
  if(!btn)return;
  selectedBrand=btn.dataset.brand;
  renderBrand();
  dialog.querySelector(".pr-dialog-result-zone").scrollIntoView({block:"nearest",behavior:"auto"});
 });
 searchBox.addEventListener("input",renderSearch);
 brandFilter.addEventListener("input",renderBrand);
 dialog.querySelector(".pr-dialog-close").addEventListener("click",()=>dialog.close());
 dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
 dialog.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();dialog.close()}});
 dialog.addEventListener("close",()=>{document.body.classList.remove("pr-discovery-open")});
}
async function open(mode,query=""){
 ensureUI();
 currentMode=mode;
 dialogTitle.textContent=mode==="search"?"Search PrinterResolve":"Which printer are you troubleshooting?";
 dialogIntro.textContent=mode==="search"?"Find a published article, guide or interactive tool.":"Choose an available brand, then pick the symptom that matches your problem.";
 dialog.querySelector(".pr-dialog-printer").hidden=mode!=="printer";
 dialog.querySelector(".pr-dialog-search").hidden=mode!=="search";
 results.replaceChildren();
 status.textContent="Loading available guides…";
 if(!dialog.open)dialog.showModal();
 document.body.classList.add("pr-discovery-open");
 if(mode==="search"){searchBox.value=query;searchBox.focus()}else{brandFilter.value="";selectedBrand=null;brandRegion.querySelector("button")?.focus()}
 try{
  await fetchIndex();
  if(!dialog.open||currentMode!==mode)return;
  if(mode==="search")renderSearch();else renderBrand();
 }catch(error){
  results.replaceChildren();
  status.textContent="Search temporarily unavailable.";
  const note=el("p","pr-no-results","You can still browse the complete library or use the problem checker.");
  results.appendChild(note);
 }
}
function mountTopBar(){
 const header=document.querySelector("header.site-header .nav-wrap,header.nx-top .nx-top-inner");
 if(!header)return;
 if(document.querySelector(".pr-discovery-controls"))return;
 const wrapper=el("div","pr-discovery-controls");
 const form=el("form","pr-top-search");form.setAttribute("role","search");
 const label=el("label","pr-visually-hidden","Search PrinterResolve");label.htmlFor="pr-top-site-search";
 const input=el("input","pr-top-search-input");input.type="search";input.name="q";input.id="pr-top-site-search";input.placeholder="Search printer problems…";input.autocomplete="off";
 const searchBtn=el("button","pr-top-search-button","Search");searchBtn.type="submit";searchBtn.setAttribute("aria-label","Search all guides");
 form.append(label,input,searchBtn);
 form.addEventListener("submit",e=>{e.preventDefault();open("search",input.value)});
 const picker=el("button","pr-top-printer-button","Choose printer");picker.type="button";picker.addEventListener("click",()=>open("printer"));
 wrapper.append(form,picker);
 const brand=header.querySelector(".brand,.nx-wordmark");
 if(brand)brand.after(wrapper);else header.prepend(wrapper);
 const homeActions=document.querySelector(".hero-actions");
 if(homeActions&&!homeActions.querySelector(".pr-open-picker")){
  const btn=el("button","pr-open-picker button button-outline","Find your printer");btn.type="button";
  btn.addEventListener("click",()=>open("printer"));homeActions.appendChild(btn);
 }
 const libraryHero=document.querySelector(".library-hero .shell");
 if(libraryHero&&!libraryHero.querySelector(".pr-open-picker")){
  const btn=el("button","pr-open-picker button button-outline","Choose your printer");btn.type="button";
  btn.addEventListener("click",()=>open("printer"));libraryHero.appendChild(btn);
 }
 document.addEventListener("keydown",e=>{
  const editing=e.target?.closest?.("input,textarea,select,[contenteditable=true]");
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){
   e.preventDefault();open("search");
  }else if(e.key==="/"&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!editing&&!dialog?.open){
   e.preventDefault();open("search");
  }
 });
 const params=new URLSearchParams(location.search);
 if(location.pathname==="/guides"&&params.has("q"))open("search",params.get("q"));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountTopBar,{once:true});else mountTopBar();
})();
