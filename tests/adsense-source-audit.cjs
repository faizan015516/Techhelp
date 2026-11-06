"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const base="https://printerresolve.com";
const htmlFiles=[];
function scan(dir){
 for(const d of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
  if(d.name.startsWith(".")&&d.name!==".well-known")continue;
  const p=path.posix.join(dir,d.name);
  if(d.isDirectory()){if(!["node_modules","test-artifacts"].includes(d.name))scan(p)}
  else if(d.name.endsWith(".html"))htmlFiles.push(p);
 }
}
scan(".");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const siteFiles=new Set(htmlFiles.map(p=>p==="index.html"?"/":"/"+p.replace(/\.html$/,"")));
const pretty=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&(?:amp|nbsp|quot|#39|rsquo|mdash|hellip);/g," ").replace(/\s+/g," ").trim();
const official=/support\.microsoft\.com|learn\.microsoft\.com|support\.hp\.com|ij\.manual\.canon|www\.usa\.canon\.com\/support|files\.support\.epson|epson\.com\/support|support\.brother\.com|dell\.com\/support|www\.dell\.com\/support/i;
const pages=[],badLinks=[],paragraphs=new Map(),titles=new Map(),thirdPartyTags=[],externalLinks=new Map();
function section(s,name){const m=s.match(new RegExp("<"+name+"\\b[^>]*>([\\s\\S]*?)<\\/"+name+">","i"));return m?m[1]:""}
for(const filename of htmlFiles){
 const s=read(filename),pageURL=base+(filename==="index.html"?"/":"/"+filename.replace(/\.html$/,""));
 const canonical=(s.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)||[])[1]||"";
 const title=pretty(section(s,"title")),h1=[...s.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>pretty(m[1]));
 const desc=(s.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)||[])[1]||"";
 const main=section(s,"main")||s,article=main,plain=pretty(article); // Analyze the full <main>: several guides contain multiple sections after their first <article>.
 const words=plain.split(/\s+/).filter(Boolean).length;
 const linkRe=/<a\b[^>]*href=["']([^"']+)["']/gi,links=[...s.matchAll(linkRe)].map(m=>m[1]);
 const external=links.filter(u=>/^https?:/i.test(u));
 const officialRefs=external.filter(u=>official.test(u));
 const assetRe=/(?:src|href)=["'](\/assets\/[^"']+)["']/gi;
 const assets=[...s.matchAll(assetRe)].map(m=>m[1].split("?")[0]).filter(u=>!u.includes("#"));
 const deadAssets=[...new Set(assets)].filter(u=>!fs.existsSync(path.join(root,u.slice(1))));
 const broken=[];
 for(const href of links){
  if(/^(?:#|mailto:|tel:|javascript:|data:)/i.test(href))continue;
  let u;try{u=new URL(href,pageURL)}catch(e){broken.push({href,reason:"invalid URL"});continue;}
  if(u.host!=="printerresolve.com")continue;
  let target=u.pathname.replace(/\/$/,"")||"/";
  if(target.endsWith(".html"))target=target.slice(0,-5);
  if(!siteFiles.has(target)&&!fs.existsSync(path.join(root,target.replace(/^\//,"")))&&!target.startsWith("/cdn-cgi")){
   broken.push({href,resolvesTo:u.pathname,reason:"target missing from repo"});
  }
 }
 if(broken.length||deadAssets.length)badLinks.push({page:filename,links:broken.slice(0,20),assets:deadAssets});
 const fingerprint=plain.toLowerCase().replace(/\s+/g," ").slice(0,800);
 const paras=[...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>pretty(m[1])).filter(p=>p.length>145);
 for(const p of paras){
  const h=crypto.createHash("sha256").update(p.toLowerCase()).digest("hex").slice(0,15);
  const v=paragraphs.get(h)||{text:p.slice(0,95),files:new Set()};
  v.files.add(filename);paragraphs.set(h,v);
 }
 const heading2=[...article.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(m=>pretty(m[1]));
 const isGuide=/printer|wi-fi|windows|driver|spooler|device-setup|find-install/i.test(filename)&&!["printer-problem-checker.html","guides.html","index.html"].includes(filename);
 const cites=external.filter(u=>official.test(u));
 const adsScripts=/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle/i.test(s);
 const ga=/gtag\.js|googletagmanager\.com\/gtm\.js|google-analytics\.com\/analytics/i.test(s);
 const byline=/<(?:p|span|small)[^>]*class=["'][^"']*(?:byline|author|reviewer)[^"']*["']/i.test(s);
 const schemaTypes=[...s.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map(m=>m[1]);
 const row={path:filename,route:pageURL,words,h1Count:h1.length,h1:h1[0]||"",h2Count:heading2.length,title,titleLength:title.length,descriptionLength:desc.length,canonicalCorrect:canonical===pageURL,officialLinks:officialRefs.length,externals:external.length,isGuide,byline,schemas:schemaTypes,adsScripts,ga,illustrative:/illustrative|not a device test|worked example|model-specific|independent educational/i.test(plain),originalValue:/controlled (?:test|observation)|tested on|original (?:tool|framework|analysis)|worked example|evidence matrix|test timing|calculate|printed report/i.test(plain),hasDateModified:/dateModified/.test(s),wordcountIsProxyNotQuality:true};
 pages.push(row);if(adsScripts||ga)thirdPartyTags.push({path:filename,adsScripts,ga});
 titles.set(title,[...(titles.get(title)||[]),filename]);
}
const rpt=pages.filter(p=>p.isGuide);
const reasons=[];
const low=pages.filter(p=>p.words<400),guideLow=rpt.filter(p=>p.words<700);
const noSources=rpt.filter(p=>p.officialLinks===0);
const repeats=[...paragraphs.values()].filter(x=>x.files.size>=3).sort((a,b)=>b.files.size-a.files.size).slice(0,28).map(v=>({count:v.files.size,text:v.text,files:[...v.files]}));
const sitemap=read("sitemap.xml");
const sitemapRoutes=[...sitemap.matchAll(/<loc>https:\/\/printerresolve\.com([^<]*)<\/loc>/g)].map(m=>m[1]);
const missingInSitemap=pages.filter(p=>!sitemapRoutes.includes(new URL(p.route).pathname)).map(p=>p.path);
const notInRepo=sitemapRoutes.filter(x=>!siteFiles.has(x));
const hasConsentImplementation=fs.readdirSync(path.join(root,"assets")).some(f=>/consent|cmp|cookie-banner|onetrust|cookiebot/i.test(f));
const result={runDate:new Date().toISOString(),site:base,analysis:"Static source audit. This is not an official AdSense evaluation or factual validation of every step.",counts:{htmlFiles:pages.length,guides:rpt.length,uniqueCanonicalInSitemap:new Set(sitemapRoutes).size,sitemapCount:sitemapRoutes.length,adsScriptPages:thirdPartyTags.filter(x=>x.adsScripts).length,analyticsScriptPages:thirdPartyTags.filter(x=>x.ga).length,guidePagesWithoutOfficialPrimaryReferences:noSources.length,guidePagesUnder700Words:guideLow.length,pagesUnder400Words:low.length,brokenInternalLinkPages:badLinks.length,duplicateParagraphsOn3plusPages:repeats.length,bylineGuides:rpt.filter(p=>p.byline).length,hasConsentAssetByName:hasConsentImplementation},smallPages:low.map(p=>({page:p.path,words:p.words})),shortGuides:guideLow.map(p=>({page:p.path,words:p.words,sources:p.officialLinks})),guidesWithoutPrimaryReferences:noSources.map(p=>({page:p.path,words:p.words})),brokenInternalLinks:badLinks,canonicalErrors:pages.filter(p=>!p.canonicalCorrect).map(p=>p.path),pageHeadingErrors:pages.filter(p=>p.h1Count!==1).map(p=>({path:p.path,h1:p.h1Count})),sitemap:{notInSitemap:missingInSitemap,missingFromRepo:notInRepo},duplicateTitles:[...titles].filter(([t,files])=>files.length>1),duplicateLongParagraphs:repeats,privacy:{privacyPageServesAdScript:pages.find(p=>p.path==="privacy.html")?.adsScripts,adScriptPageCount:thirdPartyTags.filter(p=>p.adsScripts).length,consentImplementationNotVerified:!hasConsentImplementation},pages:pages.sort((a,b)=>a.words-b.words)};
fs.mkdirSync(path.join(root,"test-artifacts"),{recursive:true});
fs.writeFileSync(path.join(root,"test-artifacts/adsense-source-audit.json"),JSON.stringify(result,null,2));
console.log("ADSENSE_SOURCE_AUDIT_SUMMARY "+JSON.stringify(result.counts));
console.log("ADSENSE_SOURCE_AUDIT_NO_SOURCES "+JSON.stringify(result.guidesWithoutPrimaryReferences));
console.log("ADSENSE_SOURCE_AUDIT_SHORT_GUIDES "+JSON.stringify(result.shortGuides));
console.log("ADSENSE_SOURCE_AUDIT_BROKEN_LINKS "+JSON.stringify(result.brokenInternalLinks).slice(0,8000));
console.log("ADSENSE_SOURCE_AUDIT_DUPLICATE_PARAGRAPHS "+JSON.stringify(result.duplicateLongParagraphs.slice(0,8)));
console.log("ADSENSE_SOURCE_AUDIT_SITEMAP "+JSON.stringify(result.sitemap));
console.log("ADSENSE_SOURCE_AUDIT_ALL_PAGES "+JSON.stringify(result.pages.map(p=>({page:p.path,words:p.words,officialLinks:p.officialLinks,h1:p.h1Count,ads:p.adsScripts}))));
