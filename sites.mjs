/* ============================================================
   CHAPTER 1 — EXPEDITION, CAVE AND GATE
   Part 1: shared data, exploration sites, THE GATE site
   ============================================================ */
ORDER.push("EXPEDITION","SIGNAL","CAVE_ENTRY","CAVE","CRYSTALS","SURFACE","GATE","GATE_EVENT","END");
Object.assign(OBJ,{
 EXPEDITION:"FIRST EXPEDITION",SIGNAL:"FOLLOW THE UNKNOWN SIGNAL",CAVE_ENTRY:"ENTER THE CAVE",
 CAVE:"FOLLOW THE UNKNOWN SIGNAL",CRYSTALS:"COLLECT THE CRYSTALS",SURFACE:"RETURN TO THE SURFACE",
 GATE:"INVESTIGATE THE GATE",GATE_EVENT:"INVESTIGATE THE GATE",END:"..."
});
Object.assign(HEMTON_HINT,{
 EXPEDITION:["Use NEUTRON to survey the region, Hemadri.","Look for resources and anomalies."],
 SIGNAL:["Follow the transmission. Stay alert."],
 CAVE_ENTRY:["The passage is stable enough to enter."],
 CAVE:["I cannot scan through the rock. Be careful."],
 CRYSTALS:["Collect the crystals, Hemadri."],
 SURFACE:["Return to the surface."],
 GATE:["Follow the signal to the gate."],
 GATE_EVENT:["Hemadri..."],
 END:["..."]
});
Object.assign(NOVA_HINT,{
 EXPEDITION:["NEUTRON synchronized.","Use SCAN near anything interesting."],
 SIGNAL:["The signal is getting stronger."],
 CAVE_ENTRY:["There's something below us."],
 CAVE:["Stay close, Hemadri."],
 CRYSTALS:["..."],
 SURFACE:["..."],
 GATE:["You came back."],
 GATE_EVENT:["..."],
 END:["..."]
});
Object.assign(SPK_COLOR,{HEMADRI:"#ffd9a8",NEUTRON:"#6fe0ff"});

const scanBtn=document.getElementById("scanBtn");
const scanPanel=document.getElementById("scanPanel");
const scanFx=document.getElementById("scanFx");
const bannerEl=document.getElementById("banner");
const tagsEl=document.getElementById("tags");
const fadeEl=document.getElementById("fade");
const flashEl=document.getElementById("flash");
const syncEl=document.getElementById("sync");
const syncVal=document.getElementById("syncVal");
const syncFill=document.querySelector("#sync i");
const cutEl=document.getElementById("cut");

const SCAN_RANGE=30;
const PICK_LABEL={metal:"METAL DEPOSIT",energy:"ENERGY SIGNATURE",parts:"COMPONENTS"};
const scannables=[],harvests=[];
const siteFX={crystalMat:null,haloMat:null,haloMat2:null,blinkMats:[],sparks:[]};
const STRUCT=new THREE.Vector3(SITES.struct.x,0,SITES.struct.z);   // centre of the gate site
const caveMouth={x:0,z:0},caveSite={rot:0};
const gate={G:null,portal:null,mat:null,beams:[],dust:null,dustPa:null,rot:0,novaPt:{x:0,z:0},ux:0,uz:0};
let glyphMat=null,ringMat=null,glyphLevel=.12;
let scannerUnlocked=false,signalFound=false,signalPending=false,caveArrived=false,gateKnown=false;
let gateStage=0,gateActive=false,neutronPct=23;
let poiScanned=0;
let scanCool=0,scanT=-1,scanPending=null,scanPanelTimer=null,scanFxMeshes=null;
const scanTags=[];
let camShake=0,actKind=null,actData=null,inputLocked=false;
let novaScript=null,novaExcite=0,novaStuck=0,novaDetour=0,novaSide=1,novaStuckCount=0,novaAlt=false,novaFlicker=0;
const barkFlags={};
let barkCool=0;
let actx=null,scannerScreen=null;
let markerMesh=null,markerData=[];
const _mDummy=new THREE.Object3D(),_mUp=new THREE.Vector3(0,1,0);

/* ---------- tiny audio helpers (WebAudio, no files) ---------- */
function initAudio(){
 try{
   if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();
   if(actx.state==="suspended")actx.resume();
 }catch(e){actx=null}
}
function blip(f=880,d=.1,vol=.1){
 if(!actx)return;
 try{
   const o=actx.createOscillator(),g=actx.createGain(),t=actx.currentTime;
   o.type="sine";o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.8,t+d);
   g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
   o.connect(g);g.connect(actx.destination);o.start();o.stop(t+d+.02);
 }catch(e){}
}
function hum(dur,freq=40,vol=.25){
 if(!actx)return;
 try{
   const t=actx.currentTime,g=actx.createGain();
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+dur*.5);g.gain.linearRampToValueAtTime(0,t+dur);
   g.connect(actx.destination);
   for(const [type,f] of [["sine",freq],["triangle",freq*1.5]]){
     const o=actx.createOscillator();o.type=type;o.frequency.value=f;o.connect(g);o.start();o.stop(t+dur+.1);
   }
 }catch(e){}
}
function vibrate(p){try{if(navigator.vibrate)navigator.vibrate(p)}catch(e){}}

/* ---------- textures for the ancient builders ---------- */
function makeGlyphTexture(){
 const [c,g]=mkCanvas(256,256);
 g.strokeStyle="#fff";g.lineWidth=3;g.lineCap="round";
 for(let cy=0;cy<6;cy++)for(let cx=0;cx<4;cx++){
   const x0=cx*64+10,y0=cy*42+6,n=2+Math.floor(rand()*3);
   g.beginPath();
   for(let k=0;k<n;k++){
     const a=rand();
     if(a<.35){g.moveTo(x0+rand()*40,y0+rand()*28);g.lineTo(x0+rand()*40,y0+rand()*28)}
     else if(a<.65){g.moveTo(x0+24+rand()*8,y0+14);g.arc(x0+20,y0+14,4+rand()*8,0,6.3)}
     else{g.moveTo(x0+rand()*40,y0);g.lineTo(x0+rand()*40,y0+30);g.lineTo(x0+rand()*40,y0+rand()*30)}
   }
   g.stroke();
 }
 g.lineWidth=4;g.strokeRect(3,3,250,250);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function makeAncientTexture(){
 const [c,g]=mkCanvas(256,256);
 g.fillStyle="#3a3441";g.fillRect(0,0,256,256);
 for(let i=0;i<40;i++){g.fillStyle=(i%2?"rgba(255,240,255,":"rgba(0,0,0,")+(.03+rand()*.07)+")";g.fillRect(0,rand()*256,256,2+rand()*10)}
 for(let i=0;i<9;i++){
   g.strokeStyle="rgba(0,0,0,.45)";g.lineWidth=1+rand()*1.5;g.beginPath();
   let x=rand()*256,y=rand()*256;g.moveTo(x,y);
   for(let k=0;k<6;k++){x+=(rand()-.5)*50;y+=rand()*38;g.lineTo(x,y)}
   g.stroke();
 }
 for(let i=0;i<500;i++){g.fillStyle=rand()<.5?"rgba(255,255,255,.05)":"rgba(0,0,0,.1)";g.fillRect(rand()*256,rand()*256,2,2)}
 return canvasTex(c);
}
function rockGeoPlain(size){const g=rockGeo(size);g.deleteAttribute("color");return g}
function applyGlyph(lv){
 glyphMat.color.setRGB(.61*lv,.4*lv,1*lv);
 ringMat.color.setRGB(.43*lv,.88*lv,1*lv);
}

/* ---------- direction markers (small holographic chevrons) ---------- */
function setMarkerPath(ax,az,bx,bz,spacing){
 const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
 const n=Math.min(28,Math.floor(len/spacing));
 const dir=new THREE.Vector3(dx/len,0,dz/len),q=new THREE.Quaternion().setFromUnitVectors(_mUp,dir);
 markerData=[];
 for(let i=1;i<=n;i++){
   const x=ax+dx*i/(n+1),z=az+dz*i/(n+1);
   markerData.push({x,z,y:terrainHeight(x,z)+.9,q});
 }
 markerMesh.count=markerData.length;
 markerMesh.visible=markerData.length>0;
}
function hideMarkers(){markerData=[];if(markerMesh){markerMesh.count=0;markerMesh.visible=false}}
function updateMarkers(t){
 if(!markerMesh||!markerData.length||inCave)return;
 for(let i=0;i<markerData.length;i++){
   const m=markerData[i],s=.75+.45*Math.max(0,Math.sin(t*3-i*.8));
   _mDummy.position.set(m.x,m.y+Math.sin(t*2+i)*.06,m.z);
   _mDummy.quaternion.copy(m.q);_mDummy.scale.set(s,s*1.2,s*.35);_mDummy.updateMatrix();
   markerMesh.setMatrixAt(i,_mDummy.matrix);
 }
 markerMesh.instanceMatrix.needsUpdate=true;
}

/* ---------- build every exploration site ---------- */
function createSites(){
 TEX.glyph=makeGlyphTexture();
 TEX.ancient=makeAncientTexture();
 glyphMat=new THREE.MeshBasicMaterial({map:TEX.glyph,color:0x9c65ff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 ringMat=new THREE.MeshBasicMaterial({color:0x6fe0ff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 applyGlyph(glyphLevel);

 const addSolid=(x,z,r)=>solids.push({x,z,r});
 const toWorld=(S,rot,lx,lz)=>{const c=Math.cos(rot),s=Math.sin(rot);return {x:S.x+lx*c+lz*s,z:S.z-lx*s+lz*c}};
 const reg=o=>{
   const sc={id:o.id,name:o.name,lines:o.lines,pos:new THREE.Vector3(o.x,o.y,o.z),radius:o.radius,poi:o.poi!==false,scanned:false,depleted:false,struct:!!o.struct,hidden:false};
   scannables.push(sc);
   if(o.harvest)harvests.push({sc,type:o.harvest.type,amt:o.harvest.amt,label:o.harvest.label,group:o.harvest.group,done:false});
   return sc;
 };
 const shadowAll=g=>g.traverse(o=>{if(o.isMesh&&o.material.blending!==THREE.AdditiveBlending){o.castShadow=true;o.receiveShadow=true}});
 const rockMatSite=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:true});
 const crystalMat=new THREE.MeshStandardMaterial({color:0x4a1f9a,emissive:0x8a4dff,emissiveIntensity:1.3,roughness:.2,metalness:.35,flatShading:true});
 siteFX.crystalMat=crystalMat;
 const dummy=new THREE.Object3D();

 /* 1. METAL DEPOSIT */
 {
   const S=SITES.metal,y0=terrainHeight(S.x,S.z),g=new THREE.Group();
   const mat=new THREE.MeshStandardMaterial({color:0x9aa2b8,roughness:.38,metalness:.9,flatShading:true});
   for(const [x,z,s,sy2] of [[0,0,2.0,1.3],[2.4,1.2,1.3,1.1],[-2.1,1.6,1.1,.9],[.6,-2.4,1.5,1.2],[-1.8,-1.7,.9,1]]){
     const m=new THREE.Mesh(rockGeoPlain(s),mat);
     m.position.set(x,s*.35*sy2,z);m.scale.y=sy2;m.rotation.set(rand()*.5,rand()*6,rand()*.5);g.add(m);
   }
   const gm=new THREE.MeshBasicMaterial({color:0xcfe6ff,toneMapped:false});
   for(let i=0;i<8;i++){
     const m=new THREE.Mesh(new THREE.OctahedronGeometry(.1+rand()*.09,0),gm);
     const a=rand()*6.28,r=.6+rand()*2.2;m.position.set(Math.cos(a)*r,.5+rand()*1.5,Math.sin(a)*r);g.add(m);
   }
   g.position.set(S.x,y0,S.z);shadowAll(g);scene.add(g);
   addSolid(S.x,S.z,2.5);addSolid(S.x+2.4,S.z+1.2,1.4);addSolid(S.x-1.8,S.z-1.7,1.1);
   reg({id:"metal",name:"METAL DEPOSIT",lines:["ORE-RICH FORMATION","EXTRACTABLE"],x:S.x,y:y0+1.6,z:S.z,radius:3,harvest:{type:"metal",amt:3,label:"EXTRACT METAL",group:g}});
 }

 /* 2. ENERGY DEPOSIT (instanced crystals) */
 {
   const S=SITES.energy,y0=terrainHeight(S.x,S.z),g=new THREE.Group();
   const N=13,im=new THREE.InstancedMesh(new THREE.ConeGeometry(.5,2.8,6),crystalMat,N);
   for(let i=0;i<N;i++){
     const a=i/N*6.28+rand(),r=i<3?rand()*.7:1+rand()*2.2,s=i<3?1.3+rand()*.4:.45+rand()*.7;
     dummy.position.set(Math.cos(a)*r,1.4*s-.25,Math.sin(a)*r);
     dummy.rotation.set((rand()-.5)*.6,rand()*6,(rand()-.5)*.6);dummy.scale.setScalar(s);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);
   }
   im.frustumCulled=false;im.castShadow=true;g.add(im);
   const disc=new THREE.Mesh(new THREE.CircleGeometry(4,28),glowMat(0x8a4dff,.22));
   disc.rotation.x=-Math.PI/2;disc.position.y=.07;g.add(disc);
   siteFX.haloMat=glowMat(0x8a4dff,.14);
   const col=new THREE.Mesh(new THREE.CylinderGeometry(.7,1.3,7,12,1,true),siteFX.haloMat);col.position.y=3.5;g.add(col);
   g.position.set(S.x,y0,S.z);scene.add(g);
   addSolid(S.x,S.z,2.4);
   reg({id:"energy",name:"ENERGY SIGNATURE",lines:["OUTPUT: STRONG","EXTRACTABLE"],x:S.x,y:y0+1.8,z:S.z,radius:3,harvest:{type:"energy",amt:2,label:"EXTRACT ENERGY",group:g}});
 }

 /* 3. DAMAGED HUMAN EQUIPMENT (wrecked rover) */
 {
   const S=SITES.equip,y0=terrainHeight(S.x,S.z),g=new THREE.Group(),rot=.9;
   const body=new THREE.MeshStandardMaterial({color:0x2e3038,roughness:.55,metalness:.7});
   const white=new THREE.MeshStandardMaterial({color:0xcfd0d8,roughness:.5,metalness:.4});
   const tyre=new THREE.MeshStandardMaterial({color:0x15151a,roughness:.9,metalness:.1});
   const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
   add(new THREE.BoxGeometry(3.4,.55,1.8),body,0,.7,0).rotation.z=.07;
   add(new THREE.BoxGeometry(3.2,.08,1.84),white,0,1.0,0).rotation.z=.07;
   add(new THREE.BoxGeometry(3.3,.05,.04),glow(0x9c65ff),0,.72,.92);
   add(new THREE.BoxGeometry(1.3,.7,1.6),body,.7,1.35,0).rotation.z=-.1;
   add(new THREE.BoxGeometry(.05,.5,1.3),new THREE.MeshStandardMaterial({color:0x0c1020,roughness:.1,metalness:.9}),1.36,1.35,0);
   for(const [x,z] of [[1.2,1.0],[-1.2,1.0],[1.2,-1.0],[-1.2,-1.0]]){
     add(new THREE.CylinderGeometry(.5,.5,.4,16),tyre,x,.5,z).rotation.x=Math.PI/2;
   }
   add(new THREE.CylinderGeometry(.5,.5,.4,16),tyre,2.9,.22,1.9).rotation.set(1.3,.4,.2);
   add(new THREE.BoxGeometry(2.2,.06,1.4),new THREE.MeshStandardMaterial({map:TEX.hullDark,color:0x6a7cc0,roughness:.3,metalness:.8}),-3,.35,2.2).rotation.set(.2,.5,.15);
   add(new THREE.CylinderGeometry(.03,.03,2.4,6),body,-1.4,1.9,.3).rotation.z=.9;
   const bm=new THREE.MeshBasicMaterial({color:0xff3030,toneMapped:false});siteFX.blinkMats.push(bm);
   add(new THREE.SphereGeometry(.09,8,6),bm,.5,1.78,.5);
   const sp=new THREE.MeshBasicMaterial({color:0xff9a3a,toneMapped:false});
   for(const [x,y,z] of [[-.4,1.1,.95],[1.7,.8,-.8]])siteFX.sparks.push(add(new THREE.SphereGeometry(.05,6,6),sp,x,y,z));
   for(const [x,z,ry] of [[-2.2,-1.8,.4],[-1.0,-2.3,-.3]])add(new THREE.BoxGeometry(.9,.6,.8),body,x,.32,z).rotation.y=ry;
   g.position.set(S.x,y0,S.z);g.rotation.y=rot;shadowAll(g);scene.add(g);
   for(const [lx,lz,r] of [[0,0,2.0],[-1.6,0,1.3],[1.5,0,1.2]]){const w=toWorld(S,rot,lx,lz);addSolid(w.x,w.z,r)}
   reg({id:"equip",name:"HUMAN EQUIPMENT",lines:["CONDITION: DAMAGED","SALVAGE: COMPONENTS"],x:S.x,y:y0+1.2,z:S.z,radius:3,harvest:{type:"parts",amt:3,label:"SALVAGE COMPONENTS",group:g}});
 }

 /* 4. ALIEN PLANTS beside a small pool (instanced) */
 {
   const S=SITES.plant,y0=terrainHeight(S.x,S.z);
   const pool=new THREE.Mesh(new THREE.CircleGeometry(4.2,32),new THREE.MeshStandardMaterial({color:0x0d3a46,emissive:0x062c34,roughness:.04,metalness:.85,transparent:true,opacity:.92,envMapIntensity:2.4}));
   pool.rotation.x=-Math.PI/2;pool.position.set(S.x,y0+.05,S.z);pool.receiveShadow=true;scene.add(pool);
   const plantMat=new THREE.MeshStandardMaterial({color:0x1f5a52,emissive:0x0a2a30,roughness:.7,metalness:.05});
   const stemGeo=new THREE.CylinderGeometry(.03,.09,2.6,6,6);
   {const p=stemGeo.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i)+1.3;p.setX(i,p.getX(i)+y*y*.11)}stemGeo.computeVertexNormals()}
   const NP=10;
   const stems=new THREE.InstancedMesh(stemGeo,plantMat,NP);
   const leaves=new THREE.InstancedMesh(new THREE.ConeGeometry(.13,1.5,4),plantMat,NP*5);
   const pods=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.2,1),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),NP*2);
   siteFX.haloMat2=glowMat(0xffffff,.2);
   const halos=new THREE.InstancedMesh(new THREE.SphereGeometry(.48,8,6),siteFX.haloMat2,NP*2);
   const cP=new THREE.Color(0xb066ff),cC=new THREE.Color(0x35e0ff);
   let li=0,pi=0;
   for(let i=0;i<NP;i++){
     const a=i/NP*6.28+rand()*.5,r=5.2+rand()*2.6,px=S.x+Math.cos(a)*r,pz=S.z+Math.sin(a)*r;
     const py=terrainHeight(px,pz),sc=.8+rand()*.8,yw=rand()*6.28,cy=Math.cos(yw),sy=Math.sin(yw);
     dummy.rotation.order="XYZ";
     dummy.position.set(px,py+1.3*sc,pz);dummy.rotation.set(0,yw,0);dummy.scale.setScalar(sc);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
     const stemPt=h=>{const ly=h*2.6,bend=ly*ly*.11;return new THREE.Vector3(px+cy*bend*sc,py+ly*sc,pz-sy*bend*sc)};
     for(let j=0;j<5;j++){
       const pt=stemPt(.4+j*.12);
       dummy.rotation.order="YZX";dummy.rotation.set(0,j*1.26+rand(),1.2+rand()*.3);
       const v=new THREE.Vector3(0,.7*sc,0).applyQuaternion(dummy.quaternion);
       dummy.position.copy(pt).add(v);dummy.scale.set(sc,sc,sc*.3);dummy.updateMatrix();leaves.setMatrixAt(li++,dummy.matrix);
     }
     dummy.rotation.order="XYZ";
     const col=i%2?cP:cC;
     for(let k=0;k<2;k++){
       const pt=k===0?stemPt(1).add(new THREE.Vector3(0,.12*sc,0)):stemPt(.72).add(new THREE.Vector3(cy*.5,.1,-sy*.5));
       dummy.position.copy(pt);dummy.rotation.set(0,0,0);dummy.scale.setScalar(k===0?sc:sc*.7);dummy.updateMatrix();
       pods.setMatrixAt(pi,dummy.matrix);pods.setColorAt(pi,col);halos.setMatrixAt(pi,dummy.matrix);halos.setColorAt(pi,col);pi++;
     }
   }
   for(const m of [stems,leaves,pods,halos])m.frustumCulled=false;
   stems.castShadow=true;leaves.castShadow=true;
   scene.add(stems,leaves,pods,halos);
   reg({id:"plant",name:"ALIEN FLORA",lines:["BIOLUMINESCENT","WATER SOURCE NEARBY"],x:S.x,y:y0+1.5,z:S.z,radius:7});
 }

 /* 5. THE CAVE ENTRANCE (leads to the real cave) */
 {
   const S=SITES.cave,y0=terrainHeight(S.x,S.z);
   const dx=-S.x,dz=-5-S.z,dl=Math.hypot(dx,dz);
   const rot=Math.atan2(-dz/dl,dx/dl);             // local +x faces the ship
   caveSite.rot=rot;
   const g=new THREE.Group();g.position.set(S.x,y0,S.z);g.rotation.y=rot;
   const rock=(lx,lz,size,sy2,sx=1,sz=1,py=null)=>{
     const m=new THREE.Mesh(rockGeo(size),rockMatSite);
     m.position.set(lx,py!==null?py:size*.35*sy2,lz);m.scale.set(sx,sy2,sz);m.rotation.y=rand()*6;g.add(m);
   };
   rock(0,-3.6,3.4,1.5);rock(0,3.6,3.2,1.5);rock(-3.8,0,4.6,1.6);rock(.2,0,2.4,.55,1.1,2.1,3.35);
   rock(-1.5,-5.8,2.1,1.1);rock(-1.5,5.6,1.9,1.2);
   const black=new THREE.Mesh(new THREE.CircleGeometry(1.5,20),new THREE.MeshBasicMaterial({color:0x020103}));
   black.scale.set(1,1.4,1);black.rotation.y=Math.PI/2;black.position.set(-2.2,1.5,0);g.add(black);
   const glowSp=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.smoke,color:0x4fc8ff,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
   glowSp.scale.set(3,3,1);glowSp.position.set(-2.0,.9,0);g.add(glowSp);
   for(const [z,s] of [[-.8,.9],[.7,.7],[.1,1.1],[-.3,.6]]){
     const c=new THREE.Mesh(new THREE.ConeGeometry(.14,.7*s,5),crystalMat);
     c.position.set(-2.0,.25*s,z);c.rotation.z=(rand()-.5)*.5;g.add(c);
   }
   shadowAll(g);scene.add(g);
   for(const [lx,lz,r] of [[0,-3.6,2.6],[0,3.6,2.5],[-3.8,0,3.6],[-1.5,-5.8,1.8],[-1.5,5.6,1.6]]){const w=toWorld(S,rot,lx,lz);addSolid(w.x,w.z,r)}
   const mouth=toWorld(S,rot,1.8,0);caveMouth.x=mouth.x;caveMouth.z=mouth.z;
   reg({id:"cave",name:"CAVE ENTRANCE",lines:["DEPTH: UNKNOWN","SEISMIC ECHO DETECTED"],x:mouth.x,y:y0+1.5,z:mouth.z,radius:4,poi:false});
 }

 /* 6. UNKNOWN OBJECT (a dormant shard on the way to the gate) */
 {
   const S=SITES.unknown,y0=terrainHeight(S.x,S.z);
   const stone=new THREE.MeshStandardMaterial({map:TEX.ancient,color:0xb9b2c4,roughness:.85,metalness:.35});
   const g=new THREE.Group();
   const bg=new THREE.BoxGeometry(1.7,5,1.0);uvScale(bg,1.7,5,1.0,3);
   const slab=new THREE.Mesh(bg,stone);slab.position.y=1.3;slab.rotation.set(.12,.5,.2);g.add(slab);
   const gl=new THREE.Mesh(new THREE.PlaneGeometry(1.3,2.6),glyphMat);gl.position.set(0,.4,.52);slab.add(gl);
   for(let i=0;i<4;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.5+rand()*.6,.4,.5),stone);const a=rand()*6.28;b.position.set(Math.cos(a)*1.8,.2,Math.sin(a)*1.8);b.rotation.y=rand()*3;g.add(b)}
   g.position.set(S.x,y0,S.z);shadowAll(g);scene.add(g);
   addSolid(S.x,S.z,1.2);
   reg({id:"unknown",name:"UNKNOWN OBJECT",lines:["MATERIAL: UNKNOWN","STATUS: DORMANT"],x:S.x,y:y0+2.5,z:S.z,radius:2});
 }

 /* 7. THE GATE SITE — enormous, ancient, partially buried */
 {
   const S=SITES.struct,y0=terrainHeight(S.x,S.z);
   STRUCT.y=y0;
   const dsx=-S.x,dsz=-5-S.z,dsl=Math.hypot(dsx,dsz),ux=dsx/dsl,uz=dsz/dsl;
   const rotG=Math.atan2(ux,uz);                     // gate local +z faces the crash site
   gate.rot=rotG;gate.ux=ux;gate.uz=uz;
   const stone=new THREE.MeshStandardMaterial({map:TEX.ancient,color:0xb9b2c4,roughness:.85,metalness:.35,envMapIntensity:.7});
   const stoneDark=new THREE.MeshStandardMaterial({map:TEX.ancient,color:0x7c7588,roughness:.8,metalness:.5});
   const G=new THREE.Group();G.position.set(S.x,y0,S.z);G.rotation.y=rotG;scene.add(G);gate.G=G;
   const disc=new THREE.Mesh(new THREE.CylinderGeometry(15.5,16.2,.12,48),stone);disc.position.y=.05;disc.receiveShadow=true;G.add(disc);
   for(const r of [5.5,9.5,13.8]){
     const m=new THREE.Mesh(new THREE.RingGeometry(r-.22,r,64),ringMat);m.rotation.x=-Math.PI/2;m.position.y=.13;G.add(m);
   }
   for(let i=0;i<8;i++){
     const a=i/8*Math.PI*2,m=new THREE.Mesh(new THREE.PlaneGeometry(8.2,.16),ringMat);
     m.rotation.order="YXZ";m.rotation.set(-Math.PI/2,-a,0);m.position.set(Math.cos(a)*9,.13,Math.sin(a)*9);G.add(m);
   }
   // ring of leaning slabs, open towards the approach
   for(let i=0;i<8;i++){
     const a=i/8*Math.PI*2+rr(-.08,.08);
     if(Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)))<.8)continue;
     const R=rr(19,22),h=rr(15,24),w=rr(3.6,4.6),d=rr(1.9,2.6);
     const px=Math.cos(a)*R,pz=Math.sin(a)*R,th=Math.atan2(-px,-pz);
     const bg=new THREE.BoxGeometry(w,h,d);uvScale(bg,w,h,d,5);
     const slab=new THREE.Mesh(bg,stone);
     slab.rotation.order="YXZ";slab.rotation.set(rr(.04,.2),th,rr(-.1,.1));
     slab.position.set(px,h*.17,pz);slab.castShadow=true;slab.receiveShadow=true;
     const gl=new THREE.Mesh(new THREE.PlaneGeometry(w*.8,h*.5),glyphMat);gl.position.set(0,h*.23,d/2+.03);slab.add(gl);
     G.add(slab);
     for(const t of [-w*.28,w*.28]){const w2=toWorld(S,rotG,px+Math.cos(th)*t,pz-Math.sin(th)*t);addSolid(w2.x,w2.z,1.9)}
   }
   // the gate: two colossal pillars, a broken arch, energy channels
   for(const s of [-1,1]){
     const bg=new THREE.BoxGeometry(5,26,5);uvScale(bg,5,26,5,5);
     const p=new THREE.Mesh(bg,stone);p.position.set(s*11.5,7,0);p.castShadow=true;p.receiveShadow=true;G.add(p);
     for(const y of [1,6,11,16]){const b=new THREE.Mesh(new THREE.BoxGeometry(5.6,.6,5.6),stoneDark);b.position.set(s*11.5,y,0);b.castShadow=true;G.add(b)}
     const ch=new THREE.Mesh(new THREE.BoxGeometry(.2,20,.15),ringMat);ch.position.set(s*8.92,10,1.4);G.add(ch);
     const gp=new THREE.Mesh(new THREE.PlaneGeometry(3.4,12),glyphMat);gp.position.set(s*11.5,9,2.53);G.add(gp);
     const bm=new THREE.Mesh(new THREE.CylinderGeometry(.5,1.1,40,10,1,true),glowMat(0x9c65ff,0));
     bm.position.set(s*11.5,40,0);bm.visible=false;G.add(bm);gate.beams.push(bm);
     for(const t of [-1.4,1.4]){const w2=toWorld(S,rotG,s*11.5,t);addSolid(w2.x,w2.z,2.6)}
   }
   const archR=10.8;
   for(let i=0;i<9;i++){
     if(i===6)continue;                               // a missing section: the gate is damaged
     const t=Math.PI*(i+.5)/9;
     const seg=new THREE.Mesh(new THREE.BoxGeometry(4.4,3.0,5),i%2?stone:stoneDark);
     seg.position.set(Math.cos(t)*archR,17+Math.sin(t)*archR-(i===2?1.2:0),0);
     seg.rotation.z=t+Math.PI/2+(i===2?.14:0);seg.castShadow=true;G.add(seg);
   }
   const archGlow=new THREE.Mesh(new THREE.TorusGeometry(9.15,.14,6,48,Math.PI),ringMat);archGlow.position.set(0,17,1.3);G.add(archGlow);
   // fallen arch stones
   for(const [x,z,s] of [[7,6,2.2],[-4,9,1.6],[10,3,1.3]]){
     const m=new THREE.Mesh(new THREE.BoxGeometry(s*1.6,s,s*1.1),stone);m.position.set(x,s*.4,z);m.rotation.set(rand()*.4,rand()*3,rand()*.4);m.castShadow=true;G.add(m);
     const w2=toWorld(S,rotG,x,z);addSolid(w2.x,w2.z,s*.8);
   }
   // blockers in front of the opening so nobody walks through before it is ready
   for(const x of [-6,-2,2,6]){const w2=toWorld(S,rotG,x,2.2);addSolid(w2.x,w2.z,2.3)}
   // the portal surface (shows the other side once the gate is active)
   const sh=new THREE.Shape();
   sh.moveTo(-9,0);sh.lineTo(9,0);sh.lineTo(9,17);sh.absarc(0,17,9,0,Math.PI,false);sh.lineTo(-9,0);
   gate.mat=new THREE.ShaderMaterial({
     uniforms:{uTime:{value:0},uOpen:{value:0}},
     vertexShader:"varying vec3 vW;varying vec2 vL;void main(){vL=position.xy;vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
     fragmentShader:[
       "uniform float uTime;uniform float uOpen;varying vec3 vW;varying vec2 vL;",
       "float sm(float a,float b,float x){float t=clamp((x-a)/(b-a),0.0,1.0);return t*t*(3.0-2.0*t);}",
       "float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
       "float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y);}",
       "float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.0;a*=0.5;}return s;}",
       "void main(){",
       "vec2 q=vL;",
       "float edgeD=9.0-max(abs(q.x),q.y>17.0?length(vec2(q.x,q.y-17.0)):0.0);",
       "float r=length(vec2(q.x,(q.y-12.0)*0.75));",
       "float reveal=sm(uOpen*22.0+0.5,uOpen*22.0-3.0,r);",
       "vec3 dir=normalize(vW-cameraPosition);",
       "float az=atan(dir.x,dir.z);float el=dir.y;",
       "vec3 col=mix(vec3(0.95,0.42,0.40),vec3(0.20,0.07,0.28),sm(0.0,0.45,el));",
       "col=mix(col,vec3(0.03,0.02,0.09),sm(0.35,1.0,el));",
       "float pl=length(vec2((az-0.55)*1.2,el-0.34));",
       "col=mix(col,vec3(0.85,0.75,0.95)*(0.7+0.3*fbm(vec2(az*9.0,el*9.0))),sm(0.17,0.15,pl));",
       "col+=vec3(0.9,0.7,1.0)*sm(0.30,0.15,pl)*0.18;",
       "float st=step(0.985,h21(floor(vec2(az*60.0,el*40.0))));col+=vec3(st)*0.8*sm(0.1,0.3,el);",
       "for(int l=0;l<3;l++){float fl=float(l);",
       "float hh=0.03+fl*0.045+(fbm(vec2(az*(2.5+fl*2.0)+fl*9.0,fl*3.0+uTime*0.01))-0.5)*(0.14+fl*0.05);",
       "vec3 mc=mix(vec3(0.08,0.03,0.12),vec3(0.38,0.16,0.30),fl*0.38);",
       "col=mix(col,mc,sm(hh+0.004,hh-0.004,el));}",
       "float t2=1.6/max(0.02,-el);vec2 gp=vec2(dir.x,dir.z)*t2;",
       "if(el<0.0){vec3 gc=mix(vec3(0.07,0.03,0.10),vec3(0.30,0.12,0.22),exp(-t2*0.01));",
       "vec2 cell=floor(gp/38.0);float hv=h21(cell);vec2 fc=fract(gp/38.0)-0.5;",
       "float lit=step(0.88,hv)*sm(0.08,0.02,length(fc))*(0.6+0.4*sin(uTime*2.0+hv*20.0));",
       "gc+=vec3(0.5,0.9,1.0)*lit*min(1.0,30.0/t2);col=gc;}",
       "float bars=step(0.93,h21(vec2(floor(az*16.0),4.0)));",
       "float bh=0.05+0.14*h21(vec2(floor(az*16.0),9.0));",
       "col=mix(col,vec3(0.05,0.02,0.08),bars*step(el,bh)*step(0.0,el)*0.9);",
       "float bl=bars*sm(0.012,0.0,abs(el-bh))*(0.5+0.5*sin(uTime*3.0+az*40.0));col+=vec3(0.6,0.8,1.0)*bl*0.6;",
       "float br=0.012*sin(uTime*0.6);",
       "vec2 bp=vec2((az-0.1-sin(uTime*0.04)*0.25)*1.0,(el-0.115-br)*2.4);",
       "float body=sm(0.52,0.46,length(bp));",
       "float limb=sm(0.05,0.02,abs(bp.y*0.5-0.1*sin(bp.x*4.0+uTime*0.3)))*sm(0.7,0.4,abs(bp.x+0.2))*step(0.0,el);",
       "col=mix(col,vec3(0.012,0.006,0.02),max(body,limb*0.8));",
       "float rim=sm(0.54,0.5,length(bp))-sm(0.5,0.46,length(bp));",
       "col+=vec3(0.7,0.35,0.9)*rim*0.35*(0.6+0.4*sin(uTime*1.3+az*10.0));",
       "float dots=step(0.97,h21(floor(vec2(bp.x*30.0,bp.y*30.0))))*body*(0.5+0.5*sin(uTime*2.5+bp.x*20.0));col+=vec3(0.6,0.9,1.0)*dots*0.7;",
       "float fog=sm(0.0,0.12,el)*0.0;",
       "vec3 sw=vec3(0.28,0.10,0.55)*(0.5+fbm(q*0.35+vec2(uTime*0.35,-uTime*0.2)));",
       "vec3 outc=mix(sw,col,reveal);",
       "outc+=vec3(0.55,0.35,1.0)*sm(1.4,0.0,edgeD)*0.9;",
       "gl_FragColor=vec4(outc,1.0);",
       "#include <tonemapping_fragment>",
       "#include <colorspace_fragment>",
       "}"
     ].join("\n"),
     side:THREE.FrontSide,fog:false,transparent:false
   });
   const portal=new THREE.Mesh(new THREE.ShapeGeometry(sh,24),gate.mat);
   portal.position.set(0,.05,0);portal.visible=false;portal.renderOrder=2;G.add(portal);gate.portal=portal;
   // dust that rises when the gate wakes
   const NPD=70;gate.dustPa=new Float32Array(NPD*3);
   for(let i=0;i<NPD;i++){gate.dustPa[i*3]=(rand()-.5)*20;gate.dustPa[i*3+1]=rand()*8;gate.dustPa[i*3+2]=rand()*9}
   const dg=new THREE.BufferGeometry();dg.setAttribute("position",new THREE.BufferAttribute(new Float32Array(gate.dustPa),3));
   gate.dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xd8b7a0,size:.35,transparent:true,opacity:.6,depthWrite:false}));
   gate.dust.frustumCulled=false;gate.dust.visible=false;G.add(gate.dust);
   // fragments
   for(let i=0;i<8;i++){
     const sz=.6+rand()*1.4,a=rand()*6.28,r=6+rand()*10;
     const m=new THREE.Mesh(new THREE.BoxGeometry(sz,sz*(.5+rand()*.6),sz*(.6+rand()*.8)),stone);
     m.position.set(Math.cos(a)*r,sz*.3,Math.sin(a)*r);m.rotation.set(rand()*.5,rand()*6,rand()*.5);m.castShadow=true;G.add(m);
   }
   const np=toWorld(S,rotG,2,15);gate.novaPt.x=np.x;gate.novaPt.z=np.z;
   reg({id:"gate",name:"ANCIENT STRUCTURE",lines:["ORIGIN: UNKNOWN","ENERGY SOURCE: UNKNOWN"],x:S.x,y:y0+10,z:S.z,radius:20,poi:false,struct:true});
 }

 /* scan effect meshes, label pool, direction markers */
 const mk=(geo,col)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,fog:false}));m.visible=false;scene.add(m);return m};
 const r1=mk(new THREE.RingGeometry(.96,1,72),0x6fe0ff);r1.rotation.x=-Math.PI/2;
 const r2=mk(new THREE.RingGeometry(.97,1,72),0xb066ff);r2.rotation.x=-Math.PI/2;
 const dome=mk(new THREE.SphereGeometry(1,28,10,0,Math.PI*2,0,Math.PI/2),0x6fe0ff);dome.material.wireframe=true;
 scanFxMeshes={r1,r2,dome};
 for(let i=0;i<8;i++){
   const el=document.createElement("div");el.className="stag";el.innerHTML="<i></i><span></span>";tagsEl.appendChild(el);
   scanTags.push({el,span:el.querySelector("span"),pos:new THREE.Vector3(),on:false,until:0});
 }
 markerMesh=new THREE.InstancedMesh(new THREE.ConeGeometry(.18,.65,4),new THREE.MeshBasicMaterial({color:0x6fe0ff,transparent:true,opacity:.8,toneMapped:false,depthWrite:false}),28);
 markerMesh.frustumCulled=false;markerMesh.count=0;markerMesh.visible=false;scene.add(markerMesh);
}


/* ---------- CHAPTER 1 story bridge / gate cinematic ---------- */
let surfaceConversationStarted=false;
let gateReturnStarted=false;
let gateReturnFinished=false;
let gateSyncRunning=false;
function chapter1Speak(speaker,lines,done){
 if(typeof speak==="function")speak(speaker,lines,done);else if(done)done();
}
function onSurfaceReached(){
 if(surfaceConversationStarted)return;
 surfaceConversationStarted=true;
 if(typeof setState==="function")setState("SURFACE");
 const continueToGate=()=>{
   if(typeof setState==="function")setState("GATE");
   gateKnown=true;
   if(typeof neutron==="function")neutron("INVESTIGATE THE GATE","UNKNOWN SIGNAL DETECTED");
 };
 chapter1Speak("HEMTON",["Hemadri."],()=>chapter1Speak("HEMADRI",["NOVA is gone."],()=>chapter1Speak("HEMTON",["I know."],()=>chapter1Speak("HEMADRI",["Then help me find him."],()=>chapter1Speak("HEMTON",["I have detected something else."],()=>chapter1Speak("HEMADRI",["What?"],()=>chapter1Speak("HEMTON",["A signal."],()=>chapter1Speak("HEMADRI",["From NOVA?"],()=>chapter1Speak("HEMTON",["No."],()=>chapter1Speak("HEMTON",["From the gate."],continueToGate))))))))));
}
function beginGateNovaReturn(){
 if(gateReturnStarted||gateReturnFinished)return;
 gateReturnStarted=true;gateReturnFinished=true;
 try{nova.visible=true;nova.position.set(gate.novaPt.x,terrainHeight(gate.novaPt.x,gate.novaPt.z)+.65,gate.novaPt.z)}catch(e){}
 try{novaMode="online"}catch(e){}
 chapter1Speak("NOVA",["You came back."],()=>chapter1Speak("HEMADRI",["Where were you?"],()=>chapter1Speak("NOVA",["I don't know."],startNeutronSync)));
}
function startNeutronSync(){
 if(gateSyncRunning)return;gateSyncRunning=true;
 const vals=[23,41,67,100];let i=0;
 const step=()=>{
   neutronPct=vals[i];
   if(syncVal)syncVal.textContent=neutronPct+"%";
   if(syncFill)syncFill.style.width=neutronPct+"%";
   if(syncEl)syncEl.style.display="block";
   if(i<vals.length-1){i++;setTimeout(step,700);return;}
   setTimeout(()=>{
     if(syncEl)syncEl.style.display="none";
     if(typeof toast==="function")toast("SYNCHRONIZATION COMPLETE",1800);
     gateActive=true;gateStage=3;
     if(gate.portal)gate.portal.visible=true;
     try{if(gate.mat)gate.mat.uniforms.uOpen.value=1}catch(e){}
     gateSyncRunning=false;
     if(typeof setState==="function")setState("GATE_EVENT");
   },900);
 };
 step();
}
function triggerGateEnding(){
 if(gateStage>=4)return;gateStage=4;
 chapter1Speak("HEMTON",["Hemadri... step back."],()=>setTimeout(()=>{
   try{cutEl.style.opacity="1"}catch(e){}
   setTimeout(()=>{
     chapter1Speak("HEMTON",["That isn't a structure."],()=>{
       if(typeof setState==="function")setState("END");
       setTimeout(()=>{try{cutEl.style.opacity="1"}catch(e){};if(typeof toast==="function")toast("NEXUS — CHAPTER 2 — THE OTHER SIDE",5000)},500);
     });
   },900);
 },900));
}
function updateChapter1Sites(dt,t){
 if(inCave||!player)return;
 // cave entrance: arriving at the mouth advances SIGNAL -> CAVE_ENTRY and enters; also lets the player return after leaving early
 if(caveMouth.x||caveMouth.z){
   const dc=Math.hypot(player.position.x-caveMouth.x,player.position.z-caveMouth.z);
   if(state==="SIGNAL"&&dc<4&&typeof setState==="function")setState("CAVE_ENTRY");
   if((state==="CAVE_ENTRY"||state==="CAVE"||state==="CRYSTALS")&&dc<6.5&&!inputLocked
      &&(typeof lastCaveExit==="undefined"||performance.now()-lastCaveExit>3000)
      &&typeof enterCave==="function")enterCave();
 }
 const d=Math.hypot(player.position.x-gate.novaPt.x,player.position.z-gate.novaPt.z);
 if(state==="GATE"&&d<6){beginGateNovaReturn();return;}
 if(state==="GATE_EVENT"&&gateActive&&d<10&&!gateSyncRunning)triggerGateEnding();
}
if(typeof window!=="undefined")window.NEXUS_CHAPTER1={onSurfaceReached,beginGateNovaReturn,startNeutronSync,triggerGateEnding,updateChapter1Sites};
