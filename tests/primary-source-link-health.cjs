"use strict";
/* Read-only source-link reachability audit. HTTP status is NOT factual verification. */
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),out=path.join(root,"test-artifacts");
fs.mkdirSync(out,{recursive:true});
const hosts=[
 /(^|\.)support\.microsoft\.com$/i,
 /(^|\.)files\.support\.epson\.com$/i,
 /(^|\.)ij\.manual\.canon$/i,
 /(^|\.)support\.hp\.com$/i,
 /(^|\.)support\.brother\.com$/i,
 /(^|\.)www\.dell\.com$/i,
 /(^|\.)support\.usa\.canon\.com$/i
];
const list=fs.readdirSync(root).filter(f=>f.endsWith(".html"));
const refs=new Map();
for(const file of list){
 const html=fs.readFileSync(path.join(root,file),"utf8");
 const main=html.slice(html.indexOf("<main")>=0?html.indexOf("<main"):0,html.indexOf("</main>")>0?html.indexOf("</main>")+7:html.length);
 for(const match of main.matchAll(/<a\b[^>]*href=["'](https?:\/\/[^"']+)["']/gi)){
  let url;try{url=new URL(match[1].replace(/&amp;/g,"&"))}catch(e){continue}
  if(!hosts.some(re=>re.test(url.hostname)))continue;
  const key=url.href;
  const old=refs.get(key)||{url:key,usedBy:[]};
  if(!old.usedBy.includes(file))old.usedBy.push(file);
  refs.set(key,old);
 }
}
const urls=[...refs.values()].slice(0,125);
const errors=[];
async function request(url,method){
 try{
  const res=await fetch(url,{method,redirect:"follow",signal:AbortSignal.timeout(9000),headers:{"User-Agent":"Mozilla/5.0 (compatible; PrinterResolveEditorialLinkAudit/1.0)"}});
  return{status:res.status,finalUrl:res.url,success:res.ok,error:null};
 }catch(e){return{status:null,finalUrl:null,success:false,error:e.message||String(e)}}
}
async function verify(record){
 const head=await request(record.url,"HEAD");
 let last=head;
 if([403,405,406,429,503].includes(head.status)||head.status===null)last=await request(record.url,"GET");
 let state;
 if(last.success)state="reachable";
 else if([404,410].includes(last.status))state="needs_manual_review_http_missing";
 else if([401,403,406,408,429,500,502,503,504].includes(last.status)||last.status===null)state="inconclusive_vendor_block_or_network";
 else state="needs_manual_review_other_http_status";
 return {...record,state,headStatus:head.status,getOrFinalStatus:last.status,finalUrl:last.finalUrl,error:last.error};
}
(async()=>{
 const results=new Array(urls.length);let index=0;
 async function worker(){
  while(index<urls.length){const i=index++;results[i]=await verify(urls[i]);}
 }
 await Promise.all(Array.from({length:5},()=>worker()));
 const counts=results.reduce((o,r)=>(o[r.state]=(o[r.state]||0)+1,o),{});
 const report={checkedAt:new Date().toISOString(),site:"https://printerresolve.com",method:"Read-only HTTP HEAD, fallback GET for bot-blocked/unsupported HEAD. Does not verify any technical claim or imply a device test.",references:results.length,counts,attention:results.filter(r=>r.state!=="reachable"),results};
 fs.writeFileSync(path.join(out,"primary-source-link-audit.json"),JSON.stringify(report,null,2));
 console.log("SOURCE_LINK_AUDIT_SUMMARY "+JSON.stringify({references:report.references,counts}));
 console.log("SOURCE_LINK_AUDIT_ATTENTION "+JSON.stringify(report.attention).slice(0,14000));
})();
