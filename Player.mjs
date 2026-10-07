function makeNexusPatch(){
 const [c,g]=mkCanvas(128,48);
 g.fillStyle="#14151a";g.fillRect(0,0,128,48);
 g.strokeStyle="#9c65ff";g.lineWidth=3;g.strokeRect(2,2,124,44);
 g.fillStyle="#fff";g.font="bold 26px Arial";g.textAlign="center";g.textBaseline="middle";g.fillText("NEXUS",64,25);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function createPlayer(){
 player=new THREE.Group();
 const suit=new THREE.MeshStandardMaterial({color:0x2a2c34,roughness:.74,metalness:.1});
 const suit2=new THREE.MeshStandardMaterial({color:0x3b3e49,roughness:.6,metalness:.25});
 const white=new THREE.MeshStandardMaterial({color:0xe9e8ee,roughness:.55,metalness:.1});
 const metal=new THREE.MeshStandardMaterial({color:0xc8cbd4,roughness:.3,metalness:.9});
 const dark=new THREE.MeshStandardMaterial({color:0x14151a,roughness:.85,metalness:.2});
 const skin=new THREE.MeshStandardMaterial({color:0xc58e6d,roughness:.62,metalness:0});
 const hairM=new THREE.MeshStandardMaterial({color:0x2b1c14,roughness:.85,metalness:0});
 const neon=glow(0x9c65ff);
 const root=new THREE.Group();
 root.scale.setScalar(.93);
 player.add(root);
 const add=(parent,geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m};

 // torso, pelvis, belt
 const torso=add(root,new THREE.CapsuleGeometry(.235,.36,8,18),suit,0,1.3,0);torso.scale.set(1.12,1,.78);
 const pelvis=add(root,new THREE.CapsuleGeometry(.2,.08,6,14),suit,0,.93,0);pelvis.scale.set(1.15,1,.85);
 add(root,new THREE.BoxGeometry(.4,.24,.05),white,0,1.4,.2);
 add(root,new THREE.BoxGeometry(.4,.02,.052),neon,0,1.27,.2);
 for(const s of [-1,1]){
   add(root,new THREE.BoxGeometry(.018,.5,.012),neon,s*.19,1.2,.185);
   add(root,new THREE.BoxGeometry(.2,.06,.22),white,s*.27,1.6,0).rotation.z=-s*.25;
 }
 // NEXUS patch, ID card and emergency beacon
 const patch=new THREE.Mesh(new THREE.PlaneGeometry(.12,.045),new THREE.MeshBasicMaterial({map:makeNexusPatch(),toneMapped:false}));
 patch.position.set(.12,1.46,.228);root.add(patch);
 add(root,new THREE.BoxGeometry(.06,.08,.012),white,.14,1.33,.228);
 add(root,new THREE.BoxGeometry(.06,.014,.014),neon,.14,1.3,.234);
 add(root,new THREE.BoxGeometry(.05,.05,.03),glow(0xff8a32),-.13,1.45,.232);
 const belt=add(root,new THREE.TorusGeometry(.25,.03,8,24),dark,0,.99,0);belt.rotation.x=Math.PI/2;belt.scale.set(1.12,.8,1);
 add(root,new THREE.BoxGeometry(.07,.05,.02),neon,0,.99,.205);
 for(const s of [-1,1])add(root,new THREE.BoxGeometry(.1,.12,.07),suit2,s*.21,.94,.1);
 add(root,new THREE.BoxGeometry(.16,.1,.07),suit2,0,.96,-.2);
 add(root,new THREE.CylinderGeometry(.02,.02,.16,8),metal,-.26,.88,.02);

 // neck, collar, head
 add(root,new THREE.CylinderGeometry(.06,.07,.14,12),skin,0,1.62,0);
 const collar=add(root,new THREE.TorusGeometry(.115,.035,8,18),suit2,0,1.58,0);collar.rotation.x=Math.PI/2;
 const cg=add(root,new THREE.TorusGeometry(.12,.008,6,18),neon,0,1.607,0);cg.rotation.x=Math.PI/2;
 const head=new THREE.Group();head.position.set(0,1.77,0);root.add(head);
 const skull=add(head,new THREE.SphereGeometry(.125,24,18),skin,0,0,0);skull.scale.set(.9,1.08,1);
 const jaw=add(head,new THREE.SphereGeometry(.095,18,12),skin,0,-.065,.03);jaw.scale.set(.95,.9,.95);
 const eyeW=new THREE.MeshStandardMaterial({color:0xf2eee8,roughness:.4}),iris=new THREE.MeshStandardMaterial({color:0x2a3a50,roughness:.3});
 for(const s of [-1,1]){
   add(head,new THREE.SphereGeometry(.02,10,8),eyeW,s*.04,.02,.11).scale.z=.6;
   add(head,new THREE.SphereGeometry(.012,8,6),iris,s*.04,.02,.124);
   add(head,new THREE.BoxGeometry(.045,.008,.012),hairM,s*.04,.05,.118).rotation.z=s*-.12;
   add(head,new THREE.SphereGeometry(.026,10,8),skin,s*.115,-.005,-.005).scale.set(.5,1,.8);
 }
 const nose=add(head,new THREE.ConeGeometry(.016,.045,8),skin,0,-.012,.128);nose.rotation.x=Math.PI/2;
 add(head,new THREE.BoxGeometry(.045,.006,.01),new THREE.MeshStandardMaterial({color:0x7a3b36,roughness:.6}),0,-.062,.118);
 const cap=add(head,new THREE.SphereGeometry(.133,20,12,0,Math.PI*2,0,Math.PI*.56),hairM,0,.012,-.008);cap.rotation.x=-.15;
 const up=new THREE.Vector3(0,1,0);
 for(let i=0;i<10;i++){
   const th=.2+rand()*.9,ph=rand()*Math.PI*2;
   const n=new THREE.Vector3(Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph));
   const tuft=add(head,new THREE.ConeGeometry(.028,.09,5),hairM,n.x*.13,n.y*.135+.01,n.z*.13);
   tuft.quaternion.setFromUnitVectors(up,n.clone().add(new THREE.Vector3((rand()-.5)*.6,.2,(rand()-.5)*.6)).normalize());
 }

 // helmet, folded and attached at the back of the collar
 const helm=new THREE.Group();helm.position.set(0,1.56,-.2);helm.rotation.x=-1.25;root.add(helm);
 add(helm,new THREE.SphereGeometry(.2,22,12,0,Math.PI*2,0,Math.PI/2),white,0,0,0);
 const rim=add(helm,new THREE.TorusGeometry(.2,.014,6,24),metal,0,0,0);rim.rotation.x=Math.PI/2;
 const hg=add(helm,new THREE.TorusGeometry(.2,.006,6,24),neon,0,.014,0);hg.rotation.x=Math.PI/2;

 // survival pack
 const pack=new THREE.Group();pack.position.set(0,1.16,-.24);root.add(pack);
 add(pack,new THREE.BoxGeometry(.36,.46,.17),suit2,0,0,0);
 add(pack,new THREE.BoxGeometry(.3,.04,.012),neon,0,.08,-.092);
 const can=add(pack,new THREE.CylinderGeometry(.045,.045,.34,10),metal,0,-.27,-.03);can.rotation.z=Math.PI/2;
 add(pack,new THREE.CylinderGeometry(.008,.008,.3,6),metal,.13,.35,-.02);
 const blink=add(pack,new THREE.SphereGeometry(.02,8,6),glow(0xff3030),.13,.51,-.02);

 // arms (index 1 = character's left arm, carries the scanner)
 scannerScreen=makeScreen("radar","#6fe0ff");
 const arms=[],forearms=[];
 for(const s of [-1,1]){
   const piv=new THREE.Group();piv.position.set(s*.35,1.56,0);root.add(piv);
   add(piv,new THREE.SphereGeometry(.1,16,12),suit2,0,0,0);
   const upG=new THREE.Group();upG.rotation.z=s*.1;piv.add(upG);
   add(upG,new THREE.CapsuleGeometry(.075,.2,6,14),suit,0,-.2,0);
   const b1=add(upG,new THREE.TorusGeometry(.079,.013,6,16),white,0,-.12,0);b1.rotation.x=Math.PI/2;
   const b2=add(upG,new THREE.TorusGeometry(.079,.008,6,16),neon,0,-.17,0);b2.rotation.x=Math.PI/2;
   add(upG,new THREE.SphereGeometry(.068,12,10),suit2,0,-.4,0);
   const fore=new THREE.Group();fore.position.set(0,-.4,0);fore.rotation.x=-.4;upG.add(fore);
   add(fore,new THREE.CapsuleGeometry(.065,.18,6,14),suit,0,-.17,0);
   const st=add(fore,new THREE.TorusGeometry(.068,.01,6,16),white,0,-.28,0);st.rotation.x=Math.PI/2;
   const hand=add(fore,new THREE.SphereGeometry(.075,14,10),dark,0,-.4,.01);hand.scale.set(1,1.15,.85);
   add(fore,new THREE.CapsuleGeometry(.022,.05,4,8),dark,-s*.065,-.38,.03).rotation.z=s*.6;
   if(s===1){
     add(fore,new THREE.BoxGeometry(.115,.15,.045),suit2,0,-.19,.085);
     const scr=new THREE.Mesh(new THREE.PlaneGeometry(.085,.11),scannerScreen);scr.position.set(0,-.19,.1085);fore.add(scr);
     for(const x of [-.062,.062])add(fore,new THREE.BoxGeometry(.01,.15,.01),neon,x,-.19,.108);
     add(fore,new THREE.CylinderGeometry(.012,.012,.03,8),glow(0x6fe0ff),0,-.285,.09);
   }
   arms.push(piv);forearms.push(fore);
 }

 // legs
 const legs=[];
 for(const s of [-1,1]){
   const piv=new THREE.Group();piv.position.set(s*.12,.98,0);root.add(piv);
   add(piv,new THREE.CapsuleGeometry(.105,.28,6,14),suit,0,-.2,0);
   add(piv,new THREE.BoxGeometry(.15,.12,.07),white,0,-.46,.1);
   add(piv,new THREE.CapsuleGeometry(.09,.24,6,14),suit,0,-.64,0);
   const strap=add(piv,new THREE.TorusGeometry(.093,.008,6,16),neon,0,-.7,0);strap.rotation.x=Math.PI/2;
   add(piv,new THREE.BoxGeometry(.19,.17,.35),dark,0,-.875,.06);
   add(piv,new THREE.BoxGeometry(.21,.04,.39),suit2,0,-.96,.06);
   add(piv,new THREE.BoxGeometry(.215,.012,.4),neon,0,-.94,.06);
   add(piv,new THREE.BoxGeometry(.18,.09,.12),suit2,0,-.9,.24);
   legs.push(piv);
 }

 player.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
 player.userData={root,arms,forearms,legs,blink};
 player.position.set(0,terrainHeight(0,6),6);
 scene.add(player);
}
