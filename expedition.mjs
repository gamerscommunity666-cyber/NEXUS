/* ============================================================
   FIRST EXPEDITION — exploration sites, scanner, signal, structure
   ============================================================ */
ORDER.push("EXPEDITION","SIGNAL","STRUCTURE","ACTIVATE","UNDERGROUND");
Object.assign(OBJ,{
 EXPEDITION:"FIRST EXPEDITION",SIGNAL:"FOLLOW THE UNKNOWN SIGNAL",STRUCTURE:"SCAN THE STRUCTURE",
 ACTIVATE:"FIRST EXPEDITION",UNDERGROUND:"INVESTIGATE THE UNDERGROUND SIGNAL"
});
Object.assign(HEMTON_HINT,{
 EXPEDITION:["Use the scanner to survey the region.","Look for resources and anomalies."],
 SIGNAL:["Follow the transmission. Stay alert."],
 STRUCTURE:["Scan the structure. Keep your distance."],
 ACTIVATE:["Stand by."],
 UNDERGROUND:["Approach the opening carefully."]
});
Object.assign(NOVA_HINT,{
 EXPEDITION:["Scanner synchronized.","Use SCAN near anything interesting."],
 SIGNAL:["The signal is getting stronger."],
 STRUCTURE:["I... can't explain it."],
 ACTIVATE:["..."],
 UNDERGROUND:["Something is down there."]
});

const scanBtn=document.getElementById("scanBtn");
const scanPanel=document.getElementById("scanPanel");
const scanFx=document.getElementById("scanFx");
const bannerEl=document.getElementById("banner");
const tagsEl=document.getElementById("tags");

const SCAN_RANGE=30;
const PICK_LABEL={metal:"METAL DEPOSIT",energy:"ENERGY SIGNATURE",parts:"COMPONENTS"};
const scannables=[],harvests=[];
const siteFX={crystalMat:null,haloMat:null,blinkMats:[],sparks:[]};
const STRUCT=new THREE.Vector3(SITES.struct.x,0,SITES.struct.z);
const structNovaPt={x:0,z:0};
const caveMouth={x:0,z:0};
const fissure={g:null,col:null,pa:null,pts:null,pos:new THREE.Vector3(),solidsAdded:false};
let glyphMat=null,ringMat=null,glyphLevel=.12;
let scannerUnlocked=false,signalFound=false,signalPending=false,structArrived=false,structActivated=false,undergroundDone=false;
let poiScanned=0;
let scanCool=0,scanT=-1,scanPending=null,scanPanelTimer=null,scanFxMeshes=null;
const scanTags=[];
let camShake=0,actKind=null,actData=null;
let novaScript=null,novaExcite=0,novaStuck=0,novaDetour=0,novaSide=1,novaStuckCount=0;
const barkFlags={};
let barkCool=0;
let actx=null,scannerScreen=null;

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
   const sc={id:o.id,name:o.name,lines:o.lines,pos:new THREE.Vector3(o.x,o.y,o.z),radius:o.radius,poi:o.poi!==false,scanned:false,depleted:false,struct:!!o.struct};
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
   for(const [x,z,rz] of [[1.2,1.0,0],[-1.2,1.0,0],[1.2,-1.0,0],[-1.2,-1.0,.0]]){
     const w=add(new THREE.CylinderGeometry(.5,.5,.4,16),tyre,x,.5,z);w.rotation.x=Math.PI/2;
   }
   const lost=add(new THREE.CylinderGeometry(.5,.5,.4,16),tyre,2.9,.22,1.9);lost.rotation.set(1.3,.4,.2);
   const panel=add(new THREE.BoxGeometry(2.2,.06,1.4),new THREE.MeshStandardMaterial({map:TEX.hullDark,color:0x6a7cc0,roughness:.3,metalness:.8}),-3,.35,2.2);panel.rotation.set(.2,.5,.15);
   const ant=add(new THREE.CylinderGeometry(.03,.03,2.4,6),body,-1.4,1.9,.3);ant.rotation.z=.9;
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
   const podMat=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
   const pods=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.2,1),podMat,NP*2);
   siteFX.haloMat2=glowMat(0xffffff,.2);
   const halos=new THREE.InstancedMesh(new THREE.SphereGeometry(.48,8,6),siteFX.haloMat2,NP*2);
   const cP=new THREE.Color(0xb066ff),cC=new THREE.Color(0x35e0ff);
   let li=0,pi=0;
   for(let i=0;i<NP;i++){
     const a=i/NP*6.28+rand()*.5,r=5.2+rand()*2.6,px=S.x+Math.cos(a)*r,pz=S.z+Math.sin(a)*r;
     const py=terrainHeight(px,pz),sc=.8+rand()*.8,yw=rand()*6.28,cy=Math.cos(yw),sy=Math.sin(yw);
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
       const pt=k===0?stemPt(1).add(new THREE.Vector3(0,.12*sc,0)):stemPt(.72).add(new THREE.Vector3(Math.cos(yw)*.5,.1,-Math.sin(yw)*.5));
       dummy.position.copy(pt);dummy.rotation.set(0,0,0);dummy.scale.setScalar(k===0?sc:sc*.7);dummy.updateMatrix();
       pods.setMatrixAt(pi,dummy.matrix);pods.setColorAt(pi,col);halos.setMatrixAt(pi,dummy.matrix);halos.setColorAt(pi,col);pi++;
     }
   }
   for(const m of [stems,leaves,pods,halos])m.frustumCulled=false;
   stems.castShadow=true;leaves.castShadow=true;
   scene.add(stems,leaves,pods,halos);
   reg({id:"plant",name:"ALIEN FLORA",lines:["BIOLUMINESCENT","WATER SOURCE NEARBY"],x:S.x,y:y0+1.5,z:S.z,radius:7});
 }

 /* 5. SMALL CAVE ENTRANCE */
 {
   const S=SITES.cave,y0=terrainHeight(S.x,S.z);
   const dx=-S.x,dz=-5-S.z,dl=Math.hypot(dx,dz);
   const rot=Math.atan2(-dz/dl,dx/dl);             // local +x faces the ship
   const g=new THREE.Group();g.position.set(S.x,y0,S.z);g.rotation.y=rot;
   const rock=(lx,lz,size,sy2,sx=1,sz=1,py=null)=>{
     const m=new THREE.Mesh(rockGeo(size),rockMatSite);
     m.position.set(lx,py!==null?py:size*.35*sy2,lz);m.scale.set(sx,sy2,sz);m.rotation.y=rand()*6;g.add(m);
   };
   rock(0,-3.6,3.4,1.5);rock(0,3.6,3.2,1.5);rock(-3.8,0,4.6,1.6);rock(.2,0,2.4,.55,1.1,2.1,3.35);
   rock(-1.5,-5.8,2.1,1.1);rock(-1.5,5.6,1.9,1.2);
   const black=new THREE.Mesh(new THREE.CircleGeometry(1.5,20),new THREE.MeshBasicMaterial({color:0x020103}));
   black.scale.set(1,1.4,1);black.rotation.y=Math.PI/2;black.position.set(-2.2,1.5,0);g.add(black);
   const glowSp=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.smoke,color:0x8a4dff,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));
   glowSp.scale.set(3,3,1);glowSp.position.set(-2.0,.9,0);g.add(glowSp);
   for(const [z,s] of [[-.8,.9],[.7,.7],[.1,1.1],[-.3,.6]]){
     const c=new THREE.Mesh(new THREE.ConeGeometry(.14,.7*s,5),crystalMat);
     c.position.set(-2.0,.25*s,z);c.rotation.z=(rand()-.5)*.5;g.add(c);
   }
   shadowAll(g);scene.add(g);
   for(const [lx,lz,r] of [[0,-3.6,2.6],[0,3.6,2.5],[-3.8,0,3.6],[-1.5,-5.8,1.8],[-1.5,5.6,1.6]]){const w=toWorld(S,rot,lx,lz);addSolid(w.x,w.z,r)}
   const mouth=toWorld(S,rot,1.8,0);caveMouth.x=mouth.x;caveMouth.z=mouth.z;
   reg({id:"cave",name:"CAVE ENTRANCE",lines:["DEPTH: UNKNOWN","SEISMIC ECHO DETECTED"],x:mouth.x,y:y0+1.5,z:mouth.z,radius:4});
 }

 /* 6. UNKNOWN OBJECT (a dormant shard on the way to the signal) */
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

 /* 7. THE ANCIENT STRUCTURE (far away, partially buried) */
 {
   const S=SITES.struct,y0=terrainHeight(S.x,S.z);
   STRUCT.y=y0;
   const stone=new THREE.MeshStandardMaterial({map:TEX.ancient,color:0xb9b2c4,roughness:.85,metalness:.35,envMapIntensity:.7});
   const G=new THREE.Group();G.position.set(S.x,y0,S.z);scene.add(G);
   const disc=new THREE.Mesh(new THREE.CylinderGeometry(15.5,16.2,.12,48),stone);disc.position.y=.05;disc.receiveShadow=true;G.add(disc);
   for(const r of [5.5,9.5,13.8]){
     const m=new THREE.Mesh(new THREE.RingGeometry(r-.22,r,64),ringMat);m.rotation.x=-Math.PI/2;m.position.y=.13;G.add(m);
   }
   for(let i=0;i<8;i++){
     const a=i/8*Math.PI*2,m=new THREE.Mesh(new THREE.PlaneGeometry(8.2,.16),ringMat);
     m.rotation.order="YXZ";m.rotation.set(-Math.PI/2,-a,0);m.position.set(Math.cos(a)*9,.13,Math.sin(a)*9);G.add(m);
   }
   // pylons
   for(let i=0;i<6;i++){
     const a=i/6*Math.PI*2+rr(-.15,.15),R=rr(18,21),h=rr(17,26),w=rr(3.6,4.6),d=rr(1.9,2.6);
     const px=Math.cos(a)*R,pz=Math.sin(a)*R,th=Math.atan2(-px,-pz);
     const bg=new THREE.BoxGeometry(w,h,d);uvScale(bg,w,h,d,5);
     const slab=new THREE.Mesh(bg,stone);
     slab.rotation.order="YXZ";slab.rotation.set(rr(.04,.2),th,rr(-.1,.1));
     slab.position.set(px,h*.17,pz);slab.castShadow=true;slab.receiveShadow=true;
     const gl=new THREE.Mesh(new THREE.PlaneGeometry(w*.8,h*.5),glyphMat);gl.position.set(0,h*.23,d/2+.03);slab.add(gl);
     G.add(slab);
     for(const t of [-w*.28,w*.28])addSolid(S.x+px+Math.cos(th)*t,S.z+pz-Math.sin(th)*t,1.9);
   }
   // central leaning monolith
   const mono=new THREE.Group();mono.position.set(0,5,0);mono.rotation.z=-.16;G.add(mono);
   const mm=new THREE.Mesh(new THREE.CylinderGeometry(3.0,4.0,32,6),stone);mm.castShadow=true;mm.receiveShadow=true;mono.add(mm);
   for(const y of [-2,4,10]){const r=3.5-y/32;const b=new THREE.Mesh(new THREE.CylinderGeometry(r+.07,r+.07,.5,6,1,true),ringMat);b.position.y=y;mono.add(b)}
   addSolid(S.x,S.z,4.6);
   // fallen fragments
   for(let i=0;i<10;i++){
     const sz=.6+rand()*1.6,a=rand()*6.28,r=6+rand()*18;
     const m=new THREE.Mesh(new THREE.BoxGeometry(sz,sz*(.5+rand()*.6),sz*(.6+rand()*.8)),stone);
     m.position.set(Math.cos(a)*r,sz*.3,Math.sin(a)*r);m.rotation.set(rand()*.5,rand()*6,rand()*.5);m.castShadow=true;G.add(m);
     if(sz>1.5)addSolid(S.x+m.position.x,S.z+m.position.z,sz*.65);
   }
   const dsx=-S.x,dsz=-5-S.z,dsl=Math.hypot(dsx,dsz);
   const ux=dsx/dsl,uz=dsz/dsl;
   structNovaPt.x=S.x+ux*13;structNovaPt.z=S.z+uz*13;
   reg({id:"struct",name:"UNKNOWN TECHNOLOGY",lines:["ORIGIN: UNKNOWN","ENERGY SOURCE: UNKNOWN"],x:S.x,y:y0+8,z:S.z,radius:17,poi:false,struct:true});

   // the opening that appears during activation
   const fx=S.x+ux*8.5,fz=S.z+uz*8.5;
   fissure.pos.set(fx,terrainHeight(fx,fz),fz);
   const fg=new THREE.Group();fg.position.copy(fissure.pos);fg.rotation.y=Math.atan2(ux,uz)+Math.PI/2;
   const L=7,Wd=1.3,n=9,top=[],bot=[];
   for(let i=0;i<=n;i++){const x=-L/2+L*i/n,f=Math.sin(Math.PI*i/n);top.push([x,Wd*f*(.45+rand()*.55)]);bot.push([x,-Wd*f*(.45+rand()*.55)])}
   const mkShape=k=>{const sh=new THREE.Shape();sh.moveTo(top[0][0]*k,top[0][1]*k);for(let i=1;i<=n;i++)sh.lineTo(top[i][0]*k,top[i][1]*k);for(let i=n;i>=0;i--)sh.lineTo(bot[i][0]*k,bot[i][1]*k);return sh};
   const hole=new THREE.Mesh(new THREE.ShapeGeometry(mkShape(1)),new THREE.MeshBasicMaterial({color:0x040207,polygonOffset:true,polygonOffsetFactor:-3}));
   hole.rotation.x=-Math.PI/2;hole.position.y=.07;fg.add(hole);
   const hg=new THREE.Mesh(new THREE.ShapeGeometry(mkShape(.72)),glowMat(0x9c65ff,.95));
   hg.rotation.x=-Math.PI/2;hg.position.y=.09;fg.add(hg);
   fissure.col=new THREE.Mesh(new THREE.CylinderGeometry(.55,1.1,16,12,1,true),glowMat(0x9c65ff,.24));
   fissure.col.position.y=8;fg.add(fissure.col);
   const dark=new THREE.MeshStandardMaterial({color:0x2a2330,roughness:.9,metalness:.2,flatShading:true});
   for(let i=0;i<7;i++){
     const m=new THREE.Mesh(rockGeoPlain(.35+rand()*.45),dark);
     m.position.set(-3+rand()*6,.1,(rand()<.5?-1:1)*(.9+rand()*.5));m.rotation.set(rand()*3,rand()*3,rand()*3);m.castShadow=true;fg.add(m);
   }
   const NPT=40;fissure.pa=new Float32Array(NPT*3);
   for(let i=0;i<NPT;i++){fissure.pa[i*3]=(rand()-.5)*5;fissure.pa[i*3+1]=rand()*9;fissure.pa[i*3+2]=(rand()-.5)*1.2}
   const pg=new THREE.BufferGeometry();pg.setAttribute("position",new THREE.BufferAttribute(new Float32Array(fissure.pa),3));
   fissure.pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0xc9a0ff,size:.22,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
   fissure.pts.frustumCulled=false;fg.add(fissure.pts);
   fg.visible=false;fg.scale.set(.01,1,.01);scene.add(fg);fissure.g=fg;
 }

 /* scan effect meshes + tag pool */
 const mk=(geo,col,op)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,fog:false}));m.visible=false;scene.add(m);return m};
 const r1=mk(new THREE.RingGeometry(.96,1,72),0x6fe0ff);r1.rotation.x=-Math.PI/2;
 const r2=mk(new THREE.RingGeometry(.97,1,72),0xb066ff);r2.rotation.x=-Math.PI/2;
 const dome=mk(new THREE.SphereGeometry(1,28,10,0,Math.PI*2,0,Math.PI/2),0x6fe0ff);dome.material.wireframe=true;
 scanFxMeshes={r1,r2,dome};
 for(let i=0;i<8;i++){
   const el=document.createElement("div");el.className="stag";el.innerHTML="<i></i><span></span>";tagsEl.appendChild(el);
   scanTags.push({el,span:el.querySelector("span"),pos:new THREE.Vector3(),on:false,until:0});
 }
}

/* ---------- scanner ---------- */
const fmtD=d=>d>=1000?(d/1000).toFixed(1)+" km":Math.round(d)+"m";
function unlockScanner(){
 scannerUnlocked=true;
 scanBtn.classList.add("on");
}
function doScan(){
 if(!started||!scannerUnlocked||busy||scanCool>0)return;
 scanCool=2.4;scanT=0;
 blip(620,.14,.12);
 scanFx.classList.remove("on");void scanFx.offsetWidth;scanFx.classList.add("on");
 const p=player.position,found=[];
 for(const s of scannables){
   if(s.struct&&!signalFound)continue;
   const d=Math.max(0,Math.hypot(s.pos.x-p.x,s.pos.z-p.z)-s.radius);
   if(d<=SCAN_RANGE)found.push({s,d,name:s.name,lines:s.depleted?["DEPLETED"]:s.lines,pos:s.pos});
 }
 for(const g of pickups){
   const d=dist2D(p,g.position);
   if(d<=SCAN_RANGE)found.push({s:null,d,name:PICK_LABEL[g.userData.type],lines:[],pos:g.position});
 }
 found.sort((a,b)=>a.d-b.d);
 scanPending=found;
}
function showScanPanel(title,rows,alert){
 let h="<h4>"+title+"</h4>";
 for(const r of rows){
   h+='<div class="row"><b>'+r.name+'</b>'+(r.d!=null?" • "+fmtD(r.d):"")+(r.lines&&r.lines.length?"<span>"+r.lines.join(" · ")+"</span>":"")+"</div>";
 }
 scanPanel.innerHTML=h;
 scanPanel.className=alert?"alert":"";
 scanPanel.style.display="block";
 clearTimeout(scanPanelTimer);
 scanPanelTimer=setTimeout(()=>{scanPanel.style.display="none"},8000);
}
function showScanResults(found){
 blip(980,.1,.09);
 if(!found.length){
   showScanPanel("SCAN COMPLETE",[{name:"NO SIGNATURES IN RANGE",d:null,lines:["RANGE "+SCAN_RANGE+"m"]}],false);
   return;
 }
 let newSites=0,sawStruct=false;
 const now=performance.now();
 found.forEach((f,i)=>{
   if(f.s&&f.s.poi&&!f.s.scanned){f.s.scanned=true;poiScanned++;newSites++}
   if(f.s&&f.s.struct)sawStruct=true;
   if(i<scanTags.length){
     const tg=scanTags[i];tg.pos.copy(f.pos);tg.pos.y+=(f.s?1.2:.6);tg.span.textContent=f.name;tg.on=true;tg.until=now+9000;
   }
 });
 for(let i=found.length;i<scanTags.length;i++)scanTags[i].on=false;
 showScanPanel(newSites?"SCAN COMPLETE • SITE LOGGED":"SCAN COMPLETE",found.slice(0,5).map((f,i)=>({name:f.name,d:f.d,lines:i<3?f.lines:[]})),false);
 if(state==="EXPEDITION"&&poiScanned>=3&&!signalFound&&!signalPending){
   signalPending=true;
   setTimeout(triggerSignal,2600);
 }
 if(sawStruct&&state==="STRUCTURE"&&!structActivated){
   structActivated=true;
   setTimeout(activateStructure,1900);
 }
}
function triggerSignal(){
 signalFound=true;signalPending=false;
 setState("SIGNAL");
 blip(300,.4,.15);
 showScanPanel("⚠ UNKNOWN SIGNAL",[{name:"UNKNOWN SIGNAL",d:Math.hypot(STRUCT.x-player.position.x,STRUCT.z-player.position.z),lines:["ORIGIN: UNKNOWN","WAYPOINT SET"]}],true);
 speak("HEMTON",["That transmission wasn't present during our initial scan.","Marking its location."]);
}
function updateScan(dt,t){
 if(scanCool>0){scanCool-=dt;scanBtn.style.opacity=scanCool>0?".45":"1"}
 if(scannerScreen)scannerScreen.color.setScalar(.6+(scanT>=0?.9:0)+.1*Math.sin(t*5));
 const {r1,r2,dome}=scanFxMeshes;
 if(scanT>=0){
   scanT+=dt;
   const k=scanT/1.2,p=player.position;
   if(scanPending&&scanT>.5){const f=scanPending;scanPending=null;showScanResults(f)}
   if(k>=1){scanT=-1;r1.visible=r2.visible=dome.visible=false}
   else{
     r1.visible=r2.visible=dome.visible=true;
     const y=p.y+.15,rad=SCAN_RANGE*k;
     r1.position.set(p.x,y,p.z);r1.scale.setScalar(Math.max(.1,rad));r1.material.opacity=(1-k)*.9;
     const k2=Math.max(0,k-.14)/.86;
     r2.position.set(p.x,y,p.z);r2.scale.setScalar(Math.max(.1,SCAN_RANGE*k2));r2.material.opacity=(1-k2)*.7;
     dome.position.set(p.x,p.y,p.z);dome.scale.setScalar(Math.max(.1,rad));dome.material.opacity=(1-k)*.22;
   }
 }
 // floating labels over scanned objects
 const now=performance.now();
 for(const tg of scanTags){
   if(!tg.on)continue;
   if(now>tg.until){tg.on=false;tg.el.style.display="none";continue}
   const cz=tg.pos.clone().applyMatrix4(camera.matrixWorldInverse).z;
   if(cz>0){tg.el.style.display="none";continue}
   const v=tg.pos.clone().project(camera);
   tg.el.style.display="block";
   tg.el.style.transform="translate("+((v.x*.5+.5)*innerWidth)+"px,"+((-v.y*.5+.5)*innerHeight)+"px)";
 }
}

/* ---------- harvesting ---------- */
function nearHarvest(){
 const p=player.position;
 for(const h of harvests){
   if(h.done)continue;
   if(dist2D(p,h.sc.pos)<h.sc.radius+2.4)return h;
 }
 return null;
}
function doHarvest(h){
 h.done=true;h.sc.depleted=true;
 inv[h.type]+=h.amt;refreshInv(h.type);
 toast("+"+h.amt+" "+RES[h.type].label,1600);
 blip(520,.12,.1);
 h.group.scale.multiplyScalar(.62);
}

/* ---------- mission flow ---------- */
function beginExpedition(){
 setState("EXPEDITION");
 unlockScanner();
 speak("HEMTON",[
   "NOVA's systems are stable.",
   "We need to determine where we are.",
   "Begin a survey of the surrounding region."
 ],()=>toast("SCANNER ONLINE • PRESS SCAN",3400));
}
function runArrival(){
 novaScript={x:structNovaPt.x,z:structNovaPt.z,until:performance.now()+10000};
 novaExcite=8;
 speak("NOVA",["I don't understand this.","...but I remember it."],()=>
   speak("HEMTON",["NOVA, step away from the structure."],()=>{
     novaScript=null;novaExcite=0;
     setState("STRUCTURE");
     toast("SCAN THE STRUCTURE",2800);
   }));
}
function activateStructure(){
 setState("ACTIVATE");
 hum(7,40,.28);
 try{if(navigator.vibrate)navigator.vibrate([120,60,120,60,300,80,500,100,700])}catch(e){}
 tween(3.2,k=>{glyphLevel=.12+k*.95;camShake=k*.03});
 setTimeout(()=>{
   fissure.g.visible=true;
   if(!fissure.solidsAdded){
     fissure.solidsAdded=true;
     const h=fissure.g.rotation.y,c=Math.cos(h),s=Math.sin(h);
     for(const t of [-1.9,1.9])solids.push({x:fissure.pos.x+c*t,z:fissure.pos.z-s*t,r:1.5});
   }
   tween(2.6,k=>{
     const e=1-Math.pow(1-k,3);
     fissure.g.scale.set(Math.max(.01,e),1,Math.max(.01,e));
     camShake=.035+Math.sin(k*22)*.01;
     glyphLevel=1.07+Math.sin(k*50)*.15;
   });
   const y0=yaw,dx=fissure.pos.x-player.position.x,dz=fissure.pos.z-player.position.z,ty=Math.atan2(-dx,-dz);
   tween(1.6,k=>{const e=k*k*(3-2*k);yaw=lerpAngle(y0,ty,e);pitch+=(.08-pitch)*.08});
 },3000);
 setTimeout(()=>{
   tween(1.4,k=>{glyphLevel=1.05*(1-k)+.12*k;camShake=.035*(1-k)},()=>{camShake=0;glyphLevel=.12});
 },5800);
 setTimeout(()=>{
   speak("HEMTON",["Energy surge terminated.","Scanning the ground...","There is something beneath us."],missionComplete);
 },6600);
}
function missionComplete(){
 bannerEl.style.display="block";
 bannerEl.classList.remove("show");void bannerEl.offsetWidth;bannerEl.classList.add("show");
 blip(440,.5,.12);
 setTimeout(()=>{
   bannerEl.style.display="none";
   setState("UNDERGROUND");
   toast("NEW OBJECTIVE",2200);
 },4600);
}
function updateMission(dt,t){
 barkCool-=dt;novaExcite=Math.max(0,novaExcite-dt);
 const p=player.position;
 if(state==="SIGNAL"&&!structArrived&&dist2D(p,STRUCT)<48){structArrived=true;runArrival()}
 if(state==="UNDERGROUND"&&!undergroundDone&&dist2D(p,fissure.pos)<8&&!speaking){
   undergroundDone=true;
   speak("HEMTON",["Signal source confirmed beneath the surface.","A descent will require preparation."],()=>toast("TO BE CONTINUED...",4200));
 }
 // NOVA reactions to the world
 if(novaMode!=="online"||speaking||busy||barkCool>0)return;
 if(ORDER.indexOf(state)<ORDER.indexOf("EXPEDITION")||state==="ACTIVATE"||state==="STRUCTURE")return;
 if(dist2D(p,nova.position)>16)return;
 const bark=(key,x,z,r,line)=>{
   if(barkFlags[key]||Math.hypot(p.x-x,p.z-z)>=r)return false;
   barkFlags[key]=1;barkCool=8;novaExcite=2.6;speak("NOVA",[line]);return true;
 };
 if(bark("energy",SITES.energy.x,SITES.energy.z,15,"Interesting energy signature."))return;
 if(bark("cave",caveMouth.x,caveMouth.z,13,"There's something below us."))return;
 if(bark("plant",SITES.plant.x,SITES.plant.z,14,"Organic growth. Highly unusual."))return;
 if(bark("equip",SITES.equip.x,SITES.equip.z,13,"Human equipment. Damaged, but salvageable."))return;
 if(bark("unk",SITES.unknown.x,SITES.unknown.z,11,"I don't recognize this material."))return;
 if(!barkFlags.energyPick){
   for(const g of pickups){
     if(g.userData.type==="energy"&&dist2D(p,g.position)<7){barkFlags.energyPick=1;barkCool=8;novaExcite=2.6;speak("NOVA",["Interesting energy signature."]);return}
   }
 }
}
function updateSitesFX(dt,t){
 if(siteFX.crystalMat)siteFX.crystalMat.emissiveIntensity=1.1+.5*Math.sin(t*2.1);
 if(siteFX.haloMat)siteFX.haloMat.opacity=.12+.07*Math.sin(t*2.6);
 if(siteFX.haloMat2)siteFX.haloMat2.opacity=.16+.07*Math.sin(t*2.2+1);
 applyGlyph(state==="ACTIVATE"?glyphLevel:glyphLevel*(1+.12*Math.sin(t*1.7)));
 for(const b of siteFX.blinkMats)b.color.setHex(Math.sin(t*3.5)>.2?0xff3030:0x300808);
 for(const s of siteFX.sparks)s.visible=Math.random()<.3;
 if(fissure.g&&fissure.g.visible){
   fissure.col.material.opacity=.2+.07*Math.sin(t*3);
   const a=fissure.pts.geometry.attributes.position.array;
   for(let i=0;i<fissure.pa.length;i+=3){
     fissure.pa[i+1]+=dt*(1.6+(i%7)*.3);
     if(fissure.pa[i+1]>10)fissure.pa[i+1]-=10;
     a[i]=fissure.pa[i];a[i+1]=fissure.pa[i+1];a[i+2]=fissure.pa[i+2];
   }
   fissure.pts.geometry.attributes.position.needsUpdate=true;
 }
}
