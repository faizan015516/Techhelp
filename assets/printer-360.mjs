/* PrinterResolve interactive 3D printer viewer.
 * One lightweight, procedural WebGL printer per page. No product photo is copied.
 * THREE is requested only when a viewer becomes visible. Static SVG is the fallback.
 */
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const widgets = [...document.querySelectorAll(".pr360[data-printer]")];

const profiles = {
  home:    {name:"PrinterResolve",ink:"#e1e6eb",side:"#a8b4c4",trim:"#1c2633",accent:"#86dce4",width:3.48,height:1.33,depth:2.46,type:"allinone"},
  epson:   {name:"EcoTank style",ink:"#222830",side:"#171c23",trim:"#0e1117",accent:"#54dcd0",width:3.52,height:1.23,depth:2.34,type:"tank"},
  canon:   {name:"PIXMA style",ink:"#d9dde1",side:"#acb4bd",trim:"#121722",accent:"#e25b65",width:3.47,height:1.07,depth:2.47,type:"compact"},
  hp:      {name:"Smart Tank style",ink:"#f0f3f6",side:"#c2cbd5",trim:"#242e3c",accent:"#539be6",width:3.62,height:1.29,depth:2.42,type:"tank"},
  brother: {name:"Laser MFP style",ink:"#e0e4e9",side:"#b6bec8",trim:"#1c242f",accent:"#74b6ee",width:3.46,height:1.82,depth:2.46,type:"laser"},
  dell:    {name:"Laser MFP style",ink:"#303a47",side:"#1d2631",trim:"#151b25",accent:"#7fbcf2",width:3.35,height:1.72,depth:2.42,type:"laser"}
};

let threePromise;
function loadThree(){
  return threePromise || (threePromise=import("https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js"));
}
function setup(element,THREE){
  const type=element.dataset.printer in profiles?element.dataset.printer:"home";
  const p=profiles[type];
  const frame=element.querySelector(".pr360-frame");
  const poster=element.querySelector(".pr360-fallback");
  const status=element.querySelector(".pr360-status");
  const spin=element.querySelector(".pr360-spin");
  const reset=element.querySelector(".pr360-reset");
  if(!frame || !spin || !reset)return;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,0.1,100);
  camera.position.set(0,2.64,7.55);
  camera.lookAt(0,0.17,0);
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power",preserveDrawingBuffer:false});
  }catch(error){throw new Error("WebGL is unavailable");}
  renderer.setClearColor(0,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.55;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.domElement.className="pr360-canvas";
  renderer.domElement.setAttribute("aria-hidden","true");

  const ambient=new THREE.HemisphereLight(0xeaf8ff,0x26303e,2.65);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffffff,3.6);key.position.set(-4,7,7);scene.add(key);
  const rim=new THREE.DirectionalLight(0x9dccf9,2.3);rim.position.set(5,3,-5);scene.add(rim);
  const front=new THREE.DirectionalLight(0xffffff,1.15);front.position.set(0,1,8);scene.add(front);
  const group=new THREE.Group();
  scene.add(group);
  const material=(hex,metalness=.1,roughness=.47)=>new THREE.MeshStandardMaterial({color:hex,metalness,roughness});
  const shell=material(p.ink,.13,.32);
  const sides=material(p.side,.2,.41);
  const trim=material(p.trim,.28,.36);
  const black=material("#0a1119",.28,.25);
  const glass=material("#132d3c",.26,.12);
  const accent=material(p.accent,.45,.26);
  const rubber=material("#131920",.04,.85);
  const paper=material("#f7fbff",.02,.8);
  const silver=material("#8e9dad",.55,.28);
  const W=p.width,H=p.height,D=p.depth;
  const y0=-.42; // bottom of printer
  function box(w,h,d,x,y,z,mat,rot){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);if(rot)mesh.rotation.set(...rot);group.add(mesh);return mesh;
  }
  function cylinder(radius,height,x,y,z,mat,rotateX=0){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,12),mat);
    m.position.set(x,y,z);m.rotation.x=rotateX;group.add(m);return m;
  }
  function rounded(w,h,d,x,y,z,mat,r=.08){
    // Extruded 2D rounded profile; shallow bevel softens photographic silhouettes.
    const rr=Math.min(r,w/4,h/4),a=-w/2,b=-h/2;
    const sh=new THREE.Shape();
    sh.moveTo(a+rr,b);sh.lineTo(a+w-rr,b);sh.quadraticCurveTo(a+w,b,a+w,b+rr);
    sh.lineTo(a+w,b+h-rr);sh.quadraticCurveTo(a+w,b+h,a+w-rr,b+h);
    sh.lineTo(a+rr,b+h);sh.quadraticCurveTo(a,b+h,a,b+h-rr);
    sh.lineTo(a,b+rr);sh.quadraticCurveTo(a,b,a+rr,b);
    const geo=new THREE.ExtrudeGeometry(sh,{depth:d-.04,bevelEnabled:true,bevelSegments:2,steps:1,bevelThickness:.02,bevelSize:.018,curveSegments:3});
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z-d/2+.02);group.add(m);return m;
  }
  function label(text,w,h,bg="#111a27",fg="#eef8ff"){
    const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext("2d");ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);
    ctx.fillStyle=fg;ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.font="700 43px system-ui, sans-serif";ctx.fillText(text,256,67);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({map,transparent:false,side:THREE.DoubleSide});
  }
  function frontLabel(text,w,x,y,z){
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,.24),label(text,w,.24));
    plane.position.set(x,y,z);group.add(plane);
  }
  // Core is a physical closed body: front, back, scanner and sides remain visible at 360 degrees.
  const topY=y0+H;
  rounded(W,H,D,0,y0+H/2,0,sides,.13);
  rounded(W-.12,H-.13,D-.06,0,y0+(H-.13)/2+.06,.03,shell,.09);
  // Base seam, rubber feet, deep rear vent and a real rear access panel.
  box(W-.14,.085,D-.08,0,y0+.11,0,trim);
  for(const x of [-W*.35,W*.35])for(const z of [-D*.36,D*.36]) box(.34,.12,.36,x,y0-.05,z,rubber);
  rounded(W*.64,.39,.036,0,y0+H*.45,-D/2-.015,trim,.035);
  for(let i=0;i<9;i++)box(W*.51,.013,.04,0,y0+H*.33+i*.025,-D/2-.061,silver);
  // Side side-service panel and decorative vents (not just a flat front-facing mock-up).
  box(.025,.43,D*.46,W/2+.026,y0+H*.48,0,trim);
  for(let i=0;i<7;i++)box(.018,.014,D*.35,W/2+.041,y0+H*.32+i*.048,-.03,silver);
  // Flatbed scanner lid; thick-ish dark glass inset framed in model shell.
  rounded(W*.98,.20,D*.91,0,topY+.02,-.02,trim,.095);
  rounded(W*.9,.055,D*.81,0,topY+.135,-.08,sides,.06);
  rounded(W*.75,.015,D*.6,-.03,topY+.176,-.13,glass,.055);
  box(W*.25,.035,.10,0,topY+.2,-D*.44,silver);
  // Front face, output mouth, and paper tray.
  rounded(W*.92,.30,.06,0,y0+H*.38,D/2+.035,trim,.06);
  box(W*.69,.045,.075,0,y0+H*.42,D/2+.085,black);
  box(W*.66,.017,.056,0,y0+H*.39,D/2+.13,silver);
  rounded(W*.73,.13,.42,0,y0+H*.23,D/2+.20,trim,.045);
  box(W*.61,.011,.29,0,y0+H*.3,D/2+.36,black);
  // Paper sheet partly emerged with printed content; readable at close viewing angles.
  box(W*.49,.016,.58,0,y0+H*.315,D/2+.30,paper,[.075,0,0]);
  for(let i=0;i<4;i++)box(W*(i===0?.31:.40),.002,.012,-.08,y0+H*.325,D/2+.35+i*.09,material(i===0?"#3c698b":"#b4c9da"));
  // Front control cluster and small luminous screen.
  rounded(W*.32,.20,.08,-W*.29,topY-.31,D/2+.07,black,.035);
  rounded(W*.24,.14,.025,-W*.29,topY-.31,D/2+.126,glass,.019);
  box(W*.14,.015,.014,-W*.30,topY-.285,D/2+.143,accent);
  cylinder(.044,.012,W*.06,topY-.30,D/2+.14,accent,Math.PI/2);
  cylinder(.028,.012,W*.14,topY-.30,D/2+.14,silver,Math.PI/2);
  // Scanner seam, top rear paper-feed hint, and brand-style label NOT manufacturer's official logo.
  // Nominative brand identifiers on ORIGINAL concept geometry, not logo art or exact model replicas.
  const textByType={home:"P/R STUDIO",epson:"EPSON CONCEPT",canon:"CANON CONCEPT",hp:"HP CONCEPT",brother:"BROTHER CONCEPT",dell:"DELL CONCEPT"};
  frontLabel(textByType[type]||"PRINTER CONCEPT",W*.44,W*.19,topY-.3,D/2+.085);
  // More category-defining details.
  if(p.type==="tank"){
    rounded(.54,.84,.23,W*.35,y0+.55,D/2+.19,black,.035);
    for(let i=0;i<4;i++){
      const cols=["#39adc5","#d65b8f","#e1c24a","#3a4653"];
      const m=material(cols[i],.13,.3);
      box(.085,.40,.025,W*.35-.18+i*.12,y0+.5,D/2+.328,m);
      box(.09,.07,.032,W*.35-.18+i*.12,y0+.23,D/2+.331,silver);
    }
  }
  if(p.type==="laser"){
    rounded(W*.83,.37,.1,0,y0+.18,D/2+.105,sides,.04);
    box(W*.72,.018,.03,0,y0+.31,D/2+.164,silver);
    rounded(.70,.30,.08,-W*.26,topY-.24,D/2+.15,glass,.02);
    for(let i=0;i<4;i++)box(.042,.035,.05,-W*.40+i*.11,topY-.30,D/2+.20,accent);
    // taller top document feeder creates a distinct office laser silhouette
    rounded(W*.75,.21,D*.58,0,topY+.34,-.22,sides,.05);
    box(W*.69,.07,.28,0,topY+.46,-D*.32,trim);
  }
  if(p.type==="compact"){
    box(W*.86,.028,.042,0,topY-.09,D/2+.10,accent);
    rounded(W*.52,.08,.18,0,y0+.15,D/2+.25,sides,.04);
  }
  if(type==="home"){
    // Premium consumer all-in-one: subtle document feeder and metallic edge.
    box(W*.79,.028,.10,0,topY+.22,-.10,accent);
    rounded(W*.65,.08,D*.25,0,topY+.25,-D*.32,sides,.06);
  }
  // Floating shadow on a studio plinth (looks physical from all viewing angles).
  const base=new THREE.Mesh(new THREE.CircleGeometry(2.55,48),new THREE.MeshBasicMaterial({color:0x001425,transparent:true,opacity:.18,depthWrite:false}));
  base.rotation.x=-Math.PI/2;base.position.y=y0-.145;scene.add(base);

  group.rotation.y=-.52;
  let yaw=-.52,tilt=0;
  let auto=!reduced.matches,dragging=false,moved=false,px=0,py=0,last=0;
  let visible=true,raf=0,disposed=false;
  function resize(){
    const w=Math.max(260,Math.round(frame.clientWidth)),h=Math.max(190,Math.round(frame.clientHeight));
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    const mobile=w<400;
    camera.position.set(0,mobile?2.55:2.64,mobile?8.7:7.55);camera.lookAt(0,.2,0);
    render();
  }
  function render(){group.rotation.y=yaw;group.rotation.x=tilt;renderer.render(scene,camera);}
  function tick(t){
    raf=0;if(disposed||!visible||document.hidden)return;
    if(auto&&!dragging){const delta=Math.min(50,t-(last||t));yaw+=delta*.00019;render();}
    last=t;
    if(auto)raf=requestAnimationFrame(tick);
  }
  function schedule(){if(!raf&&auto&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;}
  function updateButton(){spin.textContent=auto?"Pause rotation":"Auto rotate";spin.setAttribute("aria-pressed",String(auto));}
  updateButton();
  function pointerDown(e){
    if(e.pointerType==="mouse"&&e.button!==0)return;
    dragging=true;moved=false;px=e.clientX;py=e.clientY;frame.setPointerCapture(e.pointerId);stop();frame.classList.add("is-dragging");
  }
  function pointerMove(e){
    if(!dragging)return;
    const dx=e.clientX-px,dy=e.clientY-py;px=e.clientX;py=e.clientY;
    if(Math.abs(dx)+Math.abs(dy)>1)moved=true;
    yaw+=dx*.011;tilt=Math.max(-.26,Math.min(.28,tilt+dy*.004));render();
  }
  function pointerUp(e){dragging=false;frame.classList.remove("is-dragging");if(frame.hasPointerCapture(e.pointerId))frame.releasePointerCapture(e.pointerId);schedule();}
  frame.addEventListener("pointerdown",pointerDown);
  frame.addEventListener("pointermove",pointerMove);
  frame.addEventListener("pointerup",pointerUp);
  frame.addEventListener("pointercancel",pointerUp);
  frame.addEventListener("keydown",e=>{
    if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
    e.preventDefault();yaw+=(e.key==="ArrowLeft"?-.18:.18);render();
  });
  spin.addEventListener("click",()=>{auto=!auto;updateButton();if(auto)schedule();else stop();});
  reset.addEventListener("click",()=>{yaw=-.52;tilt=0;render();});
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(frame);
  const viewObserver=new IntersectionObserver(entries=>{
    visible=entries.some(x=>x.isIntersecting);if(visible){render();schedule();}else stop();
  },{threshold:0.02});viewObserver.observe(frame);
  document.addEventListener("visibilitychange",()=>document.hidden?stop():schedule());
  window.addEventListener("pagehide",()=>{stop();disposed=true;resizeObserver.disconnect();viewObserver.disconnect();renderer.dispose();});
  frame.prepend(renderer.domElement);
  resize();
  if(poster)poster.hidden=true;
  if(status)status.textContent="Drag to rotate 360°. Use arrow keys for finer control.";
  element.classList.add("pr360-ready");
  schedule();
}
if(widgets.length){
  const loader=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      loader.unobserve(entry.target);
      const w=entry.target;
      const status=w.querySelector(".pr360-status");
      if(status)status.textContent="Preparing interactive 3D printer…";
      loadThree().then(THREE=>setup(w,THREE)).catch(error=>{
        w.classList.add("pr360-fallback-only");
        if(status)status.textContent="3D unavailable here. Static printer illustration displayed.";
        const spin=w.querySelector(".pr360-spin"),reset=w.querySelector(".pr360-reset");
        if(spin)spin.disabled=true;if(reset)reset.disabled=true;
        console.warn("PrinterResolve 3D viewer fallback:",error.message);
      });
    }
  },{rootMargin:"220px 0px",threshold:0});
  widgets.forEach(w=>loader.observe(w));
}
