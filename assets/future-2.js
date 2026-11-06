/* PrinterResolve Future 2.0: accessible sticky outline and subtle 3D depth.
   No tracking, user data collection, third-party animation or required network calls. */
(()=>{
"use strict";
const reduce=window.matchMedia("(prefers-reduced-motion: reduce)");
const fine=window.matchMedia("(hover: hover) and (pointer: fine)");
const hero=document.querySelector(".nx-hero");
const art=hero?.querySelector(".nx-scene");
if(hero&&art&&fine.matches&&!reduce.matches){
 let frame=0;
 hero.addEventListener("pointermove",e=>{
   if(frame)return;
   frame=requestAnimationFrame(()=>{
     frame=0;
     const b=hero.getBoundingClientRect();
     const x=(e.clientX-b.left)/b.width-.5;
     const y=(e.clientY-b.top)/b.height-.5;
     const degX=Math.max(-6,Math.min(6,y*8));
     const degY=Math.max(-9,Math.min(9,x*-14));
     art.style.transform="translate3d(0,-4px,0) rotateX("+degX+"deg) rotateY("+degY+"deg)";
   });
 },{passive:true});
 hero.addEventListener("pointerleave",()=>{art.style.removeProperty("transform")},{passive:true});
}
if(!document.body.classList.contains("nx-document"))return;
const progress=document.querySelector(".nx-progress");
const updateProgress=()=>{
  if(!progress)return;
  const scrollMax=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  progress.style.transform="scaleX("+Math.min(1,Math.max(0,scrollY/scrollMax))+")";
};
window.addEventListener("scroll",updateProgress,{passive:true});updateProgress();
const nav=document.querySelector(".nx-outline");
const main=document.querySelector("main");
if(!nav||!main)return;
const sections=[...main.querySelectorAll("h2")].filter(h=>!h.closest(".pr-field-guide")&&!h.closest(".pr-evidence")&&!h.closest(".pr-notes")&&!h.closest(".nx-inline-visual"));
const seen=new Set([...document.querySelectorAll("[id]")].map(el=>el.id));
const links=[];
sections.slice(0,15).forEach((h,i)=>{
  if(!h.id){let value="nx-topic-"+(i+1);while(seen.has(value))value+="-x";h.id=value;seen.add(value)}
  const link=document.createElement("a");link.href="#"+encodeURIComponent(h.id);link.textContent=(h.textContent||"Section").trim().replace(/\s+/g," ").slice(0,75);nav.appendChild(link);links.push({h,link});
});
if(links.length===0){nav.textContent="Use the guide to follow safe, step-by-step troubleshooting.";return}
if("IntersectionObserver" in window){
  const observer=new IntersectionObserver(entries=>{
    const active=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
    if(!active.length)return;
    const activeId=active[0].target.id;
    for(const {h,link} of links){if(h.id===activeId)link.setAttribute("aria-current","location");else link.removeAttribute("aria-current")}
  },{rootMargin:"-19% 0px -64% 0px",threshold:0});
  links.forEach(({h})=>observer.observe(h));
}
})();
/* PrinterResolve shared search and brand picker loader */
(()=>{
 if(document.querySelector('script[data-pr-discovery]'))return;
 const style=document.createElement("link");style.rel="stylesheet";style.href="/assets/site-discovery.css?v=20261106-search-1";document.head.appendChild(style);
 const script=document.createElement("script");script.src="/assets/site-discovery.js?v=20261106-search-2";script.defer=true;script.dataset.prDiscovery="1";document.head.appendChild(script);
})();
