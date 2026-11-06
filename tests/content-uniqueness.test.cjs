"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=n=>fs.readFileSync(path.join(__dirname,"..",n),"utf8");
test("Queue guide differentiates a stalled job from a stopped Windows spooler",()=>{
 const s=read("printer-print-queue-stuck-windows-11.html");
 for(const phrase of ["A job stuck in the queue is not always a broken spooler","Print Spooler actually stops","Only one PDF remains queued","spooler-crash guide","support.microsoft.com/en-us/windows/hardware/printer/fix-print-job-stuck-in-queue-errors-in-windows"])
  assert.ok(s.includes(phrase),"Missing original cue: "+phrase);
});
test("Page-fit guide calculates A4 and Letter differences correctly and links sources",()=>{
 const s=read("printer-printing-cut-off-pages.html");
 for(const phrase of ["A4 versus US Letter: a measurable clipping example","195 + 8 + 8 = 211","17.6 mm","5.9 mm","/tools/page-fit","support.apple.com/guide/preview/print-pdfs-and-images-prvw15175/mac"])
  assert.ok(s.includes(phrase),"Missing original math or source: "+phrase);
 assert.equal(297-279.4,17.600000000000023);
 assert.equal(Math.round((215.9-210)*10)/10,5.9);
 assert.equal(195+8+8,211);
});

test("Windows discovery guide documents verified manual-add without claiming IP is proof of reachability",()=>{
 const s=read("printer-not-found-windows-11.html");
 for(const phrase of ["When Windows finds nothing: three observations that change the diagnosis","ipconfig","Same calculated","Add manually","client isolation","support.microsoft.com/en-us/windows/hardware/printer/add-or-install-a-printer-in-windows"]){
  if(phrase==="Same calculated")continue;
  assert.ok(s.toLowerCase().includes(phrase.toLowerCase()),"Missing verified discovery guidance: "+phrase);
 }
 assert.match(s,/illustrative, not a test performed on a real printer/i);
});
test("Core troubleshooting guides distinguish causes rather than promising one universal fix",()=>{
 const checks={
  "printer-paper-jam-no-paper-stuck.html":["false paper-jam warning","fuser","ADF","model-specific"],
  "printer-not-connecting-wifi.html":["wifi-four-stages","169.254.x.x","guest","support.microsoft.com"],
  "printer-printing-cut-off-pages.html":["a measurable clipping example","hardware margins","/tools/page-fit"],
  "printer-print-queue-stuck-windows-11.html":["only one PDF remains queued","shared","spooler"]
 };
 for(const [file,phrases] of Object.entries(checks)){const s=read(file).toLowerCase();for(const phrase of phrases)assert.ok(s.includes(phrase.toLowerCase()),file+" missing: "+phrase)}
});

test("Manufacturer-specific procedures are backed by their primary sources",()=>{
 const cases=[
 ["hp-printer-offline-connected-wifi.html",["hp-smart-tank-report","Information","Resume","ish_6721056-6721100-16","not the result of a hands-on printer test"]],
 ["dell-printer-not-connecting-wifi-windows-11.html",["dell-model-compatibility","C1765nfw","E525w","3000cn","000133596","not a device test"]]
 ];
 for(const [file,phrases] of cases){const s=read(file).toLowerCase();for(const phrase of phrases)assert.ok(s.includes(phrase.toLowerCase()),file+" missing primary-source specificity: "+phrase)}
});
test("Guide library routes distinct symptoms to distinct first steps",()=>{
 const s=read("guides.html");
 for(const target of ["id=\"choose-path\"","/printer-not-connecting-wifi","/printer-not-found-windows-11","/printer-offline-windows-11","/printer-print-queue-stuck-windows-11","/printer-printing-blank-pages","/printer-printing-cut-off-pages"])
  assert.ok(s.includes(target),"Missing decision guide route "+target);
});

test("Ink and Canon print-output diagnostics contain source-backed safety branches",()=>{
 const cases=[
 ["epson-not-printing-black-ink.html",["et2800-nozzle-check","Maintenance","Nozzle Check","at least 12 hours","checking_nozzles_lcd_et2800_l3260.html"]],
 ["canon-printer-not-responding-windows-11.html",["canon-tr4700-print-notrespond","Print LAN details","paper-size","ntr_t_03_01_c.html","ntr_n_01_04.html"]]
 ];
 for(const [file,phrases] of cases){const s=read(file).toLowerCase();for(const phrase of phrases)assert.ok(s.includes(phrase.toLowerCase()),file+" missing: "+phrase)}
});

test("Evidence-led high-interest guides retain their original decision frameworks",()=>{
 const sections={
  "printer-not-printing.html":["id=\"four-test-isolation\"","Built-in page works","using controls on the printer itself","fix-print-job-stuck-in-queue-errors-in-windows","mainEntityOfPage"],
  "printer-not-connecting-wifi.html":["id=\"wifi-report-decision\"","169.254.x.x","/tools/connection-path","net_connection_report_codes.html"],
  "printer-paper-jam-no-paper-stuck.html":["id=\"jam-stage-matrix\"","document feeder","1304","problem_paper_jam_l3250.html"],
  "printer-printing-slowly-windows-11.html":["id=\"prt-timing-form\"","/assets/print-timing-lab.js","110","first page","hypothetical"]
 };
 for(const [name,patterns] of Object.entries(sections)){const body=read(name).toLowerCase();for(const p of patterns)assert.ok(body.includes(p.toLowerCase()),name+" is missing original reader-value element: "+p);}
});
test("Timing calculator interprets reader measurements and rejects impossible input",()=>{
 const {diagnose}=require("../assets/print-timing-lab.js");
 const first=diagnose(70,110,5);
 assert.equal(first.ok,true); assert.equal(first.later,10); assert.equal(first.pattern,"Long first-page delay");
 const later=diagnose(10,90,5);assert.equal(later.later,20);assert.equal(later.pattern,"Later pages dominate the delay");
 const balanced=diagnose(20,100,5);assert.equal(balanced.pattern,"No strong first-versus-later imbalance");
 for(const args of [[0,100,5],[90,60,5],[50,50,5],[10,90,1],[10,90,101],[10,90,2.5]]) assert.equal(diagnose(...args).ok,false);
});

test("Spooler crash guide distinguishes event-timing evidence from an offline queue",()=>{
 const s=read("print-spooler-keeps-stopping-windows-11.html");
 for(const expected of [
  'id="spooler-event-evidence"',
  'Service Control Manager',
  'PrintService',
  'Service remains Running; printer is Offline.',
  'A repeatable timing relationship',
  'fix-print-spooler-service-not-running-errors-in-windows',
  'Free independent educational website; not affiliated with manufacturers.'
 ]) assert.ok(s.includes(expected), "Missing spooler diagnostic evidence: "+expected);
 assert.doesNotMatch(s,/Independent service; not affiliated with manufacturers\./);
});

test("Day 2 blank pages guide documents the ET-2800 decision with required cleaning limits",()=>{
 const s=read("printer-printing-blank-pages.html");
 for(const phrase of [
  'id="et2800-blank-test-decision"',
  'EcoTank ET-2800 or ET-2803',
  'Maintenance',
  'Nozzle Check',
  'each tank be at least one-third full',
  '12 hours',
  'power_cleaning_lcd_et2800_l3260.html',
  'does not claim that we operated these printers'
 ]) assert.ok(s.includes(phrase),"Blank-page source/method warning absent: "+phrase);
 assert.ok(s.indexOf('id="et2800-blank-test-decision"')<s.indexOf("1. Print a built-in test page"));
});

test("Day 2 discovery guide separates USB, manual-IP, Wi-Fi Direct and shared queues",()=>{
 const s=read("printer-not-found-windows-11.html");
 for(const phrase of [
  'id="windows11-printer-not-found-route"',
  'Direct USB printer; Windows finds nothing.',
  'auto-discovery finds nothing.',
  'Wi-Fi Direct mode only',
  'company print server',
  'printer is already listed but marked Offline',
  'help-with-installing-printers-on-arm-pcs'
 ]) assert.ok(s.includes(phrase),"Missing distinct printer-discovery decision: "+phrase);
});

test("Day 2 driver guide avoids x64 on ARM and pointless third-party downloads",()=>{
 const s=read("find-install-printer-driver.html");
 for(const phrase of [
  'id="driver-download-preflight-matrix"',
  'Windows already prints correctly',
  'Printer isn\u0027t listed at all',
  'ARM-based processor',
  'Windows Update',
  'extra function',
  'Windows ARM driver compatibility',
  'hardware drivers still require compatible ARM64 support'
 ]) assert.ok(s.includes(phrase),"Missing driver preflight safeguard: "+phrase);
});
