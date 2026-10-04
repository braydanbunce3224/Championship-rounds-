/*!
 * Championship Rounds: live fight engine (direct-control fights).
 * Copyright (c) 2026 SpecMagic Games. All rights reserved.
 *
 * LiveFight is the simulation (no DOM). LiveView (fightview.js) draws it and feeds input.
 * Loaded before game.js; uses helpers from game.js (clamp, pick, seeded, hash, pickr) at runtime.
 * Fighter sides: 0 = red corner (A), 1 = blue corner (B). Results match simFight()'s shape.
 */
const LV={W:128,H:80,FLOOR:70,L:10,R:118,TS:5,MINGAP:9};
const LMV={
  jab:{w:.09,a:.06,r:.14,sta:3.5,rng:18,dmg:3,tgt:'head',pts:1,nm:'jab'},
  cross:{w:.15,a:.06,r:.24,sta:6.5,rng:17,dmg:7,tgt:'head',pts:2,pow:1,nm:'right hand'},
  hook:{w:.16,a:.07,r:.26,sta:6.5,rng:14.5,dmg:8,tgt:'head',pts:2,pow:1,nm:'left hook'},
  over:{w:.30,a:.08,r:.36,sta:11,rng:17,dmg:12,tgt:'head',pts:3,pow:1,nm:'overhand right'},
  lkick:{w:.20,a:.08,r:.30,sta:7,rng:20,dmg:6.5,tgt:'legs',pts:2,nm:'leg kick',kick:1},
  hkick:{w:.34,a:.08,r:.44,sta:13,rng:21,dmg:17,tgt:'head',pts:4,pow:1,nm:'head kick',kick:1},
  shoot:{w:.13,a:.30,r:.42,sta:14,rng:30},
  soccer:{w:.20,a:.07,r:.30,sta:8,rng:17,dmg:11,tgt:'head',pts:3,pow:1,nm:'soccer kick',kick:1},
  cpunch:{w:.08,a:.05,r:.16,sta:2.5,dmg:3,tgt:'head',pts:1,nm:'short punches'},
  knee:{w:.16,a:.06,r:.26,sta:6,dmg:7,tgt:'body',pts:2,pow:1,nm:'knee'},
  gnp:{w:.10,a:.06,r:.22,sta:2.5,dmg:2.7,tgt:'head',pts:1,nm:'punches'},
  hgnp:{w:.22,a:.07,r:.34,sta:6,dmg:5.6,tgt:'head',pts:2,pow:1,nm:'elbows'},
  bstrike:{w:.10,a:.05,r:.22,sta:2.5,dmg:2.2,tgt:'head',pts:1,nm:'strikes from the bottom'}
};
const LSTYLE={
  Striker:{w:{jab:.34,cross:.24,hook:.14,over:.05,lkick:.1,hkick:.05,shoot:.04,clinch:.04},want:16,ag:.62},
  Kickboxer:{w:{jab:.24,cross:.14,hook:.1,over:.02,lkick:.26,hkick:.17,shoot:.03,clinch:.04},want:18,ag:.6},
  Brawler:{w:{jab:.1,cross:.26,hook:.24,over:.24,lkick:.05,hkick:.03,shoot:.04,clinch:.04},want:13,ag:.72},
  Wrestler:{w:{jab:.28,cross:.14,hook:.08,over:.03,lkick:.05,hkick:0,shoot:.3,clinch:.12},want:14,ag:.55},
  BJJ:{w:{jab:.3,cross:.14,hook:.08,over:.02,lkick:.08,hkick:.02,shoot:.26,clinch:.1},want:15,ag:.5},
  'All-rounder':{w:{jab:.3,cross:.2,hook:.12,over:.05,lkick:.1,hkick:.05,shoot:.12,clinch:.06},want:16,ag:.58}
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
const LHIT=['%A lands clean!','Big shot from %A!','%A finds a home for that one.','%D eats it and keeps coming.','%A snaps the head back!','That one stung %D.'];

function lookOf(f,side){const r=seeded(hash(f.id||f.last,'look'));
  const SK=['#f2c9a8','#e3b08a','#c98d62','#ad7048','#8c5636','#6c3f26','#4f2c1b'];
  const HC=['#16110d','#2b1d14','#4a2f1c','#7a5230','#b78a50','#2a2a2a','#5a4a3a'];
  return{skin:pickr(r,SK),hair:pickr(r,HC),hs:Math.floor(r()*5),beard:r()<.35,
    trunk:side?'#2f63c8':'#cf3a2e',trunk2:side?'#1d3f86':'#8c2219',glove:side?'#1c3570':'#701b15'}}
function mkLF(f,side,human){const r=f.r;
  return{f,side,human,name:f.last,x:LV.W/2+(side?15:-15),face:side?-1:1,vx:0,
    head:100,headMax:100,body:100,legs:100,sta:100,
    act:null,queue:null,qT:0,block:false,hurt:0,stag:0,down:0,inv:0,stuff:0,dodge:0,sprawl:false,
    kdR:0,legKD:0,unans:0,lastAtk:'',lastAtkT:9,combo:0,walkT:0,hitT:9,win:false,lost:false,
    spd:1.12-(r.str-50)/250,mv:24*(.85+r.car/400+(r.str-50)/500),
    ai:{t:.4+Math.random()*.3,dir:0,blockT:0,react:0,seen:null},
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
    this.ev=[];this.shake=0;this.slow=0;this.call='';this.callT=0;this.sprawlW=null;this.res=null;
    this.inp={dir:0,B:false};this.taps=[];
  }
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
    this.T+=dt;if(this.slow>0)this.slow-=dt;if(this.shake>0)this.shake=Math.max(0,this.shake-dt*18);if(this.callT>0)this.callT-=dt;
    if(this.phase==='intro'){this.pt+=dt;if(this.pt>1.4){this.phase='fight';this.emit('bell');this.say(this.round===1?'Here we go!':`Round ${this.round}. Fight!`)}return}
    if(this.phase!=='fight'){this.pt+=dt;for(const F of this.F){F.vx*=.85;if(F.act&&this.phase==='end')F.act=null}return}
    this.clock-=dt*LV.TS;this.el+=dt*LV.TS;
    for(const F of this.F)this.updF(F,dt);
    if(this.phase!=='fight')return;
    if(this.ct)this.updContest(dt);
    for(const F of this.F){if(F.human)this.humanCtl(F,dt);else this.aiCtl(F,dt)}
    if(this.phase!=='fight')return;
    this.physics(dt);
    if(this.pos!=='stand'&&!this.ct){this.idle+=dt;
      if(this.pos==='clinch'&&this.idle>4.5)this.breakClinch('The referee breaks the clinch.');
      else if(this.pos==='ground'&&(this.idle>7||(this.g&&this.g.t>(this.g.pos==='guard'?14:20))))this.standUp(this.idle>7?'No action. The referee stands them up.':'The referee stands them up.')}
    if(this.pos==='ground'&&this.g){this.g.t=(this.g.t||0)+dt;this.pts(this.g.top,dt*.3);this.g.top.st.ctrl+=dt*LV.TS}
    if(this.sprawlW&&this.T>this.sprawlW.until)this.sprawlW=null;
    if(this.clock<=0&&this.phase==='fight')this.endRound();
  }
  updF(F,dt){
    F.lastAtkT+=dt;F.hitT+=dt;
    if(F.inv>0)F.inv-=dt;if(F.hurt>0)F.hurt-=dt;if(F.stag>0)F.stag-=dt;if(F.stuff>0)F.stuff-=dt;if(F.dodge>0)F.dodge-=dt;
    if(F.down>0){F.down-=dt;if(F.down<=0&&this.pos==='stand'){F.head=Math.min(F.headMax,F.head+10);F.inv=.5;F.stag=Math.max(F.stag,.8);this.say(`${F.name} beats the count and gets up.`)}}
    const moving=Math.abs(F.vx)>2,busy=!!F.act;
    const reg=13*(.55+F.f.r.car/150)*(.45+.55*F.body/100)*(F.block?.55:1)*(moving?.75:1)*(busy?.3:1)*(this.pos==='ground'?.8:1)*(this.ct?.2:1);
    F.sta=clamp(F.sta+reg*dt,0,100);
    if(F.hitT>2.2&&F.down<=0)F.head=Math.min(F.headMax,F.head+dt*1.7);
    if(F.act)this.stepAct(F,dt);
    if(F.queue){F.qT-=dt;if(F.qT<=0)F.queue=null;else if(this.canAct(F)){const k=F.queue;F.queue=null;this.doAct(F,k)}}
    if(moving)F.walkT+=dt;
  }

  /* ---------------- actions ---------------- */
  doAct(F,k){
    if(!this.canAct(F)){if(!this.ct&&this.phase==='fight'){F.queue=k;F.qT=.24}return}
    const O=F.o,gap=Math.abs(F.x-O.x);
    if(this.pos==='stand'){
      if(O.down>0){
        if((k==='K'||k==='Kc')&&this.ring&&gap<18)return this.startAct(F,'soccer');
        if(gap<17&&k!=='K'&&k!=='Kc')return this.pounce(F);
        if(F.human&&(k==='K'||k==='Kc'))this.flash(this.ring?'Get closer':'No kicks to a downed fighter');
        return}
      if(k==='J')return this.startAct(F,'jab');
      if(k==='P'){const m=F.lastAtk==='jab'&&F.lastAtkT<.7?'cross':F.lastAtk==='cross'&&F.lastAtkT<.8?'hook':(F.combo++%2?'hook':'cross');return this.startAct(F,m)}
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
        if(k==='K'||k==='Kc'){if(g.pos!=='guard'&&g.pos!=='half'){if(F.human)this.flash('Escape to guard first');return}return this.contest('getup',F,O)}
      }
    }
  }
  startAct(F,k){const m=LMV[k];
    if(F.sta<m.sta*.6){if(F.human)this.flash('Too tired');return}
    const s=F.spd*(F.sta<25?1.25:1)*(F.stag>0?1.3:1)*(m.kick?1+(100-F.legs)/250:1);
    F.act={k,m,ph:'w',t:0,dw:m.w*s,da:k==='shoot'?m.a:m.a*s,dr:m.r*s,done:false};
    F.sta-=m.sta;F.block=false;if(m.dmg)F.st.thrown++;
    F.lastAtk=k;F.lastAtkT=0;
    if(k==='shoot'){F.st.tda++;this.onShoot(F)}
  }
  stepAct(F,dt){const a=F.act;a.t+=dt;
    if(a.ph==='w'){if(a.t>=a.dw){a.ph='a';a.t=0;if(a.k==='shoot')this.emit('whoosh',{x:F.x});else this.strike(F,a.m,a.k)}}
    else if(a.ph==='a'){
      if(a.k==='shoot'&&!a.done){F.vx=F.face*84*(F.sta<20?.75:1);if(Math.abs(F.x-F.o.x)<=LV.MINGAP+1.5){a.done=true;F.vx=0;this.takedown(F,F.o);return}}
      if(F.act&&a.t>=a.da){a.ph='r';a.t=0;if(a.k==='shoot'&&!a.done){F.vx=0;F.stuff=.3;F.o.sprawl=false;this.sprawlW=null;this.say(`${F.name} shoots from too far out.`)}}}
    else if(a.t>=a.dr)F.act=null;
  }
  onShoot(F){const O=F.o;O.sprawl=false;
    if(O.human)this.sprawlW={side:O.side,until:this.T+this.diff.win};
    else{const D=this.aiD(O);O.sprawl=Math.random()<D.sprawl*(.45+O.f.r.wre/140)*(O.act?.55:1)}}
  pressB(F){
    if(this.sprawlW&&this.sprawlW.side===F.side&&this.T<=this.sprawlW.until){F.sprawl=true;this.sprawlW=null;this.flash('Sprawl!')}
    else if(this.pos==='clinch'&&this.canAct(F))this.breakAttempt(F);
  }
  dodge(F){if(this.pos!=='stand'||!this.canAct(F)||F.sta<6)return;F.dodge=.26;F.inv=.17;F.sta-=6;F.vx=-F.face*78;this.emit('whoosh',{x:F.x})}

  /* ---------------- striking ---------------- */
  strike(A,m,k){const D=A.o;
    if(this.pos==='stand'){
      const gap=Math.abs(A.x-D.x);
      if(k==='soccer'){if(!(D.down>0)||gap>m.rng)return this.whiff(A)}
      else{if(D.down>0)return this.whiff(A);
        const reach=m.rng*(1+(A.f.r.str-60)/700);if(gap>reach)return this.whiff(A);
        if(D.inv>0){this.say(`${D.name} slips it.`);this.emit('whoosh',{x:D.x});return}}
    }
    let dmg=m.dmg*(.55+A.f.r.pow/110)*(.62+.38*A.sta/100);
    if(!A.human&&D.human)dmg*=this.diff.dmg;
    const counter=!!(D.act&&D.act.ph==='w'&&D.act.m.dmg);
    if(counter)dmg*=1.35;
    if(this.pos==='ground'&&this.g.top===A)dmg*=GMULT[this.g.pos];
    const canBlock=D.block&&!D.act&&D.down<=0&&k!=='soccer';
    if(canBlock){D.st.blocked++;this.idle=0;
      if(m.tgt==='legs'){A.legs=Math.max(0,A.legs-4);D.legs=Math.max(0,D.legs-1);this.emit('block',{x:D.x,y:-8,F:D});this.say(`${D.name} checks the leg kick.`);this.pts(D,1);return}
      dmg*=this.pos==='ground'?.32:.2;D.sta=Math.max(0,D.sta-3);this.emit('block',{x:D.x,y:m.tgt==='body'?-17:-25,F:D});
      return this.applyDmg(A,D,m,k,dmg,true,false)}
    this.applyDmg(A,D,m,k,dmg,false,counter)
  }
  whiff(A){this.emit('whoosh',{x:A.x+A.face*10})}
  applyDmg(A,D,m,k,dmg,blocked,counter){
    if(m.tgt==='head'){dmg*=1.27-D.f.r.chn/110;D.head-=dmg;D.headMax=Math.max(30,D.headMax-dmg*.22)}
    else if(m.tgt==='body'){D.body=Math.max(0,D.body-dmg*1.1);D.sta=Math.max(0,D.sta-dmg*.8)}
    else D.legs=Math.max(0,D.legs-dmg);
    if(blocked)return;
    A.st.landed++;A.st[m.tgt]++;D.hitT=0;this.idle=0;this.pts(A,m.pts*(counter?1.4:1));
    const hy=m.tgt==='head'?-26:m.tgt==='body'?-17:-6;
    this.emit('hit',{x:D.x-D.face*1,y:hy,big:!!m.pow,dmg,F:D,A,blood:m.pow&&dmg>6&&Math.random()<.35});
    this.shake=Math.max(this.shake,m.pow?2.6:1);
    if(this.pos==='ground'){if(this.g.top===A)this.g.unans++;else this.g.unans=0}else{A.unans++;D.unans=0}
    if(D.act&&D.act.ph==='w'&&dmg>=3&&D.act.k!=='shoot')D.act=null;
    if(this.pos==='stand'){D.hurt=Math.min(.34,.1+dmg*.02);D.x-=D.face*(m.pow?3:1.5)}
    if(counter&&A.human)this.flash('Counter!');
    if(m.tgt==='head'&&D.head<=0){const meth=this.pos==='ground'?(this.g.pounce?'TKO (punches)':'TKO (ground and pound)'):k==='soccer'?'TKO (soccer kicks)':`KO (${m.nm})`;return this.finish(A,meth)}
    if(m.tgt==='legs'&&D.legs<=0&&this.pos==='stand'){D.legKD++;if(D.legKD>=2)return this.finish(A,'TKO (leg kicks)');D.legs=20;return this.knockdown(A,D,m,true)}
    if(this.pos==='ground'){const g=this.g;
      if(g.top===A&&((D.head<17&&g.unans>=5)||(g.pounce&&g.t<5&&D.head<18&&g.unans>=4)))return this.finish(A,g.pounce?'TKO (punches)':'TKO (ground and pound)');
      return}
    if(m.pow){const ch=clamp((dmg-5.5)/58+(45-D.head)/130-(D.f.r.chn-60)/230+(counter?.05:0),0,.45);if(Math.random()<ch)return this.knockdown(A,D,m)}
    if(k==='soccer'&&D.head<32)return this.finish(A,'TKO (soccer kicks)');
    if(D.head<34&&m.pow&&D.stag<=0){D.stag=1.1;this.say(`${D.name} is hurt!`,true)}
    if(D.stag>0&&D.head<10&&A.unans>=4)return this.finish(A,'TKO (punches)');
    if(m.tgt==='body'&&D.body<22&&m.pow&&Math.random()<.22)return this.knockdown(A,D,m);
    if(m.pow&&Math.random()<.35)this.say(pick(LHIT).replace('%A',A.name).replace('%D',D.name));
  }
  knockdown(A,D,m,leg){
    if(this.pos==='clinch'){this.pos='stand';D.x=A.x+A.face*12}
    D.down=1.8;D.act=null;D.vx=0;D.block=false;D.kdR++;D.stag=0;
    if(!leg){A.st.kd++;this.rkd[this.round-1][A.side]++;this.pts(A,12)}else this.pts(A,6);
    this.slow=.7;this.shake=5;this.emit('kd',{x:D.x});
    this.say(leg?`${D.name}'s leg gives out and he goes down!`:`${A.name} drops ${D.name} with a ${m.nm}!`,true);this.banner('KNOCKDOWN');
    if(D.kdR>=3)this.finish(A,'TKO (three knockdowns)');
  }

  /* ---------------- grappling ---------------- */
  takedown(A,D){
    const counter=!!(D.act&&D.act.ph!=='r'&&D.act.m.dmg),spr=D.sprawl;
    let p=.42+(A.f.r.wre-D.f.r.wre)/75+(counter?.25:0)+(D.sta<30?.1:0)-(A.sta<25?.15:0)-(spr?.42:0)+(D.stag>0?.15:0)-(this.ring?.03:0);
    p=clamp(p,.05,.93);D.sprawl=false;this.sprawlW=null;
    if(Math.random()<p){this.toGround(A,D,A.f.r.wre>D.f.r.wre+8&&Math.random()<.4?'half':'guard');A.st.td++;this.pts(A,5);
      this.emit('slam',{x:A.x});this.shake=3;this.say(counter?`${A.name} times the shot perfectly. Takedown!`:`Takedown ${A.name}!`,true)}
    else{A.act=null;A.vx=0;A.stuff=.5;A.x-=A.face*4;this.pts(D,1);this.emit('block',{x:D.x,y:-12,F:D});
      this.say(spr?`${D.name} sprawls and stuffs the shot.`:`${D.name} defends the takedown.`);if(spr&&D.human)this.flash('Stuffed it!')}
  }
  clinch(F){const O=F.o,p=.62+(F.f.r.wre-O.f.r.wre)/120;F.sta-=4;
    if(Math.random()<p){this.pos='clinch';this.idle=0;for(const X of this.F){X.act=null;X.vx=0;X.block=false;X.queue=null}
      const mid=clamp((F.x+O.x)/2,LV.L+5,LV.R-5);F.x=mid-F.face*4.5;O.x=mid+F.face*4.5;
      this.say(Math.min(mid-LV.L,LV.R-mid)<20?`${F.name} pins him against the ${this.ring?'ropes':'fence'}.`:`${F.name} ties him up in the clinch.`)}
    else{F.stuff=.3;this.say(`${O.name} shrugs off the clinch.`)}}
  breakAttempt(F){const p=.5+(F.f.r.wre-F.o.f.r.wre)/90;F.sta-=3;
    if(Math.random()<p)this.breakClinch(`${F.name} breaks away.`);else{F.stuff=.35;this.say(`${F.o.name} keeps him tied up.`)}}
  breakClinch(msg){this.pos='stand';this.idle=0;const [a,b]=this.F,mid=(a.x+b.x)/2;
    a.x=clamp(mid-a.face*8,LV.L,LV.R);b.x=clamp(mid-b.face*8,LV.L,LV.R);for(const X of this.F){X.act=null;X.inv=.25}this.say(msg)}
  toGround(top,bot,pos){this.pos='ground';this.idle=0;this.g={top,bot,pos,unans:0,leave:0,pounce:false};
    for(const X of this.F){X.act=null;X.vx=0;X.block=false;X.down=0;X.queue=null;X.stag=0}
    const mid=clamp(bot.x,LV.L+16,LV.R-16);bot.x=mid;top.x=mid}
  pounce(F){const O=F.o;O.head=Math.min(O.headMax,O.head+8);this.toGround(F,O,Math.random()<.45?'guard':Math.random()<.5?'side':'mount');this.g.pounce=true;this.say(`${F.name} pounces on him!`,true)}
  standUp(msg){this.pos='stand';this.g=null;this.idle=0;const [a,b]=this.F,mid=clamp((a.x+b.x)/2,LV.L+10,LV.R-10);
    a.x=mid-9;b.x=mid+9;a.face=1;b.face=-1;for(const X of this.F){X.act=null;X.inv=.3;X.down=0;X.vx=0}this.say(msg)}

  contest(kind,A,D){
    const s=kind==='getup'||kind==='trip'||kind==='lock'?'wre':'grp';
    let need={adv:.55,sweep:.57,escape:.53,getup:.53,trip:.54,lock:.54,sub:.66}[kind],sub=null;
    if(kind==='sub'){const pos=this.g.pos;sub=pick(LSUBS[pos]||LSUBS.guard);
      need=.69-({back:.06,mount:.04,side:.02}[pos]||0)-(D.head<40?.03:0)-(D.sta<30?.03:0)+(this.g.bot===A?.04:0);A.st.sub++;this.pts(A,2)}
    if(kind==='trip'||kind==='lock')A.st.tda++;
    for(const X of this.F){X.act=null;X.block=false;X.queue=null}
    A.sta=Math.max(0,A.sta-4);this.idle=0;
    const nxt=this.g?GPOS[GPOS.indexOf(this.g.pos)+1]:null;
    const label={adv:`Passing to ${GPN[nxt]||''}`,sweep:'Sweep attempt',escape:'Escape attempt',getup:'Getting back up',sub:(sub||'').toUpperCase(),trip:'Trip takedown',lock:'Body-lock takedown'}[kind];
    this.ct={kind,A,D,t:0,dur:{adv:1.15,sweep:1.15,escape:1.1,getup:1.2,sub:2.3,trip:.95,lock:1.1}[kind],a:0,d:0,fa:0,fd:0,need,s,sub,label};
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
  resolveContest(){const c=this.ct,A=c.A,D=c.D,sh=this.share(),win=sh>c.need,g=this.g;this.ct=null;this.idle=0;
    this.emit('contestEnd',{win,human:A.human?win:D.human?!win:null});
    switch(c.kind){
      case'adv':if(win){g.pos=GPOS[GPOS.indexOf(g.pos)+1];g.t=0;this.pts(A,3);this.say(`${A.name} moves to ${GPN[g.pos]}.`)}else{A.sta-=3;this.say(`${D.name} keeps him in ${GPN[g.pos]}.`)}break;
      case'sweep':if(win){g.top=A;g.bot=D;g.pos='half';g.t=0;g.unans=0;g.pounce=false;this.pts(A,4);this.say(`Sweep! ${A.name} reverses the position.`,true)}else this.say(`${D.name} stays on top.`);break;
      case'escape':if(win){g.pos={half:'guard',side:'half',mount:'half',back:'guard'}[g.pos]||'guard';g.unans=0;this.pts(A,2);this.say(`${A.name} recovers ${GPN[g.pos]}.`)}else this.say(`${D.name} holds him down.`);break;
      case'getup':if(win)this.standUp(`${A.name} scrambles back to his feet.`);else this.say(`${D.name} keeps him on the mat.`);break;
      case'sub':if(win)return this.finish(A,`Submission (${c.sub})`);
        A.sta=Math.max(0,A.sta-10);this.say(`${D.name} escapes the ${c.sub}.`,true);
        if(g.bot===A&&g.pos==='guard'&&Math.random()<.45){g.pos='half';this.say(`${D.name} passes to half guard.`)}break;
      case'trip':case'lock':if(win){this.toGround(A,D,c.kind==='lock'&&A.f.r.wre>D.f.r.wre?'half':'guard');A.st.td++;this.pts(A,5);this.emit('slam',{x:A.x});this.shake=3;this.say(`${A.name} ${c.kind==='trip'?'trips him to the mat':'locks the body and takes him down'}!`,true)}
        else{this.say(`${D.name} defends the takedown.`);if(Math.random()<.35)this.breakClinch(`They break apart.`)}break;
    }
  }

  /* ---------------- control ---------------- */
  humanCtl(F,dt){
    if(this.pos==='stand'||this.pos==='clinch')F.block=this.inp.B&&!F.act&&F.down<=0&&!this.ct;
    else F.block=this.g&&this.g.bot===F&&this.inp.B&&!F.act&&!this.ct;
    while(this.taps.length){const k=this.taps.shift();
      if(this.ct){if(k!=='L'&&k!=='R'&&k!=='dodge')this.tap(F);continue}
      if(k==='B')this.pressB(F);else if(k==='dodge')this.dodge(F);else if(k!=='L'&&k!=='R')this.doAct(F,k)}
    if(this.pos==='ground'&&this.g.top===F&&!this.ct){
      this.g.leave=this.inp.dir!==0?this.g.leave+dt:0;
      if(this.g.leave>.4)this.standUp(`${F.name} stands up and lets him back up.`)}
  }
  aiCtl(F,dt){const A=F.ai,O=F.o,D=this.aiD(F),st=LSTYLE[F.f.style]||LSTYLE['All-rounder'];
    A.t-=dt;if(A.blockT>0){A.blockT-=dt;F.block=!F.act&&F.down<=0&&!this.ct&&(this.pos!=='ground'||this.g.bot===F)}else F.block=false;
    if(this.ct)return;
    if(this.pos==='stand'&&O.act&&O.act.ph==='w'&&O.act.m.dmg&&A.seen!==O.act){A.seen=O.act;A.react=D.react*(.8+Math.random()*.5)}
    if(A.react>0){A.react-=dt;if(A.react<=0&&O.act&&O.act===A.seen&&O.act.ph!=='r')this.aiReact(F,O,D)}
    if(!O.act)A.seen=null;
    if(A.t>0)return;A.t=D.think*(.7+Math.random()*.6);
    if(this.pos==='stand')this.aiStand(F,O,D,st);else if(this.pos==='clinch')this.aiClinch(F,O,D,st);else this.aiGround(F,O,D,st);
  }
  aiReact(F,O,D){const gap=Math.abs(F.x-O.x);if(gap>(O.act.m.rng||12)+4)return;
    const r=Math.random(),pb=D.block*(.6+F.f.r.str/250);
    if(r<pb){F.ai.blockT=.42;F.block=true}
    else if(r<pb+.12&&this.canAct(F))this.dodge(F);
    else if(r<pb+.22&&this.canAct(F)&&gap<18)this.doAct(F,'J')}
  aiStand(F,O,D,st){const gap=Math.abs(F.x-O.x),A=F.ai;
    if(O.down>0){if(Math.random()<st.ag*D.ag+.2){A.dir=1;if(gap<16)this.doAct(F,this.ring&&Math.random()<.2?'K':(Math.random()<.5?'S':'P'))}else A.dir=0;return}
    if(F.sta<22){A.dir=-1;A.blockT=.5;return}
    const want=st.want+(O.stag>0?-4:0)+(F.legs<40?2:0);
    A.dir=gap>want+2?1:gap<want-3?(F.f.style==='Brawler'||F.f.style==='Wrestler'?0:-1):(Math.random()<.35?(Math.random()<.5?1:-1):0);
    const ag=st.ag*D.ag*(O.stag>0?1.6:1)*(F.sta<40?.6:1)*(O.block?.85:1);
    if(Math.random()>ag||F.act)return;
    const opts=[];for(const [k,w] of Object.entries(st.w)){if(!w)continue;
      if(k==='shoot'){if(gap>=12&&gap<=27)opts.push([k,w*(O.block?1.6:1)])}
      else if(k==='clinch'){if(gap<12)opts.push([k,w*3])}
      else if(gap<=LMV[k].rng+1)opts.push([k,w])}
    if(!opts.length){A.dir=1;return}
    let tot=opts.reduce((s,o)=>s+o[1],0),x=Math.random()*tot,ch=opts[0][0];for(const [k,w] of opts){x-=w;if(x<0){ch=k;break}}
    const key={jab:'J',cross:'P',hook:'P',over:'Pc',lkick:'K',hkick:'Kc',shoot:'S',clinch:'S'}[ch];
    this.doAct(F,key);
    if(ch==='jab'&&Math.random()<.45){F.queue='P';F.qT=.4}}
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
      if((F.f.style==='Striker'||F.f.style==='Kickboxer')&&g.pos==='guard'&&r>.95)return this.standUp(`${F.name} stands up and waves him back up.`);
    }else{
      if(O.act&&O.act.ph==='w'&&r<.5){F.ai.blockT=.45;F.block=true;return}
      if(r<.36){F.ai.blockT=.55;F.block=true;return}
      if(r<.42)return this.doAct(F,'J');
      if(r<.42+.14*gr)return this.doAct(F,'S');
      if(r<.42+.14*gr+.16*(F.f.r.wre/70)&&(g.pos==='guard'||g.pos==='half'))return this.doAct(F,'K');
      if(r<.42+.14*gr+.16+(bjj?.12:.03)&&(g.pos==='guard'||g.pos==='half'))return this.doAct(F,'P');
    }}

  physics(dt){const [a,b]=this.F;
    if(this.pos==='stand'){
      for(const F of this.F){
        if(F.down>0||(F.act&&F.act.k==='shoot'&&F.act.ph==='a'&&!F.act.done)||F.dodge>0){F.vx*=F.down>0?.8:1;continue}
        const dir=F.human?this.inp.dir:(F.ai.dir||0)*F.face;
        let sp=F.mv*(.55+.45*F.legs/100)*(F.block?.5:1)*(F.stag>0?.6:1)*(F.act?.25:1)*(F.sta<15?.7:1)*(F.hurt>0?.3:1);
        if(dir&&Math.sign(dir)!==F.face)sp*=.85;
        F.vx+=(dir*sp-F.vx)*Math.min(1,dt*14)}
      for(const F of this.F){F.x=clamp(F.x+F.vx*dt,LV.L,LV.R)}
      let gap=b.x-a.x;const s=a.face;
      if(gap*s<LV.MINGAP){const need=LV.MINGAP-gap*s;a.x-=s*need/2;b.x+=s*need/2;
        if(a.x<LV.L||a.x>LV.R){a.x=clamp(a.x,LV.L,LV.R);b.x=a.x+s*LV.MINGAP}
        if(b.x<LV.L||b.x>LV.R){b.x=clamp(b.x,LV.L,LV.R);a.x=b.x-s*LV.MINGAP}}
      if(a.down<=0&&b.down<=0){a.face=b.x>=a.x?1:-1;b.face=-a.face}
    }else if(this.pos==='clinch'){const mid=(a.x+b.x)/2;a.x=mid-a.face*4.5;b.x=mid+a.face*4.5;a.vx=b.vx=0}
    else{a.vx=b.vx=0}
  }

  /* ---------------- rounds and results ---------------- */
  endRound(){const r=this.round-1,p=this.rp[r],kd=this.rkd[r],sc=[];
    for(let j=0;j<3;j++){const diff=p[0]-p[1]+(Math.random()+Math.random()+Math.random()-1.5)*10,w=diff>=0?0:1,big=Math.abs(diff)>48||kd[w]-kd[1-w]>=2;
      const s=w===0?[10,big?8:9]:[big?8:9,10];this.cards[j][0]+=s[0];this.cards[j][1]+=s[1];sc.push(s)}
    this.rcards.push(sc);
    this.rstats.push(this.F.map(F=>({...F.st})));
    this.log[r].push({t:`Horn. Broadcast card: ${sc[1][0]}-${sc[1][1]} ${sc[1][0]>sc[1][1]?this.F[0].name:this.F[1].name}.`,rd:true});
    this.emit('bell');this.ct=null;this.sprawlW=null;
    if(this.round>=this.rounds.length)return this.decision();
    this.phase='break';this.pt=0;this.say(`End of round ${this.round}.`)}
  nextRound(){if(this.phase!=='break')return;
    for(const F of this.F){F.head=Math.min(F.headMax,F.head+18);F.sta=Math.min(100,F.sta+50);F.body=Math.min(100,F.body+10);F.legs=Math.min(100,F.legs+8);
      F.act=null;F.queue=null;F.down=0;F.stag=0;F.hurt=0;F.kdR=0;F.unans=0;F.block=false;F.vx=0}
    this.round++;this.clock=this.rounds[this.round-1]*60;this.el=0;this.rp.push([0,0]);this.rkd.push([0,0]);this.log.push([]);
    this.pos='stand';this.g=null;this.ct=null;this.idle=0;const [a,b]=this.F;a.x=LV.W/2-15;b.x=LV.W/2+15;a.face=1;b.face=-1;
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
    this.say(`${W.name} wins by ${method}!`,true);this.emit('kd',{x:L.x});this.emit('crowd');
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
    if(me.sta<45)tips.push("You're gassing. Pick your shots and let your cardio come back.");
    if(O.st.blocked>=5)tips.push("He's covering up. Go to the legs, or change levels and shoot.");
    if(ms.landed<4)tips.push("You're too passive. The judges want to see you let your hands go.");
    if(O.f.style==='BJJ')tips.push("Careful on the ground. He's dangerous off his back. Tap fast when he goes for a submission.");
    if(O.f.style==='Kickboxer'||O.f.style==='Striker')tips.push("He's sharper on the feet. Mix in takedowns to take him out of his comfort zone.");
    tips.push("Jab, then POWER. The right hand behind the jab lands more often.");
    return tips.slice(0,2)}
}
