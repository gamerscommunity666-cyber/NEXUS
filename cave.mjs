/* ============================================================
   Part 2: THE CAVE — an enclosed interior built far from the map
   ============================================================ */
const CAVE_OX=600,CAVE_OZ=600;
const CV={aHalf:2.9,aZ1:-34,bX:0,bZ:-46,bRX:13,bRZ:12,cHalf:2.5,cZ0:-58,cZ1:-92,dX:0,dZ:-132,dRX:34,dRZ:40,ch0:-112,ch1:-128,bridgeHalf:2.2};
let inCave=false,caveG=null,headLamp=null,caveWallMat=null;
const caveLights=[],caveSolids=[],caveCrystals=[];
const caveFX={crystalMat:null,crystalLv:1,lineMat:null,lineLv:.55,inscMat:null,inscText:null,inscTextLv:0,mist:null,sparks:null,sparkBase:null,decoHalo:null,bridgeLight:null,crystalLight:null,farLight:null};
let hemiLight=null,fillLight=null;

function caveInside(x,z,m){
 if(z<=1.2&&z>=CV.aZ1-1&&Math.abs(x)<=CV.aHalf-m)return true;
 let dx=(x-CV.bX)/(CV.bRX-m),dz=(z-CV.bZ)/(CV.bRZ-m);
 if(dx*dx+dz*dz<=1)return true;
 if(z<=CV.cZ0+1&&z>=CV.cZ1-1&&Math.abs(x)<=CV.cHalf-m)return true;
 dx=(x-CV.dX)/(CV.dRX-m);dz=(z-CV.dZ)/(CV.dRZ-m);
 if(dx*dx+dz*dz<=1&&(z>CV.ch0+m||z<CV.ch1-m))return true;
 if(z<=CV.ch0+.5&&z>=CV.ch1-.5&&Math.abs(x)<=CV.bridgeHalf-m)return true;
 return false;
}
function caveFloorCell(x,z){
 if(z<=1.5&&z>=CV.aZ1-2&&Math.abs(x)<=CV.aHalf+1.5)return true;
 let dx=(x-CV.bX)/(CV.bRX+2),dz=(z-CV.bZ)/(CV.bRZ+2);
 if(dx*dx+dz*dz<=1)return true;
 if(z<=CV.cZ0+2&&z>=CV.cZ1-2&&Math.abs(x)<=CV.cHalf+1.5)return true;
 dx=(x-CV.dX)/(CV.dRX+2);dz=(z-CV.dZ)/(CV.dRZ+2);
 if(dx*dx+dz*dz<=1&&(z>CV.ch0||z<CV.ch1))return true;
 return false;
}
function caveBase(z){
 if(z>-34)return -3*Math.min(1,Math.max(0,-z/34));
 if(z>-58)return -3;
 if(z>-92)return -3-8*(-z-58)/34;
 return -11;
}
function caveFloor(x,z){
 const n=Math.sin(x*.9+z*.6)*Math.cos(z*.7-x*.4)*.18+Math.sin(x*2.1+z*1.7)*.05;
 const onBridge=z<CV.ch0+.5&&z>CV.ch1-.5&&Math.abs(x)<CV.bridgeHalf+.3;
 return caveBase(z)+(onBridge?0:n);
}
function caveConstrain(pos,ox,oz,m){
 if(caveInside(pos.x-CAVE_OX,pos.z-CAVE_OZ,m))return;
 if(caveInside(pos.x-CAVE_OX,oz-CAVE_OZ,m)){pos.z=oz;return}
 if(caveInside(ox-CAVE_OX,pos.z-CAVE_OZ,m)){pos.x=ox;return}
 pos.x=ox;pos.z=oz;
}
function collideCave(pos,r){
 for(const o of caveSolids){
   const dx=pos.x-o.x,dz=pos.z-o.z;
   if(Math.abs(dx)>o.r+r||Math.abs(dz)>o.r+r)continue;
   const d=Math.hypot(dx,dz),min=o.r+r;
   if(d<min&&d>1e-6){pos.x=o.x+dx/d*min;pos.z=o.z+dz/d*min}
 }
}
/* one entry point for NOVA / player movement outside or inside */
function collideAny(pos,r,ox,oz){
 if(inCave){caveConstrain(pos,ox,oz,r);collideCave(pos,r)}
 else collideWorld(pos,r);
}

/* ---------- geometry helpers ---------- */
function shellTunnel(z0,y0,z1,y1,R,off,seed){
 const dir=new THREE.Vector3(0,y1-y0,z1-z0),len=dir.length();dir.normalize();
 const g=new THREE.CylinderGeometry(R,R,len+3,20,Math.max(2,Math.round(len/3)),true);
 const p=g.attributes.position,uv=g.attributes.uv,col=[];
 for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   const n=1+(Math.sin(x*.9+y*.31+seed)*.12+Math.sin(z*1.3+y*.5+seed*2)*.1+Math.sin(x*2.1+y*1.7+z*1.9)*.05);
   p.setX(i,x*n);p.setZ(i,z*n);
   const t=.5+.2*Math.sin(y*.4+x*.8+seed);
   col.push(t,t*.86,t*.92);
   uv.setXY(i,uv.getX(i)*(2*Math.PI*R/6),uv.getY(i)*(len/6));
 }
 g.setAttribute("color",new THREE.Float32BufferAttribute(col,3));
 const m=new THREE.Mesh(g,caveWallMat);
 m.position.set(0,(y0+y1)/2+off,(z0+z1)/2);
 m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
 return m;
}
function shellEllipsoid(cx,cy,cz,rx,ry,rz,seed,carves){
 const g=new THREE.SphereGeometry(1,30,20);
 const p=g.attributes.position,uv=g.attributes.uv,col=[];
 for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   const n=1+Math.sin(x*3.1+seed)*.05+Math.sin(y*4.3+z*2.7+seed)*.045+Math.sin(z*5.2+x*3.3)*.025;
   p.setXYZ(i,x*rx*n,y*ry*n,z*rz*n);
   const wy=cy+y*ry;
   const t=Math.max(.04,Math.min(.62,.5+.2*Math.sin(x*5+z*4+seed)+(wy+13)*.012));
   col.push(t,t*.85,t*.92);
   uv.setXY(i,uv.getX(i)*10,uv.getY(i)*5);
 }
 g.setAttribute("color",new THREE.Float32BufferAttribute(col,3));
 if(carves&&carves.length){
   const idx=g.index.array,keep=[];
   for(let i=0;i<idx.length;i+=3){
     const a=idx[i],b=idx[i+1],c=idx[i+2];
     const wx=cx+(p.getX(a)+p.getX(b)+p.getX(c))/3,wy=cy+(p.getY(a)+p.getY(b)+p.getY(c))/3,wz=cz+(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;
     let cut=false;
     for(const f of carves){if(f(wx,wy,wz)){cut=true;break}}
     if(!cut)keep.push(a,b,c);
   }
   g.setIndex(keep);
 }
 const m=new THREE.Mesh(g,caveWallMat);m.position.set(cx,cy,cz);
 return m;
}
const tunnelAxisA=z=>caveBase(z)+1.5;
const tunnelAxisC=z=>caveBase(z)+1.3;

function makeInscriptionText(){
 const [c,g]=mkCanvas(512,128);
 g.font="bold 78px Arial";g.textAlign="center";g.textBaseline="middle";
 g.shadowColor="#ff5acb";g.shadowBlur=26;g.fillStyle="#ffe0f6";
 g.fillText("DO NOT COME",256,66);
 g.shadowBlur=10;g.fillText("DO NOT COME",256,66);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function createCave(){
 TEX.caveRock=TEX.ground.clone();TEX.caveRock.needsUpdate=true;TEX.caveRock.repeat.set(1,1);
 caveWallMat=new THREE.MeshStandardMaterial({map:TEX.caveRock,color:0x9a8a9a,vertexColors:true,roughness:1,metalness:0,side:THREE.BackSide,flatShading:true,bumpMap:TEX.caveRock,bumpScale:.8});
 const floorMat=new THREE.MeshStandardMaterial({map:TEX.caveRock,color:0x9d8e96,vertexColors:true,roughness:1,metalness:0,bumpMap:TEX.caveRock,bumpScale:.8});
 const stone=new THREE.MeshStandardMaterial({map:TEX.ancient,color:0xa59db3,roughness:.8,metalness:.45});
 const stoneDark=new THREE.MeshStandardMaterial({map:TEX.ancient,color:0x6a6478,roughness:.75,metalness:.55});
 const rockMatCave=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:true,color:0x9a8c98});
 caveFX.crystalMat=new THREE.MeshStandardMaterial({color:0x1d3a6a,emissive:0x4fc8ff,emissiveIntensity:1.2,roughness:.15,metalness:.4,flatShading:true});
 caveFX.lineMat=new THREE.MeshBasicMaterial({color:0x6fe0ff,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 caveFX.inscMat=new THREE.MeshBasicMaterial({map:TEX.glyph,color:0x7a50c8,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 const lineMat=caveFX.lineMat;
 const glyphMatC=new THREE.MeshBasicMaterial({map:TEX.glyph,color:0x6a48b0,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});

 const G=new THREE.Group();G.position.set(CAVE_OX,0,CAVE_OZ);G.visible=false;scene.add(G);caveG=G;
 const solid=(x,z,r)=>caveSolids.push({x:CAVE_OX+x,z:CAVE_OZ+z,r});
 const reg2=(id,name,lines,x,y,z,radius)=>{
   const sc={id,name,lines,pos:new THREE.Vector3(CAVE_OX+x,y,CAVE_OZ+z),radius,poi:false,scanned:false,depleted:false,struct:false,hidden:false};
   scannables.push(sc);return sc;
 };

 /* floor */
 {
   const x0=-40,x1=40,z0=-176,z1=4,s=2,nx=(x1-x0)/s,nz=(z1-z0)/s;
   const pos=[],uvs=[],col=[],idx=[];
   for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
     const x=x0+i*s,z=z0+j*s;
     pos.push(x,caveFloor(x,z),z);uvs.push(x/6,z/6);
     const t=.55+.25*Math.sin(x*.7+z*.5)*Math.cos(z*.4-x*.3);
     col.push(t,t*.85,t*.9);
   }
   for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
     if(!caveFloorCell(x0+i*s+s/2,z0+j*s+s/2))continue;
     const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
     idx.push(a,c,b,b,c,d);
   }
   const fg=new THREE.BufferGeometry();
   fg.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
   fg.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
   fg.setAttribute("color",new THREE.Float32BufferAttribute(col,3));
   fg.setIndex(idx);fg.computeVertexNormals();
   const fm=new THREE.Mesh(fg,floorMat);fm.receiveShadow=false;G.add(fm);
 }

 /* wall shells: two tunnels and two chambers, carved where they join */
 G.add(shellTunnel(0,0,-34,-3,3.6,1.5,1.3));
 G.add(shellTunnel(-58,-3,-92,-11,3.3,1.3,4.1));
 const carveA=(x,y,z)=>z>-40&&Math.hypot(x,y-tunnelAxisA(z))<4.2;
 const carveC=(x,y,z)=>z<-52&&Math.hypot(x,y-tunnelAxisC(z))<3.9;
 const carveC2=(x,y,z)=>z>-98&&Math.hypot(x,y-tunnelAxisC(z))<3.9;
 G.add(shellEllipsoid(0,-1,-46,15,6,14,2.2,[carveA,carveC]));
 G.add(shellEllipsoid(0,-6.5,-132,38,23.5,45,5.7,[carveC2]));
 // daylight at the entrance end of the first tunnel
 {
   const cap=new THREE.Mesh(new THREE.CircleGeometry(4.4,24),new THREE.MeshBasicMaterial({color:0xffe2bd,toneMapped:false}));
   cap.position.set(0,1.1,1.6);cap.rotation.y=Math.PI;G.add(cap);
   const wall=new THREE.Mesh(new THREE.RingGeometry(1.9,4.6,24),new THREE.MeshBasicMaterial({color:0x050308,side:THREE.DoubleSide}));
   wall.position.set(0,.2,1.55);wall.scale.set(1.15,1,1);G.add(wall);
 }

 /* stalactites */
 {
   const sg=new THREE.ConeGeometry(.35,2.2,5);sg.rotateX(Math.PI);
   const mat=new THREE.MeshStandardMaterial({color:0x4a3d46,roughness:1,flatShading:true});
   const dummy=new THREE.Object3D();
   const make=(count,cx,cy,cz,rx,ry,rz,spread)=>{
     const im=new THREE.InstancedMesh(sg,mat,count);
     for(let i=0;i<count;i++){
       const a=rand()*6.28,r=Math.sqrt(rand())*spread;
       const x=Math.cos(a)*r,z=Math.sin(a)*r;
       const top=cy+ry*Math.sqrt(Math.max(.05,1-(x*x)/(rx*rx)-(z*z)/(rz*rz)));
       const sc=.6+rand()*1.7;
       dummy.position.set(cx+x,top-.4*sc,cz+z);dummy.rotation.set((rand()-.5)*.2,rand()*6,(rand()-.5)*.2);dummy.scale.set(sc,sc*(1+rand()),sc);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);
     }
     im.frustumCulled=false;G.add(im);
   };
   make(22,0,-1,-46,13,6,12,10);
   make(38,0,-6.5,-132,36,23.5,42,30);
 }

 /* boulders (with collision) */
 {
   const rock=(x,z,size,sy2)=>{
     const m=new THREE.Mesh(rockGeo(size),rockMatCave);
     m.position.set(x,caveFloor(x,z)+size*.3*sy2,z);m.scale.y=sy2;m.rotation.set(rand()*.4,rand()*6,rand()*.4);G.add(m);
     solid(x,z,size*.8);
   };
   rock(-9,-52,1.6,1.3);rock(9.5,-37,1.4,1.4);rock(-10,-40,1.2,1.2);rock(8,-54,1.1,1.1);
   for(const [x,z,s] of [[-20,-96,2.6],[19,-98,2.2],[-24,-106,2.0],[23,-108,2.4],[-18,-140,2.4],[20,-143,2.8],[-26,-150,2.2],[14,-152,2]])rock(x,z,s,1.3);
 }

 /* crystals: collectible clusters and decoration */
 const crystalDefs=[[-6.5,-45],[7,-40],[3.5,-53],[-11,-100],[12,-104],[-7,-95],[-9,-137],[10,-141]];
 {
   const cm=caveFX.crystalMat,haloTex=TEX.smoke;
   for(const [x,z] of crystalDefs){
     const g=new THREE.Group();
     const n=3+Math.floor(rand()*3);
     for(let i=0;i<n;i++){
       const s=i===0?1.2+rand()*.4:.4+rand()*.6;
       const c=new THREE.Mesh(new THREE.ConeGeometry(.28*s,1.7*s,6),cm);
       const a=rand()*6.28,r=i===0?0:.35+rand()*.5;
       c.position.set(Math.cos(a)*r,.8*s-.05,Math.sin(a)*r);c.rotation.set((rand()-.5)*.7,rand()*6,(rand()-.5)*.7);g.add(c);
     }
     const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex,color:0x4fc8ff,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
     halo.scale.set(3.4,3.4,1);halo.position.y=1;g.add(halo);
     g.position.set(x,caveFloor(x,z),z);G.add(g);
     const sc=reg2("crystal"+caveCrystals.length,"UNKNOWN CRYSTALLINE MATERIAL",["ENERGY: ANOMALOUS","COLLECTABLE"],x,caveFloor(x,z)+1,z,1.2);
     caveCrystals.push({g,x:CAVE_OX+x,z:CAVE_OZ+z,taken:false,idd:false,halo,sc});
     solid(x,z,.7);
   }
   // wall decoration, instanced
   const N=46,im=new THREE.InstancedMesh(new THREE.ConeGeometry(.4,2.4,6),cm,N),dummy=new THREE.Object3D();
   for(let i=0;i<N;i++){
     let x,z,y,rot;
     const k=i%3;
     if(k===0){const a=rand()*6.28;x=Math.cos(a)*12.3;z=-46+Math.sin(a)*11.3;y=-3}
     else if(k===1){const a=Math.PI*(.15+rand()*.7),sd=rand()<.5?-1:1;x=sd*(33*Math.cos(a)*.98);z=-132-Math.sin(a)*38*(rand()<.5?1:-1);if(Math.abs(z+120)<12)z=-100;y=-11}
     else{z=-60-rand()*30;x=(rand()<.5?-1:1)*2.7;y=caveBase(z)}
     const s=.5+rand()*1.1;
     dummy.position.set(x,y+1.0*s,z);dummy.rotation.set((rand()-.5)*.8,rand()*6,(rand()-.5)*.8+(x>0?.3:-.3));dummy.scale.setScalar(s);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);
   }
   im.frustumCulled=false;G.add(im);
   // floating sparkles around the crystals
   const NS=90,base=new Float32Array(NS*3);
   for(let i=0;i<NS;i++){const c=crystalDefs[i%crystalDefs.length];base[i*3]=c[0]+(rand()-.5)*6;base[i*3+1]=caveFloor(c[0],c[1])+.5+rand()*3.5;base[i*3+2]=c[1]+(rand()-.5)*6}
   const sg=new THREE.BufferGeometry();sg.setAttribute("position",new THREE.BufferAttribute(new Float32Array(base),3));
   caveFX.sparkBase=base;
   caveFX.sparks=new THREE.Points(sg,new THREE.PointsMaterial({color:0xaaf0ff,size:.13,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
   caveFX.sparks.frustumCulled=false;G.add(caveFX.sparks);
 }

 /* ancient technology hints: tunnel panels, ruined arch, buried slab */
 {
   [[-64,-1],[-72,1],[-80,-1],[-88,1]].forEach(([z,sd])=>{
     const y=caveBase(z);
     const p=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.5),glyphMatC);p.position.set(sd*2.95,y+1.9,z);p.rotation.y=-sd*Math.PI/2;G.add(p);
     const l=new THREE.Mesh(new THREE.BoxGeometry(.06,.07,5.6),lineMat);l.position.set(sd*3.0,y+.6,z+2.6);G.add(l);
   });
   const za=-76,ya=caveBase(za);
   for(const s of [-1,1]){const pl=new THREE.Mesh(new THREE.BoxGeometry(.9,4.2,.9),stone);pl.position.set(s*2.3,ya+2.1,za);G.add(pl)}
   const lin=new THREE.Mesh(new THREE.BoxGeometry(5.6,.8,1.1),stoneDark);lin.position.set(0,ya+4.3,za);lin.rotation.z=.04;G.add(lin);
   const slab=new THREE.Mesh(new THREE.BoxGeometry(4.2,5,.9),stone);slab.position.set(0,-3+1.8,-58.5);slab.rotation.set(.14,0,.05);G.add(slab);
   const sgl=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.8),glyphMatC);sgl.position.set(0,-3+2.0,-58.0);sgl.rotation.x=.14;G.add(sgl);
   reg2("tech","ANCIENT TECHNOLOGY",["ORIGIN: UNKNOWN","STATUS: DORMANT"],0,-3+2,-58,5);
 }

 /* the bridge */
 {
   const deckY=-11,Z0=-112,Z1=-128;
   for(let i=0;i<6;i++){
     const zc=Z0-1.4-i*2.7;
     const d=new THREE.Mesh(new THREE.BoxGeometry(4.4,.3,2.66),stoneDark);
     d.position.set(0,deckY-.15+(i%2?-.03:.02),zc);d.rotation.z=(i%3-1)*.008;d.receiveShadow=true;G.add(d);
   }
   for(const s of [-1,1]){
     const ln=new THREE.Mesh(new THREE.BoxGeometry(.12,.05,16.4),lineMat);ln.position.set(s*1.9,deckY+.03,(Z0+Z1)/2);G.add(ln);
     for(let i=0;i<6;i++){
       if((i+(s>0?1:0))%4===3)continue;                         // broken railing
       const r=new THREE.Mesh(new THREE.BoxGeometry(.22,.7,2.2),stone);r.position.set(s*2.2,deckY+.35,Z0-1.4-i*2.7);r.rotation.z=(i%2?.05:-.03);G.add(r);
     }
     for(let i=0;i<5;i++){
       const v=new THREE.Mesh(new THREE.BoxGeometry(.07,9,.07),lineMat);v.position.set(s*2.15,deckY-5,Z0-2-i*3.2);G.add(v);
     }
   }
   for(let i=0;i<3;i++){
     const rib=new THREE.Mesh(new THREE.TorusGeometry(2.3,.2,6,16,Math.PI),stoneDark);
     rib.position.set(0,deckY-.35,Z0-2.5-i*5.5);rib.rotation.z=Math.PI;G.add(rib);
   }
   for(const [z,sg] of [[Z0+1.2,1],[Z1-1.2,-1]]){
     for(const s of [-1,1]){
       const p=new THREE.Mesh(new THREE.BoxGeometry(1.4,5,1.4),stone);p.position.set(s*3.5,deckY+2.5,z);G.add(p);
       const gp=new THREE.Mesh(new THREE.PlaneGeometry(1.1,3.2),glyphMatC);gp.position.set(s*3.5-s*.72,deckY+2.6,z);gp.rotation.y=s*Math.PI/2;G.add(gp);
       const cap=new THREE.Mesh(new THREE.BoxGeometry(.5,.2,.5),lineMat);cap.position.set(s*3.5,deckY+5.1,z);G.add(cap);
     }
   }
   caveFX.mist=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.smoke,color:0x6a4aff,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}));
   caveFX.mist.scale.set(46,22,1);caveFX.mist.position.set(0,-21,-120);G.add(caveFX.mist);
   reg2("bridge","ANCIENT BRIDGE",["ORIGIN: UNKNOWN","STRUCTURAL DAMAGE","ENERGY CHANNELS ACTIVE"],0,deckY+1,-120,9);
 }

 /* the sealed ancient wall with the warning */
 {
   const zw=-161,by=-11;
   const wall=new THREE.Mesh(new THREE.BoxGeometry(30,17,3),stone);wall.position.set(0,by+8.5,zw);G.add(wall);
   for(const s of [-1,1]){const pc=new THREE.Mesh(new THREE.BoxGeometry(3.4,20,3.6),stoneDark);pc.position.set(s*15.4,by+10,zw+.3);G.add(pc)}
   const door=new THREE.Mesh(new THREE.TorusGeometry(5.2,.2,6,40,Math.PI),lineMat);door.position.set(0,by+2.4,zw+1.6);G.add(door);
   const seal=new THREE.Mesh(new THREE.CircleGeometry(4.2,32),new THREE.MeshStandardMaterial({color:0x2a2733,roughness:.4,metalness:.85}));seal.position.set(0,by+6,zw+1.55);G.add(seal);
   for(const r of [1.4,2.6,3.8]){const ring=new THREE.Mesh(new THREE.RingGeometry(r-.08,r,40),lineMat);ring.position.set(0,by+6,zw+1.6);G.add(ring)}
   for(let i=-2;i<=2;i++){
     if(i===0)continue;
     const gp=new THREE.Mesh(new THREE.PlaneGeometry(2.2,10),glyphMatC);gp.position.set(i*5.2,by+7.5,zw+1.55);G.add(gp);
   }
   const band=new THREE.Mesh(new THREE.PlaneGeometry(13,2.4),caveFX.inscMat);band.position.set(0,by+13.3,zw+1.56);G.add(band);
   const txt=new THREE.Mesh(new THREE.PlaneGeometry(14,3.5),new THREE.MeshBasicMaterial({map:makeInscriptionText(),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}));
   txt.position.set(0,by+10.2,zw+1.7);G.add(txt);caveFX.inscText=txt;
   for(let x=-14;x<=14;x+=4)solid(x,zw+1,2.3);
   reg2("wall","ANCIENT STRUCTURE",["ORIGIN: UNKNOWN","INSCRIPTION DETECTED"],0,by+6,zw,16);
 }

 /* lights (only visible while inside) */
 {
   headLamp=new THREE.PointLight(0xdfe8ff,26,16,2);headLamp.visible=false;scene.add(headLamp);
   const mkL=(c,i,d,x,y,z)=>{const l=new THREE.PointLight(c,i,d,2);l.position.set(CAVE_OX+x,y,CAVE_OZ+z);l.visible=false;scene.add(l);caveLights.push(l);return l};
   caveFX.crystalLight=mkL(0x6fe0ff,70,30,0,0,-46);
   caveFX.bridgeLight=mkL(0x78c8ff,100,48,0,-5,-120);
   caveFX.farLight=mkL(0xa070ff,70,34,0,-3,-150);
 }
}

/* ---------- light / atmosphere switch used by enterCave and exitCave ---------- */
function setCaveLighting(on){
 sun.visible=!on;fillLight.visible=!on;
 hemiLight.intensity=on?.2:.9;
 scene.environmentIntensity=on?.16:.55;
 headLamp.visible=on;for(const l of caveLights)l.visible=on;
 scene.fog.color.setHex(on?0x07040c:0x5a2f3a);
 scene.fog.density=on?.026:.0034;
 sky.visible=!on;terrain.visible=!on;ship.visible=!on;
 caveG.visible=on;
 dust.material.color.setHex(on?0x9a8fb8:0xe0a47c);
 hideMarkers();
}
function fadeThen(cb,hold=700){
 fadeEl.style.opacity="1";
 setTimeout(()=>{cb();setTimeout(()=>{fadeEl.style.opacity="0"},220)},hold);
}
/* ---------- CHAPTER 1 cave cinematic ---------- */
let novaLostInCave=false;
let lastCaveExit=0;
let bridgeSequenceStarted=false;
let bridgeSequenceFinished=false;
function safeVibrate(pattern){try{if(typeof vibrate==="function")vibrate(pattern)}catch(e){}}
function safeBlip(f,d,v){try{if(typeof blip==="function")blip(f,d,v)}catch(e){}}
function safeHum(d,f,v){try{if(typeof hum==="function")hum(d,f,v)}catch(e){}}
function triggerCaveBridgeSequence(){
 if(bridgeSequenceStarted||novaLostInCave||state!=="CAVE")return;
 bridgeSequenceStarted=true;inputLocked=true;novaScript=null;
 if(typeof speak!=="function"){finishBridgeSequence();return}
 speak("NOVA",["Hemadri...?"] ,()=>{
   try{flashEl.style.opacity="1"}catch(e){}
   safeHum(.7,58,.28);safeVibrate([80,40,120]);
   setTimeout(()=>{
     novaLostInCave=true;
     try{novaMode="lost"}catch(e){}
     try{nova.visible=false;flashEl.style.opacity="0"}catch(e){}
     safeBlip(130,.35,.16);
     speak("NEUTRON",["SIGNAL LOST"],()=>speak("HEMADRI",["NOVA?","NOVA!"],finishBridgeSequence));
   },520);
 });
}
function finishBridgeSequence(){
 try{caveFX.crystalLv=1.8;caveFX.lineLv=1.25}catch(e){}
 bridgeSequenceFinished=true;
 if(typeof setState==="function")setState("CRYSTALS");
 if(typeof neutron==="function")neutron("COLLECT THE CRYSTALS","UNKNOWN ENERGY SIGNATURE");
 inputLocked=false;
}
function enterCave(){
 if(inCave||inputLocked)return;inputLocked=true;
 fadeThen(()=>{
   inCave=true;setCaveLighting(true);
   player.position.set(CAVE_OX,caveFloor(0,-1.2),CAVE_OZ-1.2);
   velocityX=velocityZ=velocityY=0;yaw=0;pitch=.04;
   if(!novaLostInCave){
     nova.position.set(CAVE_OX+1.3,caveFloor(1.3,-3)+.65,CAVE_OZ-3);
     nova.rotation.y=0;novaScript=null;try{nova.visible=true}catch(e){}
   }
   if(state==="CAVE_ENTRY"){setState("CAVE");toast("THE CAVE",1800)}
   inputLocked=false;
 });
}
function exitCave(){
 if(!inCave||inputLocked)return;inputLocked=true;
 fadeThen(()=>{
   inCave=false;setCaveLighting(false);
   const c=Math.cos(caveSite.rot),s=Math.sin(caveSite.rot),dx=c,dz=-s;
   const px=caveMouth.x+dx*2.8,pz=caveMouth.z+dz*2.8;
   player.position.set(px,terrainHeight(px,pz),pz);
   velocityX=velocityZ=velocityY=0;yaw=Math.atan2(-dx,-dz);pitch=.1;
   if(!novaLostInCave && typeof novaMode!=="undefined" && novaMode==="online"){
     nova.position.set(px+dx*1.5-dz*1.5,terrainHeight(px,pz)+.65,pz+dz*1.5+dx*1.5);try{nova.visible=true}catch(e){}
   }else if(novaLostInCave){try{nova.visible=false}catch(e){}}
   inputLocked=false;
   lastCaveExit=performance.now();
   if(state==="SURFACE"){                       // crystals collected: run the surface story beat
     if(typeof onSurfaceReached==="function")onSurfaceReached();
   }else if(state==="CRYSTALS"||state==="CAVE"){ // left early: story must NOT advance
     if(typeof toast==="function")toast("THE CRYSTALS ARE STILL BELOW",2200);
   }
 });
}

/* ---------- crystals ---------- */
let crystalsHeld=0;
const CRYSTALS_NEEDED=4;
function nearCrystal(){
 const p=player.position;
 for(const c of caveCrystals){
   if(c.taken)continue;
   if(Math.hypot(p.x-c.x,p.z-c.z)<3.2)return c;
 }
 return null;
}
function collectCrystal(c){
 c.taken=true;c.g.visible=false;c.sc.hidden=true;
 crystalsHeld++;
 refreshCrystalChip(true);
 toast("CRYSTAL COLLECTED  "+crystalsHeld+"/"+CRYSTALS_NEEDED,1800);
 blip(760,.18,.1);
 if(state==="CRYSTALS"&&crystalsHeld>=CRYSTALS_NEEDED){
   setState("SURFACE");
   neutron("RETURN TO THE SURFACE","ENERGY COMPATIBILITY STABLE");
 }
}
let crystalChip=null;
function refreshCrystalChip(bump){
 if(!crystalChip){
   crystalChip=document.createElement("span");
   crystalChip.className="chip";crystalChip.style.setProperty("--c","#4fc8ff");
   crystalChip.innerHTML="<i></i>CRYSTALS<b>0</b>";invEl.appendChild(crystalChip);
 }
 crystalChip.querySelector("b").textContent=crystalsHeld;
 if(bump){crystalChip.classList.remove("bump");void crystalChip.offsetWidth;crystalChip.classList.add("bump")}
}

/* ---------- per-frame cave effects ---------- */
function updateCaveFX(dt,t){
 if(!inCave)return;
 const p=player.position;
 if(!bridgeSequenceStarted && state==="CAVE" && Math.abs(p.x-CAVE_OX)<4.2 && p.z-CAVE_OZ<-106.0 && p.z-CAVE_OZ>-131.0){
   triggerCaveBridgeSequence();
   return;
 }
 headLamp.position.set(p.x,p.y+1.6,p.z);
 caveFX.crystalMat.emissiveIntensity=(1.0+.25*Math.sin(t*1.9))*caveFX.crystalLv;
 caveFX.crystalLight.intensity=(70+8*Math.sin(t*1.9))*(.6+.4*caveFX.crystalLv);
 caveFX.bridgeLight.intensity=100*(.7+.3*caveFX.lineLv);
 const lv=caveFX.lineLv;
 caveFX.lineMat.color.setRGB(.43*lv,.88*lv,1*lv);
 caveFX.inscMat.color.setRGB(.45*(.5+.5*Math.sin(t*1.1)),.3,.8);
 for(const c of caveCrystals){if(!c.taken)c.halo.material.opacity=(.38+.1*Math.sin(t*2+c.x))*(.7+.4*caveFX.crystalLv)}
 caveFX.inscText.material.opacity=caveFX.inscTextLv;
 caveFX.mist.material.opacity=.22+.05*Math.sin(t*.7);
 // sparkles
 const a=caveFX.sparks.geometry.attributes.position.array,b=caveFX.sparkBase;
 for(let i=0;i<a.length;i+=3){
   a[i]=b[i]+Math.sin(t*.6+i)*.4;a[i+1]=b[i+1]+Math.sin(t*.9+i*.7)*.5;a[i+2]=b[i+2]+Math.cos(t*.5+i)*.4;
 }
 caveFX.sparks.geometry.attributes.position.needsUpdate=true;
}
