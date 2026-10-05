/*!
 * Championship Rounds: low-poly 3D fight renderer (N64-era look) built on Three.js.
 * Copyright (c) 2026 SpecMagic Games. All rights reserved.
 *
 * Fighters are low-poly bodies driven by the same joint poses the 2D renderer uses (PO/GB/GT in
 * fightview.js), so every strike, sprawl and ground position animates the same way in 3D.
 * Renders at a low internal resolution and lets the browser upscale it for that console softness.
 * Falls back to the 2D renderer if Three.js or WebGL is unavailable.
 */
const K3=.065;                 // metres per engine unit
const X3=x=>(x-LV.W/2)*K3;     // engine x -> world x
function can3D(){try{if(typeof THREE==='undefined')return false;const c=document.createElement('canvas');return !!(c.getContext('webgl')||c.getContext('experimental-webgl'))}catch(e){return false}}

function tex3(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);
  const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;
  if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}return t}

/* ---------------- fighter rig ---------------- */
const SEG=(()=>{const cache={};return(rt,rb,n)=>{const k=rt+'|'+rb+'|'+n;if(!cache[k]){const g=new THREE.CylinderGeometry(rt,rb,1,n||6,1);g.translate(0,.5,0);cache[k]=g}return cache[k]}})();
const UP3=new THREE.Vector3(0,1,0);
function lam(c){return new THREE.MeshLambertMaterial({color:c})}
class Rig3{
  constructor(scene,look,o){o=o||{};this.ref=!!o.ref;this.bd=o.build||1;const bd=this.bd;
    const G=this.g=new THREE.Group();scene.add(G);
    const skin=lam(look.skin),trunk=lam(this.ref?'#3b3d44':look.trunk),glove=lam(this.ref?look.skin:look.glove),cuff=lam('#ece6da'),hair=lam(look.hair),dark=lam('#141010'),shirt=lam('#16161b'),shoe=lam('#111114');
    this.mats=[skin,trunk,glove,cuff,hair,shirt];this.skinC=new THREE.Color(look.skin);this.headMat=lam(look.skin);
    const add=(geo,mat)=>{const m=new THREE.Mesh(geo,mat);G.add(m);return m};
    const R=this.ref,arm=R?shirt:skin;
    // limbs: [mesh, from joint, to joint]
    this.L={
      uaB:add(SEG(.058*bd,.07*bd,6),arm),faB:add(SEG(.048*bd,.056*bd,6),skin),uaF:add(SEG(.058*bd,.07*bd,6),arm),faF:add(SEG(.048*bd,.056*bd,6),skin),
      thB:add(SEG(.085*bd,.115*bd,6),R?trunk:skin),shB:add(SEG(.055*bd,.08*bd,6),R?trunk:skin),thF:add(SEG(.085*bd,.115*bd,6),R?trunk:skin),shF:add(SEG(.055*bd,.08*bd,6),R?trunk:skin),
      sbB:add(SEG(.118*bd,.122*bd,6),trunk),sbF:add(SEG(.118*bd,.122*bd,6),trunk),neck:add(SEG(.055,.06,6),skin)};
    const tg=new THREE.CylinderGeometry(.5,.36,1,4,1);tg.rotateY(Math.PI/4);tg.translate(0,.5,0);
    this.torso=add(tg,R?shirt:skin);
    const pg=new THREE.BoxGeometry(.24,.2,.34);this.pelvis=add(pg.scale(bd,1,bd),trunk);
    if(!R){const wb=new THREE.BoxGeometry(.25,.045,.35);this.belt=add(wb.scale(bd,1,bd),lam(shadeHex(look.trunk,-.4)))}
    // head group: head, hair, eyes, brow
    this.head=new THREE.Group();G.add(this.head);
    const hg=new THREE.IcosahedronGeometry(.125,1);hg.scale(1,1.12,.94);const hm=new THREE.Mesh(hg,this.headMat);this.head.add(hm);
    const jaw=new THREE.Mesh(new THREE.BoxGeometry(.13,.08,.15),this.headMat);jaw.position.set(.04,-.075,0);this.head.add(jaw);
    const nose=new THREE.Mesh(new THREE.BoxGeometry(.04,.05,.035),this.headMat);nose.position.set(.125,-.01,0);this.head.add(nose);
    for(const z of [-.045,.045]){const e=new THREE.Mesh(new THREE.BoxGeometry(.02,.022,.03),dark);e.position.set(.112,.025,z);this.head.add(e)}
    const brow=new THREE.Mesh(new THREE.BoxGeometry(.03,.02,.15),hair);brow.position.set(.11,.06,0);this.head.add(brow);
    const hs=R?2:look.hs;
    if(hs!==0){const cap=new THREE.Mesh(new THREE.SphereGeometry(.132,8,4,0,Math.PI*2,0,hs===2?Math.PI*.32:Math.PI*.46),hair);cap.scale.set(1,1.12,.96);cap.rotation.z=.25;this.head.add(cap)}
    if(hs===3){const m=new THREE.Mesh(new THREE.BoxGeometry(.2,.06,.05),hair);m.position.set(-.01,.15,0);this.head.add(m)}
    if(hs===4){const p=new THREE.Mesh(new THREE.BoxGeometry(.08,.2,.16),hair);p.position.set(-.1,-.05,0);this.head.add(p)}
    if(look.beard&&!R){const b=new THREE.Mesh(new THREE.BoxGeometry(.1,.07,.15),hair);b.position.set(.07,-.1,0);this.head.add(b)}
    // gloves (or hands for the ref), feet
    const gs=R?.06:.115;this.glB=add(new THREE.BoxGeometry(gs,gs,gs*.9),glove);this.glF=add(new THREE.BoxGeometry(gs,gs,gs*.9),glove);
    if(!R){this.cuB=add(SEG(.052,.052,6),cuff);this.cuF=add(SEG(.052,.052,6),cuff)}
    const fg=new THREE.BoxGeometry(.24,.07,.1);fg.translate(.06,-.02,0);this.ftB=add(fg,R?shoe:skin);this.ftF=add(fg,R?shoe:skin);
    if(R){const tie=new THREE.Mesh(new THREE.BoxGeometry(.02,.05,.08),lam('#c8202c'));this.tie=tie;G.add(tie)}
    this.shadow=new THREE.Mesh(new THREE.CircleGeometry(.4,12),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.38,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;scene.add(this.shadow);
    this.fx=0;this.v=new THREE.Vector3();this.w=new THREE.Vector3()}
  // J: pose in engine units (facing +x, y up negative). ox: engine x of feet. fc: facing. z: depth lane.
  pose(J,ox,fc,z,o){o=o||{};const yaw=o.yaw||0,ef=o.eye==null?fc:o.eye,dz=.15*this.bd,P=J.P,cy=Math.cos(yaw),sy=Math.sin(yaw),fy=o.lift||0;
    const W=(k,zz)=>{const p=J[k];let lx=p[0]-P[0],lz=zz;if(yaw){const nx=lx*cy-lz*sy;lz=lx*sy+lz*cy;lx=nx}
      return new THREE.Vector3(X3(ox+fc*(P[0]+lx)),-p[1]*K3+fy,z+lz)};
    const P0=W('P',0),N0=W('N',0),H0=W('H',0);H0.lerp(N0,.22);
    const sB=W('N',-dz*1.12),sF=W('N',dz*1.12);for(const s of [sB,sF])s.lerp(P0.clone().setZ(s.z),.07);
    const hB=W('P',-dz*.62),hF=W('P',dz*.62);
    const seg=(m,a,b)=>{this.v.subVectors(b,a);const l=this.v.length()||1e-3;m.position.copy(a);m.quaternion.setFromUnitVectors(UP3,this.v.multiplyScalar(1/l));m.scale.set(1,l,1)};
    const segPart=(m,a,b,t0,t1)=>{const A=a.clone().lerp(b,t0),B=a.clone().lerp(b,t1);seg(m,A,B)};
    const E={Eb:W('Eb',-dz),Hb:W('Hb',-dz*.9),Ef:W('Ef',dz),Hf:W('Hf',dz*.9),Kb:W('Kb',-dz*.62),Fb:W('Fb',-dz*.62),Kf:W('Kf',dz*.62),Ff:W('Ff',dz*.62)};
    const L=this.L;
    seg(L.uaB,sB,E.Eb);seg(L.faB,E.Eb,E.Hb);seg(L.uaF,sF,E.Ef);seg(L.faF,E.Ef,E.Hf);
    seg(L.thB,hB,E.Kb);seg(L.shB,E.Kb,E.Fb);seg(L.thF,hF,E.Kf);seg(L.shF,E.Kf,E.Ff);
    segPart(L.sbB,hB,E.Kb,0,.42);segPart(L.sbF,hF,E.Kf,0,.42);
    // torso and head: tilt from the pose, yaw from facing (and spins)
    const tilt=(a,b)=>Math.atan2(-(J[b][0]-J[a][0]),-(J[b][1]-J[a][1]));
    const baseYaw=(fc>0?-yaw:Math.PI+yaw);
    const sh=new THREE.Vector3().addVectors(sB,sF).multiplyScalar(.5);
    const tl=sh.distanceTo(P0),tt=tilt('P','N');
    this.torso.position.copy(P0);this.torso.rotation.set(0,baseYaw,tt,'YZX');this.torso.scale.set(.36*this.bd,tl+.08,.6*this.bd);
    this.pelvis.position.copy(P0);this.pelvis.rotation.copy(this.torso.rotation);
    if(this.belt){this.belt.position.copy(P0);this.belt.position.y+=.1*Math.cos(tt);this.belt.rotation.copy(this.torso.rotation)}
    if(this.tie){this.tie.position.copy(sh).lerp(P0,.1);this.tie.position.x+=fc*.13*Math.cos(tt);this.tie.rotation.copy(this.torso.rotation)}
    seg(L.neck,N0,H0);
    const ht=tilt('N','H');this.head.position.copy(H0);
    const hy=(ef>0?-yaw:Math.PI+yaw);this.head.rotation.set(0,hy,ht*(ef===fc?1:-1),'YZX');
    // gloves follow the forearm, feet follow the shin
    for(const [g,e,h,c] of [[this.glB,E.Eb,E.Hb,this.cuB],[this.glF,E.Ef,E.Hf,this.cuF]]){this.v.subVectors(h,e).normalize();g.position.copy(h).addScaledVector(this.v,.03);g.quaternion.setFromUnitVectors(UP3,this.v);if(c){const a=e.clone().lerp(h,.72);seg(c,a,h.clone().addScaledVector(this.v,-.04))}}
    for(const [f,k,a] of [[this.ftB,'Kb','Fb'],[this.ftF,'Kf','Ff']]){const pt=E[a];f.position.copy(pt);f.rotation.set(0,baseYaw,tilt(a,k)*.55,'YZX')}
    // flash white on hits, flush the face as damage builds
    const fl=o.flash,dmg=clamp(o.dmg||0,0,1);
    for(const m of this.mats)m.emissive.setRGB(fl?.9:0,fl?.9:0,fl?.9:0);
    this.headMat.color.copy(this.skinC).lerp(new THREE.Color('#b0303a'),dmg*.45);this.headMat.emissive.setRGB(fl?.9:0,fl?.9:0,fl?.9:0);
    if(o.fire){const t=performance.now()/120;for(const m of [this.mats[2]])m.emissive.setRGB(.6+.3*Math.sin(t),.25,0)}
    // blob shadow under the hips
    this.shadow.position.set(P0.x,(o.floor||0)+.012,z);const sc=o.lying?1.6:1;this.shadow.scale.set(sc*this.bd,.7*this.bd,1);
    this.H=H0;this.B=P0.clone().lerp(sh,.55);this.Lg=E.Kf}
  dispose(){}
}
function shadeHex(hex,amt){return typeof shade==='function'?shade(hex,amt):hex}

/* ---------------- arena ---------------- */
function crowdTex(kind,seed){const reg=kind==='REG';return tex3(1024,128,(x,w,h)=>{const rr=seeded(hash(kind,'c3d'+seed));
  x.fillStyle='#0b0a0d';x.fillRect(0,0,w,h);
  const pal=['#5a4048','#3b4a5e','#685644','#3e3e3e','#6a5050','#3a5548','#544a6a','#735e4a','#7c6a5e','#47403a','#8a2a28','#2a4a88'],skins=['#e0b897','#c09068','#946848','#6e4a32','#ecc8a8'];
  for(let row=0;row<4;row++){const y=18+row*28,dim=.55+.15*row;
    for(let xx=-6;xx<w;xx+=10+Math.floor(rr()*5)){if(rr()<(reg?.6:.08))continue;const sh=pal[Math.floor(rr()*pal.length)],sk=skins[Math.floor(rr()*skins.length)];
      x.fillStyle=shadeHex(sh,-(1-dim));x.fillRect(xx,y+9,13,16);x.fillStyle=shadeHex(sk,-(1-dim)*.8);x.fillRect(xx+3,y,8,9);
      if(rr()<.3){x.fillStyle='#231a14';x.fillRect(xx+3,y,8,3)}
      if(rr()<.06){x.fillStyle='#d8ecff';x.fillRect(xx+9,y+2,3,5)}
      if(!reg&&rr()<.03){x.fillStyle=pick(['#e1ad3a','#c8202c','#3a6fd8','#f1e9dc']);x.fillRect(xx-2,y-9,18,9)}}}})}
function matTex(kind,ring){const pal=arenaPal(kind),logo=kind==='EXH'?'':kind==='REG'?'PGFC':kind==='RYU'?'RYUJIN':kind;
  return tex3(512,512,(x,w,h)=>{const g=x.createRadialGradient(w/2,h/2,40,w/2,h/2,w*.62);g.addColorStop(0,shadeHex(pal.mat,.1));g.addColorStop(1,pal.mat2);x.fillStyle=g;x.fillRect(0,0,w,h);
    if(!ring){x.strokeStyle=pal.acc;x.lineWidth=6;x.globalAlpha=.55;x.beginPath();for(let i=0;i<=8;i++){const a=i/8*Math.PI*2+Math.PI/8,r=w*.47;const px=w/2+Math.cos(a)*r,py=h/2+Math.sin(a)*r;i?x.lineTo(px,py):x.moveTo(px,py)}x.stroke();x.globalAlpha=1}
    else{x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=4;x.strokeRect(10,10,w-20,h-20)}
    x.globalAlpha=.08;for(let i=0;i<1400;i++){x.fillStyle=Math.random()<.5?'#000':'#fff';x.fillRect(Math.random()*w,Math.random()*h,2,2)}x.globalAlpha=1;
    if(logo){x.save();x.translate(w/2,h/2);x.fillStyle=pal.logo||'rgba(0,0,0,.2)';x.font='900 92px "Big Shoulders Display", Impact, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(logo,0,0);x.restore()}
    for(const [sx,sy] of [[w*.2,h*.5],[w*.8,h*.5]]){x.fillStyle='rgba(0,0,0,.08)';x.beginPath();x.arc(sx,sy,30,0,7);x.fill()}})}
function meshTex(){return tex3(64,64,(x,w,h)=>{x.clearRect(0,0,w,h);x.strokeStyle='rgba(200,206,216,.85)';x.lineWidth=3;
  x.beginPath();x.moveTo(0,0);x.lineTo(w,h);x.moveTo(w,0);x.lineTo(0,h);x.moveTo(-w/2,h/2);x.lineTo(w/2,h*1.5);x.moveTo(w/2,-h/2);x.lineTo(w*1.5,h/2);x.moveTo(w/2,-h/2);x.lineTo(-w/2,h/2);x.moveTo(w*1.5,h/2);x.lineTo(w/2,h*1.5);x.stroke()},[10,4])}
function brickTex(){return tex3(256,128,(x,w,h)=>{x.fillStyle='#2a1c17';x.fillRect(0,0,w,h);for(let y=0;y<h;y+=16)for(let xx=((y/16)%2)*16-16;xx<w;xx+=32){x.fillStyle=Math.random()<.5?'#5a3a2e':'#653f31';x.fillRect(xx+1,y+1,30,14)}},[6,2])}
function starTex(){return tex3(64,64,(x,w,h)=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,240,170,.9)');g.addColorStop(1,'rgba(255,200,80,0)');x.fillStyle=g;x.fillRect(0,0,w,h);
  x.fillStyle='#fff';x.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=i%2?8:30;x.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r)}x.fill()})}

class Arena3D{
  constructor(view){this.v=view;const f=view.f,o=view.o;this.ring=!!o.ring;this.kind=view.kind;this.pal=arenaPal(this.kind);
    const old=view.cv;const cv=document.createElement('canvas');cv.className='l3d';old.replaceWith(cv);view.cv=cv;this.cv=cv;
    const r=this.r=new THREE.WebGLRenderer({canvas:cv,antialias:false,powerPreference:'low-power',alpha:false});r.setPixelRatio(1);
    this.IW=448;this.IH=280;r.setSize(this.IW,this.IH,false);
    const S=this.scene=new THREE.Scene();S.background=new THREE.Color(this.kind==='REG'?'#120e0c':'#060609');S.fog=new THREE.Fog(S.background,9,30);
    this.cam=new THREE.PerspectiveCamera(42,this.IW/this.IH,.1,80);
    this.floor=this.ring?.0:0;
    this.build();
    this.R=f.F.map(F=>new Rig3(S,F.look,{build:F.build}));
    this.refR=new Rig3(S,view.ref.look,{ref:1,build:.95});
    this.parts=[];this.pool=[];this.decals=[];this.yawK=0;this.fovK=0;this.cine=0;this.cineF=null;this.camP=null;this.T=0;
    this.star=starTex();this.starMats=[];
    this.stars=[0,1,2].map(()=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:this.star,color:'#ffe066',transparent:true,depthWrite:false}));s.scale.set(.12,.12,.12);s.visible=false;S.add(s);return s});
    this.flares=[];}
  build(){const S=this.scene,pal=this.pal,ring=this.ring,reg=this.kind==='REG';
    S.add(new THREE.HemisphereLight('#c9d2ff','#2a1e16',reg?.55:.5));S.add(new THREE.AmbientLight('#ffffff',.18));
    const key=new THREE.DirectionalLight('#fff1d8',.8);key.position.set(1.5,10,5);S.add(key);
    const rim=new THREE.DirectionalLight('#9fb4ff',.35);rim.position.set(-3,6,-8);S.add(rim);
    // arena floor
    const gf=new THREE.Mesh(new THREE.CircleGeometry(40,24),lam(reg?'#2b231e':'#0d0c10'));gf.rotation.x=-Math.PI/2;gf.position.y=ring?-.9:-.02;S.add(gf);
    const mt=matTex(this.kind,ring);
    if(!ring){
      const R0=4.1;const mat=new THREE.Mesh(new THREE.CylinderGeometry(R0,R0,.12,8),[lam('#1a1a1f'),new THREE.MeshLambertMaterial({map:mt,color:'#9c968d'}),lam('#1a1a1f')]);mat.rotation.y=Math.PI/8;mat.position.y=-.06;S.add(mat);
      const ap=R0*Math.cos(Math.PI/8),edge=2*R0*Math.sin(Math.PI/8),mtex=meshTex();this.fence=[];
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const m=new THREE.MeshBasicMaterial({map:mtex,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false,fog:true});
        const p=new THREE.Mesh(new THREE.PlaneGeometry(edge,1.7),m);p.position.set(Math.sin(a)*ap,.95,Math.cos(a)*ap);p.rotation.y=a;S.add(p);
        const rail=new THREE.Mesh(new THREE.BoxGeometry(edge,.12,.14),lam('#16161b'));rail.position.set(Math.sin(a)*ap,1.84,Math.cos(a)*ap);rail.rotation.y=a;S.add(rail);
        const pad=new THREE.Mesh(new THREE.BoxGeometry(edge,.045,.15),lam(pal.acc));pad.position.copy(rail.position);pad.position.y=1.86;pad.rotation.y=a;S.add(pad);
        const bot=new THREE.Mesh(new THREE.BoxGeometry(edge,.18,.12),lam('#16161b'));bot.position.set(Math.sin(a)*ap,.09,Math.cos(a)*ap);bot.rotation.y=a;S.add(bot);
        const va=a+Math.PI/8,post=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1.95,6),lam('#101014'));post.position.set(Math.sin(va)*R0,.97,Math.cos(va)*R0);S.add(post);
        const pp=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.5,6),lam(pal.acc));pp.position.set(post.position.x,1.2,post.position.z);S.add(pp);
        this.fence.push({m,rail,pad,n:new THREE.Vector3(Math.sin(a),0,Math.cos(a)),objs:[rail,pad,bot,post,pp]})}
    }else{
      const H=.9,Wd=8;const plat=new THREE.Mesh(new THREE.BoxGeometry(Wd,H,Wd),[lam(pal.mat2),lam(pal.mat2),new THREE.MeshLambertMaterial({map:mt,color:'#9c968d'}),lam(pal.mat2),lam(pal.mat2),lam(pal.mat2)]);plat.position.y=-H/2;S.add(plat);
      const cols=this.kind==='RYU'?['#efe9de','#d02a34','#efe9de']:['#efe9de','#d33a3a','#3a62c0'],h2=Wd/2-.25;this.ropes=[];
      for(const [px,pz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1.5,6),lam('#18181c'));p.position.set(px*h2,.75,pz*h2);S.add(p);const pd=new THREE.Mesh(new THREE.BoxGeometry(.2,1.1,.2),lam(pal.acc));pd.position.set(px*(h2-.06),.8,pz*(h2-.06));S.add(pd)}
      for(let s=0;s<4;s++)cols.forEach((c,i)=>{const y=.42+i*.4,len=Wd-.5,m=lam(c);m.transparent=true;const r=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,len,6),m);r.rotation.z=Math.PI/2;
        if(s===0){r.position.set(0,y,-h2)}else if(s===1){r.position.set(0,y,h2)}else{r.rotation.set(Math.PI/2,0,0);r.position.set(s===2?-h2:h2,y,0)}
        S.add(r);this.ropes.push({r,m,n:new THREE.Vector3(s===2?-1:s===3?1:0,0,s===0?-1:s===1?1:0)})});
    }
    // crowd tiers (or gym walls)
    this.crowd=[];
    if(reg){const bt=brickTex();for(let i=0;i<4;i++){const w=new THREE.Mesh(new THREE.PlaneGeometry(26,7),new THREE.MeshLambertMaterial({map:bt}));const a=i/4*Math.PI*2;w.position.set(Math.sin(a)*11,2.6,Math.cos(a)*11);w.rotation.y=a+Math.PI;S.add(w)}
      const ct=crowdTex(this.kind,0);const c=new THREE.Mesh(new THREE.CylinderGeometry(9,9,1.6,32,1,true),new THREE.MeshBasicMaterial({map:ct,side:THREE.BackSide,transparent:true,alphaTest:.1,fog:true}));c.position.y=.6;ct.repeat.set(4,1);S.add(c);this.crowd.push({m:c,y:.6,ph:0})}
    else{for(let i=0;i<4;i++){const rad=8.5+i*2.4,hh=2.2,y=.4+i*1.35;const ct=crowdTex(this.kind,i);ct.wrapS=THREE.RepeatWrapping;ct.repeat.set(5,1);
      const c=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,hh,40,1,true),new THREE.MeshBasicMaterial({map:ct,side:THREE.BackSide,fog:true,color:new THREE.Color(1,1,1).multiplyScalar(.95-i*.12)}));c.position.y=y;S.add(c);this.crowd.push({m:c,y,ph:i*1.3});
      const step=new THREE.Mesh(new THREE.CylinderGeometry(rad+1.2,rad+1.2,.3,40,1,true),new THREE.MeshBasicMaterial({color:'#0a0a0d',side:THREE.BackSide,fog:true}));step.position.y=y-hh/2;S.add(step)}
      // lighting truss and light cones
      const tr=new THREE.Mesh(new THREE.TorusGeometry(4.6,.08,4,8),lam('#2a2a31'));tr.rotation.x=Math.PI/2;tr.rotation.z=Math.PI/8;tr.position.y=7.2;S.add(tr);
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2,lx=Math.sin(a)*4.6,lz=Math.cos(a)*4.6;const lb=new THREE.Mesh(new THREE.BoxGeometry(.3,.2,.3),new THREE.MeshBasicMaterial({color:'#fff4d6'}));lb.position.set(lx,7.05,lz);S.add(lb);
        const cone=new THREE.Mesh(new THREE.ConeGeometry(1.4,7,10,1,true),new THREE.MeshBasicMaterial({color:'#fff2cc',transparent:true,opacity:.028,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,fog:false}));
        cone.position.set(lx*.82,3.6,lz*.82);cone.rotation.z=Math.atan2(lx*.18,7)*-1;cone.rotation.x=Math.atan2(lz*.18,7);S.add(cone)}
      // camera flashes in the stands
      const fm=new THREE.SpriteMaterial({map:starTex(),color:'#ffffff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
      this.flashes=[...Array(10)].map(()=>{const s=new THREE.Sprite(fm.clone());s.scale.set(.5,.5,.5);s.visible=false;S.add(s);return s})}
    // dust/hit particle material set
    this.pm={};for(const c of ['#ffffff','#ffe58a','#cfe8ff','#8f1717','#d8ccb4','#ff9a3c','#a9b3bd'])this.pm[c]=new THREE.MeshBasicMaterial({color:c,transparent:true});
    this.pg=new THREE.BoxGeometry(.035,.035,.035);
    this.dm=new THREE.MeshBasicMaterial({color:'#6a1010',transparent:true,opacity:.8,depthWrite:false});this.dg=new THREE.CircleGeometry(.035,6)}
  part(p){let m=this.pool.pop();if(!m){m=new THREE.Mesh(this.pg,this.pm['#ffffff']);this.scene.add(m)}m.visible=true;m.material=this.pm[p.c]||this.pm['#ffffff'];m.scale.setScalar(p.s||1);m.position.copy(p.p);p.m=m;p.l0=p.l;this.parts.push(p)}
  burst(pos,n,c,spd,o){o=o||{};for(let i=0;i<n;i++){const v=new THREE.Vector3((Math.random()-.5)*spd+(o.dx||0),Math.random()*spd*(o.up||.8),(Math.random()-.5)*spd);this.part({p:pos.clone(),v,l:o.l||(.25+Math.random()*.25),c:typeof c==='function'?c():c,g:o.g!=null?o.g:6,s:o.s||(Math.random()<.4?1.6:1),dec:o.dec})}}
  spark(pos,big){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:this.star,color:big?'#fff3b0':'#ffffff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,depthTest:false}));s.position.copy(pos);const sc=big?.75:.4;s.scale.set(sc,sc,sc);this.scene.add(s);this.parts.push({spr:s,l:big?.16:.1,l0:big?.16:.1,sc})}
  onEv(e){const f=this.v.f;
    switch(e.type){
      case'hit':{const R=this.rigOf(e.F);if(!R)break;const pos=(e.tgt==='body'?R.B:e.tgt==='legs'?R.Lg:R.H).clone();pos.x-=(e.F.face||1)*.08;
        this.spark(pos,e.big);this.burst(pos,e.big?12:6,()=>Math.random()<.5?'#ffffff':'#ffe58a',2.4,{dx:-(e.F.face||1)*.8,l:.3});
        if(e.big||Math.random()<.4)this.burst(pos,6,'#cfe8ff',1.8,{dx:-(e.F.face||1)*.6,g:9,l:.6});
        if(e.blood)this.burst(pos,7,'#8f1717',1.6,{g:9,l:1.2,dec:1});
        if(e.big){this.yawK+=(Math.random()<.5?-1:1)*.06*(e.dmg>9?2:1);this.fovK=Math.min(8,this.fovK+(e.dmg>9?6:3))}break}
      case'block':{const R=this.rigOf(e.F);if(R)this.burst((e.y>-12?R.B:R.H).clone(),5,'#a9b3bd',1.4,{l:.18});break}
      case'slam':this.burst(new THREE.Vector3(X3(e.x),.03,0),24,'#d8ccb4',2.2,{up:.5,g:4,l:.6});this.fovK=Math.min(8,this.fovK+4);break;
      case'kd':{const D=f.F.find(F=>F.down>0)||f.F.find(F=>F.lost);this.cine=f.phase==='end'?3:1.8;this.cineF=D;this.cineYaw=(Math.random()<.5?-1:1)*(.55+Math.random()*.35);this.fovK=0;break}
      case'combo':this.fovK=Math.min(8,this.fovK+2);this.yawK+=(Math.random()<.5?-1:1)*.04;break;
      case'fire':{const R=this.rigOf(e.F);if(R)this.burst(R.B.clone(),20,()=>Math.random()<.5?'#ff9a3c':'#ffe58a',2,{up:1.2,g:-1.5,l:.8});break}
      case'rocked':this.yawK+=(Math.random()<.5?-1:1)*.08;break;
    }}
  rigOf(F){const i=this.v.f.F.indexOf(F);return i<0?null:this.R[i]}
  frame(dt){const v=this.v,f=v.f;this.T+=dt;const T=this.T;
    // fighters
    if(f.pos==='ground'&&f.g){const G=v.groundPoses(),g=f.g,b=g.bot,t=g.top;
      const bi=f.F.indexOf(b),ti=f.F.indexOf(t);
      this.R[bi].pose(G.JB,b.x,b.face,0,{eye:b.face,build:b.build,flash:b.flashT>0,dmg:1-b.headMax/100+(b.head<35?.25:0),lying:g.pos!=='back'});
      this.R[ti].pose(G.JT,b.x,b.face,g.pos==='side'?.12:0,{eye:g.pos==='back'?b.face:-b.face,build:t.build,flash:t.flashT>0,dmg:1-t.headMax/100,fire:t.fire>0});
      if(G.isSub)this.burst(this.R[bi].H.clone(),1,'#ff9a3c',.6,{up:1.5,g:-2,l:.3,s:.8})}
    else for(let i=0;i<2;i++){const F=f.F[i];if(F.flashT>0)F.flashT-=dt;const J=v.poseStand(F),a=F.act;
      let yaw=0,lift=0;if(a&&a.k==='spin'){yaw=a.ph==='w'?Math.PI*ease(a.t/a.dw):a.ph==='a'?Math.PI:Math.PI+Math.PI*ease(a.t/a.dr)}
      if(a&&a.k==='superman'&&a.ph==='w')lift=Math.sin(Math.PI*Math.min(1,a.t/a.dw))*.22;
      const z=f.pos==='clinch'?0:(i?-.05:.05)+Math.sin(T*.7+i*2)*.04;
      this.R[i].pose(J,F.x,F.face,z,{build:F.build,flash:F.flashT>0,dmg:1-F.headMax/100+(F.head<35?.25:0),lying:F.down>0,yaw,lift,fire:F.fire>0})}
    // referee stays a step behind the action
    const rf=v.ref;let rp=rf.pose;if(Math.abs(rf.vx)>3&&rp===PO.ref){const s=Math.sin(rf.walkT*14);rp=ov(rp,{Fb:[rp.Fb[0]+s*2,rp.Fb[1]-Math.max(0,s)],Ff:[rp.Ff[0]-s*2,rp.Ff[1]-Math.max(0,-s)]})}
    this.refR.pose(rp,rf.x,rf.face,-1.25,{});
    // stunned stars
    const st=f.F.find(F=>F.stag>0&&F.down<=0);
    this.stars.forEach((s,i)=>{s.visible=!!st&&f.pos==='stand';if(s.visible){const R=this.rigOf(st),a=T*6+i*2.1;s.position.set(R.H.x+Math.cos(a)*.18,R.H.y+.2,R.H.z+Math.sin(a)*.18)}});
    // particles
    for(const p of this.parts){p.l-=dt;
      if(p.spr){const k=p.l/p.l0;p.spr.material.opacity=k;const s=p.sc*(1.3-.5*k);p.spr.scale.set(s,s,s);if(p.l<=0){this.scene.remove(p.spr);p.spr.material.dispose()}continue}
      p.v.y-=p.g*dt;p.m.position.addScaledVector(p.v,dt);
      if(p.m.position.y<this.floor+.01){if(p.dec&&this.decals.length<70){const d=new THREE.Mesh(this.dg,this.dm);d.rotation.x=-Math.PI/2;d.position.set(p.m.position.x,this.floor+.006,p.m.position.z);d.scale.setScalar(.6+Math.random());this.scene.add(d);this.decals.push(d);p.l=0}
        else{p.m.position.y=this.floor+.01;p.v.multiplyScalar(.5);p.v.y=Math.abs(p.v.y)*.3}}
      if(p.l<=0){p.m.visible=false;this.pool.push(p.m)}}
    this.parts=this.parts.filter(p=>p.l>0);
    // crowd bounces with the hype, camera flashes pop
    const hype=v.hype;for(const c of this.crowd)c.m.position.y=c.y+(hype>.15?Math.abs(Math.sin(T*(9+c.ph)+c.ph))*.09*hype:0);
    if(this.flashes)for(const s of this.flashes){if(s.visible){s.material.opacity-=dt*9;if(s.material.opacity<=0)s.visible=false}
      else if(Math.random()<dt*(.6+hype*10)){const a=Math.random()*Math.PI*2,rr=8.3+Math.random()*7;s.position.set(Math.sin(a)*rr,1+Math.random()*4.5,Math.cos(a)*rr);s.material.opacity=1;s.visible=true}}
    this.camera(dt);
    // see-through near side of the cage / ropes
    const cdir=new THREE.Vector3(this.cam.position.x,0,this.cam.position.z).normalize();
    if(this.fence)for(const p of this.fence){const d=p.n.dot(cdir);const near=d>.35;p.m.opacity=near?.1:.7;for(const o of p.objs)o.visible=!near||d<.75}
    if(this.ropes)for(const r of this.ropes){const d=r.n.dot(cdir);r.m.opacity=d>.4?.25:1}
    this.r.render(this.scene,this.cam)}
  camera(dt){const v=this.v,f=v.f,[a,b]=f.F,T=this.T;
    let tx=(X3(a.x)+X3(b.x))/2,ty=1.0,gap=Math.abs(a.x-b.x)*K3,d=3.5+gap*.75,h=1.05,yaw=.22*Math.sin(T*.11)+.08*Math.sin(T*.37);
    if(f.pos==='ground'&&f.g){tx=X3(f.g.bot.x)+f.g.bot.face*.25;ty=.4;d=3.3;h=1.7;yaw+=.15}
    else if(f.pos==='clinch'){d=3.4;ty=1.1}
    if(f.ct){d-=.35;yaw*=.6}
    if(this.cine>0&&this.cineF){this.cine-=dt;const D=this.cineF;tx=X3(D.x);ty=.55;d=3.1;h=.85;yaw=this.cineYaw*(1-Math.max(0,this.cine-1)*.3)}
    if(f.phase==='end'&&f.pt>1.4){const W=f.F.find(F=>F.win)||a;tx=X3(W.x);ty=1.2;d=3.6;h=1.4;yaw=T*.25}
    this.yawK*=Math.exp(-dt*2.5);this.fovK*=Math.exp(-dt*5);
    yaw+=this.yawK;tx=clamp(tx,-2.6,2.6);
    const want=new THREE.Vector3(tx+Math.sin(yaw)*d,ty+h,Math.cos(yaw)*d),look=new THREE.Vector3(tx,ty,0);
    if(!this.camP){this.camP=want.clone();this.lookP=look.clone()}
    const k=1-Math.exp(-dt*(this.cine>0?5:3.2));this.camP.lerp(want,k);this.lookP.lerp(look,k);
    this.cam.position.copy(this.camP);
    if(f.shake){const s=f.shake*.012;this.cam.position.x+=(Math.random()-.5)*s;this.cam.position.y+=(Math.random()-.5)*s}
    this.cam.fov=42-this.fovK;this.cam.updateProjectionMatrix();this.cam.lookAt(this.lookP)}
  dispose(){try{this.r.dispose();this.r.forceContextLoss&&this.r.forceContextLoss()}catch(e){}}
}
