/*!
 * Championship Rounds: live fight screen (pixel-art renderer, HUD, touch/keyboard controls, sound).
 * Copyright (c) 2026 SpecMagic Games. All rights reserved.
 * openLive(opts) mounts a fight over the app; opts.onEnd(result|null) fires when the player leaves it.
 * The engine runs in LV units (128x80). The renderer draws at S=2 (256x160) for finer sprite detail.
 */
let LIVE_ON=false;

/* ---------------- sound (synthesized, no files) ---------------- */
const SFX={ac:null,on:(()=>{try{return localStorage.getItem('cr.sfx')!=='0'}catch(e){return true}})(),
  init(){if(!this.on)return;try{if(!this.ac)this.ac=new(window.AudioContext||window.webkitAudioContext)();if(this.ac.state==='suspended')this.ac.resume()}catch(e){}},
  set(on){this.on=on;try{localStorage.setItem('cr.sfx',on?'1':'0')}catch(e){}if(on)this.init()},
  buf(d,decay){const a=this.ac,len=Math.max(1,Math.floor(a.sampleRate*d)),b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<len;i++)c[i]=(Math.random()*2-1)*(decay?1-i/len:1);return b},
  noise(d,f,q,v,type){const a=this.ac,n=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();n.buffer=this.buf(d,true);fl.type=type||'bandpass';fl.frequency.value=f;fl.Q.value=q;g.gain.value=v;n.connect(fl).connect(g).connect(a.destination);n.start()},
  tone(f0,f1,d,v,type){const a=this.ac,o=a.createOscillator(),g=a.createGain(),t=a.currentTime;o.type=type||'sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d+.03)},
  crowd(v){const a=this.ac,n=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain(),t=a.currentTime;n.buffer=this.buf(2,false);fl.type='bandpass';fl.frequency.value=850;fl.Q.value=.5;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.25);g.gain.exponentialRampToValueAtTime(.001,t+1.9);n.connect(fl).connect(g).connect(a.destination);n.start()},
  play(k,big){if(!this.on||!this.ac)return;try{switch(k){
    case'hit':this.noise(.07,big?650:1100,1.1,big?.55:.3);this.tone(big?150:190,48,big?.15:.08,big?.65:.35);break;
    case'block':this.noise(.04,2400,2,.16);this.tone(620,300,.04,.06,'square');break;
    case'whoosh':this.noise(.09,1900,.8,.07,'highpass');break;
    case'slam':this.tone(95,34,.26,.75);this.noise(.2,380,.7,.35,'lowpass');break;
    case'bell':[880,1318,2210].forEach((f,i)=>this.tone(f,f*.99,1.5,.16/(i+1)));break;
    case'crowd':this.crowd(big?.3:.18);break;
    case'tap':this.tone(900,700,.03,.05,'square');break;
  }}catch(e){}}};

/* ---------------- pixel helpers (pixel coordinates) ---------------- */
const FVS=2,FVW=LV.W*FVS,FVH=LV.H*FVS,FVY=LV.FLOOR*FVS;
const PXF={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',Y:'101101010010010'};
function pxText(x,s,X,Y,sc,c){x.fillStyle=c;let cx=X;for(const ch of s){const g=PXF[ch];if(g)for(let i=0;i<15;i++)if(g[i]==='1')x.fillRect(cx+(i%3)*sc,Y+Math.floor(i/3)*sc,sc,sc);cx+=4*sc}}
const pxW=(s,sc)=>s.length*4*sc-sc;
function shade(hex,amt){if(hex[0]!=='#')return hex;const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;
  if(amt<0){r*=1+amt;g*=1+amt;b*=1+amt}else{r+=(255-r)*amt;g+=(255-g)*amt;b+=(255-b)*amt}
  return'#'+[r,g,b].map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('')}
function pline(x,x0,y0,x1,y1,w,c){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));x.fillStyle=c;const h=w/2;for(let i=0;i<=n;i++){const t=i/n;x.fillRect(Math.round(x0+(x1-x0)*t-h),Math.round(y0+(y1-y0)*t-h),w,w)}}
function pcirc(x,cx,cy,r,c){x.fillStyle=c;for(let dy=-r;dy<=r;dy++){const dx=Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy))+.35);x.fillRect(Math.round(cx-dx),Math.round(cy+dy),dx*2+1,1)}}
function ppoly(x,pts,c){x.fillStyle=c;let y0=Infinity,y1=-Infinity;for(const p of pts){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])}
  for(let y=Math.round(y0);y<=Math.round(y1);y++){const xs=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))}
    xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)x.fillRect(Math.round(xs[i]),y,Math.max(1,Math.round(xs[i+1])-Math.round(xs[i])+1),1)}}
function prect(x,X,Y,w,h,c){x.fillStyle=c;x.fillRect(Math.round(X),Math.round(Y),w,h)}

/* ---------------- poses (LV units, facing +x, origin at feet) ---------------- */
const PJ=['H','N','P','Eb','Hb','Ef','Hf','Kb','Fb','Kf','Ff'];
const PO={};
const ov=(b,d)=>Object.assign({},b,d);
PO.stance={H:[3,-29],N:[1,-24],P:[0,-14],Eb:[-1,-19],Hb:[3,-24],Ef:[5,-19],Hf:[7,-25],Kb:[-3,-7],Fb:[-6,0],Kf:[3,-7],Ff:[6,0]};
PO.block=ov(PO.stance,{H:[2,-28],Ef:[5,-21],Hf:[6,-27],Eb:[2,-21],Hb:[5,-26]});
PO.jabC=ov(PO.stance,{Hf:[6,-24]});PO.jabX=ov(PO.stance,{N:[2,-24],H:[4,-29],Ef:[10,-24],Hf:[15,-25]});
PO.crossC=ov(PO.stance,{N:[0,-24],Hb:[2,-24]});PO.crossX=ov(PO.stance,{N:[4,-24],H:[6,-28],P:[1,-14],Eb:[8,-23],Hb:[15,-25],Kb:[-2,-7],Fb:[-5,0]});
PO.hookC=ov(PO.stance,{Ef:[7,-21],Hf:[6,-22],N:[0,-24]});PO.hookX=ov(PO.stance,{N:[3,-24],H:[5,-28],Ef:[10,-23],Hf:[13,-26]});
PO.overC=ov(PO.stance,{N:[0,-24],Eb:[-3,-25],Hb:[-2,-29]});PO.overX=ov(PO.stance,{N:[5,-23],H:[7,-27],Eb:[7,-27],Hb:[14,-24],P:[1,-14]});
PO.lkC=ov(PO.stance,{N:[0,-24],Kb:[1,-9],Fb:[-2,-3]});PO.lkX=ov(PO.stance,{N:[-1,-24],H:[0,-28],P:[1,-14],Kb:[7,-9],Fb:[14,-7]});
PO.hkC=ov(PO.stance,{N:[-1,-24],Kb:[3,-13],Fb:[-1,-8]});PO.hkX=ov(PO.stance,{P:[1,-15],N:[-3,-23],H:[-4,-27],Eb:[-3,-17],Hb:[-1,-20],Kb:[8,-20],Fb:[16,-27]});
PO.socX=ov(PO.stance,{N:[-1,-24],H:[0,-28],Kb:[7,-7],Fb:[14,-3]});
PO.shC=ov(PO.stance,{P:[0,-11],N:[3,-18],H:[5,-21],Kf:[4,-5],Kb:[-4,-4],Ef:[5,-15],Hf:[7,-18],Eb:[2,-15],Hb:[5,-17]});
PO.shX={H:[12,-14],N:[9,-13],P:[2,-9],Eb:[10,-10],Hb:[14,-9],Ef:[12,-12],Hf:[15,-11],Kb:[-4,-3],Fb:[-8,0],Kf:[6,-3],Ff:[9,0]};
PO.hurt=ov(PO.stance,{H:[0,-28],N:[-1,-24],Ef:[2,-20],Hf:[3,-18],Eb:[-1,-19],Hb:[0,-17]});
PO.stag=ov(PO.stance,{H:[1,-27],N:[0,-23],P:[0,-13],Kb:[-3,-6],Kf:[3,-6],Hf:[5,-21],Hb:[2,-20],Ef:[3,-18],Eb:[0,-18]});
PO.down={H:[-14,-3],N:[-10,-3],P:[0,-3],Eb:[-8,-1],Hb:[-6,0],Ef:[-9,-6],Hf:[-6,-8],Kb:[6,-4],Fb:[12,0],Kf:[5,-7],Ff:[11,-4]};
PO.dodge=ov(PO.stance,{H:[-2,-27],N:[-2,-23],P:[-1,-14],Hf:[4,-25],Hb:[1,-24]});
PO.sprawl={H:[6,-13],N:[3,-12],P:[-4,-6],Eb:[3,-8],Hb:[7,-6],Ef:[5,-9],Hf:[9,-7],Kb:[-8,-2],Fb:[-13,0],Kf:[-6,-2],Ff:[-10,0]};
PO.fall={H:[-4,-17],N:[-3,-14],P:[-1,-8],Eb:[-6,-11],Hb:[-5,-6],Ef:[0,-12],Hf:[2,-8],Kb:[-4,-3],Fb:[-9,0],Kf:[4,-4],Ff:[8,0]};
PO.rise={H:[3,-20],N:[1,-17],P:[-1,-9],Eb:[1,-12],Hb:[4,-13],Ef:[4,-13],Hf:[7,-15],Kb:[-4,-3],Fb:[-8,0],Kf:[4,-6],Ff:[6,0]};
PO.win=ov(PO.stance,{H:[1,-30],N:[0,-25],Eb:[-4,-29],Hb:[-3,-35],Ef:[5,-29],Hf:[5,-35]});
PO.win2=ov(PO.stance,{H:[1,-31],N:[0,-26],P:[0,-15],Eb:[-5,-30],Hb:[-6,-37],Ef:[7,-31],Hf:[9,-38],Kb:[-3,-8],Kf:[3,-8]});
PO.clinch=ov(PO.stance,{N:[3,-23],H:[5,-27],Ef:[7,-23],Hf:[10,-27],Eb:[5,-21],Hb:[9,-25]});
PO.kneeX=ov(PO.clinch,{Kf:[7,-15],Ff:[4,-9],P:[1,-14]});PO.cpX=ov(PO.clinch,{Eb:[7,-22],Hb:[11,-24]});
PO.ref={H:[1,-29],N:[0,-24],P:[0,-14],Eb:[-2,-19],Hb:[-1,-15],Ef:[2,-19],Hf:[3,-15],Kb:[-2,-7],Fb:[-3,0],Kf:[2,-7],Ff:[3,0]};
PO.refCrouch={H:[5,-22],N:[3,-18],P:[-1,-10],Eb:[2,-13],Hb:[5,-10],Ef:[5,-13],Hf:[8,-10],Kb:[-4,-5],Fb:[-6,0],Kf:[4,-6],Ff:[5,0]};
PO.refRaise={H:[1,-29],N:[0,-24],P:[0,-14],Eb:[-2,-19],Hb:[-1,-15],Ef:[4,-28],Hf:[6,-34],Kb:[-2,-7],Fb:[-3,0],Kf:[2,-7],Ff:[3,0]};
PO.refStop={H:[3,-28],N:[2,-24],P:[0,-14],Eb:[4,-21],Hb:[9,-22],Ef:[5,-22],Hf:[10,-24],Kb:[-3,-7],Fb:[-5,0],Kf:[3,-7],Ff:[6,0]};
PO.upC=ov(PO.stance,{N:[1,-23],P:[0,-13],H:[3,-28],Eb:[0,-17],Hb:[3,-15]});PO.upX=ov(PO.stance,{N:[3,-24],H:[4,-29],P:[1,-14],Eb:[7,-20],Hb:[9,-28]});
PO.bodyC=ov(PO.stance,{P:[0,-12],N:[2,-21],H:[4,-26],Ef:[6,-17],Hf:[5,-15],Kf:[4,-6],Kb:[-4,-6]});PO.bodyX=ov(PO.bodyC,{Ef:[8,-16],Hf:[13,-17],N:[4,-21],H:[6,-25],P:[1,-12]});
PO.supC=ov(PO.stance,{P:[-1,-16],N:[0,-26],H:[2,-31],Kb:[-6,-10],Fb:[-11,-8],Kf:[3,-9],Ff:[5,-3],Eb:[-3,-25],Hb:[-1,-29]});
PO.supX={H:[7,-29],N:[5,-25],P:[1,-15],Eb:[9,-27],Hb:[17,-27],Ef:[3,-21],Hf:[5,-24],Kb:[-6,-9],Fb:[-12,-6],Kf:[3,-8],Ff:[5,-1]};
PO.bkX=ov(PO.stance,{P:[1,-14],N:[-2,-24],H:[-2,-28],Kb:[8,-15],Fb:[15,-17],Eb:[-3,-18],Hb:[-1,-21]});
PO.teepC=ov(PO.stance,{Kf:[6,-14],Ff:[5,-9]});PO.teepX=ov(PO.stance,{N:[-2,-24],H:[-2,-28],Kf:[9,-14],Ff:[16,-15],P:[0,-14]});
PO.spinC=ov(PO.stance,{H:[-1,-28],N:[-1,-24],Kb:[-1,-10],Fb:[-4,-6]});
PO.spinX={H:[-6,-25],N:[-4,-22],P:[0,-14],Eb:[-6,-18],Hb:[-3,-21],Ef:[-2,-18],Hf:[1,-21],Kf:[-2,-7],Ff:[-4,0],Kb:[8,-15],Fb:[17,-15]};
const PCH={upper:['upC','upX'],body:['bodyC','bodyX'],superman:['supC','supX'],bkick:['lkC','bkX'],teep:['teepC','teepX'],spin:['spinC','spinX'],jab:['jabC','jabX'],cross:['crossC','crossX'],hook:['hookC','hookX'],over:['overC','overX'],lkick:['lkC','lkX'],hkick:['hkC','hkX'],soccer:['lkC','socX'],shoot:['shC','shX'],knee:['clinch','kneeX'],cpunch:['clinch','cpX']};
const TRAIL={upper:'Hb',body:'Hf',superman:'Hb',bkick:'Fb',spin:'Fb',cross:'Hb',hook:'Hf',over:'Hb',hkick:'Fb',lkick:'Fb',soccer:'Fb',knee:'Kf'};
const GB={
  guard:{H:[-15,-4],N:[-11,-4],P:[-1,-4],Eb:[-9,-9],Hb:[-11,-12],Ef:[-7,-10],Hf:[-9,-13],Kb:[4,-10],Fb:[11,-8],Kf:[6,-12],Ff:[12,-11]},
  half:{H:[-15,-4],N:[-11,-4],P:[-1,-4],Eb:[-9,-8],Hb:[-11,-11],Ef:[-7,-9],Hf:[-8,-12],Kb:[4,-7],Fb:[9,-3],Kf:[5,-5],Ff:[11,-2]},
  side:{H:[-15,-4],N:[-11,-4],P:[-1,-4],Eb:[-9,-7],Hb:[-7,-10],Ef:[-8,-8],Hf:[-5,-11],Kb:[5,-3],Fb:[11,-1],Kf:[6,-5],Ff:[12,-2]},
  mount:{H:[-15,-4],N:[-11,-4],P:[-1,-4],Eb:[-10,-8],Hb:[-12,-11],Ef:[-8,-9],Hf:[-10,-12],Kb:[5,-3],Fb:[11,-1],Kf:[6,-4],Ff:[12,-2]},
  back:{H:[3,-18],N:[2,-14],P:[0,-5],Eb:[1,-10],Hb:[2,-14],Ef:[4,-10],Hf:[3,-15],Kb:[5,-7],Fb:[10,-1],Kf:[6,-8],Ff:[11,-2]}};
const GT={
  guard:{H:[-1,-18],N:[1,-15],P:[7,-8],Eb:[0,-11],Hb:[-4,-7],Ef:[-2,-12],Hf:[-6,-8],Kb:[6,-1],Fb:[12,0],Kf:[4,-1],Ff:[10,0]},
  half:{H:[-6,-14],N:[-3,-12],P:[4,-8],Eb:[-6,-9],Hb:[-9,-6],Ef:[-7,-10],Hf:[-11,-7],Kb:[5,-1],Fb:[11,0],Kf:[2,-1],Ff:[8,0]},
  side:{H:[-11,-11],N:[-8,-9],P:[2,-8],Eb:[-10,-6],Hb:[-13,-5],Ef:[-7,-6],Hf:[-6,-4],Kb:[4,-1],Fb:[9,0],Kf:[0,-1],Ff:[5,0]},
  mount:{H:[-4,-20],N:[-3,-16],P:[-2,-6],Eb:[-7,-13],Hb:[-9,-11],Ef:[-6,-14],Hf:[-8,-12],Kb:[-6,-1],Fb:[-1,0],Kf:[4,-1],Ff:[8,0]},
  back:{H:[-1,-20],N:[-2,-16],P:[-4,-6],Eb:[0,-14],Hb:[3,-16],Ef:[1,-13],Hf:[3,-15],Kb:[1,-7],Fb:[5,-5],Kf:[2,-6],Ff:[6,-4]}};
function mixP(a,b,t){t=clamp(t,0,1);const o={};for(const k of PJ){const p=a[k],q=b[k]||p;o[k]=[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]}return o}
const ease=t=>{t=clamp(t,0,1);return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};
const BUILD={FW:.88,LW:.92,WW:.97,MW:1,LHW:1.06,HW:1.14};
const OUT='#120d0b';

/* ---------------- arena backgrounds ---------------- */
function arenaPal(kind){return{TFC:{acc:'#e1ad3a',mat:'#ddd5c6',mat2:'#cfc6b6',logo:'rgba(150,100,10,.32)'},GFL:{acc:'#3a6fd8',mat:'#d8dbe0',mat2:'#c7ccd4',logo:'rgba(40,80,170,.32)'},
  RYU:{acc:'#c8202c',mat:'#e2dbcf',mat2:'#8f1d24',logo:'rgba(140,20,30,.4)'},REG:{acc:'#c7783e',mat:'#cdbfa8',mat2:'#b9a98f',logo:'rgba(90,55,30,.32)'},
  EXH:{acc:'#e1ad3a',mat:'#ddd5c6',mat2:'#cfc6b6',logo:''}}[kind]||{acc:'#e1ad3a',mat:'#ddd5c6',mat2:'#cfc6b6',logo:''}}
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;return[c,x]}
function buildBg(kind,ring){const [c,x]=mkCanvas(FVW,FVH),rr=seeded(hash(kind,'bg2')),pal=arenaPal(kind),reg=kind==='REG';
  const g=x.createLinearGradient(0,0,0,FVH);g.addColorStop(0,'#050507');g.addColorStop(.55,reg?'#1e1714':'#13111a');g.addColorStop(1,'#0a090c');x.fillStyle=g;x.fillRect(0,0,FVW,FVH);
  if(reg){ // brick gym wall, posters, heavy bags
    for(let yy=10;yy<FVY-6;yy+=6)for(let xx=((yy/6)%2)*8-8;xx<FVW;xx+=16){prect(x,xx,yy,15,5,rr()<.5?'#3a2720':'#43302a');prect(x,xx,yy,15,1,'#4d382f')}
    for(const [px,col] of [[22,'#c8202c'],[200,'#2f63c8']]){prect(x,px,26,26,34,col);prect(x,px+2,28,22,30,shade(col,-.35));pxText(x,'PGFC',px+3,32,1,'#f1e9dc');prect(x,px+4,44,18,2,'#f1e9dc');prect(x,px+4,49,14,2,'#f1e9dc')}
    for(const bx of [70,186]){prect(x,bx+5,0,2,30,'#2a2522');prect(x,bx,30,12,34,'#8c1f1a');prect(x,bx,30,3,34,'#a8362c');prect(x,bx+9,30,3,34,'#5e1410');prect(x,bx,38,12,2,'#2b1210');prect(x,bx,56,12,2,'#2b1210')}
    for(let i=0;i<4;i++){const lx=30+i*64;prect(x,lx-10,6,20,3,'#5a5852');const lg=x.createRadialGradient(lx,10,2,lx,10,80);lg.addColorStop(0,'rgba(255,236,190,.16)');lg.addColorStop(1,'rgba(255,236,190,0)');x.fillStyle=lg;x.fillRect(lx-80,6,160,FVY)}
  }else{ // lighting truss and spotlights
    prect(x,0,10,FVW,3,'#2a2a31');prect(x,0,18,FVW,2,'#1d1d22');for(let i=0;i<FVW;i+=8)pline(x,i,12,i+8,19,1,'#26262c');
    for(let i=0;i<7;i++){const lx=18+i*37;prect(x,lx-3,20,6,4,'#3a3a40');prect(x,lx-2,24,4,1,'#fff6d8');
      const cone=x.createLinearGradient(0,24,0,FVY);cone.addColorStop(0,'rgba(255,244,210,.10)');cone.addColorStop(1,'rgba(255,244,210,0)');x.fillStyle=cone;x.beginPath();x.moveTo(lx-2,24);x.lineTo(lx+2,24);x.lineTo(lx+40,FVY);x.lineTo(lx-40,FVY);x.fill()}}
  // floor
  const top=FVY-(ring?6:4);
  if(ring){prect(x,0,FVY-4,FVW,FVH-FVY+4,'#0e0d10');prect(x,8,FVY-3,FVW-16,10,pal.mat);prect(x,8,FVY-3,FVW-16,1,shade(pal.mat,.3));prect(x,0,FVY+7,FVW,FVH-FVY-7,pal.mat2);
    for(let i=0;i<FVW;i+=24)prect(x,i,FVY+9,12,2,shade(pal.mat2,-.25))}
  else{const fg=x.createLinearGradient(0,FVY-4,0,FVH);fg.addColorStop(0,shade(pal.mat,.12));fg.addColorStop(1,pal.mat2);x.fillStyle=fg;x.fillRect(0,FVY-4,FVW,FVH-FVY+4);
    if(!reg){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,FVY+9,FVW,1);for(const [sx,w] of [[18,26],[212,26]]){prect(x,sx,FVY+3,w,4,'rgba(0,0,0,.14)');prect(x,sx+2,FVY+4,w-4,2,pal.acc)}}}
  for(const [rw,a] of [[.46,.05],[.34,.05],[.22,.06]]){x.fillStyle=`rgba(255,246,220,${a})`;x.beginPath();x.ellipse(FVW/2,FVY+8,FVW*rw,12*rw/.46,0,0,Math.PI*2);x.fill()}
  const logo=kind==='EXH'?'':reg?'PGFC':kind==='RYU'?'RYUJIN':kind;
  if(logo){const sc=3,w=pxW(logo,sc);pxText(x,logo,Math.round(FVW/2-w/2),FVY+2,sc,pal.logo)}
  if(!ring){ // cage: padded rail, chain-link mesh with highlights, posts
    const ct=reg?FVY-64:FVY-78;
    x.save();x.beginPath();x.rect(0,ct+4,FVW,FVY-ct-6);x.clip();
    x.fillStyle='rgba(0,0,0,.28)';x.fillRect(0,ct+4,FVW,FVY-ct-6);
    for(let d=-FVH;d<FVW+FVH;d+=6){x.fillStyle='rgba(170,176,188,.22)';for(let t=0;t<FVH;t++){x.fillRect(d+t,ct+4+t,1,1);x.fillRect(d-t,ct+4+t,1,1)}}
    x.fillStyle='rgba(255,255,255,.08)';for(let d=-FVH;d<FVW+FVH;d+=12)for(let t=0;t<FVH;t+=12)x.fillRect(d+t,ct+4+t,1,1);
    x.restore();
    prect(x,0,ct,FVW,5,'#16161b');prect(x,0,ct+1,FVW,2,pal.acc);prect(x,0,ct,FVW,1,'#34343b');
    for(const px of [4,FVW-12]){prect(x,px,ct-2,8,FVY-ct+2,'#0f0f13');prect(x,px+1,ct-2,2,FVY-ct+2,'#26262d');prect(x,px,ct+12,8,22,pal.acc);prect(x,px,ct+12,8,2,shade(pal.acc,.3))}
  }else{for(const px of [10,FVW-16]){prect(x,px,FVY-84,6,84,'#1b1b1f');prect(x,px+1,FVY-84,1,84,'#3a3a40');prect(x,px-1,FVY-84,8,14,pal.acc);prect(x,px-1,FVY-84,8,2,shade(pal.acc,.35))}}
  return c}
function buildCrowd(kind){const reg=kind==='REG',rr=seeded(hash(kind,'crowd')),layers=[0,1,2,3].map(()=>mkCanvas(FVW,FVH)),arms=[0,1,2,3].map(()=>mkCanvas(FVW,FVH));
  const pal=['#4a3a40','#35404e','#55463a','#363636','#5a4646','#33473e','#46405a','#5f4f40','#6a5a50','#3d3530'],skins=['#d9b392','#b98a64','#8f6446','#6b4630','#e6c3a3'];
  const y0=reg?FVY-56:30,y1=reg?FVY-40:FVY-74,rows=Math.max(1,Math.floor((y1-y0)/7));
  for(let r=0;r<rows;r++){const yy=y0+r*7,dim=.55+.45*(r/rows);
    for(let xx=-3;xx<FVW;xx+=5+Math.floor(rr()*3)){if(rr()<(reg?.55:.12))continue;const L=layers[Math.floor(rr()*4)][1],sh=pal[Math.floor(rr()*pal.length)],sk=skins[Math.floor(rr()*skins.length)];
      const yo=yy+Math.floor(rr()*2),li=layers.findIndex(l=>l[1]===L);prect(L,xx,yo+4,6,5,shade(sh,-(1-dim)));prect(L,xx,yo+4,1,5,shade(sh,-(1-dim)-.2));prect(L,xx+1,yo,4,4,shade(sk,-(1-dim)*.9));prect(L,xx+1,yo,1,4,shade(sk,-(1-dim)*.9-.15));
      if(rr()<.55){const A=arms[li][1],ac=shade(sk,-(1-dim)*.9),up=rr()<.5;prect(A,xx-1,yo-(up?4:2),1,up?7:5,ac);prect(A,xx+6,yo-(up?4:2),1,up?7:5,ac);prect(A,xx-1,yo-(up?5:3),2,2,ac);prect(A,xx+5,yo-(up?5:3),2,2,ac)}
      if(rr()<.25)prect(L,xx+1,yo,4,1,shade('#2a1d14',-(1-dim)));
      if(rr()<.05){prect(L,xx+4,yo+1,2,3,'#c9e3ff')}
      if(!reg&&rr()<.025){const sc=pick(['#e1ad3a','#c8202c','#3a6fd8','#f1e9dc']);prect(L,xx-1,yo-5,9,5,sc);prect(L,xx+1,yo-4,5,1,'#222')}}}
  const out=layers.map(l=>l[0]);out.arms=arms.map(a=>a[0]);return out}
function buildVignette(){const [c,x]=mkCanvas(FVW,FVH);const g=x.createRadialGradient(FVW/2,FVH*.55,FVH*.35,FVW/2,FVH*.55,FVW*.72);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.55)');x.fillStyle=g;x.fillRect(0,0,FVW,FVH);return c}
/* ---- broadcast camera: SNES "Mode 7" floor, panoramic crowd, cage walls ---- */
const CAM={DC:92,HC:78,FOC:184,H0:-16,NEAR:6,PW:756};
function matTex7(kind,ring,armsUp){const TS=512,[c,x]=mkCanvas(TS,TS),pal=arenaPal(kind),reg=kind==='REG',R=cageR(ring),S=2,cx=TS/2,rr=seeded(hash(kind,'seats'));
  x.fillStyle=reg?'#2a221d':'#121117';x.fillRect(0,0,TS,TS);
  // floor tiles outside the fence
  for(let yy=0;yy<TS;yy+=16)for(let xx=0;xx<TS;xx+=16){x.fillStyle=((xx+yy)/16)%2?(reg?'#30271f':'#16151b'):(reg?'#2a221b':'#121117');x.fillRect(xx,yy,16,16)}
  const poly=(r)=>{const N=cageN(ring),n=N.length,pts=[];for(let i=0;i<n;i++){const a=Math.atan2(N[i][1],N[i][0])+Math.PI/n,r2=r/Math.cos(Math.PI/n);pts.push([cx+Math.cos(a)*r2*S,cx+Math.sin(a)*r2*S])}return pts};
  const fillPoly=(pts,col)=>{x.fillStyle=col;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fill()};
  // tiered seating around the cage (an octagon of rows for the cage, a square for the ring), packed with fans
  const skins=['#d9b392','#b98a64','#8f6446','#6b4630','#e6c3a3'],shirts=['#4a3a40','#35404e','#55463a','#363636','#5a4646','#33473e','#46405a','#5f4f40','#7a3030','#2e4a7a','#6a5a50'];
  if(!reg){const tiers=11;for(let t=tiers;t>=0;t--){const r0=R+18+t*7.5;fillPoly(poly(r0),t%2?'#1d1b22':'#24212a')}
    fillPoly(poly(R+17),'#0e0d12');fillPoly(poly(R+12),'#17161c');
    for(let t=0;t<11;t++){const r0=R+20+t*7.5,dim=1-t*.05,N=cageN(ring),n=N.length;
      for(let i=0;i<n;i++){const a0=Math.atan2(N[i][1],N[i][0])+Math.PI/n,a1=Math.atan2(N[(i+1)%n][1],N[(i+1)%n][0])+Math.PI/n,r2=r0/Math.cos(Math.PI/n);
        const A=[cx+Math.cos(a0)*r2*S,cx+Math.sin(a0)*r2*S],B=[cx+Math.cos(a1)*r2*S,cx+Math.sin(a1)*r2*S],L=Math.hypot(B[0]-A[0],B[1]-A[1]),cnt=Math.floor(L/7);
        const ox=Math.cos((a0+a1)/2)*S*3,oy=Math.sin((a0+a1)/2)*S*3;
        for(let j=0;j<cnt;j++){if(rr()<.1)continue;const u=(j+.5)/cnt,px=A[0]+(B[0]-A[0])*u+ox,py=A[1]+(B[1]-A[1])*u+oy;
          x.fillStyle=shade(pick(shirts),-(1-dim));x.fillRect(px-3,py-3,6,6);x.fillStyle=shade(pick(skins),-(1-dim)*.8);x.fillRect(px-2,py-2,4,4);
          if(rr()<.3){x.fillStyle='#2a1d14';x.fillRect(px-2,py-2,4,2)}
          if(armsUp&&rr()<.55){x.fillStyle=shade(pick(skins),-(1-dim)*.8);const ax=Math.cos((a0+a1)/2+1.57)*4,ay=Math.sin((a0+a1)/2+1.57)*4;x.fillRect(px+ax-1,py+ay-1,2,2);x.fillRect(px-ax-1,py-ay-1,2,2)}
          if(!armsUp&&rr()<.025){x.fillStyle=pick([pal.acc,'#c8202c','#3a6fd8','#f1e9dc']);x.fillRect(px-4,py-4,8,4)}}}}
    // aisles
    const N=cageN(ring);x.strokeStyle='#0c0b10';x.lineWidth=5;for(let i=0;i<N.length;i++){const a=Math.atan2(N[i][1],N[i][0]);x.beginPath();x.moveTo(cx+Math.cos(a)*(R+17)*S,cx+Math.sin(a)*(R+17)*S);x.lineTo(cx+Math.cos(a)*TS,cx+Math.sin(a)*TS);x.stroke()}}
  else{for(let i=0;i<14;i++){const bx=rr()*TS,by=rr()*TS;if(Math.hypot(bx-cx,by-cx)<(R+16)*S)continue;x.fillStyle='#8c1f1a';x.beginPath();x.arc(bx,by,7,0,7);x.fill();x.fillStyle='#a8362c';x.beginPath();x.arc(bx-2,by-2,3,0,7);x.fill()}
    for(let i=0;i<10;i++){const a=rr()*6.28,d=(R+22+rr()*30)*S,px=cx+Math.cos(a)*d,py=cx+Math.sin(a)*d;x.fillStyle=pick(shirts);x.fillRect(px-3,py-3,6,6);x.fillStyle=pick(skins);x.fillRect(px-2,py-2,4,4)}}
  if(ring){fillPoly(poly(R+8),pal.mat2);fillPoly(poly(R+2),shade(pal.mat2,-.25))}else fillPoly(poly(R+3),'#1a1a20');
  fillPoly(poly(R),pal.mat);
  // dithered shading toward the edges, SNES style
  x.save();x.beginPath();poly(R).forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.clip();
  for(let yy=0;yy<TS;yy++)for(let xx=(yy%2);xx<TS;xx+=2){const d=Math.hypot(xx-cx,yy-cx)/(R*S);if(d>.8&&((xx*7+yy*13)%7)<(d-.8)*9){x.fillStyle=ring?shade(pal.mat,-.12):pal.mat2;x.fillRect(xx,yy,1,1)}}
  if(!ring){x.strokeStyle=pal.acc;x.globalAlpha=.6;x.lineWidth=2;x.beginPath();poly(R-5).forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.stroke();x.globalAlpha=1}
  else{x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=2;x.beginPath();poly(R-4).forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.stroke()}
  // corner marks
  for(const s2 of [-1,1]){x.fillStyle=s2<0?'rgba(207,58,46,.55)':'rgba(47,99,200,.55)';x.fillRect(cx+s2*R*S*.62-5,cx-2,10,4)}
  x.restore();
  const logo=kind==='EXH'?'':reg?'PGFC':kind==='RYU'?'RYUJIN':kind;
  if(logo){const sc=logo.length>4?5:7,w=pxW(logo,sc);pxText(x,logo,Math.round(cx-w/2),Math.round(cx-sc*2.5),sc,pal.logo||'rgba(0,0,0,.25)')}
  const d=x.getImageData(0,0,TS,TS);return{px:new Uint32Array(d.data.buffer),TS,S}}
function buildPano(kind){const PW=CAM.PW,PH=CAM.H0+10,reg=kind==='REG',rr=seeded(hash(kind,'pano'));
  const [bc,bx]=mkCanvas(PW,PH),layers=[0,1,2,3].map(()=>mkCanvas(PW,PH)),arms=[0,1,2,3].map(()=>mkCanvas(PW,PH)),pal=arenaPal(kind);
  const g=bx.createLinearGradient(0,0,0,PH);g.addColorStop(0,'#040406');g.addColorStop(1,reg?'#2a1d17':'#15131b');bx.fillStyle=g;bx.fillRect(0,0,PW,PH);
  if(reg){for(let yy=4;yy<PH;yy+=6)for(let xx=((yy/6)%2)*8-8;xx<PW;xx+=16){prect(bx,xx,yy,15,5,rr()<.5?'#3a2720':'#43302a');prect(bx,xx,yy,15,1,'#4d382f')}
    for(let px=30;px<PW;px+=150){const col=rr()<.5?'#c8202c':'#2f63c8';prect(bx,px,14,24,30,col);prect(bx,px+2,16,20,26,shade(col,-.35));pxText(bx,'PGFC',px+1,20,1,'#f1e9dc')}
    for(let bxx=90;bxx<PW;bxx+=150){prect(bx,bxx+5,0,2,26,'#2a2522');prect(bx,bxx,26,12,30,'#8c1f1a');prect(bx,bxx,26,3,30,'#a8362c')}}
  else{prect(bx,0,4,PW,3,'#2a2a31');for(let i=0;i<PW;i+=8)pline(bx,i,5,i+8,9,1,'#26262c');
    for(let lx=12;lx<PW;lx+=42){prect(bx,lx-3,8,6,4,'#3a3a40');prect(bx,lx-2,12,4,1,'#fff6d8')}
    for(let i=0;i<PW;i+=63){const col=pick([pal.acc,'#c8202c','#3a6fd8','#f1e9dc']);prect(bx,i+8,PH-12,40,6,col);prect(bx,i+10,PH-10,36,2,shade(col,-.4))}}
  const skins=['#d9b392','#b98a64','#8f6446','#6b4630','#e6c3a3'],cols=['#4a3a40','#35404e','#55463a','#363636','#5a4646','#33473e','#46405a','#5f4f40','#6a5a50','#3d3530'];
  const y0=reg?PH-22:16,y1=PH-13,rows=Math.max(1,Math.floor((y1-y0)/6));
  for(let r=0;r<rows;r++){const yy=y0+r*6,dim=.5+.5*(r/rows);
    for(let xx=-3;xx<PW;xx+=5+Math.floor(rr()*3)){if(rr()<(reg?.55:.1))continue;const li=Math.floor(rr()*4),L=layers[li][1],sh=cols[Math.floor(rr()*cols.length)],sk=skins[Math.floor(rr()*skins.length)];
      const yo=yy+Math.floor(rr()*2);prect(L,xx,yo+4,5,4,shade(sh,-(1-dim)));prect(L,xx+1,yo,3,4,shade(sk,-(1-dim)*.9));prect(L,xx+1,yo,1,4,shade(sk,-(1-dim)*.9-.15));
      if(rr()<.25)prect(L,xx+1,yo,3,1,shade('#2a1d14',-(1-dim)));if(rr()<.05)prect(L,xx+3,yo+1,2,2,'#c9e3ff');
      if(rr()<.55){const A=arms[li][1],ac=shade(sk,-(1-dim)*.9),up=rr()<.5;prect(A,xx-1,yo-(up?3:1),1,up?6:4,ac);prect(A,xx+5,yo-(up?3:1),1,up?6:4,ac)}}}
  prect(bx,0,PH-7,PW,7,reg?'#1f1814':'#0d0c10');prect(bx,0,PH-7,PW,1,pal.acc);
  return{bg:bc,layers:layers.map(l=>l[0]),arms:arms.map(a=>a[0]),PH}}
function meshPat(x){const [c,m]=mkCanvas(6,6);m.fillStyle='rgba(176,184,198,.85)';for(let i=0;i<6;i++){m.fillRect(i,i,1,1);m.fillRect(5-i,i,1,1)}return x.createPattern(c,'repeat')}
function drawRopes(x,kind){const cols=kind==='RYU'?['#efe9de','#d02a34','#efe9de']:['#efe9de','#d33a3a','#3a62c0'];
  [FVY-68,FVY-50,FVY-32].forEach((y,i)=>{prect(x,14,y,FVW-28,3,cols[i]);prect(x,14,y,FVW-28,1,shade(cols[i],.35));prect(x,14,y+3,FVW-28,2,'rgba(0,0,0,.35)')})}

/* ---------------- fighter sprites ---------------- */
// Primitives are collected per layer, then drawn with a 1px dark outline (silhouette pass) and a fill pass.
function figure(x,J,ox,fc,lk,o){o=o||{};const bd=o.build||1,fl=o.flash,P=k=>[(ox+fc*J[k][0])*FVS,(LV.FLOOR+J[k][1])*FVS];
  const ef=o.eye==null?fc:o.eye,sk=fl?'#ffffff':lk.skin,skS=fl?'#e6e6e6':shade(lk.skin,-.22),skH=fl?'#fff':shade(lk.skin,.18),tr=fl?'#fff':lk.trunk,trS=fl?'#ddd':lk.trunk2,gl=fl?'#fff':lk.glove,glH=fl?'#fff':shade(lk.glove,.35);
  const ref=o.ref,shirt='#17171b',pants='#3b3d44';
  const layers=[[],[],[]];
  const L=(i,f)=>layers[i].push(f);
  // limbs get a lit edge (toward the lights, up and toward the camera side) and a shaded edge
  const limb=(i,a,b,w,c,joint)=>L(i,(dx,dy,col)=>{pline(x,a[0]+dx,a[1]+dy,b[0]+dx,b[1]+dy,w,col||c);
    if(joint)pcirc(x,b[0]+dx,b[1]+dy,Math.max(1,Math.floor(w/2)),col||c);
    if(col||fl||w<4)return;const vx=b[0]-a[0],vy=b[1]-a[1],l=Math.hypot(vx,vy)||1;let nx=-vy/l,ny=vx/l;if(ny>0||(Math.abs(ny)<.2&&nx>0)){nx=-nx;ny=-ny}
    const o=w/2-1.2;pline(x,a[0]+nx*o,a[1]+ny*o,b[0]+nx*o,b[1]+ny*o,1,shade(c,.2));pline(x,a[0]-nx*o,a[1]-ny*o,b[0]-nx*o,b[1]-ny*o,1,shade(c,-.22))});
  // back leg + back arm (layer 0, darker)
  const leg=(i,K,Fo,c,cs,front)=>{const p=P('P'),k=P(K),f=P(Fo),m=[p[0]+(k[0]-p[0])*.55,p[1]+(k[1]-p[1])*.55];
    limb(i,p,m,Math.round(7*bd),ref?pants:(front?tr:trS));limb(i,m,k,Math.round(6*bd),ref?pants:c,1);limb(i,k,f,Math.round(5*bd),ref?pants:c);
    if(!ref)L(i,(dx,dy,col)=>{if(col||fl)return;const cv=[k[0]+(f[0]-k[0])*.3,k[1]+(f[1]-k[1])*.3];prect(x,cv[0]-1,cv[1],2,2,shade(c,.12))});
    L(i,(dx,dy,col)=>prect(x,f[0]-(ef>0?2:4)+dx,f[1]-1+dy,6,3,col||(ref?'#111':cs)))};
  const arm=(i,E,Hd,c,cs)=>{const n=P('N'),s=[n[0],n[1]+3],e=P(E),h=P(Hd);limb(i,s,e,Math.round(5*bd),ref?shirt:c,1);limb(i,e,h,Math.round(4*bd),c);
    L(i,(dx,dy,col)=>{if(ref){prect(x,h[0]-2+dx,h[1]-2+dy,4,4,col||c);return}
      const cuff=[e[0]+(h[0]-e[0])*.62,e[1]+(h[1]-e[1])*.62];
      if(!col)pline(x,cuff[0],cuff[1],h[0],h[1],3,fl?'#fff':'#ece6da');
      pcirc(x,h[0]+dx,h[1]+dy,3,col||gl);prect(x,h[0]+(ef>0?1:-3)+dx,h[1]-2+dy,2,4,col||gl);
      if(!col&&!fl){prect(x,h[0]-2,h[1]-3,3,1,glH);prect(x,h[0]-3,h[1]-2,1,2,glH);prect(x,h[0]-1,h[1]+2,4,1,shade(lk.glove,-.35));prect(x,h[0]+(ef>0?-3:1),h[1]-1,2,1,shade(lk.glove,-.25))}})};
  leg(0,'Kb','Fb',skS,skS,false);arm(0,'Eb','Hb',skS,skS);
  // torso, shorts, front leg, neck, head (layer 1)
  const n=P('N'),p=P('P'),ax=[p[0]-n[0],p[1]-n[1]],al=Math.hypot(ax[0],ax[1])||1,nv=[-ax[1]/al,ax[0]/al],front=Math.sign(nv[0]*fc)||1;
  const sw=13*bd/2,ww=10*bd/2,sh=[n[0],n[1]+3];
  const quad=[[sh[0]+nv[0]*sw,sh[1]+nv[1]*sw],[p[0]+nv[0]*ww,p[1]+nv[1]*ww],[p[0]-nv[0]*ww,p[1]-nv[1]*ww],[sh[0]-nv[0]*sw,sh[1]-nv[1]*sw]];
  leg(1,'Kf','Ff',sk,skS,true);
  L(1,(dx,dy,col)=>{ppoly(x,quad.map(q=>[q[0]+dx,q[1]+dy]),col||(ref?shirt:sk));
    if(!col&&!ref){const back=-front,bq=[[sh[0]+nv[0]*sw*back,sh[1]+nv[1]*sw*back],[p[0]+nv[0]*ww*back,p[1]+nv[1]*ww*back],[p[0]+nv[0]*(ww-3)*back,p[1]+nv[1]*(ww-3)*back],[sh[0]+nv[0]*(sw-3)*back,sh[1]+nv[1]*(sw-3)*back]];
      ppoly(x,bq,skS);const at=t=>[n[0]+ax[0]*t,n[1]+ax[1]*t];
      const c1=at(.32);pline(x,c1[0]+nv[0]*front*1,c1[1],c1[0]+nv[0]*front*5,c1[1]+1,1,skS);
      for(const t of [.55,.7,.84]){const q=at(t);prect(x,q[0]+nv[0]*front*2-1,q[1],3,1,shade(lk.skin,-.12))}
      const hl=at(.2);prect(x,hl[0]+nv[0]*front*(sw-3),hl[1],2,2,skH);
      // rim light down the front edge, deltoid on the lead shoulder, lat shadow
      const fe=front>0?[quad[0],quad[1]]:[quad[3],quad[2]];pline(x,fe[0][0]-nv[0]*front*1.5,fe[0][1]+1,fe[1][0]-nv[0]*front*1.5,fe[1][1]-2,1,skH);
      const dl=[sh[0]+nv[0]*front*(sw-2),sh[1]+nv[1]*front*(sw-2)+1];pcirc(x,dl[0],dl[1],3,sk);prect(x,dl[0]-1,dl[1]-2,2,1,skH);
      const lt=at(.45);prect(x,lt[0]-nv[0]*front*(sw-4),lt[1],1,4,skS)}
    if(!col&&ref){const q=[n[0]+ax[0]*.15,n[1]+ax[1]*.15];prect(x,q[0]-1,q[1],2,2,'#ddd')}});
  // shorts over hips
  L(1,(dx,dy,col)=>{if(ref)return;const kf=P('Kf'),kb=P('Kb'),m1=[p[0]+(kf[0]-p[0])*.5,p[1]+(kf[1]-p[1])*.5],m2=[p[0]+(kb[0]-p[0])*.5,p[1]+(kb[1]-p[1])*.5];
    pline(x,p[0]+dx,p[1]+dy,m1[0]+dx,m1[1]+dy,Math.round(9*bd),col||tr);pline(x,p[0]+dx,p[1]+dy,m2[0]+dx,m2[1]+dy,Math.round(8*bd),col||trS);
    if(!col){const w=Math.round(10*bd);prect(x,p[0]-w/2,p[1]-2,w,3,shade(lk.trunk,-.35));prect(x,p[0]-w/2,p[1]-2,w,1,shade(lk.trunk,-.1));pline(x,p[0],p[1]+1,m1[0],m1[1],1,shade(lk.trunk,.4));
      if(!fl){const ex=[m1[0]+(ef>0?2:-2),m1[1]];pline(x,p[0]+(ef>0?3:-3),p[1],ex[0],ex[1],1,lk.side?'#9cc0ff':'#ffd0c4')}}});
  const h=P('H'),hr=6;
  L(1,(dx,dy,col)=>{pline(x,n[0]+dx,n[1]+2+dy,h[0]+dx,h[1]+3+dy,5,col||skS);pcirc(x,h[0]+dx,h[1]+dy,hr,col||sk);
    if(!o.lying)prect(x,h[0]+(ef>0?0:-5)+dx,h[1]+1+dy,6,5,col||sk)});
  L(1,(dx,dy,col)=>{if(col)return;const hx=Math.round(h[0]),hy=Math.round(h[1]);
    if(o.lying){prect(x,hx-1,hy-4,2,2,'#1a1210');if(lk.hs)prect(x,hx-ef*5-1,hy-4,3,8,lk.hair);return}
    prect(x,hx-ef*4-1,hy-1,2,3,skS);prect(x,hx-ef*2-2,hy+5,5,1,skS);prect(x,hx-ef*1-1,hy,2,3,shade(lk.skin,-.3));prect(x,hx+(ef>0?-4:2),hy-4,2,1,skH);
    const hair=lk.hair,hs=lk.hs;
    const cap=rows=>{for(let dy2=-hr;dy2<-hr+rows;dy2++){const dxw=Math.floor(Math.sqrt(Math.max(0,hr*hr-dy2*dy2))+.35);const x0=hx-dxw,x1=hx+dxw;prect(x,ef>0?x0:x0+1,hy+dy2,x1-x0,1,hair)}};
    if(hs===1){cap(4);prect(x,hx-ef*5-(ef>0?1:0),hy-3,2,4,hair)}
    else if(hs===2){cap(2)}
    else if(hs===3){for(let i=0;i<4;i++)prect(x,hx-1-ef,hy-hr-3+i,3,2,hair)}
    else if(hs===4){cap(4);prect(x,hx-ef*5-(ef>0?2:0),hy-4,3,9,hair)}
    else{prect(x,hx-1,hy-hr+1,2,1,skH)}
    if(lk.beard){prect(x,hx+(ef>0?-1:-5),hy+3,6,3,hair);prect(x,hx+(ef>0?1:-3),hy+2,3,1,hair)}
    const ex=hx+ef*3-(ef<0?1:0);
    if(o.ko){prect(x,ex-1,hy-1,3,1,'#1a1210')}else{prect(x,ex,hy-1,2,2,'#1a1210');prect(x,ex-(ef<0?1:0),hy-3,3,1,shade(hair,-.2))}
    prect(x,hx+ef*6-(ef<0?1:0),hy+1,1,2,skS);
    if(o.hurt)prect(x,hx+ef*3-1,hy+4,3,1,'#5a1f1f');
    const dmg=o.dmg||0;
    if(dmg>.45){prect(x,ex-(ef<0?1:0),hy-4,2,1,'#b0202a')}
    if(dmg>.55){prect(x,ex-1,hy+1,3,2,'#7a3d6a')}
    if(dmg>.7){prect(x,ex+(ef>0?1:-1),hy-3,1,4,'#a01c24');prect(x,hx+ef*5-(ef<0?1:0),hy+3,1,3,'#a01c24')}});
  arm(2,'Ef','Hf',sk,skS);
  for(const lay of layers){for(const f of lay)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])f(dx,dy,OUT);for(const f of lay)f(0,0,null)}
}

/* ---------------- the view ---------------- */
const ICO={
  fist:'<path d="M7 12V9.2a1.6 1.6 0 0 1 3.2 0V11M10.2 10.6V8.4a1.6 1.6 0 0 1 3.2 0v2.2M13.4 10.4V8.8a1.6 1.6 0 0 1 3.2 0v2M16.6 11a1.6 1.6 0 0 1 3.2 0v3a6 6 0 0 1-6 6h-1.6A5.2 5.2 0 0 1 7 14.8V12"/><path d="M2 10h3M2.5 14H5"/>',
  power:'<path d="M8 13V10a1.8 1.8 0 0 1 3.6 0v1M11.6 11V9a1.8 1.8 0 0 1 3.6 0v2M15.2 11.2a1.8 1.8 0 0 1 3.6 0V15a6 6 0 0 1-6 6h-1A5.4 5.4 0 0 1 8 15.6V13"/><path d="M4 6l2 2M2 11h3M4 16l2-2M9 3l1 2.5M14 3l-1 2.5"/>',
  kick:'<path d="M5 3.5l5 7.5 9.5 1.5"/><path d="M19.5 12.5l1.5 2.5-6-.5"/><circle cx="5" cy="3.5" r="1"/>',
  shoot:'<circle cx="6" cy="5" r="2"/><path d="M7.5 8.5l4 5 6.5 1.5M11.5 13.5l-2.5 6M21 15l-3 0"/><path d="M3 21h18"/>',
  shield:'<path d="M12 3l7 3v5.5c0 4.6-3 8-7 9.5-4-1.5-7-4.9-7-9.5V6z"/>',
  lock:'<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2"/>',
  up:'<path d="M12 20V5M6 11l6-6 6 6"/>',
  swap:'<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  knee:'<path d="M8 3v8l6 3M14 14l-3 7"/><circle cx="14" cy="14" r="1.6"/>',
  tap:'<path d="M9 11.5V5.5a2 2 0 0 1 4 0V11M13 10a2 2 0 0 1 4 0v3M9 11.5l-2-2a2 2 0 0 0-3 2.6l5 6.2a5 5 0 0 0 4 1.9h2a5 5 0 0 0 5-5v-3.2a2 2 0 0 0-3-1.7"/>'};
const LBLICO={Jab:'fist',Punches:'fist',Punch:'fist',Strike:'fist',Power:'power',Elbow:'power',Knee:'knee',Kick:'kick',Trip:'kick','Soccer kick':'kick',Shoot:'shoot',Clinch:'shoot','Body lock':'shoot',Pounce:'shoot',Advance:'up',Body:'power','Body kick':'kick',Teep:'kick','Get up':'up','Go behind':'up',Choke:'lock',Catch:'shoot',Sweep:'swap',Escape:'swap',Submit:'lock',Block:'shield',Break:'shield',Posture:'shield',Defend:'shield'};
class LiveView{
  constructor(host,o){this.o=o;this.f=new LiveFight(o);this.speed=1;this.acc=0;this.last=0;this.parts=[];this.decals=[];this.stop=0;this.zoom=1;this.hype=0;this.ghost=[100,100];this.over=null;
    this.kind=o.arena||'EXH';this.vig=buildVignette();[this.buf,this.bx]=mkCanvas(FVW,FVH);
    this.mat=matTex7(this.kind,!!o.ring,false);this.matUp=this.kind==='REG'?this.mat:matTex7(this.kind,!!o.ring,true);this.pano=buildPano(this.kind);this.mesh=meshPat(this.bx);this.floorImg=this.bx.createImageData(FVW,FVH);this.floor32=new Uint32Array(this.floorImg.data.buffer);
    this.cam={mx:0,my:0,th:0};this.decalW=[];
    this.hold={};this.backTap=0;this.stick={id:null,dir:0};this.swap=lsGetV('cr.swap')==='1';
    const [A,B]=this.f.F;for(const F of this.f.F){F.build=BUILD[F.f.div]||1}
    this.ref={x:0,y:-26,vx:0,look:lookOf({id:'ref'+(o.a.id||'')},0),pose:PO.ref,face:1};
    host.insertAdjacentHTML('beforeend',`<div class="live${this.swap?' swap':''}" id="live" role="application" aria-label="Live fight">
      <div class="lhud">${[A,B].map((F,i)=>this.plate(F,i)).join('')}</div>
      <div class="lstage"><canvas width="${FVW}" height="${FVH}"></canvas><div class="lban"></div><div class="lflash"></div><div class="lcombo"></div>
        <div class="lct" hidden><div class="lctn"><span></span><b></b><span></span></div><div class="lctbar"><i></i><em></em></div></div></div>
      <div class="lcall"><span class="lchip">Live</span><span class="ltxt"></span></div>
      <div class="lpad">${this.f.human?this.padHTML():this.watchHTML()}<div class="ltapzone" hidden><div class="ltz"><span>${svg(ICO.tap)}</span><b>Tap!</b><small></small></div></div></div>
      <div class="lover" hidden></div></div>`);
    this.el=host.querySelector('#live');const hud=this.el.querySelector('.lhud');
    hud.insertAdjacentHTML('beforeend',`<div class="lclk"><div class="lpips">${o.rounds.map(()=>'<i></i>').join('')}</div><b class="ltm">5:00</b><button class="lpause" data-lv="pause" aria-label="Pause">${svg('<path d="M9 5v14M15 5v14"/>')}</button></div>`);
    hud.insertBefore(hud.querySelector('.lclk'),hud.children[1]);
    this.cv=this.el.querySelector('canvas');this.ctx=this.cv.getContext('2d');this.ctx.imageSmoothingEnabled=false;
    this.q=s=>this.el.querySelector(s);
    this.mo=[...this.el.querySelectorAll('.lmo i')];this.ui={hp:[...this.el.querySelectorAll('.lhp .cur')],gh:[...this.el.querySelectorAll('.lhp .ghost')],mx:[...this.el.querySelectorAll('.lhp .max')],st:[...this.el.querySelectorAll('.lsta i')],fs:[...this.el.querySelectorAll('.lfs')],
      body:[...this.el.querySelectorAll('.lbody')],pips:[...this.el.querySelectorAll('.lpips i')],tm:this.q('.ltm'),ban:this.q('.lban'),fl:this.q('.lflash'),ct:this.q('.lct'),call:this.q('.ltxt'),over:this.q('.lover'),tz:this.q('.ltapzone'),knob:this.q('.lknob')};
    this.bind();LIVE_ON=true;window.__live=this;this.layoutPad();this.onResize=()=>this.layoutPad();window.addEventListener('resize',this.onResize);
    this.showBanner(`${esc(A.name)} <span style="color:var(--acc)">vs</span> ${esc(B.name)}`,o.title?'Title fight':`${o.rounds.length} round${o.rounds.length>1?'s':''}`,1.6);
    this.loop=this.loop.bind(this);this.raf=requestAnimationFrame(this.loop)}
  plate(F,i){const rec=F.f.w!=null?`${F.f.w}-${F.f.l}${F.f.d?'-'+F.f.d:''}`:'';
    return `<div class="lfs ${i?'b':'a'}"><div class="lplate"><i class="cor"></i><b class="lnm">${esc(F.name)}</b>${F.human?'<em>You</em>':''}</div>
      <div class="lhp"><i class="max"></i><i class="ghost"></i><i class="cur"></i></div><div class="lsub"><div class="lsta"><i></i></div><div class="lmo" title="Momentum"><i></i></div>
      <svg class="lbody" viewBox="0 0 10 22" aria-hidden="true"><circle cx="5" cy="3" r="2.6"/><rect x="2.4" y="6.4" width="5.2" height="7" rx="1.4"/><rect x="2.6" y="13.8" width="4.8" height="7.6" rx="1.2"/></svg></div>
      <div class="lmeta">${esc(F.f.style||'')}${rec?' · '+rec:''}</div></div>`}
  padHTML(){const b=(k,cls,lbl,ico)=>`<button class="lbtn ${cls}" data-k="${k}"><span class="lring"></span><span class="lic">${svg(ICO[ico])}</span><b>${lbl}</b><small></small></button>`;
    return `<div class="lleft"><div class="lstick" data-stick aria-label="Move: drag in any direction"><span class="larr l">${svg('<path d="M15 5l-7 7 7 7"/>')}</span><span class="larr r">${svg('<path d="M9 5l7 7-7 7"/>')}</span><span class="larr u">${svg('<path d="M5 15l7-7 7 7"/>')}</span><span class="larr d">${svg('<path d="M5 9l7 7 7-7"/>')}</span><span class="lknob"></span></div>
      ${b('B','lblock','Block','shield')}</div>
      <div class="ldia">${b('J','kj','Jab','fist')}${b('S','ks','Shoot','shoot')}${b('P','kp','Power','power')}${b('K','kk','Kick','kick')}</div>`}
  watchHTML(){return `<div class="lwatch"><div class="lbl">Watching live · speed</div><div class="seg">${[1,2,4].map(s=>`<button class="${s===1?'on':''}" data-lv="spd" data-v="${s}">${s}×</button>`).join('')}</div><button class="btn ghost block" data-lv="ffwd">Skip to result</button></div>`}

  layoutPad(){const pad=this.q('.lpad'),dia=this.q('.ldia');if(!pad||!dia)return;dia.style.width=dia.style.height='';
    const cs=getComputedStyle(pad),h=pad.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom),w=dia.getBoundingClientRect().width;
    const sz=Math.round(clamp(Math.min(w/1.08,h),130,240));dia.style.width=dia.style.height=sz+'px'}
  /* ---------- input ---------- */
  bind(){const el=this.el;
    this.onDown=e=>{SFX.init();const st=e.target.closest('[data-stick]');if(st){e.preventDefault();this.stickDown(e,st);return}
      if(e.target.closest('.ltapzone')){e.preventDefault();this.tapZone(e);return}
      const b=e.target.closest('[data-k]');if(!b)return;e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}this.press(b.dataset.k,b)};
    this.onMove=e=>{if(this.stick.id===e.pointerId)this.stickMove(e)};
    this.onUp=e=>{if(this.stick.id===e.pointerId){this.stickUp();return}const b=e.target.closest('[data-k]');if(!b)return;e.preventDefault();this.release(b.dataset.k,b)};
    this.onClick=e=>{const b=e.target.closest('[data-lv]');if(!b)return;SFX.init();this.cmd(b.dataset.lv,b.dataset.v)};
    el.addEventListener('pointerdown',this.onDown);el.addEventListener('pointermove',this.onMove);el.addEventListener('pointerup',this.onUp);el.addEventListener('pointercancel',this.onUp);el.addEventListener('lostpointercapture',this.onUp);el.addEventListener('click',this.onClick);
    el.addEventListener('contextmenu',e=>e.preventDefault());
    const KM={ArrowLeft:'L',a:'L',A:'L',ArrowRight:'R',d:'R',D:'R',ArrowUp:'U',w:'U',W:'U',ArrowDown:'D',s:'D',S:'D',' ':'B',j:'J',J:'J',k:'P',K:'P',l:'K',L:'K',i:'S',I:'S'};
    this.onKey=e=>{if(e.type==='keydown'&&(e.key==='Escape'||e.key==='p')){this.cmd(this.over==='pause'?'resume':'pause');return}
      const k=KM[e.key];if(!k||!this.f.human)return;e.preventDefault();if(e.type==='keydown'){if(e.repeat)return;SFX.init();this.press(k,this.el.querySelector(`[data-k="${k}"]`))}else this.release(k,this.el.querySelector(`[data-k="${k}"]`))};
    document.addEventListener('keydown',this.onKey);document.addEventListener('keyup',this.onKey)}
  stickDown(e,st){const r=st.getBoundingClientRect();this.stick={id:e.pointerId,cx:r.left+r.width/2,cy:r.top+r.height/2,w:r.width,dir:0,mx:0,my:0};try{st.setPointerCapture(e.pointerId)}catch(_){}this.stickMove(e)}
  stickMove(e){const s=this.stick,lim=Math.max(14,s.w/2-28);let dx=e.clientX-s.cx,dy=e.clientY-s.cy;const m=Math.hypot(dx,dy);
    if(m>lim){dx*=lim/m;dy*=lim/m}const dead=10;s.mx=m<dead?0:dx/lim;s.my=m<dead?0:dy/lim;
    const d=Math.abs(s.mx)>.55&&Math.abs(s.mx)>Math.abs(s.my)?Math.sign(s.mx):0;if(d!==s.dir){if(d!==0)this.dirStart(d);s.dir=d}
    const v=Math.abs(s.my)>.55&&Math.abs(s.my)>Math.abs(s.mx)?Math.sign(s.my):0;if(v!==s.vdir){if(v!==0)this.vStart(v);s.vdir=v}
    if(this.ui.knob)this.ui.knob.style.transform=`translate(${dx}px,${dy}px)`}
  stickUp(){this.stick={id:null,dir:0,mx:0,my:0};if(this.ui.knob)this.ui.knob.style.transform=''}
  vStart(v){const f=this.f,H=f.human;if(!H||this.over||f.ct||f.pos!=='stand')return;const now=performance.now(),k=v<0?'upTap':'dnTap';
    if(now-(this[k]||0)<300){f.taps.push(v<0?'slipL':'slipR');this[k]=0}else this[k]=now}
  dirStart(d){const f=this.f,H=f.human;if(!H||this.over)return;if(f.ct){f.taps.push(d<0?'L':'R');return}
    if(f.pos!=='stand')return;const now=performance.now();
    if(d!==(H.sf||1)){if(now-this.backTap<300){f.taps.push('dodge');this.backTap=0}else this.backTap=now}
    else{if(now-(this.fwdTap||0)<300){f.taps.push('dash');this.fwdTap=0}else this.fwdTap=now}}
  tapZone(e){const f=this.f;if(!f.ct)return;f.taps.push('J');SFX.play('tap');const z=this.ui.tz.querySelector('.ltz');z.classList.remove('hit');void z.offsetWidth;z.classList.add('hit');try{navigator.vibrate&&navigator.vibrate(6)}catch(_){}}
  press(k,b){const f=this.f,H=f.human;if(!H||this.over)return;b&&b.classList.add('on');
    if(k==='L'||k==='R'){this.hold[k]=true;this.dirStart(k==='L'?-1:1);return}
    if(k==='U'||k==='D'){this.hold[k]=true;this.vStart(k==='U'?-1:1);return}
    if(k==='B'){this.hold.B=true;f.taps.push('B');return}
    if(f.ct||(k!=='P'&&k!=='K')){f.taps.push(k);return}
    this.hold[k]=performance.now();this.hb=this.hb||{};this.hb[k]=b;
    clearTimeout(this['ct'+k]);this['ct'+k]=setTimeout(()=>{if(this.hold[k]){this.hold[k]=0;b&&b.style.setProperty('--c',0);f.taps.push(k+'c');try{navigator.vibrate&&navigator.vibrate(15)}catch(_){}}},480)}
  release(k,b){b&&b.classList.remove('on');const f=this.f;
    if(k==='L'||k==='R'||k==='U'||k==='D'||k==='B'){this.hold[k]=false;return}
    if((k==='P'||k==='K')&&this.hold[k]){const held=performance.now()-this.hold[k];this.hold[k]=0;clearTimeout(this['ct'+k]);b&&b.style.setProperty('--c',0);f.taps.push(held<220?k:k+'c')}}
  cmd(c,v){const f=this.f;
    if(c==='pause'&&f.phase!=='end'){this.paused=true;this.overlay('pause')}
    else if(c==='resume'){this.paused=false;this.overlay(null)}
    else if(c==='spd'){this.speed=+v;this.el.querySelectorAll('[data-lv="spd"]').forEach(b=>b.classList.toggle('on',b.dataset.v===v))}
    else if(c==='ffwd'||c==='simrest'){for(const F of f.F)F.human=false;this.speed=40;this.paused=false;this.overlay(null);this.ff=true;this.q('.lpad').innerHTML=`<div class="lwatch"><div class="lbl">Simulating the rest of the fight</div></div>`}
    else if(c==='sound'){SFX.set(!SFX.on);this.overlay('pause')}
    else if(c==='swap'){this.swap=!this.swap;lsSetV('cr.swap',this.swap?'1':'0');this.el.classList.toggle('swap',this.swap);this.overlay('pause')}
    else if(c==='help')this.overlay('help');
    else if(c==='next'){f.nextRound();this.overlay(null)}
    else if(c==='done')this.close(f.res);
    else if(c==='quit')this.close(null)}
  close(res){cancelAnimationFrame(this.raf);window.removeEventListener('resize',this.onResize);document.removeEventListener('keydown',this.onKey);document.removeEventListener('keyup',this.onKey);clearTimeout(this.ctP);clearTimeout(this.ctK);
    this.el.remove();LIVE_ON=false;const cb=this.o.onEnd;cb&&cb(res)}

  /* ---------- loop ---------- */
  loop(ts){this.raf=requestAnimationFrame(this.loop);if(!this.el.isConnected){cancelAnimationFrame(this.raf);LIVE_ON=false;return}
    let dt=Math.min(.05,(ts-(this.last||ts))/1000);this.last=ts;const f=this.f;
    if(!this.paused&&!this.over){const H=f.human;
      {let mx=this.stick.mx||((this.hold.R?1:0)-(this.hold.L?1:0)),my=this.stick.my||((this.hold.D?1:0)-(this.hold.U?1:0));if(!H){mx=my=0}
        const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}const c=this.cam,cr=Math.cos(c.th),sr=Math.sin(c.th);
        // screen right = camera right, screen up = away from the camera
        f.inp.dir=mx;f.inp.wx=cr*mx+sr*my;f.inp.wy=sr*mx-cr*my}
      f.inp.B=!!this.hold.B;
      if(this.stop>0&&!this.ff)this.stop-=dt;
      else{const sp=this.ff?this.speed:this.speed*(f.slow>0?.35:1);this.acc+=dt*sp;let n=0;
        while(this.acc>=1/60&&n<900){f.update(1/60);this.acc-=1/60;n++;this.drain();if(this.stop>0&&!this.ff){this.acc=0;break}}}
      if(f.phase==='break'&&!this.over){if(f.human)this.overlay('break');else{this.brk=(this.brk||0)+dt;if(this.brk>(this.ff?0:2.2)){this.brk=0;f.nextRound()}}}
      if(f.phase==='end'&&f.pt>(this.ff?0:1.9)&&!this.over)this.overlay('end')}
    this.hype=Math.max(0,this.hype-dt*.5);
    this.updRef(dt);this.updParts(dt);this.draw(dt);this.hud(dt)}
  drain(){const f=this.f;while(f.ev.length)this.onEv(f.ev.shift())}
  onEv(e){const f=this.f,ff=this.ff;if(ff&&e.type!=='banner')return;
    switch(e.type){
      case'hit':{const p=this.hitPos(e),big=e.big;
        this.parts.push({k:'burst',x:p[0],y:p[1],l:big?.2:.12,m:big?.2:.12,s:big?1:.6,d:-(e.F.sf||1)});if(big)this.parts.push({k:'ring',x:p[0],y:p[1],l:.18,m:.18});
        if(big)this.parts.push({k:'lines',x:p[0],y:p[1],l:.12,m:.12,d:-(e.F.sf||1)});
        for(let i=0;i<(big?10:5);i++)this.parts.push({x:p[0],y:p[1],vx:(Math.random()-.5)*130-(e.F.sf||1)*40,vy:(Math.random()-.75)*110,l:.2+Math.random()*.2,c:Math.random()<.5?'#fff':'#ffe58a',s:Math.random()<.4?2:1});
        if(big||Math.random()<.4)for(let i=0;i<5;i++)this.parts.push({x:p[0],y:p[1],vx:(Math.random()-.5)*80-(e.F.sf||1)*30,vy:-Math.random()*70,l:.5,c:'#cfe8ff',s:2,g:1});
        if(e.blood){for(let i=0;i<6;i++)this.parts.push({x:p[0],y:p[1],vx:(Math.random()-.5)*90,vy:-Math.random()*60,l:.7,c:'#8f1717',s:2,g:1});
          if(this.decalW.length<90)for(let i=0;i<3;i++)this.decalW.push([e.F.x+(Math.random()-.5)*8,e.F.y+(Math.random()-.5)*5,Math.random()<.5?2:1])}
        if(big){this.stop=Math.max(this.stop,e.dmg>9?.1:.065);this.hype=Math.min(1,this.hype+.35)}
        e.F.flashT=.07;e.F.snap=.18;e.F.snapBig=big;e.F.snapT=e.tgt||'head';SFX.play('hit',big);if(big&&e.dmg>8)SFX.play('crowd');
        if(f.human&&(e.F===f.human||e.A===f.human))try{navigator.vibrate&&navigator.vibrate(e.F===f.human?(big?30:12):8)}catch(_){}break}
      case'block':{const p=this.hitPos(e);for(let i=0;i<5;i++)this.parts.push({x:p[0],y:p[1],vx:(Math.random()-.5)*70-(e.F.sf||1)*30,vy:(Math.random()-.6)*60,l:.16,c:'#a9b3bd',s:1});this.parts.push({k:'ring',x:p[0],y:p[1],l:.1,m:.1,c:'#a9b3bd'});SFX.play('block');break}
      case'whoosh':SFX.play('whoosh');break;
      case'slam':{const P=this.proj(e.F.x,e.F.y,0);for(let i=0;i<20;i++)this.parts.push({x:P[0]+(Math.random()-.5)*36,y:P[1]-2,vx:(Math.random()-.5)*110,vy:-Math.random()*40,l:.6,c:'#d8ccb4',s:Math.random()<.5?3:2,a:1});SFX.play('slam');this.stop=.06;this.hype=Math.min(1,this.hype+.3);break}
      case'kd':this.stop=.16;this.hype=1;SFX.play('slam');SFX.play('crowd',true);break;
      case'bell':SFX.play('bell');break;
      case'crowd':SFX.play('crowd',true);this.hype=1;break;
      case'banner':if(!ff)this.showBanner(e.t,'',1.4);break;
      case'flash':this.showFlash(e.t);break;
      case'combo':this.showCombo(e.n);break;
      case'fire':SFX.play('crowd',true);this.hype=1;break;
      case'rocked':this.hype=Math.min(1,this.hype+.5);break;
      case'contestEnd':if(e.human!=null)this.showFlash(e.human?'You win the scramble!':'Lost the scramble');break;
    }}
  hitPos(e){const f=this.f,F=e.F;this.place();if(f.pos==='ground'&&f.g){const b=f.g.bot,fb=f.g.sfb||1,J=F===b?GB[f.g.pos]:GT[f.g.pos];return[b.px+fb*J.H[0]*FVS,b.py+J.H[1]*FVS]}
    return[F.px-(F.sf||1)*1.5*FVS,F.py+(e.y||-26)*FVS]}
  updParts(dt){for(const p of this.parts){p.l-=dt;if(p.vx!=null){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.g?320:80)*dt;if(p.a)p.vx*=.92}
      }
    this.parts=this.parts.filter(p=>p.l>0)}
  // the referee works the far side of the action so he never blocks the camera
  updRef(dt){const f=this.f,r=this.ref,[a,b]=f.F,c=this.cam,cr=Math.cos(c.th),sr=Math.sin(c.th),kx=-sr,ky=cr;let tx,ty,pose=PO.ref,look=null;
    const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,side=(r.x-mx)*cr+(r.y-my)*sr>=0?1:-1;
    if(f.phase==='end'&&f.pt>1){const W=f.F.find(F=>F.win)||a;tx=W.x+kx*5-cr*side*7;ty=W.y+ky*5-sr*side*7;pose=W.win?PO.refRaise:PO.ref;look=W}
    else if(f.pos==='ground'&&f.g){const B=f.g.bot;tx=B.x+kx*14+cr*side*24;ty=B.y+ky*14+sr*side*24;pose=PO.refCrouch;look=B}
    else{const D=f.F.find(F=>F.down>0);
      if(D){tx=D.x+kx*10+cr*side*20;ty=D.y+ky*10+sr*side*20;pose=PO.refStop;look=D}
      else{tx=mx+kx*12+cr*side*30;ty=my+ky*12+sr*side*30}}
    const P={x:tx,y:ty};f.clampIn(P,3);const dx=P.x-r.x,dy=P.y-r.y,d=Math.hypot(dx,dy),sp=Math.min(40,d*3);
    if(d>.01){r.x+=dx/d*sp*dt;r.y+=dy/d*sp*dt}r.vx=sp;r.walkT=(r.walkT||0)+(sp>3?dt:0);r.pose=pose;r.look2=look||{x:mx,y:my}}
  showBanner(t,sub,d){this.ui.ban.innerHTML=`<span>${t}</span>${sub?`<small>${esc(sub)}</small>`:''}`;this.ui.ban.classList.remove('on');void this.ui.ban.offsetWidth;this.ui.ban.classList.add('on');clearTimeout(this.bt);this.bt=setTimeout(()=>this.ui.ban.classList.remove('on'),(d||1.4)*1000)}
  showCombo(n){const el=this.q('.lcombo');if(!el)return;el.innerHTML=`<b>${n}</b><span>hit combo</span>`;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');clearTimeout(this.cbT);this.cbT=setTimeout(()=>el.classList.remove('on'),900)}
  showFlash(t){this.ui.fl.textContent=t;this.ui.fl.classList.add('on');clearTimeout(this.ft);this.ft=setTimeout(()=>this.ui.fl.classList.remove('on'),900)}

  /* ---------- camera ---------- */
  camUpdate(dt){const f=this.f,c=this.cam,[a,b]=f.F;let tx,ty;
    if(f.pos==='ground'&&f.g){tx=f.g.bot.x;ty=f.g.bot.y}else{tx=(a.x+b.x)/2;ty=(a.y+b.y)/2}
    const ax=Math.atan2(f.axis[1],f.axis[0]);let best=ax,bd=9;for(const cand of [ax,ax+Math.PI]){let d=cand-c.th;d=Math.atan2(Math.sin(d),Math.cos(d));if(Math.abs(d)<Math.abs(bd)){bd=d;best=cand}}
    if(f.pos==='stand'&&!f.F.some(F=>F.down>0))c.th+=bd*Math.min(1,dt*2.6);
    c.cutCD=(c.cutCD||0)-dt;
    if(c.cutCD<=0&&c.cr!=null){const kx=-Math.sin(c.th),ky=Math.cos(c.th);let near=0;for(const F of f.F){let m=-1e9;for(const n of f.N){if(n[0]*kx+n[1]*ky<-.3)m=Math.max(m,F.x*n[0]+F.y*n[1])}if(f.CR-m<14)near++}
      if(near===2){c.th+=Math.PI;c.cutCD=4;this.cut=.12}}
    const k=Math.min(1,dt*4);c.mx+=(tx-c.mx)*k;c.my+=(ty-c.my)*k;
    c.cr=Math.cos(c.th);c.sr=Math.sin(c.th);c.cx=c.mx+c.sr*CAM.DC;c.cy=c.my-c.cr*CAM.DC}
  // world (x,y on the mat, h above it) -> screen pixels; returns [sx,sy,depth]
  proj(wx,wy,h){const c=this.cam,rx=wx-c.cx,ry=wy-c.cy,xr=rx*c.cr+ry*c.sr,d=-rx*c.sr+ry*c.cr;
    if(d<.5)return[NaN,NaN,d];return[FVW/2+xr*CAM.FOC/d,CAM.H0+(CAM.HC-(h||0))*CAM.FOC/d,d]}
  // per-fighter screen anchors (feet) and which way each one faces on screen
  place(){const f=this.f,c=this.cam;if(c.cr==null)this.camUpdate(0);
    for(const F of f.F){const P=this.proj(F.x,F.y,0);F.px=Math.round(P[0]);F.py=Math.round(P[1]);F.pd=P[2]}
    const [a,b]=f.F;const dxs=b.px-a.px;if(Math.abs(dxs)>1){a.sf=dxs>0?1:-1;b.sf=-a.sf}else{a.sf=a.sf||1;b.sf=-(a.sf)}
    if(f.g){const v=f.g.fx;f.g.sfb=(v[0]*c.cr+v[1]*c.sr)>=0?1:-1}
    const r=this.ref,P=this.proj(r.x,r.y,0);r.px=Math.round(P[0]);r.py=Math.round(P[1]);r.pd=P[2];
    const L=r.look2?this.proj(r.look2.x,r.look2.y,0):null;r.sf=L&&L[0]<r.px?-1:1}
  floor7(sx,sy){const c=this.cam,M=this.hype>.4&&Math.sin(this.vt*14)>0?this.matUp:this.mat,px=M.px,TS=M.TS,S=M.S,out=this.floor32,half=TS/2,dark=0xff0b0a0e;
    const y0=Math.max(0,Math.ceil(CAM.H0+1+sy));for(let y=0;y<y0;y++)out.fill(0,y*FVW,(y+1)*FVW);
    for(let y=y0;y<FVH;y++){const d=CAM.HC*CAM.FOC/(y-sy-CAM.H0),step=d/CAM.FOC,fog=Math.max(.35,Math.min(1,1.3-d/420));
      let wx=c.cx-c.sr*d+c.cr*(-FVW/2-sx)*step,wy=c.cy+c.cr*d+c.sr*(-FVW/2-sx)*step;const dx=c.cr*step,dy=c.sr*step,row=y*FVW;
      for(let x=0;x<FVW;x++){const tx=(wx*S+half)|0,ty=(wy*S+half)|0;let col=(tx>=0&&ty>=0&&tx<TS&&ty<TS)?px[ty*TS+tx]:dark;
        if(fog<1){const r=(col&255)*fog,g=((col>>8)&255)*fog,b=((col>>16)&255)*fog;col=0xff000000|(b<<16)|(g<<8)|r}
        out[row+x]=col;wx+=dx;wy+=dy}}
    this.bx.putImageData(this.floorImg,0,0)}
  cageVerts(){const f=this.f,N=f.N,n=N.length,R=f.CR/Math.cos(Math.PI/n),V=[];for(let i=0;i<n;i++){const a=Math.atan2(N[i][1],N[i][0])+Math.PI/n;V.push([Math.cos(a)*R,Math.sin(a)*R])}return V}
  // back walls before the fighters, near walls (see-through) after them
  drawCage(x,front){const f=this.f,c=this.cam,V=this.cageVerts(),n=V.length,ring=!!this.o.ring,pal=arenaPal(this.kind),H=ring?30:34,NEAR=front?24:CAM.NEAR;
    const kx=-c.sr,ky=c.cr;
    for(let i=0;i<n;i++){const A=V[i],B=V[(i+1)%n],nx=f.N[(i+1)%n]?f.N[i]:f.N[i],nm=f.N[i],back=(nm[0]*kx+nm[1]*ky)>-.15;
      if(back===!!front)continue;
      let a=[A[0],A[1]],b=[B[0],B[1]];const da=(a[0]-c.cx)*kx+(a[1]-c.cy)*ky,db=(b[0]-c.cx)*kx+(b[1]-c.cy)*ky;
      if(da<NEAR&&db<NEAR)continue;
      if(da<NEAR){const t=(NEAR-da)/(db-da);a=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
      if(db<NEAR){const t=(NEAR-db)/(da-db);b=[b[0]+(a[0]-b[0])*t,b[1]+(a[1]-b[1])*t]}
      const a0=this.proj(a[0],a[1],0),a1=this.proj(a[0],a[1],H),b0=this.proj(b[0],b[1],0),b1=this.proj(b[0],b[1],H);
      if(!ring){x.globalAlpha=front?.14:.62;x.fillStyle=this.mesh;x.beginPath();x.moveTo(a0[0],a0[1]);x.lineTo(b0[0],b0[1]);x.lineTo(b1[0],b1[1]);x.lineTo(a1[0],a1[1]);x.closePath();x.fill();
        x.globalAlpha=front?.08:.35;x.fillStyle='#000';x.beginPath();x.moveTo(a0[0],a0[1]);x.lineTo(b0[0],b0[1]);x.lineTo(b1[0],b1[1]);x.lineTo(a1[0],a1[1]);x.closePath();x.fill();x.globalAlpha=1;
        const rail=(p,q,w,col)=>pline(x,p[0],p[1],q[0],q[1],w,col);
        if(front)x.globalAlpha=.45;rail(a1,b1,front?2:3,'#16161b');rail([a1[0],a1[1]-1],[b1[0],b1[1]-1],1,pal.acc);
        if(!front)rail(a0,b0,2,'#18181d');x.globalAlpha=1}
      else{const cols=this.kind==='RYU'?['#efe9de','#d02a34','#efe9de']:['#efe9de','#d33a3a','#3a62c0'];
        [10,18,26].forEach((h,j)=>{const p=this.proj(a[0],a[1],h),q=this.proj(b[0],b[1],h);x.globalAlpha=front?.55:1;pline(x,p[0],p[1],q[0],q[1],2,cols[j]);x.globalAlpha=1})}
      // posts at the true corners
      for(const [P,d] of [[A,da],[B,db]])if(d>=NEAR){const p0=this.proj(P[0],P[1],0),p1=this.proj(P[0],P[1],H+2),w=Math.max(2,Math.round(CAM.FOC/p0[2]*2.2));
        x.globalAlpha=front?.3:1;prect(x,p0[0]-w/2,p1[1],w,p0[1]-p1[1],'#0f0f13');prect(x,p0[0]-w/2,p1[1]+(p0[1]-p1[1])*.25,w,(p0[1]-p1[1])*.3,ring?pal.acc:pal.acc);x.globalAlpha=1}}}
  drawPano(x,ox,oy){const P=this.pano,PW=CAM.PW,c=this.cam,off=(((c.th*CAM.FOC)%PW)+PW)%PW,T=this.vt,amp=this.hype>.15?2:0,y=Math.round(CAM.H0+oy-P.PH+8);
    const blit=(img,dy)=>{for(let k=-1;k<=1;k++)x.drawImage(img,Math.round(-off+k*PW+ox),y+dy)};
    blit(P.bg,0);P.layers.forEach((L,i)=>{const o=amp?Math.round(Math.abs(Math.sin(T*(8+i*1.3)+i*1.7))*-amp):(Math.sin(T*1.3+i*2)>.97?-1:0);
      if(this.hype>.4)blit(P.arms[i],o-(Math.sin(T*(10+i)+i)>0?1:0));blit(L,o)})}
  minimap(x){const f=this.f,c=this.cam,S=.26,cx=18,cy=FVH-18,V=this.cageVerts();
    const m=(wx,wy)=>{const xr=wx*c.cr+wy*c.sr,d=-wx*c.sr+wy*c.cr;return[cx+xr*S,cy-d*S]};
    x.globalAlpha=.55;x.fillStyle='#000';x.beginPath();V.forEach((v,i)=>{const p=m(v[0],v[1]);i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1])});x.closePath();x.fill();x.globalAlpha=1;
    for(let i=0;i<V.length;i++){const p=m(V[i][0],V[i][1]),q=m(V[(i+1)%V.length][0],V[(i+1)%V.length][1]);pline(x,p[0],p[1],q[0],q[1],1,'rgba(240,232,214,.75)')}
    for(const F of f.F){const p=m(F.x,F.y);prect(x,p[0]-1,p[1]-1,3,3,F.side?'#5d8dff':'#ff5a4a')}
    const r=m(this.ref.x,this.ref.y);prect(x,r[0],r[1],1,1,'#ddd')}

  /* ---------- drawing ---------- */
  draw(dt){const f=this.f,x=this.bx;this.vt=(this.vt||0)+dt;const T=this.vt;
    let sx=0,sy=0;if(f.shake){sx=Math.round((Math.random()-.5)*f.shake*FVS);sy=Math.round((Math.random()-.5)*f.shake*FVS*.6)}
    this.camUpdate(dt);this.place();if(this.cut>0)this.cut-=dt;
    x.setTransform(1,0,0,1,0,0);this.floor7(sx,sy);x.setTransform(1,0,0,1,sx,sy);
    if(CAM.H0>4)this.drawPano(x,0,0);
    if(this.kind!=='REG'){this.flashes=this.flashes||[];if(Math.random()<dt*(1.5+this.hype*14)){const a=Math.random()*6.283,rr=f.CR+22+Math.random()*70;this.flashes.push({x:Math.cos(a)*rr,y:Math.sin(a)*rr,l:.09})}
      for(const q of this.flashes){q.l-=dt;const P=this.proj(q.x,q.y,6);if(P[2]>CAM.NEAR&&q.l>0){prect(x,P[0]-1,P[1],3,1,'#fff');prect(x,P[0],P[1]-1,1,3,'#fff')}}this.flashes=this.flashes.filter(q=>q.l>0)}
    if(this.hype>.55&&this.kind!=='REG'){for(let i=0;i<2;i++){const cx=FVW/2+Math.sin(T*1.3+i*Math.PI)*FVW*.38;x.globalAlpha=.07*this.hype;x.fillStyle='#fff3cf';x.beginPath();x.moveTo(cx-4,0);x.lineTo(cx+4,0);x.lineTo(cx+34,FVY);x.lineTo(cx-34,FVY);x.fill()}x.globalAlpha=1}
    this.drawCage(x,false);
    for(const d of this.decalW){const P=this.proj(d[0],d[1],0);if(P[2]>CAM.NEAR)prect(x,P[0],P[1],d[2],1,'#7a1414')}
    const shadowAt=(px,py,w)=>{x.fillStyle='rgba(0,0,0,.35)';x.fillRect(Math.round(px-w),py-1,w*2,3);x.fillRect(Math.round(px-w+3),py+2,w*2-6,1)};
    // draw referee and fighters back to front
    const r=this.ref,items=[];
    items.push({d:r.pd,fn:()=>{if(!(r.pd>CAM.NEAR))return;shadowAt(r.px,r.py,9);let rp=r.pose;if(r.vx>3&&rp===PO.ref){const s2=Math.sin(r.walkT*14);rp=ov(rp,{Fb:[rp.Fb[0]+s2*2,rp.Fb[1]-Math.max(0,s2)],Ff:[rp.Ff[0]-s2*2,rp.Ff[1]-Math.max(0,-s2)]})}
      x.save();x.translate(r.px,r.py-FVY);x.globalAlpha=.94;figure(x,rp,0,r.sf,r.look,{ref:1,build:.95});x.restore()}});
    if(f.pos==='ground'&&f.g){const b=f.g.bot;items.push({d:b.pd,fn:()=>{shadowAt(b.px,b.py,24);this.drawGround(x)}})}
    else{const order=[...f.F].sort((a,b)=>(a.act?1:0)-(b.act?1:0));order.forEach((F,i)=>items.push({d:F.pd-i*.01,fn:()=>{shadowAt(F.px,F.py,F.down>0?20:11);this.drawStand(x,F,dt)}}))}
    items.sort((a,b)=>b.d-a.d).forEach(it=>it.fn());
    this.drawCage(x,true);
    for(const p of this.parts){
      if(p.k==='burst'){const t=1-p.l/p.m,S=p.s;
        if(t<.34){const rr=Math.round(7*S);prect(x,p.x-rr,p.y-1,rr*2+1,3,'#fff');prect(x,p.x-1,p.y-rr,3,rr*2+1,'#fff');for(const [a,b] of [[1,1],[1,-1],[-1,1],[-1,-1]])pline(x,p.x+a*2,p.y+b*2,p.x+a*rr*.7,p.y+b*rr*.7,2,'#ffe066');pcirc(x,p.x,p.y,Math.round(3*S),'#fff6c8')}
        else if(t<.67){const rr=Math.round(9*S);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;prect(x,p.x+Math.cos(a)*rr-1,p.y+Math.sin(a)*rr*.8-1,3,3,i%2?'#ffe066':'#fff')}pcirc(x,p.x,p.y,Math.round(2*S),'#ffd04a')}
        else{const rr=Math.round(12*S);for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.4;prect(x,p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr*.8,2,2,'#ffb347')}}continue}
      if(p.k==='lines'){const t=1-p.l/p.m;for(const dy of [-6,0,6]){const len=10+Math.abs(dy)*-0.5,x0=p.x-p.d*(14+t*10);x.globalAlpha=1-t;prect(x,Math.min(x0,x0-p.d*len),p.y+dy,len,1,'#fff');x.globalAlpha=1}continue}
      if(p.k==='star'){const t=p.l/p.m,s2=Math.max(1,Math.round(p.s*t));prect(x,p.x-s2,p.y-1,s2*2+1,3,'#fff');prect(x,p.x-1,p.y-s2,3,s2*2+1,'#fff');prect(x,p.x-1,p.y-1,3,3,'#ffe066');continue}
      if(p.k==='ring'){const t=1-p.l/p.m,rad=4+t*12;x.fillStyle=p.c||'rgba(255,255,255,.8)';for(let i=0;i<16;i++){const a=i/16*Math.PI*2;x.fillRect(Math.round(p.x+Math.cos(a)*rad),Math.round(p.y+Math.sin(a)*rad*.8),2,2)}continue}
      x.globalAlpha=p.a?Math.min(1,p.l*2):1;prect(x,p.x,p.y,p.s,p.s,p.c);x.globalAlpha=1}
    x.setTransform(1,0,0,1,0,0);x.drawImage(this.vig,0,0);this.minimap(x);if(this.cut>0){x.fillStyle=`rgba(0,0,0,${this.cut*5})`;x.fillRect(0,0,FVW,FVH)}
    if(f.phase==='end'&&f.pt<1){x.fillStyle=`rgba(255,255,255,${Math.max(0,.3-f.pt*.3)})`;x.fillRect(0,0,FVW,FVH)}
    // zoom toward the downed fighter on knockdowns and finishes
    const D=f.F.find(F=>F.down>0),zt=(f.phase==='end'&&D)?1.22:(D&&f.slow>0?1.12:1);this.zoom+=(zt-this.zoom)*Math.min(1,dt*4);
    const cc=this.ctx;cc.imageSmoothingEnabled=false;cc.setTransform(1,0,0,1,0,0);
    if(this.zoom>1.005&&D){const z=this.zoom,cx=clamp(D.px,FVW/(2*z),FVW-FVW/(2*z)),cy=clamp(D.py-20,FVH/(2*z),FVH-FVH/(2*z));cc.drawImage(this.buf,cx-FVW/(2*z),cy-FVH/(2*z),FVW/z,FVH/z,0,0,FVW,FVH)}
    else cc.drawImage(this.buf,0,0)}
  poseStand(F){const f=this.f;
    if(F.win&&f.phase==='end'&&f.pt>.9){const k=Math.sin(f.pt*5.5);return mixP(PO.win,PO.win2,k*.5+.5)}
    if(F.down>0){const t=F.vFall||0;if(t<.16)return mixP(F.hurt>0||F.stag>0?PO.stag:PO.hurt,PO.fall,ease(t/.16));if(t<.38)return mixP(PO.fall,PO.down,ease((t-.16)/.22));return PO.down}
    if(F.vRise>0)return mixP(PO.rise,PO.stance,ease(1-F.vRise/.45));
    if(f.pos==='clinch'){if(F.act&&PCH[F.act.k])return this.actPose(F);if(f.ct)return mixP(PO.clinch,PO.stag,.3+Math.sin(f.T*30)*.15);return PO.clinch}
    if(F.sprawl&&F.o.act&&F.o.act.k==='shoot')return PO.sprawl;
    if(F.dodge>0)return PO.dodge;
    if(F.stuff>0)return PO.stag;
    if(F.act&&PCH[F.act.k])return this.actPoseS(F);
    if(F.hurt>0)return this.snap(F,mixP(PO.stance,PO.hurt,Math.min(1,F.hurt*7)));
    if(F.block)return PO.block;
    let p=F.stag>0?mixP(PO.stance,PO.stag,.75):PO.stance;
    if(Math.abs(F.vx)>2){const s=Math.sin(F.walkT*15);p=ov(p,{Kb:[p.Kb[0]+s*1.5,p.Kb[1]],Fb:[p.Fb[0]+s*2.5,p.Fb[1]-Math.max(0,s)*1.5],Kf:[p.Kf[0]-s*1.5,p.Kf[1]],Ff:[p.Ff[0]-s*2.5,p.Ff[1]-Math.max(0,-s)*1.5]})}
    if(Math.abs(F.vx)>2){const s=Math.sin(F.walkT*15);p=ov(p,{Hf:[p.Hf[0]-s*.8,p.Hf[1]+Math.abs(s)*.6],Hb:[p.Hb[0]+s*.8,p.Hb[1]+Math.abs(s)*.6]})}
    const b=Math.sin(f.T*5+F.side*2)*.5,q={};for(const k of PJ)q[k]=k[0]==='K'||k[0]==='F'?p[k]:[p[k][0],p[k][1]+b*(k==='P'?.3:1)];return this.snap(F,q)}
  // head snaps back on clean shots, body folds on body shots
  snap(F,q){if(!(F.snap>0))return q;const k=F.snap/.18*(F.snapBig?1.6:1),o={};for(const j of PJ)o[j]=q[j];
    if(F.snapT==='body'){o.N=[q.N[0]+1.5*k,q.N[1]+1.2*k];o.H=[q.H[0]+2*k,q.H[1]+2*k];o.P=[q.P[0]-.8*k,q.P[1]]}
    else{o.H=[q.H[0]-2.6*k,q.H[1]-.6*k];o.N=[q.N[0]-1.1*k,q.N[1]]}return o}
  actPoseS(F){return this.snap(F,this.actPose(F))}
  actPose(F){const a=F.act,c=PCH[a.k],C=PO[c[0]],X=PO[c[1]],St=this.f.pos==='clinch'?PO.clinch:PO.stance;
    if(a.ph==='w')return mixP(St,C,ease(a.t/a.dw));if(a.ph==='a')return mixP(C,X,Math.min(1,a.t/Math.min(a.da,.06)));return mixP(X,St,ease(a.t/a.dr))}
  drawStand(x,F,dt){x.save();x.translate(F.px,F.py-FVY);this.drawStand0(x,F,dt);x.restore()}
  drawStand0(x,F,dt){const f=this.f;
    if(F.down>0)F.vFall=(F.vFall||0)+dt;else{if(F.vFall>0&&!F.lost)F.vRise=.45;F.vFall=0}if(F.vRise>0)F.vRise-=dt;if(F.snap>0)F.snap-=dt;
    const J=this.poseStand(F);if(F.flashT>0)F.flashT-=dt;
    const a=F.act;if(a&&a.m.pow&&TRAIL[a.k]&&(a.ph==='a'||(a.ph==='r'&&a.t<.05))){const c=PCH[a.k],j=TRAIL[a.k],C=PO[c[0]][j],X=PO[c[1]][j];
      for(let i=1;i<=4;i++){const t=1-i*.22,px=(0+F.sf*(C[0]+(X[0]-C[0])*t))*FVS,py=(LV.FLOOR+C[1]+(X[1]-C[1])*t)*FVS;x.globalAlpha=.42-i*.08;prect(x,px-3,py-3,7,7,'#fff6d0')}x.globalAlpha=1}
    figure(x,J,0,F.sf,F.look,{build:F.build,flash:F.flashT>0,hurt:F.hurt>0||F.stag>0,lying:F.down>0&&(F.vFall||0)>.3,ko:F.down>0&&(F.lost||F.head<20),dmg:1-F.headMax/100+(F.head<35?.25:0)});
    if(F.fire>0&&F.down<=0){const t=f.T;for(let i=0;i<6;i++){const ph=(t*1.6+i/6)%1,jx=['Hf','Hb','H','P','Ef','Eb'][i],j=J[jx];
      x.globalAlpha=1-ph;prect(x,(0+F.sf*j[0])*FVS+Math.sin(t*9+i*2)*3,(LV.FLOOR+j[1])*FVS-ph*14,2,2,ph<.4?'#ffe066':'#ff7a2b')}x.globalAlpha=1}
    if(F.stag>0&&F.down<=0){const h=J.H,t=f.T;for(let i=0;i<3;i++){const an=t*6+i*2.1;prect(x,(0+F.sf*h[0]+Math.cos(an)*6)*FVS,(LV.FLOOR+h[1]-8+Math.sin(an)*1.5)*FVS,2,2,i?'#ffe066':'#fff')}}}
  groundPoses(){const f=this.f,g=f.g,b=g.bot,t=g.top,pos=g.pos;let JB=GB[pos],JT=GT[pos];
    const jig=f.ct?Math.sin(f.T*35)*.6:0;
    const strike=(F,J,target)=>{const a=F.act;if(!a||!['gnp','hgnp','bstrike'].includes(a.k))return J;const e=a.ph==='w'?-.3*ease(a.t/a.dw):a.ph==='a'?1:1-ease(a.t/a.dr);
      if(e<0)return ov(J,{Hf:[J.Hf[0]+2,J.Hf[1]-3],Ef:[J.Ef[0]+1,J.Ef[1]-3]});
      return ov(J,{Hf:[J.Hf[0]+(target[0]-J.Hf[0])*e,J.Hf[1]+(target[1]-J.Hf[1])*e],Ef:[J.Ef[0]+(target[0]-J.Ef[0])*e*.5,J.Ef[1]+(target[1]-J.Ef[1])*e*.4-1]})};
    if(b.block&&pos!=='back')JB=ov(JB,{Hf:[JB.H[0]+2,JB.H[1]-3],Hb:[JB.H[0]+1,JB.H[1]-2],Ef:[JB.H[0]+5,JB.H[1]-4],Eb:[JB.H[0]+4,JB.H[1]-2]});
    JT=strike(t,JT,JB.H);JB=strike(b,JB,JT.H);
    const sh=k=>{const o={};for(const q of PJ)o[q]=[k[q][0]+jig,k[q][1]];return o};
    const isSub=!!(f.ct&&f.ct.kind==='sub');
    for(const F of [b,t])if(F.flashT>0)F.flashT-=1/60;
    return{JB:sh(JB),JT:isSub?sh(JT):JT,isSub}}
  drawGround(x){x.save();x.translate(this.f.g.bot.px,this.f.g.bot.py-FVY);this.drawGround0(x);x.restore()}
  drawGround0(x){const f=this.f,g=f.g,b=g.bot,t=g.top,fb=g.sfb||1,pos=g.pos;let JB=GB[pos],JT=GT[pos];
    const jig=f.ct?Math.sin(f.T*35)*.6:0;
    const strike=(F,J,target)=>{const a=F.act;if(!a||!['gnp','hgnp','bstrike'].includes(a.k))return J;const e=a.ph==='w'?-.3*ease(a.t/a.dw):a.ph==='a'?1:1-ease(a.t/a.dr);
      if(e<0)return ov(J,{Hf:[J.Hf[0]+2,J.Hf[1]-3],Ef:[J.Ef[0]+1,J.Ef[1]-3]});
      return ov(J,{Hf:[J.Hf[0]+(target[0]-J.Hf[0])*e,J.Hf[1]+(target[1]-J.Hf[1])*e],Ef:[J.Ef[0]+(target[0]-J.Ef[0])*e*.5,J.Ef[1]+(target[1]-J.Ef[1])*e*.4-1]})};
    if(b.block&&pos!=='back')JB=ov(JB,{Hf:[JB.H[0]+2,JB.H[1]-3],Hb:[JB.H[0]+1,JB.H[1]-2],Ef:[JB.H[0]+5,JB.H[1]-4],Eb:[JB.H[0]+4,JB.H[1]-2]});
    JT=strike(t,JT,JB.H);JB=strike(b,JB,JT.H);
    const sh=k=>{const o={};for(const q of PJ)o[q]=[k[q][0]+jig,k[q][1]];return o};
    const isSub=f.ct&&f.ct.kind==='sub';
    for(const F of [b,t])if(F.flashT>0)F.flashT-=1/60;
    figure(x,sh(JB),0,fb,b.look,{lying:pos!=='back',eye:fb,build:b.build,flash:b.flashT>0,dmg:1-b.headMax/100+(b.head<35?.25:0)});
    figure(x,isSub?sh(JT):JT,0,fb,t.look,{eye:pos==='back'?fb:-fb,build:t.build,flash:t.flashT>0,dmg:1-t.headMax/100});
    if(isSub){const h=JB.H;const px=(0+fb*h[0])*FVS,py=(LV.FLOOR+h[1])*FVS;const k=Math.sin(f.T*20);prect(x,px-1+k,py-14,3,6,'#ff5a3c');prect(x,px-1+k,py-6,3,2,'#ff5a3c')}}

  /* ---------- HUD ---------- */
  hud(dt){const f=this.f,u=this.ui;
    f.F.forEach((F,i)=>{const hp=Math.max(0,F.head);this.ghost[i]=Math.max(hp,this.ghost[i]-dt*22);
      u.hp[i].style.width=hp+'%';u.gh[i].style.width=this.ghost[i]+'%';u.mx[i].style.width=Math.max(0,F.headMax)+'%';u.st[i].style.width=Math.max(0,F.sta)+'%';
      if(this.mo[i]){this.mo[i].style.width=(F.fire>0?100:F.mo||0)+'%';u.fs[i].classList.toggle('fire',F.fire>0)}
      u.fs[i].classList.toggle('low',hp<30);u.fs[i].classList.toggle('gas',F.sta<30);
      const col=v=>v>66?'#5cc188':v>33?'#f2a43c':'#ec6450',parts=u.body[i].children;parts[0].style.fill=col(F.head);parts[1].style.fill=col(F.body);parts[2].style.fill=col(F.legs)});
    const cl=Math.max(0,f.clock);u.tm.textContent=`${Math.floor(cl/60)}:${String(Math.floor(cl%60)).padStart(2,'0')}`;
    u.pips.forEach((p,i)=>{p.className=i<f.round-1?'done':i===f.round-1?'now':''});
    if(f.callT>0&&u.call.textContent!==f.call)u.call.textContent=f.call;u.call.parentElement.classList.toggle('fade',f.callT<=0);
    const c=f.ct;u.ct.hidden=!c;const H=f.human,inC=!!(c&&H&&(c.A===H||c.D===H));
    if(u.tz){u.tz.hidden=!inC;if(inC)u.tz.querySelector('small').textContent=H===c.A?(c.sub?'Finish the submission':'Win the scramble'):(c.sub?'Escape the submission':'Stop him');}
    if(c){const s=f.share(),red=c.A.side===0?s:1-s,need=c.A.side===0?c.need:1-c.need;u.ct.querySelector('.lctbar i').style.width=(red*100)+'%';u.ct.querySelector('em').style.left=(need*100)+'%';
      const n=u.ct.querySelectorAll('.lctn span,.lctn b');n[0].textContent=f.F[0].name;n[1].textContent=c.label;n[2].textContent=f.F[1].name}
    if(H)this.updPad()}
  updPad(){const f=this.f,H=f.human,O=H.o,lab={};const gap=f.gap(H);
    if(f.phase==='end'||f.phase==='break'){for(const k of 'JPKSB')lab[k]=['—','']}
    else if(f.ct){for(const k of 'JPKSB')lab[k]=['Tap!','']}
    else if(f.pos==='stand'){
      if(O.down>0){lab.J=['Pounce',''];lab.P=['Pounce',''];lab.S=['Pounce',''];lab.K=f.ring?['Soccer kick','']:['—',''];lab.B=['Block','']}
      else if(f.fhl&&f.fhl.side===H.side&&gap<16){lab.J=['Jab','counter'];lab.P=['Choke','hold: guillotine'];lab.K=['Knee',''];lab.S=['Go behind','take the back'];lab.B=['Block','']}
      else{const kk=O.act&&O.act.m.kick&&O.act.ph!=='r'&&gap<=O.act.m.rng+3,op=O.open>0;
        const rv=f.rel(H),rel=rv>.5?1:rv<-.5?-1:0;
        lab.J=['Jab',op?'he\'s open!':''];lab.P=rel<0?['Body','hook']:['Power',op?'he\'s open!':rel>0?'hold: superman':'hold: overhand'];lab.K=rel>0?['Body kick','hold: spin']:rel<0?['Teep','push kick']:['Kick','hold: head'];lab.S=kk?['Catch','the kick']:gap<12?['Clinch','']:['Shoot','takedown'];lab.B=['Block',f.sprawlW&&f.sprawlW.side===H.side?'Sprawl now!':'tap: sprawl']}}
    else if(f.pos==='clinch'){lab.J=['Punches',''];lab.P=['Knee',''];lab.K=['Trip',''];lab.S=['Body lock',''];lab.B=['Break','']}
    else{const g=f.g,top=g.top===H,gp=g.pos;
      if(top){lab.J=['Punch',''];lab.P=['Elbow',''];lab.K=gp==='guard'?['—','pass first']:['Submit',''];lab.S=gp==='back'?['—','']:['Advance',(GPN[GPOS[GPOS.indexOf(gp)+1]]||'').replace(' control','').replace('full ','')];lab.B=['Posture','move: stand up']}
      else{const op=gp==='guard'||gp==='half';lab.J=['Strike',''];lab.P=op?['Submit','']:['—',''];lab.K=op?['Get up',g.mom>.06?'he\'s tiring':'']:gp==='side'?['Get up','wall-walk']:['—','escape first'];lab.S=gp==='guard'?['Sweep','']:['Escape',''];lab.B=['Defend','hold']}}
    for(const k of ['P','K']){const b=this.hb&&this.hb[k];if(b&&this.hold[k])b.style.setProperty('--c',Math.min(1,(performance.now()-this.hold[k])/480))}
    const key=JSON.stringify(lab)+(f.sprawlW?1:0)+(f.fhl?1:0);if(key===this.lastLab)return;this.lastLab=key;
    for(const k in lab){const b=this.el.querySelector(`[data-k="${k}"]`);if(!b)continue;const [l,s]=lab[k];
      b.querySelector('b').textContent=l==='—'?'':l;b.style.setProperty('--fz',Math.min(19,Math.floor(118/Math.max(5,l.length)))+'cqi');b.querySelector('small').textContent=s;const ic=LBLICO[l];if(ic&&b.dataset.ic!==ic){b.querySelector('.lic').innerHTML=svg(ICO[ic]);b.dataset.ic=ic}
      b.classList.toggle('off',l==='—');b.classList.toggle('cue',(k==='B'&&!!(f.sprawlW&&f.sprawlW.side===H.side))||(k==='S'&&(l==='Catch'||l==='Go behind')))}}

  /* ---------- overlays ---------- */
  overlay(kind){const u=this.ui.over,f=this.f;this.over=kind;u.hidden=!kind;if(!kind){u.innerHTML='';return}
    const H=f.human,side=H?H.side:0,[A,B]=f.F;
    const row=(l,a,b)=>`<span class="l">${a}</span><span class="c">${l}</span><span>${b}</span>`;
    if(kind==='pause')u.innerHTML=`<h2>Paused</h2><div class="list"><button class="mrow" data-lv="resume">${svg(PLAYI)}<span>Resume</span></button><button class="mrow" data-lv="help">${svg(BOOKI)}<span>Controls</span></button><button class="mrow" data-lv="sound">${svg('<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6"/>')}<span>Sound: ${SFX.on?'On':'Off'}</span></button>${H?`<button class="mrow" data-lv="swap">${svg(ICO.swap)}<span>Buttons on the ${this.swap?'left':'right'}</span></button>`:''}<button class="mrow" data-lv="simrest">${svg('<path d="M5 5l7 7-7 7M12 5l7 7-7 7"/>')}<span>Simulate the rest</span></button>${this.o.canQuit?`<button class="mrow danger" data-lv="quit">${svg(XI)}<span>Quit fight</span></button>`:''}</div>`;
    else if(kind==='help')u.innerHTML=`<h2>Controls</h2><div class="howto lhelp"><div><h4>Standing</h4><ul><li>Drag the <b>thumbstick</b> in any direction to move around the cage: toward or away from him, or up and down to circle. Flick away twice to dodge back, up or down twice to slip sideways, toward twice to dash in.</li><li>Don't get stuck on the fence. Punches land harder on a man pinned against it, so circle off, or cut the cage off on him.</li><li><b>Jab</b> is fast. <b>Power</b> throws the cross and hook. Hold it for an overhand.</li><li><b>Kick</b> attacks the legs. Hold it for a head kick.</li><li><b>Block</b> holds your guard and checks leg kicks. Tap it when he shoots to sprawl.</li><li><b>Shoot</b> is a takedown from range, or a clinch up close.</li><li><b>Combos:</b> press the next strike as the last one lands to flow into it faster. Uppercuts come in up close.</li><li><b>Stick + strike:</b> back + Power is a body hook, forward + hold Power a superman punch. Forward + Kick is a body kick, back + Kick a teep, forward + hold Kick a spinning back kick. Spinning and flying moves leave you open if they miss.</li><li>Double-tap toward him to dash in. Land clean shots to fill your <b>momentum</b> bar. When it's full you're on fire: faster, harder hands for a few seconds.</li></ul><h4>Counters</h4><ul><li><b>Parry:</b> raise Block right as a punch lands. He's left open, so hit back hard.</li><li><b>Catch kick:</b> tap Shoot as his kick comes in to catch it and dump him.</li><li><b>Counter knee:</b> throw Power or a knee as he shoots to stop the takedown cold.</li><li><b>After a sprawl:</b> Shoot to go behind, or hold Power for a guillotine (if it fails, you land on your back).</li></ul></div><div><h4>Clinch and ground</h4><ul><li>The buttons change with the position. Read their labels.</li><li>On top: punch, elbow, advance position, submit. Move the stick to stand up.</li><li>On bottom: defend, sweep or escape, get up, submit from guard. From side control you can wall-walk up.</li><li>Every failed attempt and every blocked shot wears him down. Keep scrambling. Explode while he loads up an elbow for a big bonus.</li><li>Stall on top and the referee stands you up. Keep working.</li><li>Scrambles and submissions are tap battles: <b>tap the glowing pad fast</b>.</li></ul></div><p class="hint">Keyboard: WASD or arrows move, Space block, J jab, K power, L kick, I shoot, P pause.</p></div><button class="btn block" data-lv="pause">Back</button>`;
    else if(kind==='break'){const r=f.round,st=f.rstats[r-1],pv=f.rstats[r-2],d=(i,k)=>st[i][k]-(pv?pv[i][k]:0),adv=H?f.advice(side):[];
      u.innerHTML=`<div class="lbl">End of round ${r} of ${f.rounds.length}</div><h2>Your corner</h2>
        <div class="tape num">${row('',`<b style="color:#e8574b">${esc(A.name)}</b>`,`<b style="color:#6b95ea">${esc(B.name)}</b>`)}${row('Landed',d(0,'landed'),d(1,'landed'))}${row('Takedowns',d(0,'td'),d(1,'td'))}${row('Knockdowns',d(0,'kd'),d(1,'kd'))}</div>
        ${adv.map(t=>`<div class="quote">${esc(t)}</div>`).join('')}<button class="btn block" data-lv="next">Start round ${r+1}</button>`}
    else if(kind==='end'){const x=f.res,W=x.w<0?null:f.F[x.w],youWon=H?(x.w===H.side):null;
      u.innerHTML=`<div class="lbl">${x.fin?`Round ${x.rd} · ${x.time}`:'Decision'}</div><h2 style="color:${youWon===false?'var(--loss)':'var(--acc)'}">${W?esc(W.name)+' wins':'Draw'}</h2><div class="lbl" style="color:var(--ink)">${esc(x.method)}</div>
        ${x.cards?`<div class="cards3 num">${x.cards.map((c,j)=>`<div><span class="lbl">Judge ${j+1}</span><br>${c[0]}–${c[1]}</div>`).join('')}</div>`:''}
        <div class="tape num">${row('',`<b style="color:#e8574b">${esc(A.name)}</b>`,`<b style="color:#6b95ea">${esc(B.name)}</b>`)}${row('Strikes landed',A.st.landed,B.st.landed)}${row('Takedowns',A.st.td,B.st.td)}${row('Knockdowns',A.st.kd,B.st.kd)}${row('Sub attempts',A.st.sub,B.st.sub)}</div>
        <button class="btn block" data-lv="done">Continue</button>`}}
}
function lsGetV(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSetV(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function openLive(o){const host=document.querySelector('.shell')||document.getElementById('app');SFX.init();return new LiveView(host,o)}
