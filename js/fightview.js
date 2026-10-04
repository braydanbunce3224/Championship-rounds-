/*!
 * Championship Rounds: live fight screen (pixel-art renderer, HUD, touch/keyboard controls, sound).
 * Copyright (c) 2026 SpecMagic Games. All rights reserved.
 * openLive(opts) mounts a fight over the app; opts.onEnd(result|null) fires when the player leaves it.
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
    case'tick':this.tone(1400,1200,.03,.05,'square');break;
  }}catch(e){}}};

/* ---------------- pixel helpers ---------------- */
const PXF={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',Y:'101101010010010'};
function pxText(x,s,X,Y,sc,c){x.fillStyle=c;let cx=X;for(const ch of s){const g=PXF[ch];if(g)for(let i=0;i<15;i++)if(g[i]==='1')x.fillRect(cx+(i%3)*sc,Y+Math.floor(i/3)*sc,sc,sc);cx+=4*sc}}
function pxW(s,sc){return s.length*4*sc-sc}
function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=amt<0?1+amt:1;const add=amt>0?amt*255:0;r=Math.min(255,Math.round(r*f+add));g=Math.min(255,Math.round(g*f+add));b=Math.min(255,Math.round(b*f+add));return`rgb(${r},${g},${b})`}
function seg(x,x0,y0,x1,y1,w,c){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));x.fillStyle=c;const h=w/2;for(let i=0;i<=n;i++){const t=i/n;x.fillRect(Math.round(x0+(x1-x0)*t-h),Math.round(y0+(y1-y0)*t-h),w,w)}}
function disc(x,cx,cy,r,c){x.fillStyle=c;for(let dy=-r;dy<=r;dy++){const dx=Math.round(Math.sqrt(Math.max(0,r*r-dy*dy+r*.6)));x.fillRect(Math.round(cx-dx),Math.round(cy+dy),dx*2+1,1)}}

/* ---------------- poses (local coords, facing +x, origin at feet) ---------------- */
const PJ=['H','N','P','Eb','Hb','Ef','Hf','Kb','Fb','Kf','Ff'];
const PO={};
PO.stance={H:[3,-29],N:[1,-24],P:[0,-14],Eb:[-1,-19],Hb:[3,-24],Ef:[5,-19],Hf:[7,-25],Kb:[-3,-7],Fb:[-6,0],Kf:[3,-7],Ff:[6,0]};
const ov=(b,d)=>Object.assign({},b,d);
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
PO.win=ov(PO.stance,{H:[1,-30],N:[0,-25],Eb:[-4,-29],Hb:[-3,-35],Ef:[5,-29],Hf:[5,-35]});
PO.clinch=ov(PO.stance,{N:[3,-23],H:[5,-27],Ef:[7,-23],Hf:[10,-27],Eb:[5,-21],Hb:[9,-25]});
PO.kneeX=ov(PO.clinch,{Kf:[7,-15],Ff:[4,-9],P:[1,-14]});PO.cpX=ov(PO.clinch,{Eb:[7,-22],Hb:[11,-24]});
const PCH={jab:['jabC','jabX'],cross:['crossC','crossX'],hook:['hookC','hookX'],over:['overC','overX'],lkick:['lkC','lkX'],hkick:['hkC','hkX'],soccer:['lkC','socX'],shoot:['shC','shX'],knee:['clinch','kneeX'],cpunch:['clinch','cpX']};
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
function ease(t){t=clamp(t,0,1);return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}

/* ---------------- arena backgrounds ---------------- */
function buildBg(kind,ring){const c=document.createElement('canvas');c.width=LV.W;c.height=LV.H;const x=c.getContext('2d'),rr=seeded(hash(kind,'bg')),F=LV.FLOOR;
  const reg=kind==='REG';
  const g=x.createLinearGradient(0,0,0,LV.H);g.addColorStop(0,'#060608');g.addColorStop(.6,reg?'#1d1714':'#121016');g.addColorStop(1,'#0b0a0c');x.fillStyle=g;x.fillRect(0,0,LV.W,LV.H);
  if(reg){for(let yy=18;yy<F-8;yy+=5)for(let xx=(yy/5%2)*6-6;xx<LV.W;xx+=12){x.fillStyle=rr()<.5?'#2a1d18':'#31221c';x.fillRect(xx,yy,11,4)}
    x.fillStyle='#0d0b0a';x.fillRect(0,12,LV.W,3);for(let i=0;i<4;i++){const lx=25+i*50;x.fillStyle='#3b3a36';x.fillRect(lx-6,14,12,2);x.fillStyle='rgba(255,236,190,.05)';x.beginPath();x.moveTo(lx-5,16);x.lineTo(lx+5,16);x.lineTo(lx+26,F);x.lineTo(lx-26,F);x.fill()}}
  else{x.fillStyle='#1f1e24';x.fillRect(0,7,LV.W,2);
    for(let i=0;i<Math.ceil(LV.W/22);i++){const lx=12+i*22;x.fillStyle='#fff3cf';x.fillRect(lx,9,2,1);x.fillStyle='rgba(255,240,200,.035)';x.beginPath();x.moveTo(lx,10);x.lineTo(lx+2,10);x.lineTo(lx+24,F);x.lineTo(lx-22,F);x.fill()}
    const pal=['#3c3036','#2f3440','#463a2e','#2b2b2b','#4a3b3b','#2c3a33','#3a3346','#514338'];
    for(let yy=12;yy<F-34;yy+=4)for(let xx=-2;xx<LV.W;xx+=3+Math.floor(rr()*2)){if(rr()<.18)continue;const c1=pal[Math.floor(rr()*pal.length)];const yo=yy+Math.floor(rr()*2);
      x.fillStyle=c1;x.fillRect(xx,yo+2,3,3);x.fillStyle=shade(c1,.12);x.fillRect(xx+.5|0,yo,2,2)}
    x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,F-42,LV.W,42)}
  if(ring){
    x.fillStyle='#0f0e10';x.fillRect(0,F-3,LV.W,LV.H-F+3);
    x.fillStyle=kind==='RYU'?'#d8d2c8':'#cfc8bb';x.fillRect(4,F-2,LV.W-8,LV.H-F);
    x.fillStyle=kind==='RYU'?'#8f1d24':'#2a2a33';x.fillRect(0,F+8,LV.W,LV.H-F-8);
    for(const px of [6,LV.W-9]){x.fillStyle='#2a2a2e';x.fillRect(px,F-40,3,40);x.fillStyle=kind==='RYU'?'#c8202c':'#3a62c0';x.fillRect(px-1,F-40,5,8)}
  }else{
    x.fillStyle='#d9d1c3';x.fillRect(0,F-2,LV.W,LV.H-F+2);x.fillStyle='#c9c0b1';x.fillRect(0,F+7,LV.W,LV.H-F-7);
    if(!reg){x.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<LV.W;i+=10)x.fillRect(i,F-2,1,LV.H-F+2)}
    const top=reg?F-32:F-38;
    x.fillStyle='#1c1c21';x.fillRect(0,top,LV.W,2);
    x.fillStyle='rgba(165,170,180,.2)';for(let xx=-60;xx<LV.W+60;xx+=4)for(let yy=top+2;yy<F-2;yy++){const a=xx+(yy-top),b=xx-(yy-top);if(a>=0&&a<LV.W&&(yy-top)%1===0)x.fillRect(a,yy,1,1);if(b>=0&&b<LV.W)x.fillRect(b,yy,1,1)}
    x.fillStyle='rgba(0,0,0,.25)';x.fillRect(0,top+2,LV.W,F-top-4);
    for(const px of [3,LV.W-7]){x.fillStyle='#111114';x.fillRect(px,top-2,4,F-top+2);x.fillStyle=kind==='GFL'?'#3a6fd8':kind==='TFC'?'#e1ad3a':'#7a5a40';x.fillRect(px,top+6,4,10)}}
  const logo=kind==='EXH'?'':kind==='REG'?'PGFC':kind==='RYU'?'RYUJIN':kind;
  if(logo){const sc=2,w=pxW(logo,sc);pxText(x,logo,Math.round(LV.W/2-w/2),F+1,sc,ring?(kind==='RYU'?'rgba(140,20,30,.35)':'rgba(0,0,0,.18)'):kind==='GFL'?'rgba(40,80,170,.28)':kind==='TFC'?'rgba(150,100,10,.3)':'rgba(80,50,30,.25)')}
  if(ring){x.fillStyle='rgba(0,0,0,.25)';x.fillRect(0,F-3,LV.W,1)}
  return c}
function drawRopes(x,kind){const F=LV.FLOOR,cols=kind==='RYU'?['#e8e2d8','#c8202c','#e8e2d8']:['#e8e2d8','#d33','#36c'];
  [F-34,F-25,F-16].forEach((y,i)=>{x.fillStyle=cols[i];x.fillRect(6,y,LV.W-12,1.5);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(6,y+1.5,LV.W-12,1)})}

/* ---------------- fighter drawing ---------------- */
function drawFig(x,J,ox,oy,fc,lk,o){o=o||{};const P=k=>[ox+fc*J[k][0],oy+J[k][1]];
  const sk=lk.skin,sh=shade(sk,-.2),tr=lk.trunk,tr2=lk.trunk2,gl=lk.glove,ef=o.eye==null?fc:o.eye;
  const leg=(K,Fo,c,t)=>{const p=P('P'),k=P(K),f=P(Fo),mx=p[0]+(k[0]-p[0])*.5,my=p[1]+(k[1]-p[1])*.5;seg(x,p[0],p[1],mx,my,3,t);seg(x,mx,my,k[0],k[1],3,c);seg(x,k[0],k[1],f[0],f[1],3,c);x.fillStyle=shade(c==sh?sk:sk,-.28);x.fillRect(Math.round(f[0]-1+ef),Math.round(f[1]),3,1)};
  const arm=(E,Hd,c)=>{const n=P('N'),s=[n[0],n[1]+2],e=P(E),h=P(Hd);seg(x,s[0],s[1],e[0],e[1],2,c);seg(x,e[0],e[1],h[0],h[1],2,c);x.fillStyle=gl;x.fillRect(Math.round(h[0]-1.5),Math.round(h[1]-1.5),3,3);x.fillStyle='rgba(255,255,255,.25)';x.fillRect(Math.round(h[0]-1.5),Math.round(h[1]-1.5),1,1)};
  leg('Kb','Fb',sh,tr2);arm('Eb','Hb',sh);
  const n=P('N'),p=P('P');seg(x,n[0],n[1]+1,p[0],p[1],5,sk);seg(x,n[0]-fc*.5,n[1]+2,n[0]+fc*.5,n[1]+2,6,sk);
  x.fillStyle='rgba(0,0,0,.12)';x.fillRect(Math.round((n[0]+p[0])/2-1),Math.round((n[1]+p[1])/2),2,2);
  seg(x,p[0],p[1]+.5,p[0],p[1]+2,6,tr);x.fillStyle=tr2;x.fillRect(Math.round(p[0]-3),Math.round(p[1]-1),6,1);
  leg('Kf','Ff',sk,tr);
  const h=P('H');disc(x,h[0],h[1],3,sk);
  const hx=Math.round(h[0]),hy=Math.round(h[1]);x.fillStyle=lk.hair;
  if(o.lying){if(lk.hs)x.fillRect(hx-fc*3-1,hy-2,2,5)}
  else{if(lk.hs===1||lk.hs===4){x.fillRect(hx-3,hy-4,7,2);x.fillRect(hx-ef*3-(ef<0?0:0),hy-3,2,3)}
    if(lk.hs===4)x.fillRect(hx-ef*4,hy-3,2,6);
    if(lk.hs===2){x.fillStyle=shade(lk.hair,.1);x.fillRect(hx-3,hy-4,7,1)}
    if(lk.hs===3)x.fillRect(hx-1,hy-5,3,3);
    if(lk.beard){x.fillStyle=lk.hair;x.fillRect(hx+(ef>0?0:-2),hy+2,3,2)}
    x.fillStyle='#120c0a';x.fillRect(hx+ef*2-(ef<0?0:0),hy-1,1,1)}
  arm('Ef','Hf',sk);
  if(o.daze){x.fillStyle='#ffe066';const t=o.daze;for(let i=0;i<3;i++){const a=t*6+i*2.1;x.fillRect(Math.round(h[0]+Math.cos(a)*5),Math.round(h[1]-6+Math.sin(a)*1.5),1,1)}}
}

/* ---------------- the view ---------------- */
class LiveView{
  constructor(host,o){this.o=o;this.f=new LiveFight(o);this.speed=1;this.acc=0;this.last=0;this.parts=[];this.decals=[];this.bannerT=0;this.flashT=0;this.over=null;this.ctx=null;this.labels={};
    this.kind=o.arena||'EXH';this.bg=buildBg(this.kind,o.ring);this.keys={};this.hold={};this.backTap=0;
    const A=this.f.F[0],B=this.f.F[1],hs=this.f.human;
    host.insertAdjacentHTML('beforeend',`<div class="live" id="live" role="application" aria-label="Live fight">
      <div class="lhud">${[A,B].map((F,i)=>`<div class="lfs ${i?'b':'a'}"><div class="lnm"><i class="cor"></i><b>${esc(F.name)}</b>${F.human?'<em>YOU</em>':''}</div><div class="lbar hp"><i class="max"></i><i class="cur"></i></div><div class="lbar st"><i></i></div><div class="ldmg" aria-hidden="true"><span></span><span></span><span></span></div></div>`).join('')}
        <div class="lclk"><span class="lrd">R1</span><b class="ltm">5:00</b><button class="lpause" data-lv="pause" aria-label="Pause">${svg('<path d="M9 5v14M15 5v14"/>')}</button></div></div>
      <div class="lstage"><canvas width="${LV.W}" height="${LV.H}"></canvas><div class="lban"></div><div class="lflash"></div>
        <div class="lct" hidden><div class="lctl"><span></span><span></span></div><div class="lctbar"><i></i><em></em></div><div class="lcttap"></div></div></div>
      <div class="lcall"><span></span></div>
      <div class="lpad">${hs?this.padHTML():this.watchHTML()}</div>
      <div class="lover" hidden></div></div>`);
    this.el=host.querySelector('#live');
    const hud=this.el.querySelector('.lhud');hud.insertBefore(hud.querySelector('.lclk'),hud.children[1]);
    this.cv=this.el.querySelector('canvas');this.ctx=this.cv.getContext('2d');this.ctx.imageSmoothingEnabled=false;
    this.q=s=>this.el.querySelector(s);
    this.ui={hp:[...this.el.querySelectorAll('.lbar.hp .cur')],hm:[...this.el.querySelectorAll('.lbar.hp .max')],st:[...this.el.querySelectorAll('.lbar.st i')],dm:[...this.el.querySelectorAll('.ldmg')],
      rd:this.q('.lrd'),tm:this.q('.ltm'),ban:this.q('.lban'),fl:this.q('.lflash'),ct:this.q('.lct'),call:this.q('.lcall span'),over:this.q('.lover')};
    this.bind();LIVE_ON=true;window.__live=this;
    this.showBanner(`${esc(A.name)} <span style="color:var(--acc)">vs</span> ${esc(B.name)}`,o.title?'Title fight':`${o.rounds.length} rounds`,1.6);
    this.loop=this.loop.bind(this);this.raf=requestAnimationFrame(this.loop)}

  padHTML(){return `<div class="lmove"><button class="lk" data-k="L" aria-label="Move left">${svg('<path d="M15 5l-7 7 7 7"/>')}</button><button class="lk" data-k="R" aria-label="Move right">${svg('<path d="M9 5l7 7-7 7"/>')}</button><button class="lk lblk" data-k="B"><b>Block</b><small>tap: sprawl</small></button></div>
    <div class="lact"><button class="lk kj" data-k="J"><b>Jab</b><small></small></button><button class="lk kp" data-k="P"><b>Power</b><small>hold: overhand</small></button><button class="lk kk" data-k="K"><b>Kick</b><small>hold: head kick</small></button><button class="lk ks" data-k="S"><b>Shoot</b><small>close: clinch</small></button></div>`}
  watchHTML(){return `<div class="lwatch"><div class="lbl">Watching live · speed</div><div class="seg">${[1,2,4].map(s=>`<button class="${s===1?'on':''}" data-lv="spd" data-v="${s}">${s}×</button>`).join('')}</div><button class="btn ghost block" data-lv="ffwd">Skip to result</button></div>`}

  /* ---------- input ---------- */
  bind(){const el=this.el;
    this.onDown=e=>{const b=e.target.closest('[data-k]');SFX.init();if(!b)return;e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}
      this.press(b.dataset.k,b)};
    this.onUp=e=>{const b=e.target.closest('[data-k]');if(!b)return;e.preventDefault();this.release(b.dataset.k,b)};
    this.onClick=e=>{const b=e.target.closest('[data-lv]');if(!b)return;SFX.init();this.cmd(b.dataset.lv,b.dataset.v)};
    el.addEventListener('pointerdown',this.onDown);el.addEventListener('pointerup',this.onUp);el.addEventListener('pointercancel',this.onUp);el.addEventListener('lostpointercapture',this.onUp);el.addEventListener('click',this.onClick);
    el.addEventListener('contextmenu',e=>e.preventDefault());
    const KM={ArrowLeft:'L',a:'L',A:'L',ArrowRight:'R',d:'R',D:'R',' ':'B',ArrowDown:'B',s:'B',S:'B',j:'J',J:'J',k:'P',K:'P',l:'K',L:'K',i:'S',I:'S',ArrowUp:'S',w:'S',W:'S'};
    this.onKey=e=>{if(e.key==='Escape'||e.key==='p'){this.cmd(this.over==='pause'?'resume':'pause');return}
      const k=KM[e.key];if(!k||!this.f.human)return;e.preventDefault();if(e.type==='keydown'){if(e.repeat)return;SFX.init();this.press(k,this.el.querySelector(`[data-k="${k}"]`))}else this.release(k,this.el.querySelector(`[data-k="${k}"]`))};
    document.addEventListener('keydown',this.onKey);document.addEventListener('keyup',this.onKey)}
  press(k,b){const f=this.f,H=f.human;if(!H||this.over)return;b&&b.classList.add('on');
    if(k==='L'||k==='R'){this.hold[k]=true;const back=(k==='L'?-1:1)!==H.face;const now=performance.now();
      if(back&&f.pos==='stand'){if(now-this.backTap<280){f.taps.push('dodge');this.backTap=0}else this.backTap=now}
      if(f.ct)f.taps.push(k);return}
    if(k==='B'){this.hold.B=true;f.taps.push('B');return}
    if(f.ct||(k!=='P'&&k!=='K')){f.taps.push(k);return}
    this.hold[k]=performance.now();b&&b.classList.add('chg');
    clearTimeout(this['ct'+k]);this['ct'+k]=setTimeout(()=>{if(this.hold[k]){this.hold[k]=0;b&&b.classList.remove('chg');f.taps.push(k+'c')}},480)}
  release(k,b){b&&b.classList.remove('on','chg');const f=this.f;
    if(k==='L'||k==='R'||k==='B'){this.hold[k]=false;return}
    if((k==='P'||k==='K')&&this.hold[k]){const held=performance.now()-this.hold[k];this.hold[k]=0;clearTimeout(this['ct'+k]);f.taps.push(held<220?k:k+'c')}}
  cmd(c,v){const f=this.f;
    if(c==='pause'&&f.phase!=='end'){this.paused=true;this.overlay('pause')}
    else if(c==='resume'){this.paused=false;this.overlay(null)}
    else if(c==='spd'){this.speed=+v;this.el.querySelectorAll('[data-lv="spd"]').forEach(b=>b.classList.toggle('on',b.dataset.v===v))}
    else if(c==='ffwd'||c==='simrest'){for(const F of f.F)F.human=false;this.speed=40;this.paused=false;this.overlay(null);this.ff=true;this.q('.lpad').innerHTML=`<div class="lwatch"><div class="lbl">Simulating the rest of the fight</div></div>`}
    else if(c==='sound'){SFX.set(!SFX.on);this.overlay('pause')}
    else if(c==='help'){this.overlay('help')}
    else if(c==='next'){f.nextRound();this.overlay(null)}
    else if(c==='done'){this.close(f.res)}
    else if(c==='quit'){this.close(null)}}
  close(res){cancelAnimationFrame(this.raf);document.removeEventListener('keydown',this.onKey);document.removeEventListener('keyup',this.onKey);clearTimeout(this.ctP);clearTimeout(this.ctK);
    this.el.remove();LIVE_ON=false;const cb=this.o.onEnd;cb&&cb(res)}

  /* ---------- loop ---------- */
  loop(ts){this.raf=requestAnimationFrame(this.loop);if(!this.el.isConnected){cancelAnimationFrame(this.raf);LIVE_ON=false;return}
    let dt=Math.min(.05,(ts-(this.last||ts))/1000);this.last=ts;const f=this.f;
    if(!this.paused&&!this.over){const H=f.human;f.inp.dir=H?(this.hold.R?1:0)-(this.hold.L?1:0):0;f.inp.B=!!this.hold.B;
      const sp=this.ff?this.speed:this.speed*(f.slow>0?.35:1);this.acc+=dt*sp;let n=0;
      while(this.acc>=1/60&&n<900){f.update(1/60);this.acc-=1/60;n++;this.drain()}
      if(f.phase==='break'&&!this.over){if(f.human)this.overlay('break');else{this.brk=(this.brk||0)+dt;if(this.brk>(this.ff?0:2.2)){this.brk=0;f.nextRound()}}}
      if(f.phase==='end'&&f.pt>(this.ff?0:1.7)&&!this.over)this.overlay('end')}
    this.updParts(dt);this.draw();this.hud(dt)}
  drain(){const f=this.f;while(f.ev.length){const e=f.ev.shift();this.onEv(e)}}
  onEv(e){const f=this.f,ff=this.ff;
    switch(e.type){
      case'hit':{if(ff)break;const p=this.hitPos(e);const n=e.big?12:6;for(let i=0;i<n;i++)this.parts.push({x:p[0],y:p[1],vx:(Math.random()-.5)*60+(-e.F.face)*20,vy:(Math.random()-.8)*50,l:.25+Math.random()*.2,c:Math.random()<.5?'#fff':'#ffe58a',s:1});
        if(e.big)for(let i=0;i<4;i++)this.parts.push({x:p[0],y:p[1],vx:(Math.random()-.5)*40,vy:-Math.random()*30,l:.5,c:'#bfe3ff',s:1,g:1});
        if(e.blood){for(let i=0;i<5;i++)this.parts.push({x:p[0],y:p[1],vx:(Math.random()-.5)*40,vy:-Math.random()*25,l:.8,c:'#9b1b1b',s:1,g:1,dec:1})}
        SFX.play('hit',e.big);if(e.big&&e.dmg>8)SFX.play('crowd');
        if(f.human&&(e.F===f.human||e.A===f.human))try{navigator.vibrate&&navigator.vibrate(e.F===f.human?(e.big?30:12):8)}catch(_){}break}
      case'block':if(ff)break;{const p=this.hitPos(e);for(let i=0;i<4;i++)this.parts.push({x:p[0],y:p[1],vx:(Math.random()-.5)*40,vy:(Math.random()-.7)*30,l:.18,c:'#9aa',s:1})}SFX.play('block');break;
      case'whoosh':if(!ff)SFX.play('whoosh');break;
      case'slam':if(ff)break;for(let i=0;i<14;i++)this.parts.push({x:e.x+(Math.random()-.5)*16,y:LV.FLOOR-1,vx:(Math.random()-.5)*50,vy:-Math.random()*20,l:.5,c:'#cbbfa8',s:1});SFX.play('slam');break;
      case'kd':if(!ff){SFX.play('slam');SFX.play('crowd',true)}break;
      case'bell':if(!ff)SFX.play('bell');break;
      case'crowd':if(!ff)SFX.play('crowd',true);break;
      case'banner':if(!ff)this.showBanner(e.t,'',1.4);break;
      case'flash':if(!ff)this.showFlash(e.t);break;
      case'contestEnd':if(e.human!=null&&!ff)this.showFlash(e.human?'You win the scramble!':'Lost the scramble');break;
    }}
  hitPos(e){const f=this.f,F=e.F;if(f.pos==='ground'&&f.g){const b=f.g.bot,J=GB[f.g.pos],fb=b.face;if(F===b)return[b.x+fb*J.H[0],LV.FLOOR+J.H[1]];const t=GT[f.g.pos];return[b.x+fb*t.H[0],LV.FLOOR+t.H[1]]}
    return[F.x-F.face*1,LV.FLOOR+(e.y||-24)]}
  updParts(dt){for(const p of this.parts){p.l-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.g)p.vy+=140*dt;else p.vy+=40*dt;if(p.dec&&p.y>=LV.FLOOR+1){p.l=0;if(this.decals.length<60)this.decals.push([p.x|0,LV.FLOOR+1+Math.floor(Math.random()*5)])}}
    this.parts=this.parts.filter(p=>p.l>0)}
  showBanner(t,sub,d){this.ui.ban.innerHTML=`${t}${sub?`<small>${esc(sub)}</small>`:''}`;this.ui.ban.classList.add('on');clearTimeout(this.bt);this.bt=setTimeout(()=>this.ui.ban.classList.remove('on'),(d||1.4)*1000)}
  showFlash(t){this.ui.fl.textContent=t;this.ui.fl.classList.add('on');clearTimeout(this.ft);this.ft=setTimeout(()=>this.ui.fl.classList.remove('on'),900)}

  /* ---------- drawing ---------- */
  draw(){const x=this.ctx,f=this.f,F=LV.FLOOR;const sx=f.shake?Math.round((Math.random()-.5)*f.shake):0,sy=f.shake?Math.round((Math.random()-.5)*f.shake*.6):0;
    x.setTransform(1,0,0,1,0,0);x.fillStyle='#000';x.fillRect(0,0,LV.W,LV.H);x.setTransform(1,0,0,1,sx,sy);
    x.drawImage(this.bg,0,0);
    if(this.kind!=='REG'&&Math.random()<.12){x.fillStyle='#fff';x.fillRect(Math.floor(Math.random()*LV.W),12+Math.floor(Math.random()*(LV.FLOOR-48)),1,1)}
    x.fillStyle='#7d1717';for(const d of this.decals)x.fillRect(d[0],d[1],1,1);
    for(const Fi of f.F){const gx=f.pos==='ground'&&f.g?f.g.bot.x:Fi.x;x.fillStyle='rgba(0,0,0,.32)';x.fillRect(Math.round(gx-9),F-1,18,2)}
    if(f.pos==='ground'&&f.g)this.drawGround(x);
    else{const order=[...f.F].sort((a,b)=>(a.act?1:0)-(b.act?1:0));for(const Fi of order)this.drawStand(x,Fi)}
    if(this.o.ring)drawRopes(x,this.kind);
    for(const p of this.parts){x.fillStyle=p.c;x.fillRect(Math.round(p.x),Math.round(p.y),p.s,p.s)}
    if(f.phase==='end'&&f.pt<1.2){x.fillStyle=`rgba(255,255,255,${Math.max(0,.25-f.pt*.25)})`;x.fillRect(0,0,LV.W,LV.H)}}
  poseStand(Fi){const f=this.f;
    if(Fi.win&&f.phase==='end'&&f.pt>.9)return PO.win;
    if(Fi.down>0)return PO.down;
    if(f.pos==='clinch'){if(Fi.act&&PCH[Fi.act.k])return this.actPose(Fi);if(f.ct)return mixP(PO.clinch,PO.stag,.3+Math.sin(f.T*30)*.15);return PO.clinch}
    if(Fi.sprawl&&Fi.o.act&&Fi.o.act.k==='shoot')return PO.sprawl;
    if(Fi.dodge>0)return PO.dodge;
    if(Fi.stuff>0)return PO.stag;
    if(Fi.act&&PCH[Fi.act.k])return this.actPose(Fi);
    if(Fi.hurt>0)return mixP(PO.stance,PO.hurt,Math.min(1,Fi.hurt*7));
    if(Fi.block)return PO.block;
    let p=Fi.stag>0?mixP(PO.stance,PO.stag,.75):PO.stance;
    if(Math.abs(Fi.vx)>2){const s=Math.sin(Fi.walkT*15);p=ov(p,{Kb:[p.Kb[0]+s*1.5,p.Kb[1]],Fb:[p.Fb[0]+s*2.5,p.Fb[1]-Math.max(0,s)*1.5],Kf:[p.Kf[0]-s*1.5,p.Kf[1]],Ff:[p.Ff[0]-s*2.5,p.Ff[1]-Math.max(0,-s)*1.5]})}
    const b=Math.sin(f.T*5+Fi.side*2)*.6,q={};for(const k of PJ)q[k]=k[0]==='K'||k[0]==='F'?p[k]:[p[k][0],p[k][1]+b*(k==='P'?.3:1)];return q}
  actPose(Fi){const a=Fi.act,c=PCH[a.k],C=PO[c[0]],X=PO[c[1]],S=this.f.pos==='clinch'?PO.clinch:PO.stance;
    if(a.ph==='w')return mixP(S,C,ease(a.t/a.dw));if(a.ph==='a')return mixP(C,X,Math.min(1,a.t/Math.min(a.da,.06)));return mixP(X,S,ease(a.t/a.dr))}
  drawStand(x,Fi){const f=this.f,J=this.poseStand(Fi);const lying=Fi.down>0;
    drawFig(x,J,Fi.x,LV.FLOOR,Fi.face,Fi.look,{lying,daze:Fi.stag>0?f.T:0})}
  drawGround(x){const f=this.f,g=f.g,b=g.bot,t=g.top,fb=b.face,pos=g.pos;let JB=GB[pos],JT=GT[pos];
    const jig=f.ct?Math.sin(f.T*35)*.6:0;
    const strike=(Fi,J,target)=>{const a=Fi.act;if(!a||!['gnp','hgnp','bstrike'].includes(a.k))return J;let e=a.ph==='w'?-.3*ease(a.t/a.dw):a.ph==='a'?1:1-ease(a.t/a.dr);
      if(e<0){const h=J.Hf;return ov(J,{Hf:[h[0]+2,h[1]-3],Ef:[J.Ef[0]+1,J.Ef[1]-3]})}
      const h=J.Hf,tg=[target[0]+(Fi===b?0:1),target[1]];return ov(J,{Hf:[h[0]+(tg[0]-h[0])*e,h[1]+(tg[1]-h[1])*e],Ef:[J.Ef[0]+(tg[0]-J.Ef[0])*e*.5,J.Ef[1]+(tg[1]-J.Ef[1])*e*.4-1]})};
    if(b.block&&pos!=='back')JB=ov(JB,{Hf:[JB.H[0]+2,JB.H[1]-3],Hb:[JB.H[0]+1,JB.H[1]-2],Ef:[JB.H[0]+5,JB.H[1]-4],Eb:[JB.H[0]+4,JB.H[1]-2]});
    JT=strike(t,JT,JB.H);JB=strike(b,JB,JT.H);
    const sh=k=>{const o={};for(const q of PJ)o[q]=[k[q][0]+jig,k[q][1]];return o};
    const isSub=f.ct&&f.ct.kind==='sub';
    drawFig(x,sh(JB),b.x,LV.FLOOR,fb,b.look,{lying:pos!=='back',eye:pos==='back'?fb:fb,daze:b.head<35?f.T:0});
    drawFig(x,isSub?sh(JT):JT,b.x,LV.FLOOR,fb,t.look,{eye:pos==='back'?fb:-fb});
    if(isSub){x.fillStyle='rgba(255,90,60,.8)';const h=JB.H;x.fillRect(Math.round(b.x+fb*h[0]-1+Math.sin(f.T*20)),Math.round(LV.FLOOR+h[1]-6),2,2)}}

  /* ---------- HUD ---------- */
  hud(){const f=this.f,u=this.ui;
    f.F.forEach((F,i)=>{u.hp[i].style.width=Math.max(0,F.head)+'%';u.hm[i].style.width=Math.max(0,F.headMax)+'%';u.st[i].style.width=Math.max(0,F.sta)+'%';
      const sp=u.dm[i].children,col=v=>v>66?'var(--win)':v>33?'var(--warn)':'var(--loss)';sp[0].style.background=col(F.head);sp[1].style.background=col(F.body);sp[2].style.background=col(F.legs)});
    const cl=Math.max(0,f.clock);u.rd.textContent=`R${f.round}/${f.rounds.length}`;u.tm.textContent=`${Math.floor(cl/60)}:${String(Math.floor(cl%60)).padStart(2,'0')}`;
    if(f.callT>0&&u.call.textContent!==f.call)u.call.textContent=f.call;u.call.parentElement.classList.toggle('fade',f.callT<=0);
    const c=f.ct;u.ct.hidden=!c;
    if(c){const s=f.share(),red=c.A.side===0?s:1-s,need=c.A.side===0?c.need:1-c.need;u.ct.querySelector('.lctbar i').style.width=(red*100)+'%';u.ct.querySelector('em').style.left=(need*100)+'%';
      const ls=u.ct.querySelectorAll('.lctl span');ls[0].textContent=c.label;ls[1].textContent=c.A.name;
      const H=f.human;u.ct.querySelector('.lcttap').textContent=H?(H===c.A?(c.kind==='sub'?'Tap fast to finish it!':'Tap fast!'):(c.kind==='sub'?'Tap fast to escape!':'Tap fast to stop it!')):'Scramble'}
    if(f.human)this.updPad()}
  updPad(){const f=this.f,H=f.human,O=H.o,lab={};const gap=Math.abs(H.x-O.x);
    if(f.phase!=='fight'){for(const k of 'JPKSB')lab[k]=['—',''];}
    else if(f.ct){for(const k of 'JPKS')lab[k]=['Tap!',''];lab.B=['Tap!',''];}
    else if(f.pos==='stand'){
      if(O.down>0){lab.J=['Pounce',''];lab.P=['Pounce',''];lab.S=['Pounce',''];lab.K=f.ring?['Soccer kick','ring rules']:['—',''];lab.B=['Block','']}
      else{lab.J=['Jab',''];lab.P=['Power','hold: overhand'];lab.K=['Kick','hold: head kick'];lab.S=gap<12?['Clinch','']:['Shoot','takedown'];lab.B=['Block',f.sprawlW&&f.sprawlW.side===H.side?'TAP NOW':'tap: sprawl']}}
    else if(f.pos==='clinch'){lab.J=['Punches',''];lab.P=['Knee',''];lab.K=['Trip','takedown'];lab.S=['Body lock','takedown'];lab.B=['Break','tap']}
    else{const g=f.g,top=g.top===H,gp=g.pos;
      if(top){lab.J=['Punch',''];lab.P=['Elbow','heavy'];lab.K=gp==='guard'?['—','pass first']:['Submit',''];lab.S=gp==='back'?['—','']:['Advance',GPN[GPOS[GPOS.indexOf(gp)+1]]||''];lab.B=['Posture','◀ ▶ hold: stand']}
      else{const op=gp==='guard'||gp==='half';lab.J=['Strike',''];lab.P=op?['Submit','']:['—',''];lab.K=op?['Get up','']:['—','escape first'];lab.S=gp==='guard'?['Sweep','']:['Escape',''];lab.B=['Defend','hold']}}
    const key=JSON.stringify(lab)+(f.sprawlW?1:0);if(key===this.lastLab)return;this.lastLab=key;
    for(const k in lab){const b=this.el.querySelector(`[data-k="${k}"]`);if(!b)continue;b.querySelector('b').textContent=lab[k][0];b.querySelector('small').textContent=lab[k][1];
      b.classList.toggle('off',lab[k][0]==='—');b.classList.toggle('tap',!!f.ct);b.classList.toggle('cue',k==='B'&&!!(f.sprawlW&&f.sprawlW.side===H.side))}}

  /* ---------- overlays ---------- */
  overlay(kind){const u=this.ui.over,f=this.f;this.over=kind;u.hidden=!kind;if(!kind){u.innerHTML='';return}
    const H=f.human,side=H?H.side:0,[A,B]=f.F;
    const row=(l,a,b)=>`<span class="l">${a}</span><span class="c">${l}</span><span>${b}</span>`;
    if(kind==='pause')u.innerHTML=`<h2>Paused</h2><div class="list"><button class="mrow" data-lv="resume">${svg(PLAYI)}<span>Resume</span></button><button class="mrow" data-lv="help">${svg(BOOKI)}<span>Controls</span></button><button class="mrow" data-lv="sound">${svg('<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6"/>')}<span>Sound: ${SFX.on?'On':'Off'}</span></button><button class="mrow" data-lv="simrest">${svg('<path d="M5 5l7 7-7 7M12 5l7 7-7 7"/>')}<span>Simulate the rest</span></button>${this.o.canQuit?`<button class="mrow danger" data-lv="quit">${svg(XI)}<span>Quit fight</span></button>`:''}</div>`;
    else if(kind==='help')u.innerHTML=`<h2>Controls</h2><div class="howto lhelp"><div><h4>Standing</h4><ul><li><b>◀ ▶</b> move. Double-tap away to dodge.</li><li><b>Jab</b> is fast. <b>Power</b> throws the cross and hook. Hold for an overhand.</li><li><b>Kick</b> attacks the legs. Hold for a head kick.</li><li><b>Block</b> holds your guard and checks leg kicks. Tap it when he shoots to sprawl.</li><li><b>Shoot</b> is a takedown from range, or a clinch up close.</li></ul></div><div><h4>Clinch and ground</h4><ul><li>Buttons change with the position. Read their labels.</li><li>On top: punch, elbow, advance position, submit. Hold ◀ or ▶ to stand up.</li><li>On bottom: defend, sweep or escape, get up, submit from guard.</li><li>Scrambles and submissions are tap battles: <b>tap any button fast</b>.</li></ul></div><p class="hint">Keyboard: A/D move, Space block, J jab, K power, L kick, I shoot, P pause.</p></div><button class="btn block" data-lv="pause">Back</button>`;
    else if(kind==='break'){const r=f.round,st=f.rstats[r-1],pv=f.rstats[r-2],d=(i,k)=>st[i][k]-(pv?pv[i][k]:0);
      const adv=H?f.advice(side):[];
      u.innerHTML=`<div class="lbl">End of round ${r} of ${f.rounds.length}</div><h2>Your corner</h2>
        <div class="tape num">${row('',`<b style="color:#e8574b">${esc(A.name)}</b>`,`<b style="color:#6b95ea">${esc(B.name)}</b>`)}${row('Landed',d(0,'landed'),d(1,'landed'))}${row('Takedowns',d(0,'td'),d(1,'td'))}${row('Knockdowns',d(0,'kd'),d(1,'kd'))}</div>
        ${adv.map(t=>`<div class="quote">${esc(t)}</div>`).join('')}
        <button class="btn block" data-lv="next">Start round ${r+1}</button>`}
    else if(kind==='end'){const x=f.res,W=x.w<0?null:f.F[x.w],youWon=H?(x.w===H.side):null;
      u.innerHTML=`<div class="lbl">${x.fin?`Round ${x.rd} · ${x.time}`:'Decision'}</div><h2 style="color:${youWon===false?'var(--loss)':'var(--acc)'}">${W?esc(W.name)+' wins':'Draw'}</h2><div class="lbl" style="color:var(--ink)">${esc(x.method)}</div>
        ${x.cards?`<div class="cards3 num">${x.cards.map((c,j)=>`<div><span class="lbl">Judge ${j+1}</span><br>${c[0]}–${c[1]}</div>`).join('')}</div>`:''}
        <div class="tape num">${row('',`<b style="color:#e8574b">${esc(A.name)}</b>`,`<b style="color:#6b95ea">${esc(B.name)}</b>`)}${row('Strikes landed',A.st.landed,B.st.landed)}${row('Takedowns',A.st.td,B.st.td)}${row('Knockdowns',A.st.kd,B.st.kd)}${row('Sub attempts',A.st.sub,B.st.sub)}</div>
        <button class="btn block" data-lv="done">Continue</button>`}}
}
function openLive(o){const host=document.querySelector('.shell')||document.getElementById('app');SFX.init();return new LiveView(host,o)}
