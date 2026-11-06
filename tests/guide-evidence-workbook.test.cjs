"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const {CONFIG,advice}=require("../assets/guide-evidence-workbook.js");
const targets={
 "printer-not-printing.html":"printing",
 "printer-not-connecting-wifi.html":"wifi",
 "printer-paper-jam-no-paper-stuck.html":"jam",
 "printer-printing-cut-off-pages.html":"clipping",
 "epson-printer-not-connecting-wifi.html":"epsonwifi",
 "printer-printing-blank-pages.html":"blankpages",
 "printer-not-found-windows-11.html":"discovery",
 "find-install-printer-driver.html":"driverchoice"
};
test("Eight flagship guides present distinct useful browser-based evidence panels",()=>{
 for(const [page,topic] of Object.entries(targets)){
  const html=read(page);
  assert.ok(html.includes('data-diagnostic="'+topic+'"'),"Missing panel "+page);
  assert.ok(html.includes("/assets/guide-evidence-workbook.js?v="),page+" lacks JS");
  assert.ok(html.includes("/assets/guide-evidence-workbook.css?v="),page+" lacks CSS");
  assert.ok(html.includes('aria-live="polite"'),page+" lacks accessible result");
  assert.ok(html.includes('pr-evidence-privacy'),page+" lacks privacy disclosure");
  assert.ok(html.includes('pr-evidence-sources'),page+" lacks original source reference");
  const configs=CONFIG[topic];
  assert.ok(configs.questions.length>=2);
  for(const q of configs.questions){
    assert.ok(html.includes('data-observation="'+q.id+'"'),"Missing question "+q.id+" on "+page);
    for(const [value] of q.options)assert.ok(html.includes('value="'+value+'"'),"Missing supported observation "+value+" on "+page);
  }
  assert.ok(html.includes('href="/editorial-policy"')||html.includes('href="/editorial-policy#editorial-accountability"'));
 }
});
test("Diagnostic logic changes recommendations by observed evidence",()=>{
 const branches=[
  ["printing",{internal:"no"},"on-device"],
  ["printing",{internal:"yes",other:"yes"},"Windows printer entry"],
  ["printing",{queue:"complete"},"completed Windows job"],
  ["wifi",{status:"ssid"},"SSID"],
  ["wifi",{status:"ip"},"DHCP"],
  ["wifi",{status:"connected",windows:"offline"},"stale destination"],
  ["jam",{stage:"adf"},"ADF"],
  ["jam",{stage:"duplex"},"duplex"],
  ["jam",{stage:"repeat"},"service"],
  ["clipping",{preview:"yes"},"app preview"],
  ["clipping",{paper:"no"},"A4"],
  ["clipping",{selftest:"yes"},"hardware"],
  ["epsonwifi",{model:"et2800",code:"e8"},"ET-2800"],
  ["epsonwifi",{model:"l3250",code:"e9"},"L3250"],
  ["epsonwifi",{code:"e237"},"E-2/E-3/E-7"],
  ["blankpages",{internal:"blank",technology:"inkjet"},"nozzle-check"],
  ["blankpages",{internal:"marks",document:"one"},"print preview"],
  ["blankpages",{internal:"blank",technology:"laser"},"toner"],
  ["discovery",{connection:"wifi",evidence:"ip"},"Add a new device manually"],
  ["discovery",{connection:"wifi",evidence:"noip"},"DHCP"],
  ["discovery",{connection:"usb"},"USB"],
  ["driverchoice",{download:"thirdparty"},"third-party driver-downloader"],
  ["driverchoice",{system:"arm",status:"unavailable"},"ARM-based"],
  ["driverchoice",{status:"basic"},"full-feature software"]
 ];
 for(const [topic,inputs,fragment] of branches)assert.ok(advice(topic,inputs).includes(fragment),JSON.stringify({topic,inputs,fragment,actual:advice(topic,inputs)}));
});
test("Client logic parses, does not send data, and does not invent device tests",()=>{
 assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",path.join(root,"assets/guide-evidence-workbook.js")]));
 const js=read("assets/guide-evidence-workbook.js");
 for(const unsafe of ["localStorage","sessionStorage","XMLHttpRequest","fetch(","WebSocket","sendBeacon"])assert.ok(!js.includes(unsafe),"No input telemetry in worksheet: "+unsafe);
 assert.ok(js.includes('navigator.clipboard'));
 assert.ok(js.includes("not a device scan"));
 const css=read("assets/guide-evidence-workbook.css");
 assert.ok(css.includes("@media(max-width:560px)"));
 assert.ok(css.includes('select:focus-visible'));
});
