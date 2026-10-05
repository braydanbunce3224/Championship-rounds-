/*!
 * Championship Rounds: live fight engine (direct-control fights).
 * Copyright (c) 2026 SpecMagic Games. All rights reserved.
 *
 * LiveFight is the simulation (no DOM). LiveView (fightview.js) draws it and feeds input.
 * Loaded before game.js; uses helpers from game.js (clamp, pick, seeded, hash, pickr) at runtime.
 * Fighter sides: 0 = red corner (A), 1 = blue corner (B). Results match simFight()'s shape.
 */
const LV={W:128,H:80,FLOOR:70,L:10,R:118,CAGE:48,RING:44,TS:5,MINGAP:9,PACE:.78,BREATH:2.2,TAPGRACE:.45};
const LMV={
  jab:{w:.09,a:.06,r:.14,sta:3.5,rng:18,dmg:3,tgt:'head',pts:1,nm:'jab'},
  cross:{w:.15,a:.06,r:.24,sta:6.5,rng:17,dmg:7,tgt:'head',pts:2,pow:1,nm:'right hand'},
  hook:{w:.16,a:.07,r:.26,sta:6.5,rng:14.5,dmg:8,tgt:'head',pts:2,pow:1,nm:'left hook'},
  over:{w:.30,a:.08,r:.36,sta:11,rng:17,dmg:12,tgt:'head',pts:3,pow:1,nm:'overhand right'},
  lkick:{w:.20,a:.08,r:.30,sta:7,rng:20,dmg:6.5,tgt:'legs',pts:2,nm:'leg kick',kick:1},
  hkick:{w:.34,a:.08,r:.44,sta:13,rng:21,dmg:17,tgt:'head',pts:4,pow:1,nm:'head kick',kick:1},
  shoot:{w:.13,a:.30,r:.42,sta:14,rng:30},
  upper:{w:.15,a:.06,r:.25,sta:7,rng:12.5,dmg:8.5,tgt:'head',pts:2,pow:1,nm:'uppercut'},
  body:{w:.15,a:.07,r:.25,sta:6,rng:14,dmg:7.5,tgt:'body',pts:2,pow:1,nm:'body hook'},
  superman:{w:.26,a:.08,r:.36,sta:12,rng:21,dmg:11,tgt:'head',pts:3,pow:1,nm:'superman punch',lunge:62,risk:1},
  bkick:{w:.22,a:.08,r:.32,sta:9,rng:20,dmg:8.5,tgt:'body',pts:2,pow:1,nm:'body kick',kick:1},
  teep:{w:.17,a:.07,r:.26,sta:6,rng:20,dmg:4,tgt:'body',pts:1,nm:'teep',kick:1,push:46},
  spin:{w:.36,a:.08,r:.46,sta:14,rng:19,dmg:13,tgt:'body',pts:4,pow:1,nm:'spinning back kick',kick:1,risk:1},
  soccer:{w:.20,a:.07,r:.30,sta:8,rng:17,dmg:11,tgt:'head',pts:3,pow:1,nm:'soccer kick',kick:1},
  cpunch:{w:.08,a:.05,r:.16,sta:2.5,dmg:3,tgt:'head',pts:1,nm:'short punches'},
  knee:{w:.16,a:.06,r:.26,sta:6,dmg:7,tgt:'body',pts:2,pow:1,nm:'knee'},
  gnp:{w:.10,a:.06,r:.22,sta:2.5,dmg:2.7,tgt:'head',pts:1,nm:'punches'},
  hgnp:{w:.22,a:.07,r:.34,sta:6,dmg:5.6,tgt:'head',pts:2,pow:1,nm:'elbows'},
  bstrike:{w:.10,a:.05,r:.22,sta:2.5,dmg:2.2,tgt:'head',pts:1,nm:'strikes from the bottom'}
};
const LSTRIKE=new Set(['jab','cross','hook','over','lkick','hkick','upper','body','superman','bkick','teep','spin']);
const LCHAIN=new Set(['jab','cross','hook','upper','body','lkick','bkick','teep']);
const LSTYLE={
  Striker:{w:{jab:.34,cross:.24,hook:.14,over:.05,lkick:.1,hkick:.05,upper:.06,body:0.056,superman:.03,bkick:0.028,teep:0.02,spin:.02,shoot:.04,clinch:.04},want:16,ag:.62,cmb:.55},
  Kickboxer:{w:{jab:.24,cross:.14,hook:.1,over:.02,lkick:.26,hkick:.17,upper:.04,body:0.04,superman:.02,bkick:0.07,teep:0.04,spin:.05,shoot:.03,clinch:.04},want:18,ag:.6,cmb:.5},
  Brawler:{w:{jab:.1,cross:.26,hook:.24,over:.24,lkick:.05,hkick:.03,upper:.1,body:0.064,superman:.05,bkick:0.014,teep:0.005,spin:.01,shoot:.04,clinch:.04},want:13,ag:.72,cmb:.6},
  Wrestler:{w:{jab:.28,cross:.14,hook:.08,over:.03,lkick:.05,hkick:0,upper:.05,body:0.04,superman:.01,bkick:0.014,teep:0.005,spin:0,shoot:.21,clinch:.1},want:14,ag:.55,cmb:.3},
  BJJ:{w:{jab:.3,cross:.14,hook:.08,over:.02,lkick:.08,hkick:.02,upper:.03,body:0.032,superman:.01,bkick:0.028,teep:0.02,spin:.01,shoot:.18,clinch:.08},want:15,ag:.5,cmb:.3},
  'All-rounder':{w:{jab:.3,cross:.2,hook:.12,over:.05,lkick:.1,hkick:.05,upper:.05,body:0.048,superman:.02,bkick:0.035,teep:0.02,spin:.02,shoot:.08,clinch:.05},want:16,ag:.58,cmb:.45}
};
const LDIFF={
  easy:{react:.45,block:.25,ag:.75,rate:.68,dmg:.82,sprawl:.32,think:.34,win:.55},
  normal:{react:.3,block:.45,ag:1,rate:.9,dmg:1,sprawl:.5,think:.24,win:.42},
  hard:{react:.19,block:.62,ag:1.15,rate:1.1,dmg:1.1,sprawl:.68,think:.16,win:.32}
};
const GPOS=['guard','half','side','mount','back'];
const GPN={guard:'full guard',half:'half guard',side:'side control',mount:'mount',back:'back control'};
const GMULT={guard:.7,half:.9,side:1,mount:1.35,back:1.2};
const LSUBS={guard:['triangle choke','armbar','guillotine'],half:['kimura'],side:['arm-triangle choke','kimura'],mount:['armbar','arm-triangle choke'],back:['rear-naked choke']};
/* ---------------- arena geometry: the fight happens on a 2D mat inside the fence ---------------- */
function cageN(ring){const n=ring?4:8,out=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2+(ring?Math.PI/4:0);out.push([Math.cos(a),Math.sin(a)])}return out}
function cageR(ring){return ring?LV.RING:LV.CAGE}
const LHIT=['%A lands clean!','Big shot from %A!','%A finds a home for that one.','%D eats it and keeps coming.','%A snaps the head back!','That one stung %D.'];

function lookOf(f,side){const r=seeded(hash(f.id||f.last,'look'));
  const SK=['#f2c9a8','#e3b08a','#c98d62','#ad7048','#8c5636','#6c3f26','#4f2c1b'];
  const HC=['#16110d','#2b1d14','#4a2f1c','#7a5230','#b78a50','#2a2a2a','#5a4a3a'];
  return{skin:pickr(r,SK),hair:pickr(r,HC),hs:Math.floor(r()*5),beard:r()<.35,
    side,trunk:side?'#2f63c8':'#cf3a2e',trunk2:side?'#1d3f86':'#8c2219',glove:side?'#1c3570':'#701b15'}}
function mkLF(f,side,human){const r=f.r;
  return{f,side,human,name:f.last,x:side?15:-15,y:0,face:side?-1:1,vx:0,vy:0,kbx:0,kby:0,
    head:100,headMax:100,body:100,legs:100,sta:100,
    act:null,queue:null,qT:0,block:false,hurt:0,stag:0,down:0,inv:0,stuff:0,dodge:0,sprawl:false,
    kdR:0,legKD:0,unans:0,blockT0:-9,open:0,shootCD:0,dash:0,mo:0,fire:0,chain:0,chainT:9,landT:-9,lastAtk:'',lastAtkT:9,combo:0,walkT:0,hitT:9,win:false,lost:false,
    spd:1.12-(r.str-50)/250,mv:24*(.85+r.car/400+(r.str-50)/500),
    ai:{t:.4+Math.random()*.3,dir:0,lat:0,latT:0,blockT:0,react:0,seen:null,combo:0},
    st:{thrown:0,landed:0,kd:0,td:0,tda:0,sub:0,ctrl:0,head:0,body:0,legs:0,blocked:0},
    look:lookOf(f,side)}}

class LiveFight{
  constructor(o){
    this.o=o;this.diff=LDIFF[o.diff]||LDIFF.normal;this.rounds=o.rounds;this.ring=!!o.ring;
    this.F=[mkLF(o.a,0,o.human===0),mkLF(o.b,1,o.human===1)];
    this.F[0].o=this.F[1];this.F[1].o=this.F[0];
    this.round=1;this.clock=this.rounds[0]*60;this.el=0;this.phase='intro';this.pt=0;this.T=0;
    this.pos='stand';this.g=null;this.ct=null;this.idle=0;
    this.rp=[[0,0]];this.rkd=[[0,0]];this.log=[[]];this.cards=[[0,0],[0,0],[0,0]];this.rcards=[];this.rstats=[];
    this.ctEnd=-9;this.ev=[];this.shake=0;this.slow=0;this.call='';this.callT=0;this.sprawlW=null;this.fhl=null;this.res=null;this.lastStand=null;
    this.inp={dir:0,wx:0,wy:0,B:false};this.taps=[];this.N=cageN(this.ring);this.CR=cageR(this.ring);this.axis=[1,0];
  }
  /* ---- 2D helpers ---- */
  u(F){const O=F.o,dx=O.x-F.x,dy=O.y-F.y,d=Math.hypot(dx,dy);return d>1e-6?[dx/d,dy/d,d]:[this.axis[0]*(F.side?-1:1),this.axis[1]*(F.side?-1:1),0]}
  gap(F){return Math.hypot(F.o.x-F.x,F.o.y-F.y)}
  fenceDist(P){let m=-1e9;for(const n of this.N)m=Math.max(m,P.x*n[0]+P.y*n[1]);return this.CR-m}
  fenceN(P){let best=null,m=-1e9;for(const n of this.N){const d=P.x*n[0]+P.y*n[1];if(d>m){m=d;best=n}}return best}
  clampIn(P,margin){const R=this.CR-(margin||0);for(let k=0;k<2;k++)for(const n of this.N){const d=P.x*n[0]+P.y*n[1]-R;if(d>0){P.x-=n[0]*d;P.y-=n[1]*d}}}
  place(F,x,y,margin){F.x=x;F.y=y;this.clampIn(F,margin||0)}
  push(F,ux,uy,v){F.vx=ux*v;F.vy=uy*v}
  rel(F){const u=this.u(F);return this.inp.wx*u[0]+this.inp.wy*u[1]}   // stick toward (+) or away (-) from the opponent
  pinned(A,D){if(this.fenceDist(D)>=7)return false;const n=this.fenceN(D),u=this.u(A);return u[0]*n[0]+u[1]*n[1]>.3}
  get human(){return this.F.find(F=>F.human)||null}
  emit(type,d){this.ev.push(Object.assign({type},d||{}))}
  say(t,big){this.call=t;this.callT=2.4;const L=this.log[this.round-1];if(big||L.length<40)L.push({t,big:!!big})}
  flash(t){this.emit('flash',{t})}
  banner(t){this.emit('banner',{t})}
  pts(F,v){this.rp[this.round-1][F.side]+=v}
  aiD(F){return F.o.human?this.diff:LDIFF.normal}
  canAct(F){return this.phase==='fight'&&!F.act&&F.down<=0&&F.stuff<=0&&F.dodge<=0&&F.hurt<=0&&!this.ct}

  /* ---------------- main loop ---------------- */
  update(dt){
    dt*=LV.PACE;this.T+=dt;if(this.slow>0)this.slow-=dt;if(this.shake>0)this.shake=Math.max(0,this.shake-dt*18);if(this.callT>0)this.callT-=dt;
    if(this.phase==='intro'){this.pt+=dt;if(this.pt>1.4){this.phase='fight';this.emit('bell');this.say(this.round===1?'Here we go!':`Round ${this.round}. Fight!`)}return}
    if(this.phase!=='fight'){this.pt+=dt;for(const F of this.F){F.vx*=.85;F.vy*=.85;if(F.act&&this.phase==='end')F.act=null}return}
    this.clock-=dt*LV.TS;this.el+=dt*LV.TS;
    for(const F of this.F)this.updF(F,dt);
    if(this.phase!=='fight')return;
    if(this.ct)this.updContest(dt);
    for(const F of this.F){if(F.human)this.humanCtl(F,dt);else this.aiCtl(F,dt)}
    if(this.phase!=='fight')return;
    this.physics(dt);
    if(this.pos!=='stand'&&!this.ct){this.idle+=dt;
      if(this.pos==='clinch'&&this.idle>4.5)this.breakClinch('The referee breaks the clinch.');
      else if(this.pos==='ground')this.refGround(dt)}
    if(this.pos==='ground'&&this.g){const g=this.g;g.t=(g.t||0)+dt;g.all=(g.all||0)+dt;this.pts(g.top,dt*.25);g.top.st.ctrl+=dt*LV.TS;
      // holding someone down costs the top man gas too; the bottom man slowly builds scramble momentum
      g.top.sta=Math.max(0,g.top.sta-dt*1.6);g.mom=Math.min(.16,(g.mom||0)+dt*.006)}
    if(this.fhl&&this.T>this.fhl.until)this.fhl=null;
    if(this.sprawlW&&this.T>this.sprawlW.until)this.sprawlW=null;
    if(this.clock<=0&&this.phase==='fight')this.endRound();
  }
  updF(F,dt){
    F.lastAtkT+=dt;F.hitT+=dt;
    if(F.inv>0)F.inv-=dt;if(F.hurt>0)F.hurt-=dt;if(F.stag>0)F.stag-=dt*(F.block?1.7:1);if(F.stuff>0)F.stuff-=dt;if(F.dodge>0)F.dodge-=dt;if(F.open>0)F.open-=dt;if(F.dash>0)F.dash-=dt;F.chainT+=dt;if(F.fire>0){F.fire-=dt;if(F.fire<=0)this.say(`${F.name} cools off.`)}if(F.scrCD>0)F.scrCD-=dt;if(F.shootCD>0)F.shootCD-=dt;
    if(F.down>0){F.down-=dt;if(F.down<=0&&this.pos==='stand'){F.head=Math.min(F.headMax,F.head+10);F.inv=.5;F.stag=Math.max(F.stag,.8);this.say(`${F.name} beats the count and gets up.`)}}
    const moving=Math.hypot(F.vx,F.vy)>2,busy=!!F.act;
    const reg=13*(.55+F.f.r.car/150)*(.7+.3*F.body/100)*(F.block?.55:1)*(moving?.75:1)*(busy?.3:1)*(this.pos==='ground'?.8:1)*(this.ct?.2:1);
    F.sta=clamp(F.sta+reg*dt,0,100);
    if(F.hitT>2.2&&F.down<=0){F.head=Math.min(F.headMax,F.head+dt*1.7);F.body=Math.min(100,F.body+dt*.45)}
    if(F.act)this.stepAct(F,dt);
    if(F.queue){F.qT-=dt;if(F.qT<=0)F.queue=null;else if(this.canAct(F)){const k=F.queue;F.queue=null;this.doAct(F,k)}}
    if(moving)F.walkT+=dt;
  }

  /* ---------------- actions ---------------- */
  doAct(F,k){
    const a0=F.act;
    if(this.pos==='stand'&&a0&&a0.ph==='r'&&LCHAIN.has(a0.k)&&a0.t>.03&&F.down<=0&&F.hurt<=0&&F.stuff<=0&&!this.ct&&this.phase==='fight'&&F.o.down<=0){
      const mv=this.keyMove(k,this.gap(F),F);if(mv&&LSTRIKE.has(mv)){F.act=null;return this.startAct(F,mv,true)}}
    if(!this.canAct(F)){if(!this.ct&&this.phase==='fight'){F.queue=k;F.qT=.24}return}
    const O=F.o,gap=this.gap(F);
    if(this.pos==='stand'){
      if(O.down>0){
        if((k==='K'||k==='Kc')&&this.ring&&gap<18)return this.startAct(F,'soccer');
        if(gap<17&&k!=='K'&&k!=='Kc')return this.pounce(F);
        if(F.human&&(k==='K'||k==='Kc'))this.flash(this.ring?'Get closer':'No kicks to a downed fighter');
        return}
      if(this.fhl&&this.fhl.side===F.side&&gap<16){
        if(k==='S')return this.frontHeadlock(F,'snap');
        if(k==='Pc')return this.frontHeadlock(F,'guil');
        if(k==='K'||k==='Kc'){this.fhl=null;return this.startAct(F,'knee')}}
      if(k==='S'&&O.act&&O.act.m.kick&&O.act.ph!=='r'&&gap<=O.act.m.rng+3)return this.catchKick(F,O);
      if(k==='J')return this.startAct(F,'jab');
      if(k==='P'){const close=gap<12.5,m=F.lastAtk==='jab'&&F.lastAtkT<.7?'cross':F.lastAtk==='cross'&&F.lastAtkT<.8?(close?'upper':'hook'):F.lastAtk==='hook'&&F.lastAtkT<.8&&close?'upper':close&&F.combo%3===2?(F.combo++,'upper'):(F.combo++%2?'hook':'cross');return this.startAct(F,m)}
      if(k==='U')return this.startAct(F,'upper');
      if(k==='Pb')return this.startAct(F,'body');
      if(k==='Pfc')return this.startAct(F,'superman');
      if(k==='Kf')return this.startAct(F,'bkick');
      if(k==='Kb')return this.startAct(F,'teep');
      if(k==='Kfc')return this.startAct(F,'spin');
      if(k==='Pc')return this.startAct(F,'over');
      if(k==='K')return this.startAct(F,'lkick');
      if(k==='Kc')return this.startAct(F,'hkick');
      if(k==='S')return gap<12?this.clinch(F):this.startAct(F,'shoot');
    }else if(this.pos==='clinch'){
      if(k==='J')return this.startAct(F,'cpunch');
      if(k==='P'||k==='Pc')return this.startAct(F,'knee');
      if(k==='K'||k==='Kc')return this.contest('trip',F,O);
      if(k==='S')return this.contest('lock',F,O);
    }else if(this.pos==='ground'){const g=this.g,top=g.top===F;
      if(top){
        if(k==='J')return this.startAct(F,'gnp');
        if(k==='P'||k==='Pc')return this.startAct(F,'hgnp');
        if(k==='S'){if(g.pos==='back'){if(F.human)this.flash('You already have the back');return}return this.contest('adv',F,O)}
        if(k==='K'||k==='Kc'){if(g.pos==='guard'){if(F.human)this.flash('Pass the guard first');return}return this.contest('sub',F,O)}
      }else{
        if(k==='J')return this.startAct(F,'bstrike');
        if(k==='P'||k==='Pc'){if(g.pos!=='guard'&&g.pos!=='half'){if(F.human)this.flash('No submissions from here');return}return this.contest('sub',F,O)}
        if(k==='S')return this.contest(g.pos==='guard'?'sweep':'escape',F,O);
        if(k==='K'||k==='Kc'){if(g.pos==='mount'||g.pos==='back'){if(F.human)this.flash('Escape first');return}return this.contest('getup',F,O)}
      }
    }
  }
  keyMove(k,gap,F){return{J:'jab',P:F.lastAtk==='jab'&&F.lastAtkT<.9?'cross':F.lastAtk==='cross'&&F.lastAtkT<.9?(gap<12.5?'upper':'hook'):'cross',Pc:'over',K:'lkick',Kc:'hkick',U:'upper',Pb:'body',Pfc:'superman',Kf:'bkick',Kb:'teep',Kfc:'spin'}[k]||(LMV[k]?k:null)}
  startAct(F,k,chained){const m=LMV[k];
    if(F.sta<m.sta*.6){if(F.human)this.flash('Too tired');return}
    const s=F.spd*(F.sta<25?1.25:1)*(F.stag>0?1.3:1)*(m.kick?1+(100-F.legs)/250:1)*(F.fire>0?.86:1);
    F.act={k,m,ph:'w',t:0,dw:m.w*s*(chained?.62:1),da:k==='shoot'?m.a:m.a*s,dr:m.r*s,done:false,ch:!!chained};
    F.sta-=m.sta*(F.fire>0?.75:1);F.block=false;if(m.dmg)F.st.thrown++;
    F.lastAtk=k;F.lastAtkT=0;
    if(k==='shoot'){F.st.tda++;this.onShoot(F)}
  }
  stepAct(F,dt){const a=F.act;a.t+=dt;
    if(a.ph==='r'&&F.queue&&a.t>.03&&this.pos==='stand'&&LCHAIN.has(a.k)){const k=F.queue;F.queue=null;this.doAct(F,k);if(F.act!==a)return}
    if(a.ph==='w'){if(a.m.lunge&&this.pos==='stand'){const u=this.u(F);this.push(F,u[0],u[1],a.m.lunge)}if(a.t>=a.dw){a.ph='a';a.t=0;if(a.k==='shoot')this.emit('whoosh',{F});else this.strike(F,a.m,a.k)}}
    else if(a.ph==='a'){
      if(a.k==='shoot'&&!a.done){const u=this.u(F);this.push(F,u[0],u[1],84*(F.sta<20?.75:1));if(u[2]<=LV.MINGAP+1.5){a.done=true;F.vx=F.vy=0;this.takedown(F,F.o);return}}
      if(F.act&&a.t>=a.da){a.ph='r';a.t=0;if(a.k==='shoot'&&!a.done){F.vx=F.vy=0;F.stuff=.3;F.o.sprawl=false;this.sprawlW=null;this.say(`${F.name} shoots from too far out.`)}}}
    else if(a.t>=a.dr)F.act=null;
  }
  onShoot(F){const O=F.o;O.sprawl=false;
    if(O.human)this.sprawlW={side:O.side,until:this.T+this.diff.win};
    else{const D=this.aiD(O);O.sprawl=Math.random()<D.sprawl*(.45+O.f.r.wre/140)*(O.act?.55:1)}}
  pressB(F){
    if(this.sprawlW&&this.sprawlW.side===F.side&&this.T<=this.sprawlW.until){F.sprawl=true;this.sprawlW=null;this.flash('Sprawl!')}
    else if(this.pos==='clinch'&&this.canAct(F))this.breakAttempt(F);
  }
  dodge(F,side){if(this.pos!=='stand'||!this.canAct(F)||F.sta<6)return;F.dodge=.26;F.inv=.17;F.sta-=6;const u=this.u(F);
    if(side){this.push(F,-u[1]*side,u[0]*side,74)}else this.push(F,-u[0],-u[1],78);this.emit('whoosh',{F})}

  /* ---------------- striking ---------------- */
  strike(A,m,k){const D=A.o;
    if(this.pos==='stand'){
      const gap=this.gap(A);
      if(k==='soccer'){if(!(D.down>0)||gap>m.rng)return this.whiff(A)}
      else{if(D.down>0)return this.whiff(A);
        const reach=m.rng*(1+(A.f.r.str-60)/700);if(gap>reach)return this.whiff(A);
        if(D.inv>0){this.say(`${D.name} slips it.`);this.emit('whoosh',{F:D});return}}
    }
    let dmg=m.dmg*(.55+A.f.r.pow/110)*(.62+.38*A.sta/100)*(this.pos==='stand'?1.02:1);
    if(!A.human&&D.human)dmg*=this.diff.dmg;
    const shooting=this.pos==='stand'&&D.act&&D.act.k==='shoot'&&D.act.ph!=='r'&&!D.act.done;
    if(shooting&&m.pow){ // timed a power shot or knee into a level change
      D.act=null;D.vx=D.vy=0;D.stuff=.7;this.sprawlW=null;A.sprawl=false;dmg*=1.35;
      this.say(k==='knee'?`Knee right down the middle as ${D.name} shoots!`:`${A.name} meets the shot with a ${m.nm}!`,true);
      if(A.human)this.flash('Counter!');return this.applyDmg(A,D,m,k,dmg,false,true)}
    const counter=!!(D.act&&D.act.ph==='w'&&D.act.m.dmg)||D.open>0;
    if(counter)dmg*=D.open>0&&!(D.act&&D.act.ph==='w')?1.18:1.3;
    // parry: guard raised just before the strike lands
    if(this.pos==='stand'&&D.block&&!D.act&&D.down<=0&&k!=='soccer'&&m.tgt!=='legs'&&this.T-D.blockT0<.22){
      D.st.blocked++;this.idle=0;A.open=.6;this.momentum(D,9);A.sta=Math.max(0,A.sta-2);this.pts(D,1);
      this.emit('block',{x:D.x,y:-25,F:D});this.say(`${D.name} parries it and ${A.name} is open!`);if(D.human)this.flash('Parry! Counter now');return}
    if(this.pos==='ground'&&this.g.top===A)dmg*=GMULT[this.g.pos];
    if(A.fire>0)dmg*=1.18;
    if(A.chainT<1.05&&A.chain>0)dmg*=1+Math.min(.3,A.chain*.07);
    const pinned=this.pos==='stand'&&this.pinned(A,D);if(pinned)dmg*=1.1;
    const canBlock=D.block&&!D.act&&D.down<=0&&k!=='soccer'&&!(D.open>0);
    if(canBlock){D.st.blocked++;this.idle=0;
      if(m.tgt==='legs'){A.legs=Math.max(0,A.legs-4);D.legs=Math.max(0,D.legs-1);this.emit('block',{x:D.x,y:-8,F:D});this.say(`${D.name} checks the leg kick.`);this.pts(D,1);return}
      dmg*=this.pos==='ground'?.32:m.tgt==='body'?.55:.2;D.sta=Math.max(0,D.sta-3);this.emit('block',{x:D.x,y:m.tgt==='body'?-17:-25,F:D});
      return this.applyDmg(A,D,m,k,dmg,true,false)}
    this.applyDmg(A,D,m,k,dmg,false,counter)
  }
  whiff(A){this.emit('whoosh',{F:A});const a=A.act;
    if(a&&(a.m.risk||a.k==='over'||a.k==='hkick')){A.open=a.m.risk?.55:.35;A.sta=Math.max(0,A.sta-2);if(a.m.risk&&Math.random()<.5)this.say(`${A.name} misses the ${a.m.nm} and is wide open!`);if(A.human&&a.m.risk)this.flash("Missed! You're open")}}
  dashIn(F){if(this.pos!=='stand'||!this.canAct(F)||F.sta<5||F.o.down>0)return;F.dash=.2;F.sta-=5;const u=this.u(F);this.push(F,u[0],u[1],92);this.emit('whoosh',{F})}
  applyDmg(A,D,m,k,dmg,blocked,counter){
    if(m.tgt==='head'){dmg*=1.27-D.f.r.chn/110;D.head-=dmg;D.headMax=Math.max(30,D.headMax-dmg*.22)}
    else if(m.tgt==='body'){D.body=Math.max(0,D.body-dmg*(blocked?.5:.85));D.sta=Math.max(0,D.sta-dmg*.45);D.head-=dmg*.25}
    else D.legs=Math.max(0,D.legs-dmg);
    if(this.pos==='ground'&&this.g){const g=this.g;if(blocked){if(g.top===A)g.mom=Math.min(.16,(g.mom||0)+.008)}else if(g.top===A&&dmg>=2){g.lull=0;g.mom=Math.max(0,(g.mom||0)-.006*dmg)}}
    if(blocked){if(m.tgt==='body'&&this.pos==='stand'&&dmg>2)this.emit('hit',{x:D.x,y:-17,big:false,dmg,F:D,A,body:1});return}
    A.chain=A.chainT<1.05?A.chain+1:1;A.chainT=0;D.chain=0;
    const trade=this.pos==='stand'&&this.T-D.landT<.16;A.landT=this.T;
    this.momentum(A,m.pts*2.6+(counter?6:0)+(A.chain>=3?4:0)+(trade?3:0));D.mo=Math.max(0,D.mo-dmg*.5);
    if(trade&&m.pow){this.say(`They trade! Both men land!`,true);this.emit('crowd')}
    if(A.chain>=3)this.emit('combo',{n:A.chain,F:D,A});
    A.st.landed++;A.st[m.tgt]++;D.hitT=0;this.idle=0;this.pts(A,m.pts*(counter?1.4:1));
    const hy=m.tgt==='head'?-26:m.tgt==='body'?-17:-6;
    this.emit('hit',{y:hy,big:!!m.pow,dmg,F:D,A,blood:m.pow&&dmg>6&&Math.random()<.35,tgt:m.tgt,k});
    this.shake=Math.max(this.shake,m.pow?2.6:1);
    if(this.pos==='ground'){if(this.g.top===A)this.g.unans++;else this.g.unans=0}else{A.unans++;D.unans=0}
    if(D.act&&D.act.ph==='w'&&dmg>=3&&D.act.k!=='shoot')D.act=null;
    const pinned=this.pos==='stand'&&this.pinned(A,D);
    if(this.pos==='stand'){const u=this.u(A),kb=(m.push||(3+dmg*1.5))*(pinned?.25:1);D.hurt=Math.min(.34,.1+dmg*.02);D.x+=u[0]*(m.pow?1.5:.8);D.y+=u[1]*(m.pow?1.5:.8);D.kbx=u[0]*kb;D.kby=u[1]*kb;
      if(m.push&&D.act&&D.act.ph!=='r'&&D.act.k!=='shoot'){D.act=null;this.say(`${A.name} stops him with a teep.`)}
      if(pinned&&m.pow&&Math.random()<.25)this.say(`${A.name} has him pinned against the ${this.ring?'ropes':'fence'}!`)}
    if(counter&&A.human)this.flash('Counter!');
    if(m.tgt==='head'&&D.head<=0){const meth=this.pos==='ground'?(this.g.pounce?'TKO (punches)':'TKO (ground and pound)'):k==='soccer'?'TKO (soccer kicks)':`KO (${m.nm})`;return this.finish(A,meth)}
    if(m.tgt==='legs'&&D.legs<=0&&this.pos==='stand'){D.legKD++;if(D.legKD>=2)return this.finish(A,'TKO (leg kicks)');D.legs=20;return this.knockdown(A,D,m,true)}
    if(this.pos==='ground'){const g=this.g;
      if(g.top===A&&((D.head<17&&g.unans>=5)||(g.pounce&&g.t<5&&D.head<18&&g.unans>=4)))return this.finish(A,g.pounce?'TKO (punches)':'TKO (ground and pound)');
      return}
    if(m.pow){const ch=clamp((dmg-5.5)/55+(44-D.head)/125-(D.f.r.chn-60)/230+(counter?.05:0),0,.42);if(Math.random()<ch)return this.knockdown(A,D,m)}
    if(k==='soccer'&&D.head<32)return this.finish(A,'TKO (soccer kicks)');
    if(D.head<34&&m.pow&&D.stag<=0){D.stag=1.1;{const u=this.u(A);D.kbx=u[0]*40;D.kby=u[1]*40}this.say(`${D.name} is rocked!`,true);this.momentum(A,10);this.emit('rocked',{F:D});if(A.human)this.flash("He's rocked! Pour it on");else if(D.human)this.flash("You're rocked! Cover up")}
    if(k==='spin'&&dmg>9&&Math.random()<.18)return this.knockdown(A,D,m);
    if(D.stag>0&&D.head<10&&A.unans>=4)return this.finish(A,'TKO (punches)');
    if(m.tgt==='body'&&this.pos==='stand'){
      if(D.body<=0&&m.pow){if(D.kdR>=1||D.sta<15)return this.finish(A,`TKO (${m.nm})`);D.body=12;return this.knockdown(A,D,m)}
      if(D.body<35&&m.pow&&Math.random()<.06+(35-D.body)/180){D.stag=Math.max(D.stag,.9);if(Math.random()<.45)return this.knockdown(A,D,m);this.say(`${D.name} folds from the ${m.nm}!`,true);this.emit('rocked',{F:D})}}
    if(m.pow&&Math.random()<.35)this.say(pick(LHIT).replace('%A',A.name).replace('%D',D.name));
  }
  momentum(F,v){if(F.fire>0||this.phase!=='fight')return;F.mo=Math.min(100,F.mo+v);
    if(F.mo>=100){F.mo=0;F.fire=7;this.say(`${F.name} is on fire! The crowd is on its feet!`,true);this.emit('fire',{F});this.emit('crowd');if(F.human)this.flash("You're on fire!")}}
  knockdown(A,D,m,leg){
    if(this.pos==='clinch'){const u=this.u(A);this.pos='stand';this.place(D,A.x+u[0]*12,A.y+u[1]*12,3)}
    D.down=1.8;D.act=null;D.vx=D.vy=0;D.block=false;D.kdR++;D.stag=0;
    if(!leg){A.st.kd++;this.rkd[this.round-1][A.side]++;this.pts(A,12)}else this.pts(A,6);this.momentum(A,28);D.mo=0;
    this.slow=.7;this.shake=5;this.emit('kd',{F:D});
    this.say(leg?`${D.name}'s leg gives out and he goes down!`:`${A.name} drops ${D.name} with a ${m.nm}!`,true);this.banner('KNOCKDOWN');
    if(D.kdR>=3)this.finish(A,'TKO (three knockdowns)');
  }

  /* ---------------- grappling ---------------- */
  takedown(A,D){
    const counter=!!(D.act&&D.act.ph!=='r'&&D.act.m.dmg),spr=D.sprawl;
    let p=.33+(A.f.r.wre-D.f.r.wre)/75+(counter?.25:0)+(D.sta<30?.1:0)-(A.sta<25?.15:0)-(spr?.42:0)+(D.stag>0?.15:0)-(this.ring?.03:0)-(D.block&&!spr?.08:0)+(A.tdTry>=3?-.05:0);
    p=clamp(p,.05,.9);D.sprawl=false;this.sprawlW=null;A.shootCD=4+Math.random()*3.5;A.tdTry=(A.tdTry||0)+1;
    if(Math.random()<p){this.toGround(A,D,A.f.r.wre>D.f.r.wre+8&&Math.random()<.4?'half':'guard');A.st.td++;this.pts(A,5);this.momentum(A,12);
      this.emit('slam',{F:D});this.shake=3;this.say(counter?`${A.name} times the shot perfectly. Takedown!`:`Takedown ${A.name}!`,true)}
    else{const u=this.u(A);A.act=null;A.vx=A.vy=0;A.stuff=spr?.85:.5;A.x-=u[0]*(spr?2:4);A.y-=u[1]*(spr?2:4);this.pts(D,spr?2:1);this.emit('block',{x:D.x,y:-12,F:D});A.sta=Math.max(0,A.sta-(spr?6:2));
      if(spr){A.open=.7;this.fhl={side:D.side,until:this.T+.9};this.say(`${D.name} sprawls and stuffs the shot. He has the front headlock!`);if(D.human)this.flash('Stuffed! Shoot: go behind · Hold Power: guillotine')}
      else this.say(`${D.name} defends the takedown.`)}
  }
  clinch(F){const O=F.o,p=.62+(F.f.r.wre-O.f.r.wre)/120;F.sta-=4;
    if(Math.random()<p){this.pos='clinch';this.idle=0;for(const X of this.F){X.act=null;X.vx=X.vy=0;X.block=false;X.queue=null}
      const mid=this.clinchSet(F,O);
      this.say(this.fenceDist(mid)<14?`${F.name} pins him against the ${this.ring?'ropes':'fence'}.`:`${F.name} ties him up in the clinch.`)}
    else{F.stuff=.3;this.say(`${O.name} shrugs off the clinch.`)}}
  breakAttempt(F){const p=.5+(F.f.r.wre-F.o.f.r.wre)/90;F.sta-=3;
    if(Math.random()<p)this.breakClinch(`${F.name} breaks away.`);else{F.stuff=.35;this.say(`${F.o.name} keeps him tied up.`)}}
  clinchSet(F,O){const u=this.u(F),mid={x:(F.x+O.x)/2,y:(F.y+O.y)/2};this.clampIn(mid,5);F.x=mid.x-u[0]*4.5;F.y=mid.y-u[1]*4.5;O.x=mid.x+u[0]*4.5;O.y=mid.y+u[1]*4.5;return mid}
  breakClinch(msg){this.pos='stand';this.idle=0;const [a,b]=this.F,u=this.u(a),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    this.place(a,mx-u[0]*8,my-u[1]*8);this.place(b,mx+u[0]*8,my+u[1]*8);for(const X of this.F){X.act=null;X.inv=.25}this.say(msg)}
  catchKick(F,O){const a=O.act,head=a.k==='hkick';F.sta-=5;F.block=false;
    let p=.5+(F.f.r.wre-O.f.r.wre)/90+(F.f.r.str-O.f.r.str)/200-(head?.18:0)+(a.ph==='a'?.08:0);p=clamp(p,.15,.85);
    if(Math.random()<p){O.act=null;O.vx=O.vy=0;F.st.tda++;
      if(Math.random()<.62+(F.f.r.wre-60)/150){this.toGround(F,O,Math.random()<.35?'half':'guard');F.st.td++;this.pts(F,5);this.emit('slam',{F:O});this.shake=3;this.say(`${F.name} catches the kick and dumps ${O.name}!`,true)}
      else{O.open=.6;O.stuff=.5;this.pts(F,2);this.say(`${F.name} catches the kick! ${O.name} is hopping on one leg.`);if(F.human)this.flash('Caught it! Hit him')}}
    else{F.stuff=.35;this.say(`${O.name} pulls the kick back in time.`)}}
  frontHeadlock(F,kind){const O=F.o;this.fhl=null;O.act=null;O.vx=O.vy=0;
    this.pos='clinch';this.idle=0;for(const X of this.F){X.act=null;X.vx=X.vy=0;X.block=false;X.queue=null}
    this.clinchSet(F,O);
    this.contest(kind,F,O)}
  refGround(dt){const g=this.g;if(!g)return;g.lull=(g.lull||0)+dt;
    const hurt=g.bot.head<38,cap=(g.pos==='guard'?9:g.pos==='half'?11:14)+(hurt?5:0);
    if(g.lull>2.6&&!g.warn){g.warn=1;this.say(`Referee: "Work! Improve your position!"`)}
    if(g.lull>4.2)return this.standUp('Nothing happening. The referee stands them up.','ref');
    if(g.t>cap)return this.standUp('Stalemate on the mat. The referee brings them back up.','ref')}
  toGround(top,bot,pos){const ub=this.u(bot);this.pos='ground';this.idle=0;this.g={top,bot,pos,unans:0,leave:0,pounce:false,lull:0,mom:0,t:0,all:0,fx:[ub[0],ub[1]]};
    for(const X of this.F){X.act=null;X.vx=X.vy=0;X.kbx=X.kby=0;X.block=false;X.down=0;X.queue=null;X.stag=0}
    this.clampIn(bot,15);top.x=bot.x;top.y=bot.y}
  pounce(F){const O=F.o;O.head=Math.min(O.headMax,O.head+8);this.toGround(F,O,Math.random()<.45?'guard':Math.random()<.5?'side':'mount');this.g.pounce=true;this.say(`${F.name} pounces on him!`,true)}
  standUp(msg,why){this.lastStand=why||'other';for(const X of this.F)X.shootCD=Math.max(X.shootCD,2.5+Math.random()*2.5);
    const [a,b]=this.F,g=this.g,v=g&&g.fx?(g.bot===a?g.fx:[-g.fx[0],-g.fx[1]]):this.axis,mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};this.clampIn(mid,10);
    this.pos='stand';this.g=null;this.ct=null;this.idle=0;this.fhl=null;this.place(a,mid.x-v[0]*9,mid.y-v[1]*9);this.place(b,mid.x+v[0]*9,mid.y+v[1]*9);
    for(const X of this.F){X.act=null;X.inv=.3;X.down=0;X.vx=X.vy=0}this.say(msg)}

  contest(kind,A,D){
    if(!A.human&&this.T-this.ctEnd<LV.BREATH*(D.human?1:.5))return;
    const s=kind==='getup'||kind==='trip'||kind==='lock'||kind==='snap'?'wre':'grp';
    const s2=kind==='snap'?'grp':kind==='guil'?'grp':s;
    let need={adv:.55,sweep:.58,escape:.54,getup:.57,trip:.54,lock:.54,sub:.66,snap:.42,guil:.71}[kind],sub=null,g=this.g;
    if(kind==='getup'&&g&&g.pos==='side')need+=.07;
    if(kind==='sub'){const pos=g.pos;sub=pick(LSUBS[pos]||LSUBS.guard);
      need=.69-({back:.06,mount:.04,side:.02}[pos]||0)-(D.head<40?.03:0)-(D.sta<30?.03:0)+(g.bot===A?.04:0);A.st.sub++;this.pts(A,2)}
    if(kind==='guil'){sub='guillotine';need-=(D.sta<35?.04:0);A.st.sub++;this.pts(A,2)}
    if(g&&g.bot===A&&(kind==='sweep'||kind==='escape'||kind==='getup'||kind==='sub')){
      need-=g.mom||0;                                   // scramble momentum from failed tries, blocked shots and the top man's fatigue
      need-=Math.max(0,(40-g.top.sta)/400);             // a tired top man can't hold him down
      const ta=D.act;if(ta&&ta.ph==='w'&&ta.m.pow){need-=.07;if(A.human)this.flash('Timed it!')}}  // explode while he loads up an elbow
    if(g&&g.top===A&&kind==='adv')need+=Math.min(.05,(g.mom||0)*.4);
    g&&(g.lull=0);
    if(kind==='trip'||kind==='lock')A.st.tda++;
    for(const X of this.F){X.act=null;X.block=false;X.queue=null}
    A.sta=Math.max(0,A.sta-4);this.idle=0;
    const nxt=this.g&&kind==='adv'?GPOS[GPOS.indexOf(this.g.pos)+1]:null;
    const label={adv:`Passing to ${GPN[nxt]||''}`,sweep:'Sweep attempt',escape:'Escape attempt',getup:this.g&&this.g.pos==='side'?'Wall-walking up':'Getting back up',sub:(sub||'').toUpperCase(),snap:'Going behind',guil:'GUILLOTINE',trip:'Trip takedown',lock:'Body-lock takedown'}[kind];
    this.ct={kind,A,D,t:0,dur:{adv:1.15,sweep:1.15,escape:1.1,getup:1.2,sub:2.3,trip:.95,lock:1.1,snap:.9,guil:2}[kind],a:0,d:0,fa:0,fd:0,need:clamp(need,.3,.8),s:s2,sub,label};
    this.emit('contest',{sub:!!sub});
    if(sub)this.say(`${A.name} goes for ${/^[aeiou]/.test(sub)?'an':'a'} ${sub}!`,true);
  }
  tap(F){const c=this.ct;if(!c)return;if(F===c.A)c.a++;else if(F===c.D)c.d++;F.sta=Math.max(0,F.sta-.3)}
  share(){const c=this.ct;if(!c)return .5;const A=c.A,D=c.D;
    const sa=c.a*Math.pow(A.f.r[c.s]/70,1.6)*(.6+.4*A.sta/100),sd=c.d*Math.pow(D.f.r[c.s]/70,1.6)*(.6+.4*D.sta/100);return (sa+.01)/(sa+sd+.02)}
  updContest(dt){const c=this.ct;c.t+=dt;
    for(const [F,k] of [[c.A,'a'],[c.D,'d']])if(!F.human){
      const rate=6.4*(F.o.human?this.diff.rate:1)*(.55+.45*F.sta/100);
      const fk='f'+k;c[fk]+=rate*dt*(.75+Math.random()*.5);while(c[fk]>=1){c[fk]--;c[k]++;F.sta=Math.max(0,F.sta-.3)}}
    if(c.t>=c.dur)this.resolveContest()}
  resolveContest(){const c=this.ct,A=c.A,D=c.D,sh=this.share(),win=sh>c.need,g=this.g;this.ct=null;this.idle=0;this.ctEnd=this.T;if(this.g)this.g.lull=Math.min(this.g.lull||0,0);
    this.emit('contestEnd',{win,human:A.human?win:D.human?!win:null});
    switch(c.kind){
      case'adv':if(win){g.pos=GPOS[GPOS.indexOf(g.pos)+1];g.t=0;this.pts(A,3);this.say(`${A.name} moves to ${GPN[g.pos]}.`)}
        else{A.sta-=4;g.mom=Math.min(.16,(g.mom||0)+.03);
          if(sh<c.need-.18&&Math.random()<.5){if(g.pos==='guard'||g.pos==='half'){this.pts(D,2);return this.standUp(`${D.name} uses the space and scrambles up!`,'getup')}
            g.pos=g.pos==='side'?'half':'guard';this.say(`${D.name} uses the space to recover ${GPN[g.pos]}.`)}
          else this.say(`${D.name} keeps him in ${GPN[g.pos]}.`)}break;
      case'sweep':A.scrCD=.8;if(win){g.top=A;g.bot=D;g.pos='half';g.t=0;g.unans=0;g.pounce=false;g.mom=0;this.pts(A,4);this.say(`Sweep! ${A.name} reverses the position.`,true)}else{g.mom=Math.min(.16,(g.mom||0)+.025);this.say(`${D.name} stays on top.`)}break;
      case'escape':A.scrCD=.8;if(win){g.pos={half:'guard',side:'half',mount:'half',back:'guard'}[g.pos]||'guard';g.unans=0;g.t=Math.min(g.t,4);g.mom=Math.min(.16,(g.mom||0)+.02);this.pts(A,2);this.say(`${A.name} recovers ${GPN[g.pos]}.`)}else{g.mom=Math.min(.16,(g.mom||0)+.025);this.say(`${D.name} holds him down.`)}break;
      case'getup':A.scrCD=1;if(win){this.pts(A,2);this.standUp(`${A.name} scrambles back to his feet.`,'getup')}else{g.mom=Math.min(.16,(g.mom||0)+.03);this.say(`${D.name} drags him back down.`)}break;
      case'snap':if(win){this.toGround(A,D,Math.random()<.4?'back':'side');A.st.td++;this.pts(A,5);this.emit('slam',{F:D});this.shake=2;this.say(`${A.name} spins behind and takes ${GPN[this.g.pos]}!`,true)}
        else this.breakClinch(`${D.name} pops his head out.`);break;
      case'guil':if(win)return this.finish(A,'Submission (guillotine)');
        this.toGround(D,A,'guard');this.say(`${D.name} pops his head free and lands on top!`,true);break;
      case'sub':if(win)return this.finish(A,`Submission (${c.sub})`);
        A.sta=Math.max(0,A.sta-10);this.say(`${D.name} escapes the ${c.sub}.`,true);
        if(g.bot===A&&g.pos==='guard'&&Math.random()<.45){g.pos='half';this.say(`${D.name} passes to half guard.`)}
        else if(g.top===A){const r=Math.random();g.mom=Math.min(.16,(g.mom||0)+.04);  // over-committing on top opens scrambles
          if(r<.3&&(g.pos==='mount'||g.pos==='side')){g.top=D;g.bot=A;g.pos='guard';g.t=0;g.unans=0;this.pts(D,3);this.say(`${D.name} rolls through and ends up on top!`,true)}
          else if(r<.55){this.pts(D,2);return this.standUp(`${D.name} escapes out the back and stands up!`,'getup')}}break;
      case'trip':case'lock':if(win){this.toGround(A,D,c.kind==='lock'&&A.f.r.wre>D.f.r.wre?'half':'guard');A.st.td++;this.pts(A,5);this.emit('slam',{F:D});this.shake=3;this.say(`${A.name} ${c.kind==='trip'?'trips him to the mat':'locks the body and takes him down'}!`,true)}
        else{this.say(`${D.name} defends the takedown.`);if(Math.random()<.35)this.breakClinch(`They break apart.`)}break;
    }
  }

  /* ---------------- control ---------------- */
  humanCtl(F,dt){
    const wasB=F.block;
    if(this.pos==='stand'||this.pos==='clinch')F.block=this.inp.B&&!F.act&&F.down<=0&&!this.ct;
    else F.block=this.g&&this.g.bot===F&&this.inp.B&&!F.act&&!this.ct;
    if(F.block&&!wasB)F.blockT0=this.T;
    while(this.taps.length){const k=this.taps.shift();
      if(this.ct){if(k!=='L'&&k!=='R'&&k!=='dodge')this.tap(F);continue}
      if(this.T-this.ctEnd<LV.TAPGRACE)continue;
      if(k==='B')this.pressB(F);else if(k==='dodge')this.dodge(F);else if(k==='slipL')this.dodge(F,-1);else if(k==='slipR')this.dodge(F,1);else if(k==='dash')this.dashIn(F);else if(k!=='L'&&k!=='R')this.doAct(F,this.dirKey(F,k))}
    if(this.pos==='ground'&&this.g.top===F&&!this.ct){
      this.g.leave=Math.hypot(this.inp.wx,this.inp.wy)>.5?this.g.leave+dt:0;
      if(this.g.leave>.4)this.standUp(`${F.name} stands up and lets him back up.`,'topstand')}
  }
  // stick direction turns the strike buttons into different moves while standing
  dirKey(F,k){if(this.pos!=='stand'||F.o.down>0||(this.fhl&&this.fhl.side===F.side))return k;const d=this.rel(F),fw=d>.5,bk=d<-.5;
    if(k==='P'&&bk)return'Pb';if(k==='Pc'&&fw)return'Pfc';if(k==='K'&&fw)return'Kf';if(k==='K'&&bk)return'Kb';if(k==='Kc'&&fw)return'Kfc';return k}
  aiCtl(F,dt){const A=F.ai,O=F.o,D=this.aiD(F),st=LSTYLE[F.f.style]||LSTYLE['All-rounder'];
    A.t-=dt;const wasB=F.block;if(A.blockT>0){A.blockT-=dt;F.block=!F.act&&F.down<=0&&!this.ct&&(this.pos!=='ground'||this.g.bot===F)}else F.block=false;
    if(F.block&&!wasB)F.blockT0=this.T-(Math.random()<.78?.3:0);
    if(this.ct)return;
    if(this.pos==='stand'&&A.combo>0&&F.act&&F.act.ph==='r'&&LCHAIN.has(F.act.k)&&F.act.t>.04){A.combo--;const gap=this.gap(F),c=pick(gap<13?['cross','hook','upper','body','hook']:['jab','cross','lkick','bkick','cross']);if(gap<=LMV[c].rng+1)this.doAct(F,c);else A.combo=0}
    if(this.pos==='stand'&&this.fhl&&this.fhl.side===F.side&&this.canAct(F)&&Math.random()<dt*4){const r=Math.random(),gr=F.f.r.grp/70;
      this.doAct(F,r<.3*gr?'Pc':r<.75?'S':'K');return}
    if(this.pos==='stand'&&O.act&&O.act.ph==='w'&&(O.act.m.dmg||O.act.k==='shoot')&&A.seen!==O.act){A.seen=O.act;A.react=D.react*(.8+Math.random()*.5)}
    if(A.react>0){A.react-=dt;if(A.react<=0&&O.act&&O.act===A.seen&&O.act.ph!=='r')this.aiReact(F,O,D)}
    if(!O.act)A.seen=null;
    if(A.t>0)return;A.t=D.think*(.7+Math.random()*.6)*(this.pos==='ground'?1.5:1);
    if(this.pos==='stand')this.aiStand(F,O,D,st);else if(this.pos==='clinch')this.aiClinch(F,O,D,st);else this.aiGround(F,O,D,st);
  }
  aiReact(F,O,D){const gap=this.gap(F);if(gap>(O.act.m.rng||12)+4)return;
    if(O.act.k==='shoot'){if(this.canAct(F)&&gap<22&&Math.random()<D.block*.35*(.6+F.f.r.str/200))this.doAct(F,Math.random()<.5?'P':'Pc');return}
    if(O.act.m.kick&&this.canAct(F)&&Math.random()<D.block*.22*(F.f.r.wre/70)){this.doAct(F,'S');return}
    const r=Math.random(),pb=D.block*(.6+F.f.r.str/250);
    if(r<pb){F.ai.blockT=.42;F.block=true}
    else if(r<pb+.12&&this.canAct(F))this.dodge(F);
    else if(r<pb+.22&&this.canAct(F)&&gap<18)this.doAct(F,'J')}
  aiStand(F,O,D,st){const gap=this.gap(F),A=F.ai;
    A.lat=this.aiLat(F,O,st,A);
    if(O.down>0){A.lat=0;if(Math.random()<st.ag*D.ag+.2){A.dir=1;if(gap<16)this.doAct(F,this.ring&&Math.random()<.2?'K':(Math.random()<.5?'S':'P'))}else A.dir=0;return}
    if(F.sta<22){A.dir=-1;A.blockT=.5;return}
    if(gap>22&&gap<34&&Math.random()<.07*st.ag&&this.canAct(F)){this.dashIn(F);return}
    const want=st.want+(O.stag>0?-4:0)+(F.legs<40?2:0);
    A.dir=gap>want+2?1:gap<want-3?(F.f.style==='Brawler'||F.f.style==='Wrestler'?0:-1):(Math.random()<.35?(Math.random()<.5?1:-1):0);
    const ag=st.ag*D.ag*(O.stag>0?1.6:1)*(F.sta<40?.6:1)*(O.block?.85:1)*(F.fire>0?1.3:1);
    if(Math.random()>ag||F.act)return;
    const opts=[];for(const [k,w] of Object.entries(st.w)){if(!w)continue;
      if(k==='shoot'){if(gap>=12&&gap<=27&&F.shootCD<=0)opts.push([k,w*(O.block?1.6:1)*(F.tdTry>=4?.6:1)])}
      else if(k==='clinch'){if(gap<12)opts.push([k,w*3])}
      else if(gap<=LMV[k].rng+1)opts.push([k,w*(LMV[k].tgt==='body'&&O.block?2.6:1)*(k==='teep'&&(()=>{const u=this.u(O);return O.vx*u[0]+O.vy*u[1]>4})()?2.2:1)*(k==='superman'&&gap<14?.2:1)])}
    if(!opts.length){A.dir=1;return}
    let tot=opts.reduce((s,o)=>s+o[1],0),x=Math.random()*tot,ch=opts[0][0];for(const [k,w] of opts){x-=w;if(x<0){ch=k;break}}
    const key={jab:'J',cross:'P',hook:'P',over:'Pc',lkick:'K',hkick:'Kc',shoot:'S',clinch:'S',upper:'U',body:'Pb',superman:'Pfc',bkick:'Kf',teep:'Kb',spin:'Kfc'}[ch];
    this.doAct(F,key);
    if(LCHAIN.has(ch)&&Math.random()<(st.cmb||.4)*(F.sta>40?1:.5))A.combo=1+(Math.random()<.45?1:0)+(Math.random()<.2?1:0);
    if(O.open>0&&this.canAct(F)&&Math.random()<.45)this.doAct(F,Math.random()<.5?'P':'K')}
  // lateral movement: circle off the fence, cut the cage off on a fighter who's stuck on it, otherwise circle by style
  aiLat(F,O,st,A){const u=this.u(F),px=-u[1],py=u[0],me=this.fenceDist(F),him=this.fenceDist(O);
    if(me<11&&F.sta>20){const cx=-F.x,cy=-F.y;return (px*cx+py*cy)>=0?1:-1}
    if(him<12&&(F.f.style==='Brawler'||F.f.style==='Wrestler'||st.ag>.6))return 0;
    A.latT-=.3;if(A.latT<=0){A.latT=1.2+Math.random()*2.5;const circ={Striker:.75,Kickboxer:.7,'All-rounder':.55,BJJ:.4,Wrestler:.3,Brawler:.25}[F.f.style]||.5;A.latDir=Math.random()<circ?(Math.random()<.5?-1:1):0}
    return A.latDir||0}
  aiClinch(F,O,D,st){const r=Math.random(),wr=F.f.style==='Wrestler'||F.f.style==='BJJ';
    if(F.sta<18){this.breakAttempt(F);return}
    if(r<.36)this.doAct(F,'P');else if(r<.64)this.doAct(F,'J');
    else if(r<(wr?.9:.72))this.doAct(F,Math.random()<.5?'K':'S');
    else if(r<(wr?.93:.86))this.breakAttempt(F)}
  aiGround(F,O,D,st){const g=this.g,top=g.top===F,gr=F.f.r.grp/70,bjj=F.f.style==='BJJ';
    if(Math.random()<.4)return;const r=Math.random();
    if(top){
      if(O.head<35&&r<.7)return this.doAct(F,Math.random()<.6?'P':'J');
      if(r<.32)return this.doAct(F,'J');if(r<.55)return this.doAct(F,'P');
      if(r<.55+.1*gr&&g.pos!=='back')return this.doAct(F,'S');
      if(r<.55+.1*gr+(bjj?.12:.05)*gr&&g.pos!=='guard')return this.doAct(F,'K');
      if((F.f.style==='Striker'||F.f.style==='Kickboxer'||F.f.style==='Brawler')&&g.pos==='guard'&&g.t>2&&r>.9)return this.standUp(`${F.name} stands up and waves him back up.`,'topstand');
    }else{
      const wr=F.f.r.wre/70,op=g.pos==='guard'||g.pos==='half',canUp=op||g.pos==='side';
      if(O.act&&O.act.ph==='w'&&O.act.m.pow&&r<.45*wr&&canUp)return this.doAct(F,op?'K':'K'); // explode while he loads up
      if(O.act&&O.act.ph==='w'&&r<.5){F.ai.blockT=.45;F.block=true;return}
      if(F.scrCD>0||r<.38){F.ai.blockT=.55;F.block=true;return}
      if(r<.46)return this.doAct(F,'J');
      const pick2=Math.random();
      if(bjj&&op&&pick2<.3)return this.doAct(F,'P');
      if(canUp&&pick2<.3+.35*wr)return this.doAct(F,'K');
      return this.doAct(F,'S');
    }}

  physics(dt){const [a,b]=this.F;
    if(this.pos==='stand'){
      for(const F of this.F){
        if(F.down>0||(F.act&&F.act.k==='shoot'&&F.act.ph==='a'&&!F.act.done)||(F.act&&F.act.m.lunge&&F.act.ph==='w')||F.dodge>0||F.dash>0){if(F.down>0){F.vx*=.8;F.vy*=.8}continue}
        const u=this.u(F);let mx,my;
        if(F.human){mx=this.inp.wx;my=this.inp.wy}
        else{const d=F.ai.dir||0,l=F.ai.lat||0;mx=u[0]*d-u[1]*l*.8;my=u[1]*d+u[0]*l*.8;const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}}
        let sp=F.mv*(.55+.45*F.legs/100)*(F.block?.5:1)*(F.stag>0?.6:1)*(F.act?.25:1)*(F.sta<15?.7:1)*(F.hurt>0?.3:1);
        const fw=mx*u[0]+my*u[1];if(fw<-.2)sp*=.85;
        F.vx+=(mx*sp-F.vx)*Math.min(1,dt*14);F.vy+=(my*sp-F.vy)*Math.min(1,dt*14)}
      for(const F of this.F){F.x+=(F.vx+F.kbx)*dt;F.y+=(F.vy+F.kby)*dt;const k=Math.exp(-dt*7);F.kbx*=k;F.kby*=k;if(Math.hypot(F.kbx,F.kby)<1)F.kbx=F.kby=0;this.clampIn(F,2)}
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-6,ux=dx/d,uy=dy/d;
      if(d<LV.MINGAP){const need=(LV.MINGAP-d)/2;a.x-=ux*need;a.y-=uy*need;b.x+=ux*need;b.y+=uy*need;this.clampIn(a,2);this.clampIn(b,2)}
      if(a.down<=0&&b.down<=0&&d>1)this.axis=[ux,uy];
    }else if(this.pos==='clinch'){const u=this.u(a),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;a.x=mx-u[0]*4.5;a.y=my-u[1]*4.5;b.x=mx+u[0]*4.5;b.y=my+u[1]*4.5;a.vx=a.vy=b.vx=b.vy=0}
    else{a.vx=a.vy=b.vx=b.vy=0}
    if(this.pos!=='stand')for(const F of this.F)F.kbx=F.kby=0;
  }

  /* ---------------- rounds and results ---------------- */
  endRound(){const r=this.round-1,p=this.rp[r],kd=this.rkd[r],sc=[];
    for(let j=0;j<3;j++){const diff=p[0]-p[1]+(Math.random()+Math.random()+Math.random()-1.5)*10,w=diff>=0?0:1,big=Math.abs(diff)>48||kd[w]-kd[1-w]>=2;
      const s=w===0?[10,big?8:9]:[big?8:9,10];this.cards[j][0]+=s[0];this.cards[j][1]+=s[1];sc.push(s)}
    this.rcards.push(sc);
    this.rstats.push(this.F.map(F=>({...F.st})));
    this.log[r].push({t:`Horn. Broadcast card: ${sc[1][0]}-${sc[1][1]} ${sc[1][0]>sc[1][1]?this.F[0].name:this.F[1].name}.`,rd:true});
    this.emit('bell');this.ct=null;this.sprawlW=null;this.fhl=null;
    if(this.round>=this.rounds.length)return this.decision();
    this.phase='break';this.pt=0;this.say(`End of round ${this.round}.`)}
  nextRound(){if(this.phase!=='break')return;
    for(const F of this.F){F.head=Math.min(F.headMax,F.head+18);F.sta=Math.min(100,F.sta+50);F.body=Math.min(100,F.body+10);F.legs=Math.min(100,F.legs+8);
      F.act=null;F.queue=null;F.down=0;F.stag=0;F.hurt=0;F.kdR=0;F.unans=0;F.block=false;F.vx=F.vy=0;F.kbx=F.kby=0;F.fire=0;F.chain=0;F.mo*=.5}
    this.round++;this.clock=this.rounds[this.round-1]*60;this.el=0;this.rp.push([0,0]);this.rkd.push([0,0]);this.log.push([]);
    this.pos='stand';this.g=null;this.ct=null;this.idle=0;this.fhl=null;this.lastStand='round';for(const F of this.F){F.tdTry=0;F.open=0}const [a,b]=this.F;a.x=-15;a.y=0;b.x=15;b.y=0;this.axis=[1,0];
    this.phase='intro';this.pt=0}
  decision(){const v=this.cards.map(c=>c[0]>c[1]?0:c[1]>c[0]?1:-1),a=v.filter(x=>x===0).length,b=v.filter(x=>x===1).length;let w,m;
    if(a===3||b===3){w=a===3?0:1;m='Unanimous decision'}else if((a===2&&b===1)||(b===2&&a===1)){w=a>b?0:1;m='Split decision'}
    else if(a===2||b===2){w=a===2?0:1;m='Majority decision'}else{w=-1;m='Draw'}
    this.phase='end';this.pt=0;
    if(w>=0){this.F[w].win=true;this.F[1-w].lost=true}
    this.banner(w<0?'DRAW':'DECISION');this.say(w<0?'The judges score it a draw.':`${this.F[w].name} wins by ${m.toLowerCase()}.`,true);this.emit('crowd');
    this.res=this.result(w,m,false)}
  finish(W,method){if(this.phase==='end')return;this.phase='end';this.pt=0;this.slow=1.1;this.ct=null;
    const L=W.o;W.win=true;L.lost=true;if(/KO/.test(method))L.down=999;
    this.banner(/^Sub/.test(method)?'TAP OUT':/^KO/.test(method)?'KNOCKOUT':'TKO');
    this.say(`${W.name} wins by ${method}!`,true);this.emit('kd',{F:L});this.emit('crowd');
    this.res=this.result(W.side,method,true)}
  result(w,method,fin){const rd=this.round,el=Math.min(this.el,this.rounds[rd-1]*60);
    return{w,method,rd,time:fin?`${Math.floor(el/60)}:${String(Math.floor(el%60)).padStart(2,'0')}`:`${this.rounds[rd-1]}:00`,
      pbp:this.log.map((lines,i)=>({rd:i+1,lines:lines.slice(-24)})),cards:fin?null:this.cards.map(c=>c.slice()),
      sig:this.F.map(F=>F.st.landed),td:this.F.map(F=>F.st.td),kd:this.F.map(F=>F.st.kd),fin,live:true}}
  advice(side){const me=this.F[side],O=me.o,s=O.st,ms=me.st,tips=[];
    if(me.head<45)tips.push("You're hurt. Keep your hands up and use the jab to slow him down.");
    if(O.head<45)tips.push("He's fading! Put him under pressure and throw your power shots.");
    if(s.legs>=5)tips.push("He keeps kicking your lead leg. Hold BLOCK when he throws it to check the kick.");
    if(s.tda>=2)tips.push("He wants the takedown. Tap BLOCK the moment he changes levels to sprawl.");
    if(s.td>=2)tips.push("When you're on your back, keep scrambling. Every failed try tires him out, and exploding while he loads up an elbow works best.");
    if(s.tda>=3&&ms.kd===0)tips.push("Time a POWER shot or knee as he shoots. It stops the takedown and can drop him.");
    if(O.f.style==='Kickboxer')tips.push("He loves to kick. Tap SHOOT as the kick comes in to catch it.");
    if(me.sta<45)tips.push("You're gassing. Pick your shots and let your cardio come back.");
    if(O.st.blocked>=5)tips.push("He's covering up. Go to the legs, or change levels and shoot.");
    if(ms.landed<4)tips.push("You're too passive. The judges want to see you let your hands go.");
    if(O.f.style==='BJJ')tips.push("Careful on the ground. He's dangerous off his back. Tap fast when he goes for a submission.");
    if(O.f.style==='Kickboxer'||O.f.style==='Striker')tips.push("He's sharper on the feet. Mix in takedowns to take him out of his comfort zone.");
    tips.push("Jab, then POWER. The right hand behind the jab lands more often.");
    return tips.slice(0,2)}
}
