(() => {
"use strict";
const fields=[["model","Printer model"],["connection","Connection type"],["symptom","Exact symptom / message"],["test","Test performed"],["result","What happened"]];
function getText(panel){const h=document.querySelector("h1");const lines=["Printer Resolve — troubleshooting record","Guide: "+(h?h.textContent.trim():document.title),"URL: "+location.href,""];for(const [id,label] of fields){const el=panel.querySelector('[data-pr-field="'+id+'"]');if(el&&el.value.trim())lines.push(label+": "+el.value.trim());}lines.push("","These are notes from my own observations. No passwords or identifying details included.");return lines.join("\n");}
document.querySelectorAll(".pr-notes").forEach((panel)=>{
 const btn=panel.querySelector("[data-pr-generate]"),out=panel.querySelector("[data-pr-output]"),copy=panel.querySelector("[data-pr-copy]"),status=panel.querySelector("[data-pr-status]");
 if(!btn||!out||!copy||!status)return;
 btn.addEventListener("click",()=>{out.value=getText(panel);out.hidden=false;copy.hidden=false;status.textContent="Your note is ready. Review it and remove any private details before copying."});
 copy.addEventListener("click",async()=>{if(!out.value)return;try{if(!navigator.clipboard||!navigator.clipboard.writeText)throw Error("Clipboard API unavailable");await navigator.clipboard.writeText(out.value);status.textContent="Copied. Keep the note private unless you choose to share it.";}catch(e){out.focus();out.select();status.textContent="Select the text above and copy it manually. Your notes stay in this browser.";}})
});
})();
