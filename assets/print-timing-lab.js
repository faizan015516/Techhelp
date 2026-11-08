"use strict";
(function(){
  function diagnose(firstSeconds,totalSeconds,pageCount){
    const first=Number(firstSeconds),total=Number(totalSeconds),pages=Number(pageCount);
    if(!Number.isFinite(first)||!Number.isFinite(total)||!Number.isInteger(pages)||first<=0||total<=0||pages<2||pages>100||total<=first){
      return {ok:false,error:"Enter measured positive times: final-page completion must be later than first-page completion, with 2–100 pages."};
    }
    const later=(total-first)/(pages-1);
    const ratio=first/later;
    let pattern,meaning,check;
    if(ratio>=2){
      pattern="Long first-page delay";
      meaning="The wait until the first page is disproportionately long compared with the average interval between later pages.";
      check="Compare a plain-text document with the slow file, inspect the queue before the first sheet, and check connection or app processing. This is a clue—not proof of a faulty network.";
    }else if(ratio<=0.5){
      pattern="Later pages dominate the delay";
      meaning="The average interval between later pages is much greater than the initial wait for page one.";
      check="Check whether the job uses duplexing, high-quality/photo modes, specialty media or pauses for paper handling. Repeat once with consistent settings.";
    }else{
      pattern="No strong first-versus-later imbalance";
      meaning="Both stages take time, but the measurements do not isolate a clear single bottleneck.";
      check="Compare text versus photo/PDF using the same paper and quality options; also note if the printer pauses or displays an error.";
    }
    return {ok:true,first,total,pages,later,ratio,pattern,meaning,check};
  }
  if(typeof module!=="undefined"&&module.exports)module.exports={diagnose};
  if(typeof document==="undefined")return;
  const form=document.getElementById("prt-timing-form");
  if(!form)return;
  const result=document.getElementById("prt-timing-result");
  const headline=document.getElementById("prt-timing-headline");
  const detail=document.getElementById("prt-timing-detail");
  const next=document.getElementById("prt-timing-next");
  form.addEventListener("submit",function(event){
    event.preventDefault();
    const first=document.getElementById("prt-first").value;
    const total=document.getElementById("prt-total").value;
    const count=document.getElementById("prt-pages").value;
    const output=diagnose(first,total,count);
    result.hidden=false;
    if(!output.ok){
      headline.textContent="Check the measurements";
      detail.textContent=output.error;
      next.textContent="Record the time from pressing Print until the first page emerges, then the total time until the final page finishes.";
      return;
    }
    headline.textContent=output.pattern;
    detail.textContent="First page: "+output.first.toFixed(1)+" s; average between later pages: "+output.later.toFixed(1)+" s; total for "+output.pages+" pages: "+output.total.toFixed(1)+" s. "+output.meaning;
    next.textContent="Next controlled check: "+output.check+" This calculator interprets numbers you enter. It cannot measure your printer, confirm a hardware fault or provide a universal pages-per-minute rating.";
  });
})();
