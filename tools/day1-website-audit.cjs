"use strict";
/*
 * Read-only Day 1 audit for PrinterResolve:
 * - check internal fragment links against actual element IDs
 * - measure repeated substantive paragraphs and overlapping page language
 * No external HTTP requests. Similarity is a review signal, not a Google verdict.
 */
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const urlRoot="https://printerresolve.com";
function walk(dir=""){
 const found=[];
 for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
  if([".git","node_modules","test-artifacts"].includes(e.name))continue;
  const n=path.posix.join(dir,e.name);
  if(e.isDirectory())found.push(...walk(n));else if(n.endsWith(".html"))found.push(n);
 }
 return found;
}
const files=walk(),html=Object.fromEntries(files.map(p=>[p,fs.readFileSync(path.join(root,p),"utf8")]));
function canonical(p){return p==="index.html"?urlRoot+"/":urlRoot+"/"+p.replace(/\.html$/,"");}
function toFile(pathname){
 const p=decodeURIComponent(pathname).replace(/^\/+/,"").replace(/\/$/,"");
 if(!p)return "index.html";
 return /\.[a-z0-9]+$/i.test(p)?p:p+".html";
}
const idMap=Object.fromEntries(files.map(f=>[f,new Set([...html[f].matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1]))]));
const missingFragments=[],deadPlaceholders=[];
for(const [file,source] of Object.entries(html)){
 const base=canonical(file);
 for(const a of source.matchAll(/<a\b[^>]*?\bhref=["']([^"']+)["'][^>]*>/gi)){
  const href=a[1].replace(/&amp;/g,"&");
  if(href==="#"){deadPlaceholders.push(file);continue}
  if(/^(?:javascript:|mailto:|tel:)/i.test(href))continue;
  let u;try{u=new URL(href,base)}catch{continue}
  if(u.origin!==urlRoot||!u.hash||u.hash==="#")continue;
  const target=toFile(u.pathname);
  const id=decodeURIComponent(u.hash.slice(1));
  if(idMap[target]&&!idMap[target].has(id))missingFragments.push({source:file,href,target,id});
 }
}
function clean(s){
 return s.replace(/<script\b[\s\S]*?<\/script>/gi," ")
  .replace(/<style\b[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]*>/g," ")
  .replace(/&(?:amp|nbsp|quot|lt|gt);/gi," ")
  .replace(/&#(?:\d+|x[0-9a-f]+);/gi," ")
  .replace(/\s+/g," ").trim().toLowerCase();
}
const editorialSkip=/privacy: your choices stay|Publisher: Printer Resolve|ai-assisted drafting|no physical device test|your selections stay|record what you observed|read our editorial|copy your observations|we do not request remote access|works in your browser|model-specific menus|this is a worked diagnostic example/;
const guides=files.filter(f=>!f.includes("/")&&/(printer|wi-fi|windows|driver|spooler|device-setup|find-install|epson|brother|canon|hp|dell)/i.test(f))
 .filter(f=>!["index.html","guides.html","printer-problem-checker.html"].includes(f));
const paragraphs={};
const seen=new Map();
for(const file of guides){
 let m=html[file].match(/<article\b[\s\S]*?<\/article>/i);
 const body=m?m[0]:html[file].slice(html[file].indexOf("<main"),html[file].indexOf("</main>")+7);
 const p=[...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  .map(z=>clean(z[1])).filter(x=>x.length>=165&&!editorialSkip.test(x));
 paragraphs[file]=p;
 for(const text of new Set(p)){
  if(!seen.has(text))seen.set(text,[]);
  seen.get(text).push(file);
 }
}
const repeated=[...seen.entries()].filter(([p,owners])=>owners.length>1&&p.length>=180)
 .sort((a,b)=>b[1].length-a[1].length||b[0].length-a[0].length)
 .slice(0,15).map(([text,owners])=>({chars:text.length,count:owners.length,files:owners,excerpt:text.slice(0,130)}));
function ngrams(text){
 const words=clean(text).match(/[a-z0-9]+/g)||[];
 const set=new Set();
 for(let i=0;i<words.length-2;i++)set.add(words.slice(i,i+3).join(" "));
 return set;
}
const grams=Object.fromEntries(guides.map(f=>[f,ngrams(paragraphs[f].join(" "))]));
const pairs=[];
for(let i=0;i<guides.length;i++)for(let j=i+1;j<guides.length;j++){
 const a=grams[guides[i]],b=grams[guides[j]];
 let common=0;for(const g of a)if(b.has(g))common++;
 const union=a.size+b.size-common;
 const overlap=union?common/union:0;
 pairs.push({a:guides[i],b:guides[j],sharedTrigrams:common,jaccard:Number(overlap.toFixed(3))});
}
pairs.sort((a,b)=>b.jaccard-a.jaccard);
const report={checkedAt:new Date().toISOString(),htmlPages:files.length,editorialGuidePages:guides.length,
 missingFragments,deadPlaceholders:[...new Set(deadPlaceholders)],repeatedParagraphs:repeated,topSimilarityPairs:pairs.slice(0,15)};
fs.mkdirSync(path.join(root,"test-artifacts"),{recursive:true});
fs.writeFileSync(path.join(root,"test-artifacts","day1-website-audit.json"),JSON.stringify(report,null,2));
console.log("DAY1_SITE_AUDIT "+JSON.stringify(report));
if(missingFragments.length){console.error("Broken internal anchor targets found; see DAY1_SITE_AUDIT");process.exitCode=1;}
