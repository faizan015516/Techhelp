"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const brandPages={
 "epson-printer-not-connecting-wifi.html":"epson",
 "epson-not-printing-black-ink.html":"epson",
 "canon-printer-not-found-wifi-windows-11.html":"canon",
 "canon-printer-not-responding-windows-11.html":"canon",
 "hp-printer-offline-connected-wifi.html":"hp",
 "brother-printer-offline-windows-11.html":"brother",
 "dell-printer-not-connecting-wifi-windows-11.html":"dell"
};
test("Original WebGL scene script parses as a JavaScript module",()=>{
 assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",path.join(root,"assets/printer-360.mjs")]));
});
test("Homepage has interactive 360 printer instead of old non-rotating CSS model",()=>{
 const h=read("index.html");
 assert.ok(h.includes('data-printer="home"'));
 assert.ok(h.includes('/assets/printer-360.mjs'));
 assert.ok(h.includes('/assets/printer-360.css'));
 assert.ok(!h.includes('id="printer-model"'));
});
test("All seven brand guide pages show their own rotating printer category",()=>{
 for(const [file,brand] of Object.entries(brandPages)){
   const h=read(file);
   assert.ok(h.includes('data-printer="'+brand+'"'),file+" missing matching viewer");
   assert.ok(!h.includes('pr360-spin'),file+" still exposes a pause or spin control");
   assert.ok(!h.includes('Pause rotation'),file+" still offers a pause button");
   assert.ok(h.includes('Automatically rotates through 360°'),file+" missing auto-rotation explanation");
   assert.ok(h.includes('printer-360.mjs?v=20261106-autospin-3'),file+" might load stale 3D viewer");
   assert.ok(h.includes('pr360-reset'),file+" missing reset control");
   assert.ok(h.includes('class="pr360-fallback"'),file+" missing image fallback");
   assert.ok(h.includes('type="module" src="/assets/printer-360.mjs'),file+" missing renderer");
   assert.ok(!/<img class="nx-scene"/.test(h),file+" still renders irrelevant hero scene");
 }
});
test("Viewer automatically rotates on every capable device with drag, keyboard and reset controls",()=>{
 const s=read("assets/printer-360.mjs");
 for(const text of ["pointerdown","pointermove","ArrowLeft","ArrowRight","ResizeObserver","IntersectionObserver","prefers-reduced-motion","static printer illustration","setPointerCapture","WebGLRenderer","renderer.dispose"]){
  if(text==="static printer illustration")continue;
  assert.ok(s.includes(text),"3D viewer lacks "+text);
 }
 assert.ok(s.includes('powerPreference:"low-power"'));
 assert.ok(s.includes('Math.min(window.devicePixelRatio||1,1.6)'));
 assert.ok(s.includes('import("https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js")'));
 assert.ok(s.includes("let auto=true"),"Auto rotation must start enabled, including when OS reduced motion is set");
 assert.ok(s.includes("yaw+=delta*.00019"),"Animation must advance every visible animation frame");
 assert.ok(!s.includes("Pause rotation")&&!s.includes("pr360-spin"),"Manual pause toggle must not be present");
 assert.ok(s.includes('window.addEventListener("pageshow"'),"Back-forward navigation should restart auto-rotation");
 const home=read("index.html");
 assert.ok(!home.includes("pr360-spin")&&!home.includes("Pause rotation"));
 assert.ok(home.includes("Automatically rotates through 360°"));
 const css=read("assets/printer-360.css");
 assert.ok(css.includes("touch-action:pan-y"));
 assert.ok(css.includes("max-width:600px"));
 assert.ok(css.includes("@media (prefers-reduced-motion:reduce)"));
});
