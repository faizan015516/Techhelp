/* PrinterResolve: source-checked, reader-operated observation worksheet.
   Inputs stay on the current browser page. Nothing is transmitted or persisted.
   Scenarios are diagnostic reasoning, not claims of hands-on printer tests. */
(function(root){
"use strict";
const CONFIG={
 printing:{
  label:"Printer not printing",
  questions:[
   {id:"internal",label:"Can the printer produce its own built-in status/test page?",options:[["unknown","Not checked or not supported"],["yes","Yes — internal page prints"],["no","No — internal page fails or device displays an error"]]},
   {id:"other",label:"Can another authorized device print to the same printer?",options:[["unknown","Not tested"],["yes","Yes — another device prints"],["no","No — it also fails"]]},
   {id:"queue",label:"What does the affected Windows queue show for one simple test?",options:[["unknown","Not observed"],["waiting","Job remains waiting or paused"],["offline","Printer shows Offline"],["complete","Job says completed but no sheet appears"],["error","Error or spooler issue"]]}
  ]
 },
 wifi:{
  label:"Printer Wi-Fi connection",
  questions:[
   {id:"status",label:"What does the printer's own network report indicate?",options:[["unknown","Not available / not checked"],["ssid","Cannot find the intended Wi-Fi name"],["auth","Finds network but cannot authenticate"],["ip","Joined network but has no usable IP address"],["connected","Connected with a usable IP address"]]},
   {id:"windows",label:"What does Windows show?",options:[["unknown","Not checked"],["missing","Printer not discovered"],["offline","Printer installed but Offline"],["works","Print job works from Windows"]]}
  ]
 },
 jam:{
  label:"Paper-jam warning",
  questions:[
   {id:"stage",label:"When does the warning first occur?",options:[["unknown","Not sure"],["before","Before any paper moves"],["feed","After paper begins feeding"],["duplex","Only during two-sided printing"],["adf","Only while scanning/copying through document feeder"],["repeat","Immediately returns after a documented clearing procedure"]]},
   {id:"paper",label:"Is a sheet or fragment clearly visible in a user-accessible area?",options:[["unknown","Not checked safely"],["yes","Yes"],["no","No"]]}
  ]
 },
 clipping:{
  label:"Cut-off text or image",
  questions:[
   {id:"preview",label:"Is the content already cut off in the app's print preview?",options:[["unknown","Not checked"],["yes","Yes — preview shows clipping"],["no","No — preview looks complete"]]},
   {id:"paper",label:"Do the document size, print-dialog paper size and loaded paper agree?",options:[["unknown","Not checked"],["yes","Yes — they match"],["no","No — A4, Letter or another size differs"]]},
   {id:"selftest",label:"Does the printer's own status/test page have the same missing edge?",options:[["unknown","Not checked / unavailable"],["yes","Yes — internal page is also affected"],["no","No — internal page prints normally"]]}
  ]
 },
 epsonwifi:{
  label:"Epson wireless connection",
  questions:[
   {id:"model",label:"Which model family matches the label on the printer?",options:[["unknown","Different / not sure"],["et2800","EcoTank ET-2800 / ET-2803"],["l3250","EcoTank L3250 / L3251"]]},
   {id:"code",label:"What does its network connection report show?",options:[["unknown","Not checked / no report"],["e237","E-2, E-3 or E-7"],["e8","E-8"],["e9","E-9"],["pass","Connected / check passed, Windows still cannot print"]]}
  ]
 }
};
function advice(topic,values){
 const v=values||{};
 let a="Record the observation before changing any setting.";
 if(topic==="printing"){
  if(v.internal==="no")a="Focus on the on-device error, paper path and supplies. A failed printer-generated test is not a Windows driver test; use the exact model manual.";
  else if(v.internal==="yes"&&v.other==="yes")a="The printer can print locally and from another device. Investigate the affected Windows printer entry, selected destination and queue before resetting the network.";
  else if(v.queue==="complete")a="A completed Windows job does not prove the expected physical device printed. Check the printer selected in the application and any old or virtual queue.";
  else if(v.queue==="offline")a="Windows reports Offline. Compare the saved printer connection with its current network/USB state, and follow the dedicated Offline diagnostic.";
  else if(v.queue==="waiting")a="A queue can be paused or blocked behind another document. Record the exact queue state and cancel only your own test job before considering spooler repair.";
  else if(v.queue==="error")a="Record the exact Windows error and the on-device state. Spooler restart or driver changes may be appropriate later, not before identifying the fault.";
  else if(v.internal==="yes")a="A printer-generated page succeeds. Now isolate the Windows/application path with a small text job and, if authorized, another device.";
  else a="Start with the on-device test and note whether Windows is waiting, Offline or reporting a completed job.";
 }else if(topic==="wifi"){
  if(v.status==="ssid")a="The printer cannot find the desired SSID. Check its model-supported band, physical range and SSID availability; changing Windows drivers will not make an unseen network appear.";
  else if(v.status==="auth")a="The printer sees the Wi-Fi but cannot join. Check the exact password and supported router security settings using its model documentation; do not downgrade whole-network security as a shortcut.";
  else if(v.status==="ip")a="Wireless association is not enough. Check the printer's address-assignment/DHCP information and router restrictions before troubleshooting Windows discovery.";
  else if(v.status==="connected"&&v.windows==="missing")a="The printer reports an IP address, but Windows cannot discover it. Compare the PC network, guest/client isolation and the existing printer destination. Address similarity alone does not prove reachability.";
  else if(v.status==="connected"&&v.windows==="offline")a="The printer reports network connectivity while Windows marks an installed entry Offline. Investigate stale destination or queue state using the Offline guide.";
  else if(v.windows==="works")a="Printing currently works from Windows. If a different app or file fails, isolate that app/document instead of resetting Wi-Fi.";
  else a="Separate four milestones: detect SSID, authenticate, receive an address, and accept a Windows print job. A Wi-Fi icon alone cannot confirm all four.";
 }else if(topic==="jam"){
  if(v.stage==="adf")a="This is a document feeder (ADF) event, not automatically a printing-paper jam. Use the specific model's document-feeder instructions; Canon TR4700 distinguishes ADF code 2801 from printing-paper codes 1300/1303/1304.";
  else if(v.stage==="repeat")a="A warning returning immediately after approved clearing steps may require service. Stop repeated resets or probing of hidden mechanisms; preserve the exact code.";
  else if(v.stage==="duplex")a="The timing singles out the return/duplex path or media handling. Check duplex eligibility for the loaded media and the model's approved access route before further jobs.";
  else if(v.stage==="before")a="No movement yet: check the correct tray, paper size/type, tray seating and the displayed support code. Do not assume a damaged sensor.";
  else if(v.stage==="feed")a="The printer started feeding paper. Follow only the manufacturer-approved output/feed inspection path for visible fragments; avoid touching hot or moving internal components.";
  else a="Record whether the problem occurred during feed, duplex or document scanning. The correct safe clearing path depends on that stage.";
  if(v.paper==="yes"&&v.stage!=="repeat")a+=" If paper is visible, remove it only as your model manual instructs, without forcing it.";
  if(v.paper==="no")a+=" No visible paper does not prove a faulty sensor or make internal disassembly safe.";
 }else if(topic==="clipping"){
  if(v.selftest==="yes")a="The printer's own status page is also incomplete. This points away from a single document's margins. Follow the model's hardware/print-quality guidance rather than repeatedly changing app scaling.";
  else if(v.preview==="yes")a="The app preview is already cut off, so first adjust the document size, margins, orientation or scaling before changing printer hardware settings.";
  else if(v.paper==="no")a="A mismatch between A4, US Letter or another size can crop or rescale content. Align document layout, print-dialog choice and loaded stock, then recheck preview.";
  else if(v.preview==="no"&&v.selftest==="no")a="The preview and internal page look correct. Compare one application versus another and check printer-specific printable margins and scaling.";
  else a="Compare preview, document paper, print-dialog paper and the printer's own test before deciding whether the problem is layout or hardware.";
 }else if(topic==="epsonwifi"){
  if(v.code==="e237")a="Epson's report groups E-2/E-3/E-7 around wireless discovery or credential issues, with model-specific wording. Confirm the SSID, signal and password using the report instead of blindly reinstalling a driver.";
  else if(v.code==="e8")a="E-8 relates to an invalid printer IP configuration on Epson's documented report-code lists. Review DHCP versus manual addressing and router settings with the appropriate model instructions.";
  else if(v.code==="e9")a="E-9 directs attention toward the computer/network connection. Confirm the printer's own report and the PC's connection before modifying wireless security.";
  else if(v.code==="pass")a="The printer reports a successful network check. Investigate Windows discovery, saved printer destination and print queue rather than assuming the radio or password failed.";
  else a="Print or view a network connection report using the exact model's manual; note its code and message, then choose the next test.";
  if(v.model==="et2800")a+=" ET-2800/ET-2803: Epson documents Home → Settings → Network Settings → Connection Check; it also has a separate Print Status Sheet menu.";
  else if(v.model==="l3250")a+=" L3250/L3251: Epson documents using the printer's network-status button to print its network connection report; do not apply ET-2800 on-screen menu steps.";
  else a+=" Exact Epson menus and available codes differ across models.";
 }
 return a;
}
function mount(){
 document.querySelectorAll(".pr-diagnostic-workbook[data-diagnostic]").forEach(panel=>{
  if(panel.dataset.mounted)return;
  const topic=panel.dataset.diagnostic,config=CONFIG[topic];if(!config)return;
  panel.dataset.mounted="true";
  const selects=[...panel.querySelectorAll("select[data-observation]")];
  const update=()=>{
   const values={};
   for(const s of selects)values[s.dataset.observation]=s.value;
   const target=panel.querySelector(".pr-diagnostic-advice");
   if(target)target.textContent=advice(topic,values);
  };
  selects.forEach(s=>s.addEventListener("change",update));
  const copy=panel.querySelector(".pr-diagnostic-copy");
  if(copy)copy.addEventListener("click",async()=>{
   const lines=[config.label,"Reader observations (not a device scan):"];
   for(const q of config.questions){
    const s=selects.find(x=>x.dataset.observation===q.id);const label=q.options.find(x=>x[0]===s?.value)?.[1]||"Not checked";
    lines.push(q.label+" "+label);
   }
   lines.push("Suggested next check: "+advice(topic,Object.fromEntries(selects.map(s=>[s.dataset.observation,s.value]))));
   lines.push("Source: PrinterResolve · Independent educational worksheet; no physical testing performed by this page.");
   const note=panel.querySelector(".pr-diagnostic-copy-status");
   try{
    if(!navigator.clipboard?.writeText)throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(lines.join("\n"));
    if(note)note.textContent="Copied your selected observations. Review for private data before sharing.";
   }catch(e){if(note)note.textContent="Clipboard unavailable in this browser. You can select and copy the observations manually.";}
  });
  update();
 });
}
if(typeof module!=="undefined"&&module.exports)module.exports={CONFIG,advice};
if(root&&root.document){
 if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount,{once:true});
 else mount();
}
})(typeof window!=="undefined"?window:null);
