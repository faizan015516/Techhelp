/* PrinterResolve — controlled test comparison
 * Educational evidence worksheet. All inputs remain in this page memory.
 * No network calls, cookies, persistence or automatic uploads.
 */
(function(global, factory) {
  "use strict";
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(global&&global.document){
    if(global.document.readyState==="loading"){
      global.document.addEventListener("DOMContentLoaded",()=>api.mount(global.document));
    } else api.mount(global.document);
  }
})(typeof window!=="undefined"?window:null,function(){
"use strict";
const tests={
  plain:"Same one-line Windows document",
  pdf:"Same PDF from the same application",
  internal:"Same printer-generated status/nozzle test",
  network:"Same one-page network print from this PC",
  other:"Another repeatable one-page print"
};
const outcomes={
  unknown:"Not tested / not recorded",
  printed:"Expected content printed",
  blank:"Blank or incomplete output",
  waiting:"Remained queued / did not print",
  error:"Printer or Windows displayed an error"
};
const actions={
  none:"No deliberate change: repeated the same test",
  destination:"Selected the verified physical printer",
  cable:"Checked or reseated one permitted cable",
  queue:"Changed a pause/offline setting for own queue",
  settings:"Changed one print-dialog setting",
  viewer:"Reopened the file with a trusted application",
  official:"Applied one authorized official driver step",
  other:"Made another single documented change"
};
function analyze(input){
 const a=input||{};
 const before=outcomes[a.before]?a.before:"unknown";
 const after=outcomes[a.after]?a.after:"unknown";
 const checks=!!a.samePrinter&&!!a.sameInput&&!!a.sameConnection&&!!a.oneChange;
 if(before==="unknown"||after==="unknown"){
  return {kind:"incomplete",controlled:false,title:"Record both outcomes first",
   why:"Without two observed outcomes, there is no before-and-after comparison. Leave untested items untested rather than guessing.",
   next:"Perform only a safe test supported by your printer manual, then record what actually happened."};
 }
 if(!checks){
  return {kind:"not-comparable",controlled:false,title:"Two observations, but the comparison is not controlled",
   why:"One or more conditions changed or were not confirmed. A different document, device, printer, connection, or several simultaneous changes could explain the result.",
   next:"If safe, repeat with the same printer, same input and same connection, changing no more than one known factor."};
 }
 if(before!=="printed"&&after==="printed"&&a.action==="none"){
  return {kind:"intermittent",controlled:true,title:"Printing recovered without a deliberate change",
   why:"The second attempt worked while the first did not. This is an observed change, but it might reflect an intermittent or temporary condition.",
   next:"Repeat at another time if safe and record recurrence; do not declare the problem permanently repaired."};
 }
 if(before!=="printed"&&after==="printed"){
  return {kind:"recovered",controlled:true,title:"Improvement observed after one change",
   why:"The chosen test did not succeed before and produced the expected page afterward, with the listed controls held constant. That is useful observational evidence, not proof of causation or a durable repair.",
   next:"Verify a second ordinary print job if safe; keep the specific change and original symptom in your record."};
 }
 if(before==="printed"&&after!=="printed"){
  return {kind:"regression",controlled:true,title:"A new printing problem appeared",
   why:"The selected test worked before but failed after the change. Timing makes the change worth reviewing, but does not conclusively establish it as the cause.",
   next:"Stop making additional changes; review the one change with the equipment owner or administrator before reversing anything."};
 }
 if(before==="printed"&&after==="printed"){
  return {kind:"stable",controlled:true,title:"Both controlled tests printed successfully",
   why:"No failure was reproduced during these two tests. That does not prove the original problem cannot recur.",
   next:"Do not perform additional repairs only to improve a successful result; note whether the original symptom returns."};
 }
 if(before===after){
  return {kind:"unresolved",controlled:true,title:"No improvement observed",
   why:"The same unsuccessful outcome occurred on both attempts. The chosen change did not produce a successful page under these conditions.",
   next:"Review the most relevant printer, connection or queue guide before trying any further change."};
 }
 return {kind:"changed",controlled:true,title:"The symptom changed but printing is still unsuccessful",
  why:"The second attempt failed differently. This is a useful distinction, but not evidence that the printer is fixed.",
  next:"Record the exact new error and consult the model's official documentation; do not stack multiple unverified fixes."};
}
function clean(s){return String(s||"").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim().slice(0,80)}
function formatRecord(input,result){
 const a=input||{},r=result||analyze(a);
 const chosen=(o,k)=>o[k]||"Not recorded";
 return [
 "Printer Resolve — my controlled print comparison",
 "This is my own report; it was not tested or verified by Printer Resolve.",
 "Model / family (optional): "+(clean(a.model)||"Not provided"),
 "Test: "+chosen(tests,a.test),
 "Before: "+chosen(outcomes,a.before),
 "One change: "+chosen(actions,a.action),
 "After: "+chosen(outcomes,a.after),
 "Same physical printer: "+(a.samePrinter?"Yes":"No / uncertain"),
 "Same test input: "+(a.sameInput?"Yes":"No / uncertain"),
 "Same connection and device: "+(a.sameConnection?"Yes":"No / uncertain"),
 "No more than one change: "+(a.oneChange?"Yes":"No / uncertain"),
 "Assessment: "+r.title,
 "Interpretation: "+r.why,
 "Next step: "+r.next,
 "",
 "Safety: Do not include printer serial numbers, passwords, IP addresses, document names or private workplace information.",
 "No causality, device access, official certification or permanent repair is claimed."
 ].join("\n");
}
function mount(doc){
 const form=doc.getElementById("pr-controlled-form");
 if(!form||form.dataset.ready==="yes")return;
 form.dataset.ready="yes";
 const get=id=>doc.getElementById(id);
 const status=get("pr-controlled-status"),out=get("pr-controlled-output");
 form.addEventListener("submit",e=>{
  e.preventDefault();
  const a={
    model:get("pr-controlled-model").value,
    test:get("pr-controlled-test").value,
    before:get("pr-controlled-before").value,
    after:get("pr-controlled-after").value,
    action:get("pr-controlled-action").value,
    samePrinter:get("pr-controlled-same-printer").checked,
    sameInput:get("pr-controlled-same-input").checked,
    sameConnection:get("pr-controlled-same-connection").checked,
    oneChange:get("pr-controlled-one-change").checked
  };
  const result=analyze(a);
  get("pr-controlled-title").textContent=result.title;
  get("pr-controlled-why").textContent=result.why;
  get("pr-controlled-next").textContent=result.next;
  out.value=formatRecord(a,result);
  get("pr-controlled-result").hidden=false;
  status.textContent="Record prepared locally. Review it before copying; nothing was uploaded.";
 });
 const copy=get("pr-controlled-copy");
 copy.addEventListener("click",async()=>{
  if(!out.value){status.textContent="Generate the comparison first.";return;}
  try{
   if(!navigator.clipboard||!navigator.clipboard.writeText)throw Error("Clipboard unavailable");
   await navigator.clipboard.writeText(out.value);
   status.textContent="Copied to clipboard. Share only after checking for private information.";
  }catch(e){
   out.focus();out.select();
   status.textContent="Automatic copy unavailable. Select and copy the visible text manually.";
  }
 });
}
return {analyze,formatRecord,mount,tests,outcomes,actions};
});