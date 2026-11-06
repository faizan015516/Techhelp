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
