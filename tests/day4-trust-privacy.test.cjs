"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const routes=fs.readdirSync(root).filter(p=>p.endsWith(".html"))
 .concat(fs.readdirSync(path.join(root,"tools")).filter(p=>p.endsWith(".html")).map(p=>"tools/"+p));
const publisher="2393332073506347";
test("Privacy policy accurately covers locally processed diagnosis and clipboard notes",()=>{
 const html=read("privacy.html");
 for(const token of [
  "Google AdSense application code",
  "not independently verified its appearance on the live website",
  "working consent-management mechanism",
  "third-party vendors, including Google",
  "Google Ads Settings",
  "Cloudflare Pages","Zoho",
  "before-and-after print comparison",
  "copied to your device clipboard",
  "not automatically emailed",
  "no network requests",
  "support@printerresolve.com"
 ])assert.ok(html.includes(token),"Missing current privacy disclosure: "+token);
 assert.ok(!/id=["'](?:cookie-prefs|open-cmp|fake-consent|accept-all-cookies)["']/i.test(html),
  "Do not imply a functioning first-party consent preferences interface");
});
test("All contact and editorial routes disclose independent publisher and safe correction channel",()=>{
 const pages=["about.html","contact.html","editorial-policy.html","disclaimer.html","terms.html"];
 for(const page of pages){
  const html=read(page);
  assert.ok(html.includes("Printer Resolve"),page+" publisher missing");
  assert.match(html,/support@printerresolve\.com|\/contact\b/,page+" contact missing");
 }
 const contact=read("contact.html");
 for(const t of ['id="correction-reporting"',"public article URL","specific step or heading","official, publicly accessible","serial number","/editorial-policy"])assert.ok(contact.includes(t));
 const about=read("about.html");
 assert.ok(about.includes("controlled before-and-after worksheet"));
 assert.ok(about.includes("cannot communicate with a physical device")||about.includes("do not communicate with hardware"));
 const editorial=read("editorial-policy.html");
 assert.ok(editorial.includes("controlled print comparison"));
 assert.ok(editorial.includes("do not automatically receive it"));
 assert.ok(editorial.includes("No named, independently credentialed printer technician"));
});
test("All present AdSense page-script publisher IDs match ads.txt; no second account ID",()=>{
 const ads=read("ads.txt");assert.match(ads,/^google\.com, pub-2393332073506347, DIRECT, f08c47fec0942fa0/m);
 const discovered=new Set(),advertisingScriptPages=[];
 for(const file of routes){
  const src=read(file);
  for(const tag of src.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)){
   const url=tag[1];
   if(!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle/i.test(url))continue;
   const id=url.match(/client=ca-pub-(\d+)/i)?.[1];
   assert.ok(id,"AdSense publisher ID missing in tag on "+file);
   discovered.add(id);advertisingScriptPages.push(file);
  }
 }
 assert.ok(advertisingScriptPages.length>10,"Expected existing AdSense code on many content pages");
 assert.deepEqual([...discovered],[publisher],"Publisher tag IDs must not conflict with ads.txt");
 console.log("TRUST_ADSENSE_TAG_COUNT "+advertisingScriptPages.length);
});
test("Do not silently add unauthorized scripts to the private comparison tool",()=>{
 const s=read("assets/controlled-test-log.js");
 for(const token of ["fetch(","XMLHttpRequest","sendBeacon","localStorage","indexedDB","document.cookie","sessionStorage"])
  assert.equal(s.includes(token),false,"Unexpected data access: "+token);
 const privacy=read("privacy.html");
 assert.ok(privacy.includes("/tools/print-path-lab#controlled-test-log"));
});
