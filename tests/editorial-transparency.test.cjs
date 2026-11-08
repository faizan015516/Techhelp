"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const guideFiles=fs.readdirSync(root).filter(p=>p.endsWith(".html"))
 .filter(p=>/printer|wi-fi|windows|driver|spooler|device-setup|find-install/i.test(p))
 .filter(p=>!["printer-problem-checker.html","guides.html","index.html"].includes(p))
 .concat(["epson-not-printing-black-ink.html","remote-assistance-safety.html"]);
test("All 27 informational guides disclose truthful site publisher and no fabricated field test",()=>{
 assert.equal(new Set(guideFiles).size,27,"Expected 27 unique independently published guide routes");
 for(const file of guideFiles){
  const html=read(file);
  const credit=(html.match(/<aside class="pr-editorial-credit"[^>]*>[\s\S]*?<\/aside>/i)||[])[0];
  assert.ok(credit,"Missing publisher transparency on "+file);
  assert.ok(credit.includes("Printer Resolve")&&credit.includes("AI-assisted"),"Publisher / preparation missing on "+file);
  assert.ok(credit.includes("No physical device test"),"Field-test limitation missing on "+file);
  assert.ok(credit.includes("/editorial-policy#editorial-accountability"),"Editorial method link missing on "+file);
  assert.ok(html.includes("/assets/editorial-attribution.css"),"Shared author credit styling missing on "+file);
  const h1End=html.indexOf("</h1>");
  assert.ok(h1End>=0&&html.indexOf("pr-editorial-credit",h1End)<h1End+700,"Credit is not adjacent to page heading "+file);
 }
});
test("Editorial policy names real publisher role, correction route and dated primary-source verification",()=>{
 const html=read("editorial-policy.html");
 assert.ok(html.includes('id="editorial-accountability"'));
 assert.ok(html.includes('id="documentation-checks"'));
 for(const token of [
  "No named, independently credentialed printer technician",
  "We will not fabricate an author profile",
  "support@printerresolve.com",
  "6 November 2026",
  "support.microsoft.com",
  "files.support.epson.com",
  "ij.manual.canon",
  "support.hp.com",
  "www.dell.com"
 ])assert.ok(html.includes(token),"Missing policy detail "+token);
 assert.ok(read("about.html").includes('id="about-accountable-publisher"'));
});
test("Privacy text accurately distinguishes AdSense script from granted advertising consent",()=>{
 const html=read("privacy.html"),gate=read("ADSENSE-CMP-AND-EDITORIAL-RELEASE-GATE.md");
 for(const token of ["Google AdSense application code","technical request information","working consent-management mechanism","not</strong> a substitute","Google Ads Settings"]){
  assert.ok(html.includes(token),"Privacy notice missing "+token);
 }
 assert.ok(gate.includes("NOT VERIFIED"),"Account-side consent must not be falsely marked verified");
 assert.ok(gate.includes("Do not add an unverified homemade cookie banner"));
 const css=read("assets/editorial-attribution.css");
 assert.ok(css.includes("@media (max-width:600px)"));
 assert.ok(css.includes(":focus-visible"));
});
