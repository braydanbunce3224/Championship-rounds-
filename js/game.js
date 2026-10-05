/*!
 * Championship Rounds
 * An MMA simulation game by SpecMagic Games.
 * Copyright (c) 2026 SpecMagic Games. All rights reserved.
 *
 * Plain JavaScript, no build step. Sections, in order:
 *   utilities, world constants, fight simulation, state + world generation,
 *   matchmaker mode (odds/hype, AI promotions, weekly clock, events, news),
 *   rendering (app shell, tabs, bottom sheets), fighter career mode
 *   (creation, training mini games, fight camp, fight night), input handling, boot.
 */
/* ============ utilities ============ */
const rnd=(a,b)=>a+Math.random()*(b-a), ri=(a,b)=>Math.floor(rnd(a,b+1)), pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
function seeded(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296}}
function hash(...xs){let h=2166136261;for(const ch of xs.join('|')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const pickr=(r,a)=>a[Math.floor(r()*a.length)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fm=x=>{const n=Math.abs(x),s=x<0?'−':'';return n>=1?`${s}$${n.toFixed(1)}M`:`${s}$${Math.round(n*1000)}K`};
const fk=k=>k>=1000?`$${(k/1000).toFixed(2)}M`:`$${k}K`;
const ml=p=>{p=clamp(p,.03,.97);return p>=.5?`−${Math.round(p/(1-p)*100)}`:`+${Math.round((1-p)/p*100)}`};

/* ============ world constants ============ */
const DIVS=['FW','LW','WW','MW','LHW','HW'];
const DIVN={FW:'Featherweight',LW:'Lightweight',WW:'Welterweight',MW:'Middleweight',LHW:'Light Heavyweight',HW:'Heavyweight'};
const DIVLB={FW:145,LW:155,WW:170,MW:185,LHW:205,HW:265};
const PROMOS={
  TFC:{id:'TFC',name:'Titan Fighting Championship',short:'TFC',ring:false,tv:4.6,start:212,prestige:82,color:'#e9b53c',
    tag:'The biggest stage in the sport. Rankings decide everything, five-round title fights, and a pay-per-view machine that needs feeding.',
    rules:['Cage · 3×5 min, main events 5×5','Rankings decide who gets title shots','Choose TV Fight Night or pay-per-view'],
    std:[5,5,5],five:[5,5,5,5,5],pool:{USA:5,BRA:3,RUS:3,IRL:1,MEX:2,NGA:1,POL:1,AUS:1,GEO:1,KOR:1,SWE:1,FRA:1,JPN:1}},
  GFL:{id:'GFL',name:'Global Fight League',short:'GFL',ring:false,tv:5.2,start:41,prestige:62,color:'#4d8fff',
    tag:'MMA run like a sports league. Fighters bank points all season, the top four reach the championship card, and each champion takes home $1M.',
    rules:['3 points per win, +3/+2/+1 for a round 1/2/3 finish','Title fights only on the Championship card','$1M prize to every champion'],
    std:[5,5,5],five:[5,5,5,5,5],pool:{USA:5,BRA:2,RUS:2,FRA:1,NGA:1,POL:2,SWE:1,MEX:1,AUS:1,GEO:1}},
  RYU:{id:'RYU',name:'RYUJIN Fighting Championships',short:'RYUJIN',ring:true,tv:3.4,start:31,prestige:66,color:'#ea4452',
    tag:'Spectacle in a ring. Ten-minute opening rounds, soccer kicks, and open-weight fights no other promotion would sign off on.',
    rules:['Ring · 10 + 5 + 5 min rounds','Soccer kicks and stomps are legal','Open-weight bookings allowed'],
    std:[10,5,5],five:[10,5,5],pool:{JPN:6,NED:3,BRA:3,KOR:2,USA:1,RUS:1,GEO:1}}
};
const VENUES={
  TFC:[{n:'TFC Fight Lab, Las Vegas',cap:1500,cost:.35,tix:120},{n:'Arena, Las Vegas',cap:17000,cost:1.6,tix:260},{n:'Stadium, Dallas',cap:52000,cost:5.5,tix:290}],
  GFL:[{n:'GFL Studio, Atlanta',cap:1800,cost:.3,tix:90},{n:'Arena, Atlanta',cap:14000,cost:1.3,tix:180},{n:'Stadium, New Jersey',cap:45000,cost:4.8,tix:220}],
  RYU:[{n:'Hall, Tokyo',cap:2000,cost:.35,tix:110},{n:'Super Arena, Saitama',cap:22000,cost:1.8,tix:240},{n:'Dome, Osaka',cap:45000,cost:4.6,tix:260}]
};
const NAT={
  USA:{f:['Jake','Marcus','Tyler','Derrick','Cody','Brandon','Andre','Travis','Darnell','Kyle','Trey','Malik','Dustin','Garrett','Isaiah','Wes'],l:['Barrett','Calloway','Dawson','Mercer','Pruitt','Lancaster','Boone','Kessler','Rhodes','Tolliver','Garrity','Sutton','Vance','Merritt','Holcomb','Ashford','Bledsoe','Whitlock']},
  BRA:{f:['Thiago','Rafael','Lucas','Renan','Caio','Vinicius','Matheus','Edson','Rodrigo','Felipe','Jailton','Gustavo'],l:['Albuquerque','Carvalho','Batista','Rezende','Furtado','Pacheco','Lacerda','Brandão','Vasconcelos','Quintela','Siqueira','Moura']},
  RUS:{f:['Magomed','Ruslan','Shamil','Arsen','Zaur','Timur','Akhmed','Murad','Rasul','Khamzat'],l:['Gadzhiev','Abdulaev','Kurbanov','Saidov','Aliev','Omarov','Ibragimov','Dzhabrailov','Khasbulaev','Tagirov']},
  JPN:{f:['Kenta','Takeshi','Ryo','Daisuke','Hiroki','Yuto','Kazuki','Sho','Haruto','Tatsuya','Genki','Yoshiro'],l:['Morimoto','Takeda','Fujiwara','Nakamura','Ishida','Kobayashi','Hayashi','Sakamoto','Ueda','Kuroda','Matsuda','Okabe']},
  IRL:{f:['Liam','Callum','Declan','Owen','Rory','Kieran','Ciaran','Sean','Aidan'],l:['Doherty','Brennan','Quinlan','Fallon','Gallagher','Whelan','Lynch','Carroll','Kinsella']},
  MEX:{f:['Diego','Luis','Alejandro','Javier','Ricardo','Emilio','Mateo','Héctor','Raúl','Iván'],l:['Ochoa','Villanueva','Treviño','Salazar','Quezada','Robles','Cárdenas','Montoya','Ibarra','Zamora']},
  NGA:{f:['Chidi','Emeka','Tunde','Obinna','Femi','Kelechi','Ayo','Segun'],l:['Okafor','Adeyemi','Nwosu','Balogun','Eze','Okonkwo','Adebayo','Uche']},
  POL:{f:['Mateusz','Krzysztof','Paweł','Tomasz','Kamil','Marcin'],l:['Nowak','Wiśniewski','Kowalczyk','Zieliński','Szymański','Woźniak']},
  AUS:{f:['Lachlan','Brodie','Mitch','Hamish','Nathan','Josh'],l:['Thornton','McKellar','Ashby','Pritchard','Dunleavy','Coates']},
  KOR:{f:['Ji-hoon','Min-jun','Dong-hyun','Seung-woo','Jae-won','Tae-yang'],l:['Park','Choi','Kang','Yoon','Han','Seo']},
  GEO:{f:['Giorgi','Levan','Davit','Irakli','Nika'],l:['Beridze','Kapanadze','Lomidze','Gelashvili','Tsiklauri']},
  SWE:{f:['Anton','Erik','Oskar','Viktor','Linus'],l:['Lindqvist','Bergström','Sandberg','Holm','Ekman']},
  FRA:{f:['Karim','Mathis','Yanis','Bastien','Théo'],l:['Moreau','Lefèvre','Benali','Rousseau','Garnier']},
  NED:{f:['Daan','Sem','Jesse','Milan','Ruben','Thijs'],l:['de Vries','Bakker','Visser','van Dijk','Smit','Mulder']}
};
const NICKS=['The Hammer','Bad Intentions','The Surgeon','Iron','Silent Storm','The Reaper','Bulldozer','The Professor','Chaos','The Matador','Thunder','The Python','Kid Dynamite','The Prophet','The Viking','Machine Gun','Typhoon','The Architect','Blackout','The Wolf','Sandman','Hurricane','Diesel','Ice Water','The Butcher','Shogun Jr.','Slick','The Anvil','Wildfire','Ghost','The Mechanic','Lumberjack','Cobra','Night Train','Showtime Jr.','The Bishop','Dynamo','Gravedigger'];
const STYLES={Striker:{str:12,pow:6,wre:-8,grp:-6},Kickboxer:{str:14,pow:4,wre:-10,grp:-8,car:3},Wrestler:{wre:14,grp:4,str:-6,car:6},BJJ:{grp:16,wre:2,str:-6},Brawler:{pow:12,chn:8,str:2,wre:-6,car:-6},'All-rounder':{str:3,pow:3,wre:3,grp:3,car:3,chn:3}};
const STYLE_W={TFC:['Striker','Striker','Wrestler','Wrestler','BJJ','Brawler','All-rounder','All-rounder','Kickboxer'],GFL:['Striker','Wrestler','Wrestler','BJJ','Brawler','All-rounder','All-rounder','Kickboxer'],RYU:['Kickboxer','Kickboxer','Striker','Brawler','Brawler','BJJ','Wrestler','All-rounder']};
const PERSONAS=['Trash talker','Stoic','Showman','Humble','Humble','Stoic','Hothead'];
const STRIKEY=['Striker','Kickboxer','Brawler'];
const RATING_LBL={str:'Striking',pow:'Power',wre:'Wrestling',grp:'Grappling',car:'Cardio',chn:'Chin'};

/* ============ fight simulation ============ */
const KD_SHOTS=['right hand','left hook','head kick','uppercut','flying knee','overhand right','counter left','knee up the middle','spinning back fist'];
const HOLDS=['rear-naked choke','guillotine','arm-triangle choke',"D'Arce choke",'kimura','armbar','anaconda choke','neck crank'];
const GUARD_HOLDS=['triangle choke','armbar','guillotine','omoplata','heel hook'];
const STAND=[
 (a,d)=>`${a} snaps ${d}'s head back with a stiff jab.`,
 (a,d)=>`${a} chops the lead leg. ${d} is starting to limp.`,
 (a,d)=>`Heavy body kick from ${a}. You could hear that one in the rafters.`,
 (a,d)=>`${a} slips a jab and comes back with a sharp left hook.`,
 (a,d,w)=>`${a} backs ${d} to the ${w} and unloads a combination.`,
 (a,d)=>`${a} lands a clean one-two down the middle.`,
 (a,d)=>`${d} misses a wild spinning back fist and ${a} makes him pay.`,
 (a,d,w)=>`Clinch against the ${w}. ${a} wins the exchange with short knees.`,
 (a,d)=>`${a} times ${d} coming in with a counter right.`,
 (a,d)=>`Calf kick lands for ${a}. ${d} switches stance to protect the leg.`,
 (a,d)=>`${a} is getting the better of the pocket exchanges.`,
 (a,d)=>`Big uppercut from ${a} splits the guard.`];
const TD_OK=[(a,d)=>`${a} changes levels and finishes a clean double-leg.`,(a,d)=>`${a} catches a kick and dumps ${d} to the mat.`,(a,d,w)=>`${a} chains it together against the ${w} and drags ${d} down.`,(a,d)=>`Big slam from ${a}! ${d} lands hard.`];
const TD_NO=[(a,d)=>`${a} shoots from too far out and ${d} stuffs it.`,(a,d,w)=>`${d} defends the single-leg on the ${w} and separates.`,(a,d)=>`${d} sprawls hard on ${a}'s shot.`];
const GROUND=[(a,d)=>`${a} postures up and drops heavy ground and pound.`,(a,d)=>`${a} passes to half guard.`,(a,d)=>`${a} takes the back. ${d} is in trouble here.`,(a,d)=>`${a} grinds on top, controlling the wrists.`,(a,d)=>`Elbows from the top by ${a}. There's blood now.`];
const ESCAPE=[(a,d)=>`${d} scrambles back to the feet.`,(a,d,w)=>`${d} walks up the ${w} and breaks free.`,(a,d)=>`The referee stands them up after a lull.`];

function roundsFor(pid,title,main){const P=PROMOS[pid];return (title||main)?P.five:P.std}

function simFight(A,B,o){
  const r=o.rng||Math.random,R2=(a,b)=>a+r()*(b-a),pbpOn=!!o.pbp;
  const gap=DIVS.indexOf(A.div)-DIVS.indexOf(B.div);
  const mk=(f,g)=>{const s={...f.r};if(g>0){s.pow+=g*5;s.wre+=g*4;s.chn+=g*3;s.car-=g*3}if(g<0){g=-g;s.str+=g*2;s.car+=g*2;s.pow-=g*2;s.wre-=g*3}return{f,s,hp:100,st:100,sig:0,td:0,tda:0,kd:0,ctrl:0,subA:0}};
  const F=[mk(A,gap),mk(B,-gap)],N=[A.last,B.last],wall=o.ring?'ropes':'fence';
  const pbp=[],tot=[[0,0],[0,0],[0,0]];let end=null;
  const e=(i,k)=>F[i].s[k]*(0.55+0.45*F[i].st/100)*(0.8+0.2*Math.max(0,F[i].hp)/100);
  for(let rd=1;rd<=o.rounds.length&&!end;rd++){
    const len=o.rounds[rd-1],L=[],rs=[0,0],k0=[F[0].kd,F[1].kd];let pos='stand',top=-1;
    const say=(t,big)=>{if(pbpOn)L.push({t,big:!!big})};
    for(let m=0;m<len&&!end;m++){
      const fin=(w,method,line)=>{end={w,method,rd,time:`${m}:${String(Math.floor(r()*60)).padStart(2,'0')}`};say(line,true)};
      if(pos==='stand'){
        const tdp=i=>clamp(((F[i].s.wre-55)/90)+(F[i].f.style==='Wrestler'?.22:F[i].f.style==='BJJ'?.14:0)+((F[1-i].s.str-F[i].s.str)/250),.02,.6)*.55;
        const first=r()<.5?0:1;let sh=-1;
        for(const i of [first,1-first])if(r()<tdp(i)){sh=i;break}
        if(sh>=0){const d=1-sh;F[sh].tda++;
          const p=clamp(.38+(e(sh,'wre')-e(d,'wre'))/80-(o.ring?.05:0),.08,.85);
          if(r()<p){F[sh].td++;rs[sh]+=4;pos='ground';top=sh;say(pickr(r,TD_OK)(N[sh],N[d],wall))}
          else{rs[d]+=1;if(r()<.6)say(pickr(r,TD_NO)(N[sh],N[d],wall))}
        }else{
          const land=[0,0];
          for(const i of [0,1]){const d=1-i;
            const n=Math.max(0,Math.round((3+e(i,'str')/14)*R2(.35,1.3)*(1-(F[d].s.str-55)/260)));
            land[i]=n;F[i].sig+=n;const dmg=n*(F[i].s.pow/50)*R2(.6,1.25)*(1.35-F[d].s.chn/100);
            F[d].hp-=dmg;rs[i]+=n+dmg*.8}
          for(const i of (r()<.5?[0,1]:[1,0])){if(end)break;const d=1-i;
            const p=clamp(.018+(e(i,'pow')-F[d].s.chn)/400+(100-F[d].hp)/560,.004,.2);
            if(r()<p){F[i].kd++;F[d].hp-=R2(12,24);rs[i]+=12;const shot=pickr(r,KD_SHOTS);
              const fp=clamp(.22+(F[i].s.pow-60)/160+(55-F[d].hp)/120,.06,.8);
              if(r()<fp||F[d].hp<=0){
                if(o.ring&&r()<.35)fin(i,'TKO (soccer kicks)',`${N[i]} drops ${N[d]} with a ${shot} and follows with soccer kicks. The referee waves it off!`);
                else if(['head kick','flying knee','spinning back fist'].includes(shot)||r()<.45)fin(i,`KO (${shot})`,`${N[i]} lands a ${shot} and ${N[d]} is out before he hits the canvas!`);
                else fin(i,'TKO (punches)',`${N[i]} hurts ${N[d]} with a ${shot}, swarms with punches, and the referee jumps in!`);
              }else{say(`${N[i]} drops ${N[d]} with a ${shot}! ${N[d]} survives the follow-up.`,true);if(r()<.5){pos='ground';top=i}}
            }}
          if(!end&&pbpOn&&r()<.55){const i=land[0]===land[1]?(r()<.5?0:1):(land[0]>land[1]?0:1);say(pickr(r,STAND)(N[i],N[1-i],wall))}
        }
      }else{
        const T=top,Bt=1-top;
        const n=Math.round(R2(1,6)*(e(T,'wre')/70));F[T].sig+=n;
        const dmg=n*(F[T].s.pow/55)*R2(.5,1.2)*(1.3-F[Bt].s.chn/100);F[Bt].hp-=dmg;F[T].ctrl++;rs[T]+=n+dmg*.8+3;
        if(r()<clamp((F[T].s.grp-50)/170+(F[T].f.style==='BJJ'?.12:0),.02,.32)){F[T].subA++;rs[T]+=2;const hold=pickr(r,HOLDS);
          const p=clamp(.12+(e(T,'grp')-e(Bt,'grp'))/110+(100-F[Bt].st)/420+(100-F[Bt].hp)/420,.03,.55);
          if(r()<p)fin(T,`Submission (${hold})`,`${N[T]} locks up the ${hold}... ${N[Bt]} taps!`);
          else say(`${N[T]} threatens a ${hold}, but ${N[Bt]} fights it off.`);
        }else if(r()<clamp((F[Bt].s.grp-58)/200+(F[Bt].f.style==='BJJ'?.08:0),0,.2)){F[Bt].subA++;rs[Bt]+=3;const hold=pickr(r,GUARD_HOLDS);
          const p=clamp(.12+(e(Bt,'grp')-e(T,'grp'))/110+(100-F[T].st)/420,.03,.5)*.7;
          if(r()<p)fin(Bt,`Submission (${hold})`,`From his back, ${N[Bt]} snatches a ${hold}! ${N[T]} has to tap!`);
          else say(`${N[Bt]} throws up a ${hold} from the bottom. ${N[T]} postures out.`);
        }
        if(!end&&F[Bt].hp<=0){
          if(o.ring&&r()<.45)fin(T,'TKO (soccer kicks)',`${N[T]} stands over ${N[Bt]} and lands a soccer kick. It's over!`);
          else fin(T,'TKO (ground and pound)',`${N[T]} rains down unanswered shots. The referee has seen enough!`);
        }
        if(!end){const esc=clamp(.3+(e(Bt,'wre')-(e(T,'wre')+e(T,'grp'))/2)/90,.1,.7);
          if(r()<esc){pos='stand';if(r()<.5)say(pickr(r,ESCAPE)(N[T],N[Bt],wall));top=-1}
          else if(r()<.6)say(pickr(r,GROUND)(N[T],N[Bt],wall))}
      }
      for(const i of [0,1])if(!end&&F[i].hp<=0)fin(1-i,'TKO (punches)',`${N[i]} can't defend himself and the referee steps in. ${N[1-i]} gets the stoppage!`);
      for(const i of [0,1])F[i].st=Math.max(5,F[i].st-R2(4,8)*(1.55-F[i].s.car/100)*(pos==='ground'&&i!==top?1.2:1));
    }
    let rc=null;
    if(!end){rc=[];
      for(let j=0;j<3;j++){const diff=rs[0]-rs[1]+(r()+r()+r()-1.5)*9;const w=diff>=0?0:1;
        const kdd=(F[w].kd-k0[w])-(F[1-w].kd-k0[1-w]);const big=Math.abs(diff)>42||kdd>=2;
        const s=w===0?[10,big?8:9]:[big?8:9,10];tot[j][0]+=s[0];tot[j][1]+=s[1];rc.push(s)}
      if(pbpOn)L.push({t:`Horn. Broadcast card: ${rc[1][0]}-${rc[1][1]} ${rc[1][0]>rc[1][1]?N[0]:N[1]}.`,rd:true});
    }
    pbp.push({rd,lines:L});
    for(const i of [0,1]){F[i].st=Math.min(100,F[i].st+30);F[i].hp=Math.min(100,F[i].hp+6)}
  }
  let w,method,rd,time;
  if(end){({w,method,rd,time}=end)}
  else{const v=tot.map(c=>c[0]>c[1]?0:c[1]>c[0]?1:-1);const a=v.filter(x=>x===0).length,b=v.filter(x=>x===1).length;
    rd=o.rounds.length;time=`${o.rounds[rd-1]}:00`;
    if(a===3||b===3){w=a===3?0:1;method='Unanimous decision'}
    else if(a===2&&b===1||b===2&&a===1){w=a>b?0:1;method='Split decision'}
    else if(a===2||b===2){w=a===2?0:1;method='Majority decision'}
    else{w=-1;method='Draw'}}
  return{w,method,rd,time,pbp,cards:end?null:tot,sig:[F[0].sig,F[1].sig],td:[F[0].td,F[1].td],kd:[F[0].kd,F[1].kd],fin:!!end};
}

/* ============ state ============ */
let S=null;
const U={tab:'office',div:'LW',nf:'all',sheet:null,ev:null,toast:null,wdiv:'LW'};
let RANK={},CHAMPS=new Set();
const KEY='championship-rounds.save.v1';
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function load(){try{const s=localStorage.getItem(KEY);return s?JSON.parse(s):null}catch(e){return null}}
const P=()=>PROMOS[S.pid], PS=()=>S.promos[S.pid];
const isChamp=f=>!!f&&S.promos[f.promo]?.champs[f.div]===f.id;
const mine=f=>f.promo===S.pid;
const ovrOf=r=>Math.round((r.str*1.1+r.pow*.9+r.wre+r.grp+r.car*.8+r.chn*.8)/5.6);
const nz=n=>`--nz:${n.length<=6?42:n.length<=8?34:n.length<=10?27:23}px`;
const rec=f=>`${f.w}-${f.l}${f.d?'-'+f.d:''}`;
const fname=f=>`${f.first} ${f.last}`;
function purseFor(f){return Math.round(10+Math.max(0,f.ovr-62)**2*.3+Math.max(0,f.pop-30)**2*.12+(isChamp(f)?120:0))}

function wpick(pool){const ks=Object.keys(pool);let t=ks.reduce((s,k)=>s+pool[k],0),x=Math.random()*t;for(const k of ks){x-=pool[k];if(x<0)return k}return ks[0]}
let NAMES=new Set();
function genFighter(promo,div,tier,pool,styleW,ageOverride){
  let nat,first,last,tries=0;
  do{nat=wpick(pool);first=pick(NAT[nat].f);last=pick(NAT[nat].l);tries++}while(NAMES.has(first+last)&&tries<40);
  NAMES.add(first+last);
  const style=pick(styleW),mod=STYLES[style],r={};
  for(const k of ['str','pow','wre','grp','car','chn'])r[k]=clamp(Math.round(tier+(mod[k]||0)+rnd(-6,6)),35,99);
  const ovr=ovrOf(r),age=ageOverride||ri(22,36),persona=pick(PERSONAS);
  const tf=ri(4,9)+Math.round((age-22)*.8),wp=clamp(.55+(ovr-65)/60+rnd(-.1,.1),.4,.97);
  const w=Math.round(tf*wp),l=tf-w,d=Math.random()<.12?1:0;
  const koS=STRIKEY.includes(style)?.6:style==='Wrestler'?.3:style==='BJJ'?.2:.4,subS=style==='BJJ'?.55:style==='Wrestler'?.25:.12;
  const ko=Math.round(w*koS*rnd(.7,1.1)),sub=Math.min(w-ko,Math.round(w*subS*rnd(.7,1.1)));
  const pop=clamp(Math.round(ovr*.95-34+rnd(-10,18)+((persona==='Trash talker'||persona==='Showman')?10:0)),3,92);
  const f={id:'f'+(S.nid++),first,last,nick:Math.random()<.55?pick(NICKS):'',nat,age,div,style,persona,r,ovr,pot:clamp(ovr+(age<28?ri(3,14):ri(0,3)),ovr,96),
    w,l,d,ko,sub,streak:ri(-1,4),pop,morale:ri(55,85),promo,fights:ri(1,5),purse:0,avail:ri(1,5),rs:ovr+pop*.15+rnd(-4,4),pts:0,hist:[],rivals:[],callout:null,expiring:null,promised:false};
  f.purse=purseFor(f);
  return f;
}

/* ---- hand-made fighters that appear in every new world ---- */
const SIGNATURE=[{first:'Eric',last:'Duncle',nick:'The Machine',nat:'USA',age:28,div:'FW',style:'Wrestler',persona:'Stoic',promo:'TFC',
  r:{str:80,pow:74,wre:86,grp:79,car:94,chn:82},w:18,l:2,d:0,ko:5,sub:4,streak:6,pop:74},
  {first:'Lane',last:'Johnson',nick:'Too Far',nat:'USA',age:30,div:'MW',style:'Brawler',persona:'Showman',promo:'TFC',champ:true,
  r:{str:91,pow:95,wre:84,grp:82,car:88,chn:93},w:24,l:1,d:0,ko:17,sub:3,streak:11,pop:91}];
function addSignature(){for(const t of SIGNATURE){if(Object.values(S.F).some(f=>f.first===t.first&&f.last===t.last))continue;
  const f=genFighter(t.promo,t.div,75,{USA:1},[t.style]);
  Object.assign(f,{first:t.first,last:t.last,nick:t.nick,nat:t.nat,age:t.age,style:t.style,persona:t.persona,r:{...t.r},w:t.w,l:t.l,d:t.d,ko:t.ko,sub:t.sub,streak:t.streak,pop:t.pop,morale:85,pot:Math.max(ovrOf(t.r),88),avail:1,fights:4});
  f.ovr=ovrOf(f.r);f.rs=f.ovr+f.pop*.15+(t.champ?20:0);f.pot=Math.max(f.pot,f.ovr);f.purse=purseFor(f);NAMES.add(t.first+t.last);S.F[f.id]=f}}
// older saves were made before the featherweight division existed: give every promotion a featherweight roster and champion
function migrateSave(){let changed=false;
  for(const id in PROMOS){if(!S.promos[id])continue;
    if(!Object.values(S.F).some(f=>f.promo===id&&f.div==='FW')){const per=id===S.pid?16:10,base=id==='TFC'?0:-3;
      for(let i=0;i<per;i++){const tier=i<3?rnd(80,88)+base:i<8?rnd(69,79)+base:rnd(56,68)+base;const f=genFighter(id,'FW',tier,PROMOS[id].pool,STYLE_W[id]);S.F[f.id]=f}
      changed=true}}
  if(SIGNATURE.some(t=>!Object.values(S.F).some(f=>f.first===t.first&&f.last===t.last))){addSignature();changed=true}
  for(const id in PROMOS){if(!S.promos[id]||S.promos[id].champs.FW)continue;const list=Object.values(S.F).filter(f=>f.promo===id&&f.div==='FW'&&f.id!=='me').sort((a,b)=>b.rs-a.rs);
    if(list[0]){S.promos[id].champs.FW=list[0].id;list[0].pop=clamp(list[0].pop+14,0,97);list[0].purse=purseFor(list[0]);changed=true}}
  if(changed){computeRanks();save()}}
function newGame(pid){
  NAMES=new Set();
  S={v:1,pid,week:1,cash:20,approval:62,nid:1,promos:{},F:{},news:[],inbox:[],iid:1,goal:null,lastPPV:-99,lastGrade:null,events:[],season:{n:1,ev:1,len:6},nextGoal:3};
  for(const id in PROMOS)S.promos[id]={prestige:PROMOS[id].prestige,num:PROMOS[id].start,champs:{},last:null};
  for(const id in PROMOS){
    const per=id===pid?16:10,base=id==='TFC'?0:-3;
    for(const div of DIVS)for(let i=0;i<per;i++){
      const tier=i<3?rnd(80,88)+base:i<8?rnd(69,79)+base:rnd(56,68)+base;
      const f=genFighter(id,div,tier,PROMOS[id].pool,STYLE_W[id]);S.F[f.id]=f}
  }
  const allPool={};for(const k in NAT)allPool[k]=1;
  for(let i=0;i<14;i++){const f=genFighter('FA',pick(DIVS),rnd(58,80),allPool,STYLE_W.GFL);f.fights=0;S.F[f.id]=f}
  addSignature();
  for(const id in PROMOS)for(const div of DIVS){
    const list=Object.values(S.F).filter(f=>f.promo===id&&f.div===div).sort((a,b)=>b.rs-a.rs);
    const c=list[0];S.promos[id].champs[div]=c.id;c.pop=clamp(c.pop+14,0,97);c.streak=Math.max(c.streak,3);c.purse=purseFor(c);
    if(Math.random()<.7){const a=list[ri(1,4)],b=list[ri(5,8)];a.rivals.push(b.id);b.rivals.push(a.id)}
  }
  S.next={num:S.promos[pid].num+1,week:3,type:'TV',venue:1,bouts:[]};
  computeRanks();
  // previous matchmaker left two bouts booked
  const div=pick(DIVS),c=Object.values(S.F).find(f=>f.id===S.promos[pid].champs[div]);
  const {list}=ranked(pid,div);const ch=list.find(f=>f.id!==c.id&&RANK[f.id]>=1);
  if(pid!=='GFL')S.next.bouts.push({a:c.id,b:ch.id,title:true});
  else S.next.bouts.push({a:list[0].id===c.id?list[1].id:list[0].id,b:list[2].id,title:false});
  const d2=DIVS.find(d=>d!==div),l2=ranked(pid,d2).list;S.next.bouts.push({a:l2[3].id,b:l2[4].id,title:false});
  newGoal();
  const Pr=PROMOS[pid];
  addNews({tag:'business',outlet:'Cageside Wire',h:`${Pr.short} hires a new head of matchmaking`,b:`${Pr.name} has a new matchmaker. The first card, ${Pr.short} ${S.next.num}, is two weeks out with ${S.next.bouts.length} bouts already signed by the previous regime. Ownership wants bigger cards and a healthier bottom line.`});
  for(const id in PROMOS)if(id!==pid){const c2=S.F[S.promos[id].champs[pick(DIVS)]];
    addNews({tag:'rival',outlet:'The Ground Game',h:`${PROMOS[id].short} champion ${fname(c2)} wants a statement fight`,b:`${fname(c2)} (${rec(c2)}) says nobody in the ${PROMOS[id].short} ${DIVN[c2.div].toLowerCase()} division is ready. Rival promotions are paying attention.`})}
  save();
}

function computeRanks(){RANK={};CHAMPS=new Set();
  for(const id in PROMOS)for(const div of DIVS){const {champ,list}=ranked(id,div);if(champ){CHAMPS.add(champ.id);if(id!=='GFL')RANK[champ.id]=0}
    list.forEach((f,i)=>{if(i<15)RANK[f.id]=i+1})}}
function ranked(pid,div){const cid=S.promos[pid].champs[div];const champ=cid&&S.F[cid]&&S.F[cid].promo===pid?S.F[cid]:null;
  let list=Object.values(S.F).filter(f=>f.promo===pid&&f.div===div&&(pid==='GFL'||f!==champ));
  if(pid==='GFL')list.sort((a,b)=>(b.pts-a.pts)||(b.rs-a.rs));else list.sort((a,b)=>b.rs-a.rs);
  return{champ,list}}
const rk=f=>RANK[f.id]==null?99:RANK[f.id];
const rkLbl=f=>isChamp(f)&&f.promo!=='GFL'?'C':RANK[f.id]!=null?'#'+RANK[f.id]:'NR';

/* ============ odds, hype, acceptance ============ */
const ODDS=new Map();
const rsum=f=>Object.values(f.r).join('');
function odds(a,b,rounds,ring){if(ring===undefined)ring=!!(PROMOS[S.pid]||{}).ring;const k=`${a.id}${rsum(a)}|${b.id}${rsum(b)}|${rounds.join('')}|${ring}`;
  if(ODDS.has(k))return ODDS.get(k);
  const rng=seeded(hash(a.id,b.id,rsum(a),rsum(b)));let w=0,n=110;
  for(let i=0;i<n;i++){const x=simFight(a,b,{rounds,ring,rng});w+=x.w===0?1:x.w===-1?.5:0}
  const p=clamp(w/n,.04,.96);ODDS.set(k,p);return p}
function isFinale(){return S.pid==='GFL'&&S.season.ev===S.season.len}
function canTitle(a,b){
  if(a.div!==b.div)return false;
  if(S.pid==='GFL')return isFinale()&&rk(a)<=4&&rk(b)<=4;
  return (isChamp(a)&&rk(b)<=5)||(isChamp(b)&&rk(a)<=5)}
function boutInfo(a,b,o={}){
  const rounds=roundsFor(S.pid,o.title,o.main),p=odds(a,b,rounds),tags=[];
  let h=(a.pop+b.pop)/2*.6+6;
  if(o.title){h+=16;tags.push(['TITLE','acc'])}
  const ra=rk(a),rb=rk(b);
  if(S.pid==='GFL'&&!o.title&&ra<=6&&rb<=6){h+=12;tags.push(['PLAYOFF RACE','hot'])}
  else if(ra<=5&&rb<=5&&!o.title){h+=10;tags.push(['TOP 5',''])}else if(ra<=10&&rb<=10){h+=5}
  const close=1-Math.abs(p-.5)*2;h+=close*12;if(close>.78)tags.push(["PICK'EM",'hot']);
  if(p>.82||p<.18){h-=8;tags.push(['MISMATCH','bad'])}
  const sa=STRIKEY.includes(a.style),sb=STRIKEY.includes(b.style);
  if(sa&&sb){h+=6;tags.push(['FIREWORKS','hot'])}else if((sa&&b.style==='Wrestler')||(sb&&a.style==='Wrestler')){h+=3;tags.push(['STYLE CLASH',''])}
  h+=clamp(a.streak,0,5)+clamp(b.streak,0,5);
  if(a.rivals.includes(b.id)){h+=12;tags.push(['BAD BLOOD','hot'])}
  if(a.callout===b.id||b.callout===a.id){h+=8;tags.push(['CALLOUT','hot'])}
  for(const f of [a,b])if(f.persona==='Trash talker')h+=4;
  if(a.hist.some(x=>x.opp===b.id)){h+=5;tags.push(['REMATCH',''])}
  const g=Math.abs(DIVS.indexOf(a.div)-DIVS.indexOf(b.div));if(g){h+=8*g;tags.push([g>=2?'FREAK SHOW':'OPEN WEIGHT','hot'])}
  if(o.short){h-=6;tags.push(['SHORT NOTICE','bad'])}
  return{p,h:clamp(Math.round(h),5,99),tags,cost:(a.purse+b.purse)*1.25/1000,rounds}}
const QUOTES={champ:['The champ only takes title fights or real superfights.','Bring me a contender, not a tune-up.'],
  rank:["There's nothing to gain from fighting someone unranked.","Why would I fight down the rankings? Get me a name."],
  morale:["Pay me what I'm worth first.","I'm not fighting again on this contract."],
  short:["Not on short notice. I'm not in camp.","I'd need a full camp for that one."],
  size:["I'm not fighting a man that big.","Find someone in my weight class."]};
function accept(a,b,o={}){const rng=seeded(hash(a.id,b.id,S.week,o.short?1:0));
  for(const [x,y] of [[a,b],[b,a]]){
    if(x.morale<22)return{ok:false,who:x,q:pickr(rng,QUOTES.morale)};
    if(isChamp(x)&&S.pid!=='GFL'&&!o.title&&y.pop<60)return{ok:false,who:x,q:pickr(rng,QUOTES.champ)};
    if(rk(x)<=5&&rk(y)>12&&!o.short&&!isChamp(y)&&rng()<.7)return{ok:false,who:x,q:pickr(rng,QUOTES.rank)};
    if(o.short&&rng()<.3)return{ok:false,who:x,q:pickr(rng,QUOTES.short)};
    if(DIVS.indexOf(y.div)-DIVS.indexOf(x.div)>=2&&rng()<.5)return{ok:false,who:x,q:pickr(rng,QUOTES.size)};
  }return{ok:true}}

function cardInfo(){const n=S.next,inf=n.bouts.map((bt,i)=>{const a=S.F[bt.a],b=S.F[bt.b];return boutInfo(a,b,{title:bt.title,main:i===0,short:bt.short})});
  const live=n.bouts.map((b,i)=>b.out?null:inf[i]);
  const hs=live.map(x=>x?x.h:0);const rest=hs.slice(2,5),pre=hs.slice(5);
  while(rest.length<3)rest.push(10);
  let v=(hs[0]||0)*.42+(hs[1]||0)*.2+avg(rest)*.24+(pre.length?avg(pre):25)*.14;
  const cnt=live.filter(Boolean).length;if(cnt<8)v-=(8-cnt)*2.2;
  return{inf,hype:clamp(Math.round(v),0,99),count:cnt}}
function project(ci){ci=ci||cardInfo();const n=S.next,Pr=P(),pr=PS().prestige,h=ci.hype,v=VENUES[S.pid][n.venue];
  const fill=clamp(.22+h/100*.85+pr/500,.12,1),gate=v.cap*fill*v.tix/1e6;
  const buys=n.type==='PPV'?Math.round(60*h*h*(.5+pr/100)*(S.week-S.lastPPV<4?.7:1)):0;
  const ppv=buys*69.99*.5/1e6,tv=n.type==='TV'?Pr.tv*(.55+pr/250)*(.8+h/250):0,spons=h*.025;
  const purses=ci.inf.reduce((s,x,i)=>s+(n.bouts[i].out?0:x.cost),0),prod=n.type==='PPV'?2:1;
  const prize=S.pid==='GFL'&&isFinale()?n.bouts.filter(b=>b.title&&!b.out).length:0;
  const rev=gate+ppv+tv+spons,cost=purses+v.cost+prod+prize;
  return{fill,gate,buys,ppv,tv,spons,purses,venue:v.cost,prod,prize,rev,cost,profit:rev-cost,att:Math.round(v.cap*fill)}}

/* ============ news & inbox ============ */
const HANDLES=['cagesidecarl','kenji_ko','subhunter88','mma_math','ringrust_rob','gnp_gabby','judgesrblind','tko_tina','flyingknee_fan','thescorecard','doublelegdan','southpaw_sue','corner_stool','jabjabcross','calfkick_kev','tapout_tomo','rearnaked_rae','pressrow_pete'];
function posts(lines){return lines.map(t=>({u:'@'+pick(HANDLES),t,l:ri(40,9800)}))}
function addNews(n){n.wk=S.week;n.id=S.nid++;S.news.unshift(n);if(S.news.length>160)S.news.length=160}
function addInbox(it){it.id=S.iid++;it.wk=S.week;S.inbox.unshift(it);if(S.inbox.length>30)S.inbox.length=30}

const GOALS=[
  {k:'ppv',t:'Run a pay-per-view with card hype of 65 or more',wk:8},
  {k:'profit',t:'Make $2M+ profit on a single event',wk:6},
  {k:'titles',t:'Put two title fights on one card',wk:8,no:'GFL'},
  {k:'grade',t:'Earn a media grade of A− or better',wk:8},
  {k:'sign',t:'Sign a free agent rated 72+ OVR',wk:10},
  {k:'gate',t:'Draw 15,000+ fans to one event',wk:8}];
function newGoal(){const opts=GOALS.filter(g=>g.no!==S.pid&&g.k!==S.goal?.k);const g=pick(opts);S.goal={k:g.k,t:g.t,due:S.week+g.wk}}
function goalHit(k){if(S.goal&&S.goal.k===k){S.approval=clamp(S.approval+10,0,100);
  addInbox({type:'owner',title:'Ownership is pleased',body:`Goal met: ${S.goal.t}. Owner approval +10.`});S.goal=null;S.nextGoal=S.week+2}}

/* ============ AI events for rival promotions ============ */
function aiEvent(pid){const ps=S.promos[pid];ps.num++;const name=`${PROMOS[pid].short} ${ps.num}`;const res=[];
  const divs=[...DIVS].sort(()=>Math.random()-.5).slice(0,4);
  for(const div of divs){const {champ,list}=ranked(pid,div);const av=list.filter(f=>f.avail<=S.week&&f.id!=='me'&&!f.reserved);
    let a,b,title=false;
    if(champ&&champ.id!=='me'&&!champ.reserved&&champ.avail<=S.week&&Math.random()<.5&&av[0]){a=champ;b=av.find(f=>f!==champ);title=pid!=='GFL'}
    else if(av.length>=2){a=av[0];b=av[1]}
    if(!a||!b)continue;
    const x=simFight(a,b,{rounds:roundsFor(pid,title,res.length===0),ring:PROMOS[pid].ring});
    const p=odds(a,b,roundsFor(pid,title,false),PROMOS[pid].ring);
    applyResult(a,b,x,{title,ev:name,pid,p});res.push({a,b,x,title,p})}
  if(!res.length)return;
  const m=res[0],W=m.x.w===1?m.b:m.a,Lf=m.x.w===1?m.a:m.b;
  const lines=res.map(z=>{const w=z.x.w===1?z.b:z.a,l=z.x.w===1?z.a:z.b;return z.x.w===-1?`${fname(z.a)} and ${fname(z.b)} fought to a draw`:`${fname(w)} def. ${fname(l)} by ${z.x.method.toLowerCase()}${z.x.fin?` (R${z.x.rd})`:''}`});
  const up=res.find(z=>(z.x.w===0&&z.p<.35)||(z.x.w===1&&z.p>.65));
  addNews({tag:'rival',outlet:pick(['The Ground Game','Full Mount Media',pid==='RYU'?'Ringside Japan':'Cageside Wire']),
    h:m.x.w===-1?`${name} headliner ends in a draw`:m.title&&Lf.id!==W.id&&!isChamp(Lf)?`${name}: ${fname(W)} ${m.title?'wins':'beats'} ${fname(Lf)}${m.title?' for '+PROMOS[pid].short+' gold':''}`:`${name}: ${fname(W)} def. ${fname(Lf)}`,
    b:lines.join('. ')+'.',social:up?posts([`${PROMOS[pid].short} just delivered and you're all sleeping on it.`,`${fname(up.x.w===0?up.a:up.b)} as an underdog?? Called it.`]):null});
  ps.prestige=clamp(ps.prestige+rnd(-1,1.5),30,95)}

/* ============ applying results ============ */
function applyResult(A,B,x,ctx){
  const draw=x.w===-1,W=draw?null:(x.w===0?A:B),L=draw?null:(x.w===0?B:A);
  const evN=ctx.ev;
  if(draw){A.d++;B.d++;A.streak=0;B.streak=0}
  else{W.w++;L.l++;if(/KO/.test(x.method))W.ko++;if(/Submission/.test(x.method))W.sub++;
    W.streak=Math.max(1,W.streak+1);L.streak=Math.min(-1,L.streak-1);
    const upset=(x.w===0?ctx.p:1-ctx.p)<.4;
    W.rs+=6+Math.max(0,(L.rs-W.rs)*.3)+(x.fin?2:0);L.rs-=6+(L.streak<=-1?4:0)+(L.streak<=-2?4:0);
    W.pop=clamp(W.pop+((x.fin?5:3)+(upset?4:0)+(ctx.main?3:0))*(1-W.pop/115),0,99);L.pop=clamp(L.pop-3-(L.pop>70?1:0),0,99);
    W.morale=clamp(W.morale+8,0,100);L.morale=clamp(L.morale-8,0,100);
    if(ctx.pid==='GFL'){W.pts+=3+(x.fin?Math.max(0,4-x.rd):0)}
    if(ctx.title){const ps=S.promos[ctx.pid];if(ps.champs[W.div]!==W.id){ps.champs[W.div]=W.id;W.pop=clamp(W.pop+10,0,99)}}
    if(x.method==='Split decision'&&Math.random()<.6&&!W.rivals.includes(L.id)){W.rivals.push(L.id);L.rivals.push(W.id)}}
  for(const [f,o,res] of [[A,B,draw?'D':W===A?'W':'L'],[B,A,draw?'D':W===B?'W':'L']]){
    f.hist.unshift({wk:S.week,opp:o.id,on:fname(o),res,m:x.method,rd:x.rd,t:x.time,ev:evN,title:!!ctx.title});if(f.hist.length>12)f.hist.length=12;
    const koLoss=res==='L'&&/KO/.test(x.method);f.avail=S.week+(koLoss?ri(8,12):res==='W'?ri(3,5):ri(4,6))+(Math.random()<.08?ri(4,10):0);
    if(f.callout===o.id)f.callout=null;
    f.fights=Math.max(0,f.fights-1);
    const ups=f.id==='me'?0:f.age<28&&f.ovr<f.pot?1:f.age>33?-1:0;
    if(ups){for(let i=0;i<2;i++){const k=pick(Object.keys(f.r));f.r[k]=clamp(f.r[k]+ups*ri(1,2),35,99)}f.ovr=ovrOf(f.r)}
    if(f.fights===0&&f.promo!=='FA'&&f.id!=='me'){
      if(f.promo===S.pid){f.expiring=S.week+4;addInbox({type:'contract',fid:f.id,title:`${fname(f)}'s contract is up`,body:`${fname(f)} (${rec(f)}, ${DIVN[f.div]}) has fought out his deal. He walks in 4 weeks unless you re-sign him.`})}
      else f.fights=ri(3,5);}
  }
}

/* ============ weekly clock ============ */
function advanceWeek(){
  if(S.week>=S.next.week)return;
  S.week++;S.cash-=.25;
  const roster=Object.values(S.F).filter(mine);
  for(const f of roster){
    if(Math.random()<.006){f.avail=Math.max(f.avail,S.week+ri(4,12));
      const bi=S.next.bouts.findIndex(b=>b.a===f.id||b.b===f.id);
      if(bi>=0)withdraw(bi,f,'injury in training')}
    if(f.expiring&&S.week>=f.expiring){toFA(f,'contract expired')}
    if(S.week-((f.hist[0]||{}).wk||0)>14)f.morale=clamp(f.morale-1,0,100);
  }
  const off={TFC:0,GFL:1,RYU:2};
  for(const id in PROMOS)if(id!==S.pid&&(S.week+off[id])%3===0)aiEvent(id);
  const fa=Object.values(S.F).filter(f=>f.promo==='FA');
  if(fa.length&&Math.random()<.22){const f=fa.sort((a,b)=>b.ovr-a.ovr)[ri(0,Math.min(3,fa.length-1))],to=pick(Object.keys(PROMOS).filter(k=>k!==S.pid));
    f.promo=to;f.fights=ri(3,5);addNews({tag:'rival',outlet:'Cageside Wire',h:`${PROMOS[to].short} signs free agent ${fname(f)}`,b:`${fname(f)} (${rec(f)}, ${DIVN[f.div]}) has signed a multi-fight deal with ${PROMOS[to].name}.`})}
  if(S.week%5===0)for(let i=0;i<2;i++){const all={};for(const k in NAT)all[k]=1;const f=genFighter('FA',pick(DIVS),rnd(56,72),all,STYLE_W.GFL,ri(21,25));f.fights=0;S.F[f.id]=f;
    if(i===0)addNews({tag:'business',outlet:'Full Mount Media',h:`Prospect watch: ${fname(f)} is unsigned`,b:`The ${f.age}-year-old ${f.style.toLowerCase()} is ${rec(f)} on the regional scene and wants a big-league contract. Scouts like his ceiling.`})}
  // contender-series pipeline keeps every division deep enough to book
  if(S.week%4===0)for(const id in PROMOS)for(const div of DIVS){const n=Object.values(S.F).filter(f=>f.promo===id&&f.div===div).length;
    if(n<(id===S.pid?12:9)){const f=genFighter(id,div,rnd(60,71)+(id==='TFC'?1:-1),PROMOS[id].pool,STYLE_W[id],ri(22,26));f.fights=4;f.avail=S.week+1;S.F[f.id]=f;
      if(id===S.pid)addNews({tag:'business',outlet:'Full Mount Media',h:`${P().short} signs ${fname(f)} out of its contender series`,b:`The ${f.age}-year-old ${DIVN[div].toLowerCase()} ${f.style.toLowerCase()} (${rec(f)}) earns a four-fight deal after a statement win on the ${P().short} contender series.`})}}
  if(S.goal&&S.week>S.goal.due){S.approval=clamp(S.approval-6,0,100);addInbox({type:'owner',title:'Owner goal missed',body:`You missed the deadline: ${S.goal.t}. Owner approval −6.`});S.goal=null;S.nextGoal=S.week+1}
  if(!S.goal&&S.week>=S.nextGoal){newGoal();addInbox({type:'owner',title:'New directive from ownership',body:`${S.goal.t}. Deadline: week ${S.goal.due}.`})}
  if(S.week%52===0)for(const f of Object.values(S.F)){f.age++;
    if(f.age>=37&&Math.random()<.35&&!isChamp(f)&&retireOK(f)){addNews({tag:'business',outlet:'The Ground Game',h:`${fname(f)} retires at ${f.age}`,b:`${fname(f)} hangs up the gloves with a ${rec(f)} record.`});retireF(f)}}
  if(S.week===S.next.week)fightWeek();
  computeRanks();save();
}
// retiring removes a fighter from the world; never pull someone who is booked, and clear every reference to him
function retireOK(f){if(f.id==='me')return false;if(S.next&&S.next.bouts&&S.next.bouts.some(b=>b.a===f.id||b.b===f.id))return false;
  if(S.c){if(S.c.fight&&S.c.fight.opp===f.id)return false;if((S.c.offers||[]).some(o=>o.opp===f.id))return false}return true}
function retireF(f){const id=f.id;delete S.F[id];
  for(const o of Object.values(S.F)){if(o.rivals.length)o.rivals=o.rivals.filter(r=>r!==id);if(o.callout===id)o.callout=null}
  for(const p in S.promos)for(const d in S.promos[p].champs)if(S.promos[p].champs[d]===id)delete S.promos[p].champs[d];
  S.inbox=S.inbox.filter(i=>i.fid!==id&&i.tid!==id&&i.keep!==id);if(S.c&&S.c.callout===id)S.c.callout=null}
function toFA(f,why){const wasChamp=isChamp(f);const from=f.promo;f.promo='FA';f.expiring=null;f.fights=0;
  if(wasChamp){delete S.promos[from].champs[f.div];addNews({tag:'business',outlet:'Cageside Wire',h:`${PROMOS[from].short} champion ${fname(f)} walks away. The title is vacant`,b:`Negotiations broke down and ${fname(f)} is now a free agent. The ${DIVN[f.div].toLowerCase()} belt is vacant.`,social:posts(['Letting the champ walk is the worst decision in this sport.','Somebody is getting fired over this.'])});S.approval=clamp(S.approval-6,0,100)}
  else if(from===S.pid)addNews({tag:'business',outlet:'Full Mount Media',h:`${fname(f)} hits free agency`,b:`${fname(f)} (${rec(f)}) is no longer under contract with ${PROMOS[from].short}.`});
  const bi=S.next.bouts.findIndex(b=>b.a===f.id||b.b===f.id);if(bi>=0&&from===S.pid)withdraw(bi,f,why);
  S.inbox=S.inbox.filter(i=>!(i.type==='contract'&&i.fid===f.id))}
function withdraw(bi,f,why){const bt=S.next.bouts[bi];bt.out=f.id;const o=S.F[bt.a===f.id?bt.b:bt.a];
  addInbox({type:'withdraw',bi,fid:f.id,keep:o.id,title:`${fname(f)} is out of ${bi===0?'the main event':'his bout'}`,body:`Reason: ${why}. ${fname(o)} needs a replacement opponent or the bout gets scrapped on fight night.`});
  addNews({tag:'business',outlet:'Cageside Wire',h:`${fname(f)} withdraws from ${P().short} ${S.next.num}`,b:`${fname(f)} is off the card (${why}). ${fname(o)} is waiting on a new opponent.`,social:bi===0?posts(['Main event fell apart AGAIN.','Short-notice replacement incoming. Could be chaos.']):null})}
function fightWeek(){
  const n=S.next;
  n.bouts.forEach((bt,i)=>{if(bt.out)return;for(const id of [bt.a,bt.b]){const f=S.F[id];
    if(Math.random()<.035){f.avail=S.week+ri(5,10);withdraw(i,f,'injury during fight week');return}
    if(Math.random()<.03){f.morale-=5;addNews({tag:'business',outlet:'Full Mount Media',h:`${fname(f)} misses weight`,b:`${fname(f)} came in heavy and forfeits 20% of his purse. The bout goes ahead at a catchweight.`});}}});
  const m=n.bouts[0];if(m&&!m.out){const a=S.F[m.a],b=S.F[m.b];
    if(a.persona==='Trash talker'||b.persona==='Trash talker'||a.rivals.includes(b.id)){a.pop=clamp(a.pop+3,0,99);b.pop=clamp(b.pop+3,0,99);
      addNews({tag:'fans',outlet:'The Ground Game',h:`Press conference chaos: ${a.last} and ${b.last} have to be separated`,b:`Fight week heated up as ${fname(a)} and ${fname(b)} traded insults and a shove at the ${P().short} ${n.num} press conference. Both fighters gained popularity.`,social:posts([`${a.last} vs ${b.last} is personal now.`,'Ordering the PPV just for this.','Security earned their money today.'])})}
    else addNews({tag:'business',outlet:'Cageside Wire',h:`Fight week: ${fname(a)} and ${fname(b)} face off`,b:`Media day was calm and respectful. ${P().short} ${n.num} goes ahead this week.`});}
}

/* ============ inbox actions ============ */
function askFor(f){return Math.round(purseFor(f)*(1+f.pop/500+(isChamp(f)?.12:0)))}
function negotiate(f,mult,fights){
  const ask=askFor(f),offer=Math.round(ask*mult),pr=PS().prestige;
  const p=f.promo==='FA'?clamp(.4+(mult-1)*2.2+pr/300,.05,.95):clamp(.62+(mult-1)*2.4+f.morale/300,.05,.97);
  const ok=seeded(hash(f.id,S.week,mult))()<p;
  if(ok){const wasFA=f.promo==='FA';f.promo=S.pid;f.fights=fights;f.purse=offer;f.expiring=null;f.morale=clamp(f.morale+10,0,100);
    if(f.avail<S.week)f.avail=S.week;
    S.inbox=S.inbox.filter(i=>!(i.type==='contract'&&i.fid===f.id));
    if(wasFA){addNews({tag:'business',outlet:'Cageside Wire',h:`${P().short} signs ${fname(f)}`,b:`${fname(f)} (${rec(f)}, ${DIVN[f.div]}) signs a ${fights}-fight deal worth ${fk(offer)} per fight to show.`});if(f.ovr>=72)goalHit('sign')}
    else addNews({tag:'business',outlet:'Full Mount Media',h:`${fname(f)} re-signs with ${P().short}`,b:`${fname(f)} agrees to a new ${fights}-fight contract.`});
    computeRanks();return{ok:true,msg:`${fname(f)} signed for ${fk(offer)} per fight.`}}
  f.morale=clamp(f.morale-6,0,100);
  if(f.promo==='FA'&&Math.random()<.5){const to=pick(Object.keys(PROMOS).filter(k=>k!==S.pid));f.promo=to;f.fights=4;
    addNews({tag:'rival',outlet:'Cageside Wire',h:`${fname(f)} chooses ${PROMOS[to].short} over ${P().short}`,b:`${fname(f)} turned down a ${P().short} offer and signed with ${PROMOS[to].name}.`});
    return{ok:false,msg:`${fname(f)} turned you down and signed with ${PROMOS[to].short}.`}}
  return{ok:false,msg:`${fname(f)} rejected ${fk(offer)}. His camp says the number is too low.`}}

/* ============ event night ============ */
function startEvent(){const n=S.next;
  n.bouts=n.bouts.filter(b=>{if(b.out){addNews({tag:'business',outlet:'Cageside Wire',h:`${fname(S.F[b.a===b.out?b.b:b.a])}'s bout is scrapped`,b:'No replacement was found before fight night.'});return false}return true});
  if(n.bouts.length<4){toast('You need at least 4 bouts to run the event.');return}
  const ci=cardInfo(),proj=project(ci);
  const res=n.bouts.map((bt,i)=>{const a=S.F[bt.a],b=S.F[bt.b];
    return{bt,a:{id:a.id,name:fname(a),last:a.last,rec:rec(a),nick:a.nick,rank:rkLbl(a)},b:{id:b.id,name:fname(b),last:b.last,rec:rec(b),nick:b.nick,rank:rkLbl(b)},
      info:ci.inf[i],x:simFight(a,b,{rounds:ci.inf[i].rounds,ring:P().ring,pbp:true})}});
  const name=evName();
  U.ev={name,res,ci,proj,idx:res.length-1,shown:0,phase:'fight',bonus:{}};
  render();startReveal()}
function evName(){const n=S.next,m=n.bouts[0];const base=`${P().short} ${n.num}`;
  if(S.pid==='GFL'&&isFinale())return `${base}: Championships`;
  return m&&!m.out?`${base}: ${S.F[m.a].last} vs ${S.F[m.b].last}`:base}
let revealT=null;
function startReveal(){clearInterval(revealT);const ev=U.ev;if(!ev||ev.phase!=='fight')return;
  const total=ev.res[ev.idx].x.pbp.reduce((s,r)=>s+r.lines.length+1,0);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){ev.shown=total;renderArena();return}
  revealT=setInterval(()=>{ev.shown++;if(ev.shown>=total){clearInterval(revealT)}renderArena(true)},560)}
function finishEvent(){const ev=U.ev,n=S.next,pid=S.pid;
  let upsets=0,fins=0,splits=0,mism=0;const awarded=Object.keys(ev.bonus).filter(k=>ev.bonus[k]).length;
  for(const r of ev.res){const a=S.F[r.a.id],b=S.F[r.b.id];if(!a||!b)continue;const p=r.info.p;
    if((r.x.w===0&&p<.4)||(r.x.w===1&&p>.6))upsets++;if(r.x.fin)fins++;if(r.x.method==='Split decision')splits++;if(r.info.tags.some(t=>t[0]==='MISMATCH'))mism++;
    applyResult(a,b,r.x,{title:r.bt.title,ev:ev.name,pid,p,main:r===ev.res[0]})}
  for(const id in ev.bonus)if(ev.bonus[id]){const f=S.F[id];if(f)f.morale=clamp(f.morale+15,0,100)}
  const pr=ev.proj,bonusCost=awarded*.05,noise=rnd(.92,1.08);
  const rev=pr.rev*noise,profit=rev-pr.cost-bonusCost;
  const score=ev.ci.hype*.5+fins/ev.res.length*32+upsets*4-mism*5+ev.res.length*.8;
  const grade=score>=78?'A+':score>=72?'A':score>=66?'A−':score>=60?'B+':score>=54?'B':score>=48?'B−':score>=42?'C+':score>=36?'C':score>=30?'C−':score>=24?'D':'F';
  const gi='F D C− C C+ B− B B+ A− A A+'.split(' ').indexOf(grade);
  S.cash+=profit;S.approval=clamp(S.approval+clamp(profit*1.2,-10,5)+(gi-3)*.8,0,100);
  PS().prestige=clamp(PS().prestige+(score-48)/14,25,99);PS().num=n.num;
  if(n.type==='PPV')S.lastPPV=S.week;S.lastGrade=grade;
  const sum={name:ev.name,wk:S.week,grade,profit,rev,cost:pr.cost+bonusCost,buys:Math.round(pr.buys*noise),att:pr.att,hype:ev.ci.hype,type:n.type,
    results:ev.res.map(r=>({w:r.x.w===-1?null:(r.x.w===0?r.a.name:r.b.name),l:r.x.w===-1?null:(r.x.w===0?r.b.name:r.a.name),a:r.a.name,b:r.b.name,m:r.x.method,rd:r.x.rd,t:r.x.time,title:r.bt.title}))};
  S.events.unshift(sum);if(S.events.length>20)S.events.length=20;
  if(n.type==='PPV'&&ev.ci.hype>=65)goalHit('ppv');if(profit>=2)goalHit('profit');if(n.bouts.filter(b=>b.title).length>=2)goalHit('titles');if(gi>=8)goalHit('grade');if(pr.att>=15000)goalHit('gate');
  eventNews(ev,sum,upsets,splits);
  if(S.pid==='GFL'){if(isFinale()){S.season.n++;S.season.ev=1;for(const f of Object.values(S.F))if(f.promo==='GFL')f.pts=0;
      addNews({tag:'business',outlet:'Cageside Wire',h:`GFL Season ${S.season.n-1} is in the books`,b:'Champions are crowned and every fighter goes back to zero points. Season '+S.season.n+' starts with the next card.'})}
    else S.season.ev++}
  S.next={num:n.num+1,week:S.week+2,type:'TV',venue:1,bouts:[]};
  S.inbox=S.inbox.filter(i=>i.type!=='withdraw');
  computeRanks();postEventInbox(ev);
  U.ev=null;U.tab='news';U.nf='all';save();render();
  if(S.approval<=0){U.sheet={type:'fired'};render()}}
function eventNews(ev,sum,upsets,splits){const Pr=P(),outlet=S.pid==='RYU'?'Ringside Japan':'Cageside Wire';
  const lines=[];
  const goodC=['Card of the year. No notes.','Whoever booked this card deserves a raise.','Every fight delivered tonight.'],badC=[sum.type==='PPV'?'Paid $70 for that? Never again.':'Fell asleep by the co-main.','The matchmaker needs to go.','That card was all filler.'];
  addNews({tag:'business',outlet:'Tale of the Tape Daily',h:`${sum.name} report card: ${sum.grade}`,
    b:`${sum.att.toLocaleString()} fans in the building${sum.type==='PPV'?`, an estimated ${sum.buys.toLocaleString()} pay-per-view buys`:''}. Card hype going in was ${sum.hype}. The promotion ${sum.profit>=0?'made':'lost'} ${fm(Math.abs(sum.profit))} on the night.`,
    social:posts([pick('ABA'.includes(sum.grade[0])?goodC:badC),pick('ABA'.includes(sum.grade[0])?goodC:badC)]),grade:sum.grade});
  ev.res.slice().reverse().forEach((r,i)=>{const x=r.x;if(x.w===-1){addNews({tag:'results',outlet,h:`${r.a.name} and ${r.b.name} fight to a draw`,b:`The judges couldn't separate them after ${x.rd} rounds.`,social:posts(['A draw. Nobody is happy.','Run it back immediately.'])});return}
    const W=x.w===0?r.a:r.b,L=x.w===0?r.b:r.a,p=x.w===0?r.info.p:1-r.info.p,isMain=r===ev.res[0];
    const upset=p<.4,soc=[];let h;
    if(r.bt.title){const wf=S.F[W.id];h=L.rank==='C'?`${W.name} dethrones ${L.name} to win ${Pr.short} ${DIVN[wf.div].toLowerCase()} gold`:W.rank==='C'?`${W.name} retains the title with a ${x.method.toLowerCase()} of ${L.name}`:`${W.name} is the new ${Pr.short} ${DIVN[wf.div].toLowerCase()} champion`;
      soc.push(`NEW ERA. ${W.last} said it and did it.`);}
    else if(upset)h=`Upset: ${W.name} (${ml(p)}) stuns ${L.name}`;
    else if(/KO/.test(x.method))h=`${W.name} stops ${L.name} at ${x.time} of round ${x.rd}`;
    else if(/Submission/.test(x.method))h=`${W.name} taps ${L.name} with a ${x.method.replace(/Submission \(|\)/g,'')}`;
    else if(x.method==='Split decision'){h=`Split decision sparks debate as ${W.name} edges ${L.name}`;soc.push(`ROBBERY. ${L.last} won that fight.`,`Judges need to be investigated after ${W.last} vs ${L.last}.`)}
    else if(isMain||i>=ev.res.length-3)h=`${W.name} outworks ${L.name} over ${x.rd} rounds`;
    else return;
    if(upset)soc.push(`Had ${W.last} at ${ml(p)}. Drinks on me.`,`${L.last} fans real quiet right now.`);
    if(x.fin&&x.rd===1)soc.push(`Blink and you missed it. ${W.last} is a problem.`);
    if(!soc.length)soc.push(`${W.last} looked sharp tonight.`);
    addNews({tag:'results',outlet,h,b:`${W.name} def. ${L.name} by ${x.method.toLowerCase()} (R${x.rd}, ${x.time}).${x.cards?` Scorecards: ${x.cards.map(c=>c[x.w]+'-'+c[1-x.w]).join(', ')}.`:''}`,social:posts(soc.slice(0,3))})});}
function postEventInbox(ev){
  for(const r of ev.res){if(r.x.w===-1)continue;const W=S.F[r.x.w===0?r.a.id:r.b.id];if(!W||W.promo!==S.pid)continue;
    if((W.persona==='Trash talker'||W.persona==='Showman'||(r.x.fin&&Math.random()<.4))){
      let target=null;const {champ,list}=ranked(S.pid,W.div);
      if(champ&&champ.id!==W.id&&rk(W)<=5)target=champ;else{const above=list.filter(f=>f.id!==W.id&&rk(f)<rk(W));target=above[above.length-1]||list.find(f=>f.id!==W.id)}
      if(target){W.callout=target.id;addInbox({type:'callout',fid:W.id,tid:target.id,title:`${W.last} calls out ${target.last}`,body:`“${pick(['You\'re next. Sign the contract.','I want '+target.last+'. Book it.','Everybody knows who I want. '+target.first+', stop hiding.'])}” Booking it while it's fresh adds a hype bonus.`});
        addNews({tag:'fans',outlet:'The Ground Game',h:`${fname(W)} calls out ${fname(target)} after win`,b:`In the cage after his win, ${fname(W)} named his next target: ${fname(target)}.`,social:posts([`${W.last} vs ${target.last} next. Make it happen.`,`${target.last} wants no part of that.`])})}}
    if(S.pid!=='GFL'&&rk(W)===1&&W.streak>=2&&!W.promised)addInbox({type:'demand',fid:W.id,title:`${W.last} demands a title shot`,body:`${fname(W)} is the #1 contender on a ${W.streak}-fight win streak and wants the champion next.`})}}

/* ============ rendering ============ */
const ICONS={office:'<path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/>',card:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/>',roster:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5M16 4.5a3 3 0 0 1 0 6M18 14.5c1.7.7 2.7 2.4 3 5"/>',news:'<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 12.5h7M7 16h4"/>',world:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3"/>'};
const TABN={office:'Office',card:'Card',roster:'Roster',news:'News',world:'World'};
const svg=(p)=>`<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const UP='<path d="M6 15l6-6 6 6"/>',DOWN='<path d="M6 9l6 6 6-6"/>',XI='<path d="M6 6l12 12M18 6L6 18"/>';
function meter(v,hot){let s='';for(let i=0;i<20;i++)s+=`<i class="${i<Math.round(v/5)?'on':''}"></i>`;return `<div class="meter ${hot?'hot':''}">${s}</div>`}

function fitNames(root){root.querySelectorAll('.face .n,.bout .side b,.hero').forEach(el=>{el.style.fontSize='';let fs=parseFloat(getComputedStyle(el).fontSize),g=0;while(el.scrollWidth>el.clientWidth+1&&fs>13&&g++<30){fs-=1;el.style.fontSize=fs+'px'}})}
const BACK='<path d="M15 5l-7 7 7 7"/>',CHEV='<path d="M9 6l6 6-6 6"/>',PLUS='<path d="M12 5v14M5 12h14"/>',DOTS='<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>';
const PLAYI='<path d="M8 5l11 7-11 7z"/>',BOOKI='<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16"/>',RESETI='<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/>',USERI='<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21c1-4.2 3.8-6.5 7-6.5s6 2.3 7 6.5"/>',STARI='<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>';
let LASTVKEY=null,LASTSKEY=null,LASTSOPEN=null;
function sheetScrollKey(s){return [s.type,s.id,s.bi,s.a,s.b,s.div].join(':')}
function paint(html,vkey){const app=document.getElementById('app');
  const v=document.getElementById('view'),vt=v?v.scrollTop:0,sb=document.querySelector('.sheet .body'),st=sb?sb.scrollTop:0;
  const skey=U.sheet?sheetScrollKey(U.sheet):null;
  app.innerHTML=html;fitNames(app);
  const nv=document.getElementById('view');if(nv&&vkey===LASTVKEY)nv.scrollTop=vt;LASTVKEY=vkey;
  const ns=document.querySelector('.sheet .body');if(ns&&skey&&skey===LASTSKEY)ns.scrollTop=st;LASTSKEY=skey}
function topBar(brand,meta){return `<header class="top"><div class="wm">${brand}</div><div class="when"><span class="lbl">Year ${Math.floor((S.week-1)/52)+1}</span><b>Week ${(S.week-1)%52+1}</b></div>
  <div class="meta">${meta.map(([l,v,st])=>`<div><span class="lbl">${l}</span><b class="num"${st?` style="${st}"`:''}>${v}</b></div>`).join('')}</div><button class="x" data-act="menu" aria-label="Menu">${svg(DOTS)}</button></header>`}
function tabsBar(defs,badges){return `<nav class="tabs">${Object.keys(defs).map(t=>`<button data-act="tab" data-v="${t}" class="${U.tab===t?'on':''}" aria-label="${defs[t][0]}"${U.tab===t?' aria-current="page"':''}><span class="ic">${svg(defs[t][1])}</span>${defs[t][0]}${badges[t]?`<span class="dot">${badges[t]}</span>`:''}</button>`).join('')}</nav>`}
function ctaBar(info,sub,btns,last){return `<div class="cta${last?' last':''}"><div class="ci"><b>${info}</b>${sub?`<span>${sub}</span>`:''}</div><div class="cb">${btns}</div></div>`}
function divSeg(cur,act,extra=''){return `<div class="seg">${DIVS.map(d=>`<button class="${cur===d?'on':''}" data-act="${act}" ${extra} data-v="${d}" aria-label="${DIVN[d]}">${d}<small>${DIVLB[d]}</small></button>`).join('')}</div>`}
const MMTABS={office:['Office',ICONS.office],card:['Card',ICONS.card],roster:['Roster',ICONS.roster],news:['News',ICONS.news],world:['World',ICONS.world]};
function mmCTA(){const n=S.next,wk=n.week-S.week,ci=cardInfo(),b=`${ci.count} bout${ci.count===1?'':'s'}`;
  if(wk>0)return ctaBar(`${P().short} ${n.num} in ${wk} wk${wk>1?'s':''}`,`${b} booked · Hype ${ci.hype}`,`<button class="btn" data-act="advance">Next week</button>`);
  if(ci.count>=4)return ctaBar('Fight week',`${P().short} ${n.num} · ${b} · Hype ${ci.hype}`,`<button class="btn" data-act="run">Fight night</button>`);
  return ctaBar(`Need ${4-ci.count} more`,`${ci.count} of 4 bouts booked`,`<button class="btn ghost" data-act="askpostpone">Delay</button><button class="btn" data-act="book">Add bout</button>`)}
function render(){if(MGS||LIVE_ON)return;
  if(!S){document.body.className=U.start==='create'?'p-REG':'';LASTSOPEN=null;U.sheet=null;paint(`<div class="shell">${startScreen()}</div>`,'start:'+(U.start||''));return}
  computeRanks();
  const over=(U.sheet?sheetV():'')+(U.ev||(isCareer()&&U.cf)?'<div class="arena" id="arena"></div>':'')+(isCareer()&&U.mg?mgV():'');
  if(!U.sheet)LASTSOPEN=null;
  if(isCareer()){renderCareer(over);return}
  document.body.className='p-'+S.pid;if(!MMTABS[U.tab])U.tab='office';
  paint(`<div class="shell">${topBar(P().short,[['Cash',fm(S.cash),S.cash<0?'color:var(--loss)':''],['Owner',Math.round(S.approval)+'%',S.approval<30?'color:var(--loss)':'']])}
    <main class="view" id="view">${({office:officeV,card:cardV,roster:rosterV,news:newsV,world:worldV})[U.tab]()}</main>${mmCTA()}${tabsBar(MMTABS,{office:S.inbox.length,card:S.next.bouts.some(b=>b.out)?'!':0})}${over}</div>`,'mm:'+U.tab);
  if(U.ev)renderArena()}
function showToast(m){let el=document.getElementById('toast');if(el)el.remove();el=document.createElement('div');el.id='toast';el.className='toast';el.setAttribute('role','status');el.textContent=m;document.body.appendChild(el);clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.remove(),2600)}
function toast(m){render();showToast(m)}
function posterV(){const n=S.next,m=n.bouts[0],wk=n.week-S.week;let face;
  if(m){const a=S.F[m.a],b=S.F[m.b];face=`<div class="face"><div class="n" style="${nz(a.last)}">${esc(a.last)}<small>${rkLbl(a)} · ${rec(a)}</small></div><div class="vs">VS</div><div class="n r" style="${nz(b.last)}">${esc(b.last)}<small>${rkLbl(b)} · ${rec(b)}</small></div></div>${m.out?'<span class="tag bad">Main event needs a replacement</span>':''}`}
  else face=`<div class="tbd">Main event not booked</div>`;
  const ci=cardInfo();
  return `<section class="poster"><div class="ev"><h2>${P().short} ${n.num}</h2><span class="lbl">${wk<=0?'Fight week':`In ${wk} week${wk>1?'s':''}`} · ${n.type==='PPV'?'Pay-per-view':'TV Fight Night'}</span></div>
    ${S.pid==='GFL'?`<div class="lbl">Season ${S.season.n} · ${isFinale()?'Championship card':`Regular season event ${S.season.ev} of ${S.season.len-1}`}</div>`:''}
    ${face}<div class="hype"><span class="lbl">Card hype</span>${meter(ci.hype,true)}<b class="num">${ci.hype}</b></div>
    <div class="btns"><button class="btn sm ghost" data-act="tab" data-v="card">Build the card · ${ci.count} bout${ci.count===1?'':'s'}</button></div></section>`}
function officeV(){const ci=cardInfo(),pr=project(ci);
  const g=S.goal?`<div class="list"><div class="item"><div class="k"><span class="lbl">Owner directive</span><span class="tag ${S.goal.due-S.week<=2?'bad':''}">Due wk ${(S.goal.due-1)%52+1}</span></div><div class="t">${S.goal.t}</div></div></div>`:'';
  const last=S.events[0];
  return `${posterV()}
  <div class="stats"><div><span class="lbl">Prestige</span><b>${Math.round(PS().prestige)}</b></div><div><span class="lbl">Last grade</span><b>${S.lastGrade||'—'}</b></div><div><span class="lbl">Roster</span><b>${Object.values(S.F).filter(mine).length}</b></div><div><span class="lbl">Projected</span><b style="color:${pr.profit<0?'var(--loss)':'var(--win)'}">${fm(pr.profit)}</b></div></div>
  ${g}
  <section class="sec"><header><h3>Inbox</h3><span class="lbl">${S.inbox.length} item${S.inbox.length===1?'':'s'}</span></header>
  ${S.inbox.length?`<div class="list">${S.inbox.map(inboxItem).join('')}</div>`:'<div class="list"><div class="empty">Nothing needs you right now.</div></div>'}</section>
  ${last?`<section class="sec"><header><h3>Last event</h3><span class="lbl">${esc(last.name)}</span></header><div class="list">${last.results.slice(0,5).map(r=>`<div class="item"><div class="k"><span class="t">${r.w?esc(r.w)+' def. '+esc(r.l):esc(r.a)+' vs '+esc(r.b)+': draw'}</span>${r.title?'<span class="tag acc">Title</span>':''}</div><p>${r.m} · R${r.rd} ${r.t}</p></div>`).join('')}</div></section>`:''}`}
function inboxItem(i){const f=S.F[i.fid];let acts='';
  if(i.type==='contract'&&f&&f.promo===S.pid){const ask=askFor(f);acts=`<div class="btns"><button class="btn sm" data-act="neg" data-v="${f.id}" data-m="1">Pay ${fk(ask)}</button><button class="btn sm ghost" data-act="neg" data-v="${f.id}" data-m="0.85">Offer ${fk(Math.round(ask*.85))}</button><button class="btn sm ghost" data-act="letgo" data-v="${f.id}">Let go</button></div>`}
  if(i.type==='callout'&&f&&S.F[i.tid])acts=`<div class="btns"><button class="btn sm" data-act="bookpair" data-a="${i.fid}" data-b="${i.tid}">Look at the fight</button><button class="btn sm ghost" data-act="dismiss" data-v="${i.id}">Noted</button></div>`;
  if(i.type==='demand'&&f)acts=`<div class="btns"><button class="btn sm" data-act="promise" data-v="${i.id}">Promise the shot</button><button class="btn sm ghost" data-act="ignore" data-v="${i.id}">Make him wait</button></div>`;
  if(i.type==='withdraw'){const bi=S.next.bouts.findIndex(b=>b.out===i.fid);if(bi>=0)acts=`<div class="btns"><button class="btn sm" data-act="replace" data-v="${bi}">Find replacement</button><button class="btn sm ghost" data-act="scrap" data-v="${bi}">Scrap bout</button></div>`}
  if(!acts)acts=`<div class="btns"><button class="btn sm ghost" data-act="dismiss" data-v="${i.id}">Dismiss</button></div>`;
  return `<div class="item"><div class="k"><span class="t">${esc(i.title)}</span><span class="lbl">Wk ${(i.wk-1)%52+1}</span></div><p>${esc(i.body)}</p>${acts}</div>`}
function cardV(){const n=S.next,ci=cardInfo(),pr=project(ci),v=VENUES[S.pid],wk=n.week-S.week;
  const slot=i=>i===0?'Main event':i===1?'Co-main':i<5?'Main card':'Prelims';
  const bouts=n.bouts.map((bt,i)=>{const a=S.F[bt.a],b=S.F[bt.b],x=ci.inf[i];
    return `<button class="bout${bt.out?' out':''}" data-act="boutmenu" data-v="${i}" aria-label="Edit ${esc(a.last)} versus ${esc(b.last)}"><div class="slot"><span class="lbl"${i<2?' style="color:var(--acc)"':''}>${slot(i)} · ${x.rounds.length} rds · ${a.div===b.div?DIVN[a.div]:'Open weight'}</span>${svg(CHEV)}</div>
      <div class="vsrow"><div class="side"><b>${esc(a.last)}</b><span>${rkLbl(a)} · ${rec(a)} · ${ml(x.p)}</span></div><div class="mid"><em class="num">${bt.out?'—':x.h}</em><small>HYPE</small></div><div class="side r"><b>${esc(b.last)}</b><span>${ml(1-x.p)} · ${rec(b)} · ${rkLbl(b)}</span></div></div>
      <div class="foot"><div class="tags">${bt.out?`<span class="tag bad">${esc(S.F[bt.out].last)} withdrew</span>`:''}${x.tags.map(t=>`<span class="tag ${t[1]}">${t[0]}</span>`).join('')}</div><span class="lbl num">${fm(x.cost)}</span></div></button>`}).join('');
  return `<section class="poster slim"><div class="ev"><h2>${P().short} ${n.num}</h2><span class="lbl">${wk<=0?'Fight week':`Week ${(n.week-1)%52+1} · in ${wk} wk${wk>1?'s':''}`}</span></div>
    <div class="hype"><span class="lbl">Card hype</span>${meter(ci.hype,true)}<b class="num">${ci.hype}</b></div>
    <div class="lbl">${ci.count} of 12 bouts · ${ci.count<4?`${4-ci.count} more needed to run the event`:'Ready to run'}</div></section>
  <section class="sec"><header><h3>Bouts</h3><span class="lbl">${n.bouts.length?'Tap a bout to edit':''}</span></header>
   ${n.bouts.length?`<div class="list">${bouts}</div>`:'<div class="list"><div class="empty">No bouts booked yet. Start with your main event.</div></div>'}
   <button class="btn block" data-act="book" ${n.bouts.length>=12?'disabled':''}>${svg(PLUS)} Add a bout</button></section>
  <section class="sec"><header><h3>Broadcast</h3></header><div class="seg">${[['TV','TV Fight Night'],['PPV','Pay-per-view']].map(([k,l])=>`<button class="${n.type===k?'on':''}" data-act="etype" data-v="${k}">${l}</button>`).join('')}</div>
   <p class="hint">${n.type==='PPV'?'Pay-per-view earns big on a hyped card, costs more to produce, and loses buys if you run them back to back.':'TV pays a guaranteed rights fee. The safer choice for a thin card.'}</p></section>
  <section class="sec"><header><h3>Venue</h3></header><div class="list">${v.map((x,i)=>`<button class="opt${n.venue===i?' on':''}" data-act="venue" data-v="${i}"><span class="radio"></span><span><b>${x.n}</b><small>${x.cap.toLocaleString()} seats · $${x.tix} avg ticket</small></span><span class="lbl num">${fm(x.cost)}</span></button>`).join('')}</div></section>
  <section class="sec"><header><h3>Projected books</h3></header><div class="list"><div class="item"><div class="money num">
    <span>Gate · ${pr.att.toLocaleString()} fans (${Math.round(pr.fill*100)}%)</span><span>${fm(pr.gate)}</span>
    ${n.type==='PPV'?`<span>Pay-per-view · ${pr.buys.toLocaleString()} buys${S.week-S.lastPPV<4?' (fatigue)':''}</span><span>${fm(pr.ppv)}</span>`:`<span>TV rights fee</span><span>${fm(pr.tv)}</span>`}
    <span>Sponsors</span><span>${fm(pr.spons)}</span>
    <span>Fighter purses</span><span class="neg">${fm(-pr.purses)}</span><span>Venue + production</span><span class="neg">${fm(-(pr.venue+pr.prod))}</span>
    ${pr.prize?`<span>GFL champion prizes</span><span class="neg">${fm(-pr.prize)}</span>`:''}
    <hr><b>Projected profit</b><b class="${pr.profit<0?'neg':'pos'}">${fm(pr.profit)}</b></div></div></div></section>`}
function frow(f,showPromo){const b=(S.next?S.next.bouts:[]).some(x=>(x.a===f.id||x.b===f.id)&&x.out!==f.id),st=[];
  if(b)st.push('<span class="tag acc">Booked</span>');else if(f.avail>S.week)st.push(`<span class="tag bad">Out ${f.avail-S.week} wk</span>`);
  if(f.expiring)st.push('<span class="tag hot">Expiring</span>');if(f.morale<30)st.push('<span class="tag bad">Unhappy</span>');
  const c=isChamp(f);
  return `<button class="frow" data-act="fighter" data-v="${f.id}"><span class="rk ${c?'c':''}">${c&&f.promo!=='GFL'?'C':RANK[f.id]!=null?RANK[f.id]:'–'}</span>
   <span style="min-width:0"><div class="nm">${esc(fname(f))}${c&&f.promo==='GFL'?' <span class="tag acc">Champ</span>':''}</div><div class="sub"><span>${rec(f)}</span><span>${f.style}</span>${showPromo?`<span>${f.promo==='FA'?'Free agent':PROMOS[f.promo].short}</span>`:''}${S.pid==='GFL'&&f.promo==='GFL'?`<span>${f.pts} pts</span>`:''}${st.join('')}</div></span>
   <span class="ovr num">${f.ovr}<small>OVR</small></span></button>`}
function rosterV(){const {champ,list}=ranked(S.pid,U.div);const all=champ&&S.pid!=='GFL'?[champ,...list]:list;
  return `${divSeg(U.div,'div')}
  <section class="sec"><header><h3>${DIVN[U.div]}</h3><span class="lbl">${DIVLB[U.div]} lb · ${S.pid==='GFL'?'Season points':'Rankings'}</span></header>
  <div class="list">${all.map(f=>frow(f)).join('')}</div></section>`}
function newsV(){const F=[['all','All'],['results','Results'],['fans','Fans'],['rival',isCareer()?'MMA':'Rivals'],['business','Business']];
  const items=S.news.filter(n=>U.nf==='all'||n.tag===U.nf).slice(0,60);
  const TL={results:'Result',fans:'Fan buzz',rival:isCareer()?'Around MMA':'Rival promotion',business:'Business'};
  return `<div class="seg">${F.map(([k,l])=>`<button class="${U.nf===k?'on':''}" data-act="nf" data-v="${k}">${l}</button>`).join('')}</div>
  <div class="list">${items.length?items.map(n=>`<article class="news"><div class="src"><span class="tag ${n.tag==='results'?'acc':n.tag==='fans'?'hot':''}">${TL[n.tag]}</span><span>${n.outlet} · Wk ${(n.wk-1)%52+1}</span></div>
   <h4>${esc(n.h)}</h4><p>${esc(n.b)}</p>${n.social?n.social.map(s=>`<div class="post"><div class="h"><b>${s.u}</b><span>♥ ${s.l.toLocaleString()}</span></div><div>${esc(s.t)}</div></div>`).join(''):''}</article>`).join(''):'<div class="empty">No stories here yet.</div>'}</div>`}
function worldV(){const rivals=Object.keys(PROMOS).filter(k=>k!==S.pid);
  const fa=Object.values(S.F).filter(f=>f.promo==='FA').sort((a,b)=>b.ovr-a.ovr);
  const p4p=Object.values(S.F).filter(f=>f.promo!=='FA').map(f=>({f,s:f.ovr+clamp(f.streak,0,6)*.8+(isChamp(f)?4:0)})).sort((a,b)=>b.s-a.s).slice(0,10);
  return `<section class="sec"><header><h3>Rival promotions</h3></header>
  ${rivals.map(id=>{const p=PROMOS[id],ps=S.promos[id];return `<div class="list"><div class="item"><div class="k"><span style="font-family:var(--f-display);font-weight:900;font-size:24px;color:${p.color}">${p.short}</span><span class="lbl">Prestige ${Math.round(ps.prestige)} · Last event ${p.short} ${ps.num}</span></div>
   ${DIVS.map(d=>{const c=S.F[ps.champs[d]];return `<div class="k" style="font-size:14px"><span class="lbl">${DIVN[d]}</span><span>${c&&c.promo===id?`<button data-act="fighter" data-v="${c.id}" style="text-decoration:underline;text-underline-offset:3px">${esc(fname(c))}</button> ${rec(c)}`:'Vacant'}</span></div>`}).join('')}</div></div>`}).join('')}</section>
  <section class="sec"><header><h3>Free agents</h3><span class="lbl">${fa.length} available</span></header><div class="list">${fa.length?fa.map(f=>frow(f,false).replace('<span class="rk ">–</span>',`<span class="rk">${f.div}</span>`)).join(''):'<div class="empty">The market is empty. New prospects appear every few weeks.</div>'}</div></section>
  <section class="sec"><header><h3>Pound for pound</h3><span class="lbl">All promotions</span></header><div class="list">${p4p.map((x,i)=>frow(x.f,true).replace(/<span class="rk[^"]*">[^<]*<\/span>/,`<span class="rk">${i+1}</span>`)).join('')}</div></section>`}

/* ---------- sheets ---------- */
function sheetV(){const s=U.sheet,p=sheetParts(s);if(!p){U.sheet=null;LASTSOPEN=null;return ''}
  const ok=s.type+':'+(s.id||''),anim=ok!==LASTSOPEN;LASTSOPEN=ok;
  return `<div class="scrim${anim?' anim':''}"${p.lock?'':' data-act="scrim"'}><div class="sheet${anim?' anim':''}" role="dialog" aria-modal="true" aria-label="${esc(p.title)}">${p.lock?'':'<div class="grab" aria-hidden="true"></div>'}
    <header${p.lock?' class="lock"':''}>${p.back?`<button class="x" data-act="${p.back}" aria-label="Back">${svg(BACK)}</button>`:''}<h3>${esc(p.title)}</h3>${p.lock?'':`<button class="x" data-act="close" aria-label="Close">${svg(XI)}</button>`}</header>
    <div class="body">${p.body}</div>${p.foot?`<div class="sfoot">${p.foot}</div>`:''}</div></div>`}
function sheetParts(s){
  if(s.type==='fighter'){const f=S.F[s.id];if(!f)return null;const r=fighterSheet(f);return{title:fname(f),body:r.body,foot:r.foot,back:s.prev?'sback':null}}
  if(s.type==='book'){const r=bookSheet(s);return{title:r.title,body:r.body,foot:r.foot,back:s.b?'unB':(s.a&&s.replace==null?'unA':null)}}
  if(s.type==='bout')return boutSheet(s);
  if(s.type==='confirm')return{title:s.title,body:`<p style="margin:0">${s.body}</p>`,foot:`<button class="btn ghost" data-act="sback">Cancel</button><button class="btn warn" data-act="${s.act}" data-v="${s.v||''}">${s.yes}</button>`,back:s.prev?'sback':null};
  if(s.type==='fired')return{title:"You're fired",lock:true,body:`<p style="margin:0">Owner approval hit zero. ${P().name} has relieved you of your duties.</p>`,foot:`<button class="btn" data-act="restart">Start over</button>`};
  if(s.type==='menu')return menuSheet();
  if(s.type==='howto')return howtoSheet(s);
  if(CSHEET[s.type])return CSHEET[s.type](s);
  return null}
function boutSheet(s){const n=S.next,bt=n.bouts[s.bi];if(!bt)return null;const a=S.F[bt.a],b=S.F[bt.b],x=cardInfo().inf[s.bi],i=s.bi,last=n.bouts.length-1;
  const slot=i===0?'Main event':i===1?'Co-main event':i<5?'Main card bout':'Prelim bout';
  return{title:slot,body:`<div class="face"><div class="n" style="${nz(a.last)}">${esc(a.last)}<small>${rkLbl(a)} · ${rec(a)}</small></div><div class="vs">VS</div><div class="n r" style="${nz(b.last)}">${esc(b.last)}<small>${rkLbl(b)} · ${rec(b)}</small></div></div>
    <div class="tags">${bt.out?`<span class="tag bad">${esc(S.F[bt.out].last)} withdrew</span>`:''}${bt.title?'<span class="tag acc">Title fight</span>':''}${x.tags.filter(t=>t[0]!=='TITLE').map(t=>`<span class="tag ${t[1]}">${t[0]}</span>`).join('')}</div>
    <div class="money num"><span>${esc(a.last)} odds</span><span>${ml(x.p)}</span><span>${esc(b.last)} odds</span><span>${ml(1-x.p)}</span><span>Bout hype</span><span>${bt.out?'—':x.h}</span><span>Rounds</span><span>${x.rounds.length} (${x.rounds.join('/')} min)</span><span>Purses</span><span>${fm(x.cost)}</span></div>
    <div class="list">
     <button class="mrow" data-act="fighter" data-v="${a.id}">${svg(USERI)}<span>View ${esc(fname(a))}</span>${svg(CHEV)}</button>
     <button class="mrow" data-act="fighter" data-v="${b.id}">${svg(USERI)}<span>View ${esc(fname(b))}</span>${svg(CHEV)}</button>
     ${i>0?`<button class="mrow" data-act="mkmain" data-v="${i}">${svg(STARI)}<span>Make main event</span></button>`:''}
     <button class="mrow" data-act="mv" data-v="${i}" data-d="-1"${i===0?' disabled':''}>${svg(UP)}<span>Move up the card</span></button>
     <button class="mrow" data-act="mv" data-v="${i}" data-d="1"${i===last?' disabled':''}>${svg(DOWN)}<span>Move down the card</span></button>
     <button class="mrow danger" data-act="rm" data-v="${i}">${svg(XI)}<span>Remove bout</span></button></div>`,
   foot:bt.out?`<button class="btn" data-act="replace" data-v="${i}">Find a replacement</button>`:''}}
function menuSheet(){const who=isCareer()?`${esc(fname(ME()))} · ${rec(ME())}`:esc(P().name);
  return{title:'Menu',body:`<div class="lbl">${who} · Year ${Math.floor((S.week-1)/52)+1}, week ${(S.week-1)%52+1}</div>
   <div class="list"><button class="mrow" data-act="close">${svg(PLAYI)}<span>Resume</span></button><button class="mrow" data-act="howto">${svg(BOOKI)}<span>How to play</span>${svg(CHEV)}</button><button class="mrow danger" data-act="askreset">${svg(RESETI)}<span>New game</span>${svg(CHEV)}</button></div>
   <p class="hint">Your progress saves automatically on this device.</p>`}}
function howtoSheet(s){const sec=(h,l)=>`<div><h4>${h}</h4><ul>${l.map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
  const body=isCareer()?[
    sec('The weekly loop',['Take a fight offer from the <b>Home</b> tab.','You get <b>two training sessions</b> a week in the <b>Gym</b>. Unused sessions are lost.','Tap <b>Next week</b> at the bottom of any screen to move on. On fight week the same button becomes <b>Walk out</b>.']),
    sec('Training',['<b>Play</b> a drill for the biggest gains. You are graded S to D.','<b>Quick</b> gives an average result without playing.','Sparring trains everything but carries the most injury risk.','Fatigue over 40 costs you cardio on fight night. Rest to recover.']),
    sec('Fight camp',['Film study twice reveals his ratings, then his weakness.','A gameplan that attacks his weakness gets a bonus.','Promoting the fight raises your popularity and win bonus.']),
    sec('Fighting it yourself',['On fight night choose <b>Fight it yourself</b>. ◀ ▶ move, <b>Jab</b>, <b>Power</b> (hold for an overhand), <b>Kick</b> (hold for a head kick), <b>Shoot</b> for takedowns and <b>Block</b>.','Buttons change in the clinch and on the ground. Scrambles and submissions are tap battles.','Pause during a fight to see every control.']),
    sec('Climbing',['Win three regional fights to earn a Contender Showcase, then all three promotions bid for you.','Top-3 contenders get title shots (top 2 in the GFL).','Chin never improves and wears down. Ratings slip from age 31.'])]
  :[
    sec('The weekly loop',['Each event is two weeks apart. Tap <b>Next week</b> at the bottom of any screen.','Book <b>4 to 12 bouts</b> before fight week, then tap <b>Fight night</b>.']),
    sec('Booking',['<b>Card</b> tab, <b>Add a bout</b>: pick a fighter, pick an opponent, make the offer.','Fighters can refuse. Champions want contenders; top-5 fighters won\'t face unranked ones.','Tap any booked bout to move it, make it the main event, remove it, or replace an injured fighter.']),
    sec('Hype',['Close odds, rankings, rivalries, callouts, rematches and striker-vs-striker fights all add hype.','Mismatches and short-notice replacements cost hype.']),
    sec('Going live',['On fight night tap <b>Go live</b> on any bout to watch it play out, or take control of either fighter.']),
    sec('Business',['TV pays a flat fee. Pay-per-view pays on hype and fades if you run them back to back.','Bigger venues cost more but sell more tickets.','Meet owner directives. If owner approval hits zero, you are fired.'])];
  return{title:'How to play',back:s.prev?'sback':null,body:`<div class="howto" style="display:flex;flex-direction:column;gap:16px">${body.join('')}</div>`}}
function fighterSheet(f){const c=isChamp(f),mineF=!isCareer()&&mine(f),booked=(S.next?S.next.bouts:[]).some(x=>(x.a===f.id||x.b===f.id)&&x.out!==f.id);
  const h=f.hist.slice(0,6);
  const body=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div style="min-width:0">
     ${f.nick?`<div class="lbl" style="color:var(--acc)">“${esc(f.nick)}”</div>`:''}
     <div style="font-size:14px;color:var(--dim)">${f.nat} · Age ${f.age} · ${DIVN[f.div]} · ${PROMOS[f.promo]?PROMOS[f.promo].short:f.promo==='REG'?'Regional':'Free agent'}</div>
     <div class="tags" style="margin-top:6px">${c?'<span class="tag acc">Champion</span>':''}<span class="tag">${rkLbl(f)}</span><span class="tag">${f.style}</span><span class="tag">${f.persona}</span>${f.streak>=2?`<span class="tag good">W${f.streak}</span>`:f.streak<=-2?`<span class="tag bad">L${-f.streak}</span>`:''}</div></div>
     <div class="ovr num" style="font-size:40px">${f.ovr}<small>OVR${f.id==='me'?'':' · POT '+f.pot}</small></div></div>
   <div class="stats" style="grid-template-columns:repeat(3,1fr)"><div><span class="lbl">Record</span><b>${rec(f)}</b></div><div><span class="lbl">KO / SUB</span><b>${f.ko} / ${f.sub}</b></div><div><span class="lbl">Popularity</span><b>${f.pop}</b></div></div>
   <div style="display:flex;flex-direction:column;gap:7px">${Object.keys(RATING_LBL).map(k=>`<div class="bar"><span>${RATING_LBL[k]}</span><span class="tr"><i style="width:${f.r[k]}%"></i></span><b class="num">${f.r[k]}</b></div>`).join('')}</div>
   <div class="list"><div class="item"><div class="k"><span class="lbl">Contract</span><span>${f.promo==='FA'?`Asking ${fk(askFor(f))}/fight`:`${f.fights} fight${f.fights===1?'':'s'} left · ${fk(f.purse)} to show`}</span></div>
    ${f.id==='me'?'':`<div class="k"><span class="lbl">Morale</span><span>${f.morale>=70?'Happy':f.morale>=40?'Content':f.morale>=22?'Frustrated':'Refusing fights'} (${f.morale})</span></div>`}
    ${S.next?`<div class="k"><span class="lbl">Status</span><span>${booked?'Booked on the next card':f.avail>S.week?`Out until week ${(f.avail-1)%52+1}`:'Available'}</span></div>`:''}
    ${f.callout&&S.F[f.callout]?`<div class="k"><span class="lbl">Wants</span><span>${esc(fname(S.F[f.callout]))}</span></div>`:''}
    ${f.rivals.length?`<div class="k"><span class="lbl">Rivals</span><span>${f.rivals.filter(id=>S.F[id]).map(id=>esc(S.F[id].last)).join(', ')}</span></div>`:''}</div></div>
   ${h.length?`<section class="sec"><header><span class="lbl">Recent fights</span></header><div class="list">${h.map(x=>`<div class="item"><div class="k"><span class="t"><span class="tag ${x.res==='W'?'good':x.res==='L'?'bad':''}">${x.res}</span> ${esc(x.on)}</span><span class="lbl">Wk ${(x.wk-1)%52+1}</span></div><p>${x.m} · R${x.rd} ${x.t} · ${esc(x.ev)}${x.title?' · Title':''}</p></div>`).join('')}</div></section>`:''}`;
  let foot='';
  if(f.promo==='FA'&&!isCareer())foot=`<button class="btn ghost" data-act="sign" data-v="${f.id}" data-m="1.2">Overpay ${fk(Math.round(askFor(f)*1.2))}</button><button class="btn" data-act="sign" data-v="${f.id}" data-m="1">Offer ${fk(askFor(f))}</button>`;
  else if(mineF)foot=`<button class="btn ghost" data-act="askrelease" data-v="${f.id}">Release</button>${!booked&&f.avail<=S.next.week?`<button class="btn" data-act="bookfrom" data-v="${f.id}">Book a fight</button>`:''}`;
  return{body,foot}}
function availFor(f,ev){return mine(f)&&f.avail<=S.next.week&&!S.next.bouts.some((x,i)=>i!==ev&&(x.a===f.id||x.b===f.id))}
function bookSheet(s){const rep=s.replace!=null;
  if(!s.a){const {champ,list}=ranked(S.pid,s.div);const av=(champ&&S.pid!=='GFL'?[champ,...list]:list).filter(f=>availFor(f));
    return{title:'Book a bout',body:`<div class="lbl">Step 1 of 3 · Pick a fighter</div>${divSeg(s.div,'bdiv')}
     <div class="list">${av.length?av.map(f=>frow(f).replace('data-act="fighter"','data-act="pickA"')).join(''):'<div class="empty">Nobody in this division is available for this card.</div>'}</div>`}}
  const a=S.F[s.a];
  if(!s.b){const open=S.pid==='RYU',divs=open?DIVS:[a.div];
    let opp=[];for(const d of divs){const {champ,list}=ranked(S.pid,d);opp.push(...(champ&&S.pid!=='GFL'?[champ,...list]:list))}
    opp=opp.filter(f=>f.id!==a.id&&availFor(f,s.replace));
    const short=rep&&S.next.week-S.week<=2;
    return{title:rep?'Replacement':'Pick an opponent',body:`<div class="lbl">${rep?'Replacement':'Step 2 of 3'} · Opponent for ${esc(fname(a))}</div>
     ${open?'<p class="hint">RYUJIN allows open-weight fights. Bigger size gaps mean more hype and a real chance the smaller man says no.</p>':''}
     ${opp.length>1?'<p class="hint">Sorted by projected hype. The best match is on top.</p>':''}
     <div class="list">${opp.length?opp.map(f=>[f,boutInfo(a,f,{short})]).sort((x,y)=>y[1].h-x[1].h).map(([f,bi],i)=>{return `<button class="frow${i===0?' best':''}" data-act="pickB" data-v="${f.id}"><span class="rk${isChamp(f)?' c':''}">${rkLbl(f).replace('#','')}</span><span style="min-width:0"><div class="nm">${esc(fname(f))}</div><div class="sub"><span>${rec(f)}</span><span>${f.div!==a.div?f.div+' · ':''}${ml(1-bi.p)}</span>${bi.tags.slice(0,2).map(t=>`<span class="tag ${t[1]}">${t[0]}</span>`).join('')}</div></span><span class="ovr num" style="color:var(--hot)">${bi.h}<small>HYPE</small></span></button>`}).join(''):'<div class="empty">No available opponents.</div>'}</div>`}}
  const b=S.F[s.b],short=rep&&S.next.week-S.week<=2;
  const tOK=canTitle(a,b);if(!tOK)s.title=false;
  const main=rep?s.replace===0:S.next.bouts.length===0;
  const bi=boutInfo(a,b,{title:s.title,main,short});
  const row=(l,x,y,hi=true)=>`<span class="l${hi&&x>y?' bt':''}">${x}</span><span class="c">${l}</span><span class="${hi&&y>x?'bt':''}">${y}</span>`;
  return{title:'Make the offer',body:`${s.res?`<div class="quote">“${esc(s.res.q)}”<div class="lbl" style="margin-top:4px">${esc(fname(s.res.who))} turned it down</div></div>`:''}
   <div class="face"><div class="n" style="${nz(a.last)}">${esc(a.last)}<small>${rkLbl(a)} · ${rec(a)}</small></div><div class="vs">VS</div><div class="n r" style="${nz(b.last)}">${esc(b.last)}<small>${rkLbl(b)} · ${rec(b)}</small></div></div>
   <div class="hype"><span class="lbl">Bout hype</span>${meter(bi.h,true)}<b class="num">${bi.h}</b></div>
   <div class="tags">${bi.tags.map(t=>`<span class="tag ${t[1]}">${t[0]}</span>`).join('')||'<span class="tag">Standard bout</span>'}</div>
   ${tOK?`<div class="list"><button class="opt${s.title?' on':''}" data-act="ttl"><span class="check"></span><span><b>${S.pid==='GFL'?'Championship final':'Title fight'}</b><small>Five rounds with the belt on the line</small></span><span></span></button></div>`:''}
   <div class="tape num">${row('Odds',ml(bi.p),ml(1-bi.p),false)}${row('OVR',a.ovr,b.ovr)}${Object.keys(RATING_LBL).map(k=>row(RATING_LBL[k],a.r[k],b.r[k])).join('')}${row('Age',a.age,b.age,false)}${row('Popularity',a.pop,b.pop)}${row('Style',a.style,b.style,false)}</div>
   <div class="money num"><span>Purses (show + win)</span><span>${fm(bi.cost)}</span><span>Rounds</span><span>${bi.rounds.length} (${bi.rounds.join('/')} min)</span></div>`,
   foot:`<button class="btn ghost" data-act="unB">Change</button><button class="btn" data-act="offer">Offer fight</button>`}}
/* ---------- arena ---------- */
function renderArena(partial){const el=document.getElementById('arena');if(!el||!U.ev)return;const ev=U.ev;
  if(ev.phase==='summary'){el.innerHTML=summaryV();return}
  const r=ev.res[ev.idx],x=r.x,n=ev.res.length,pos=n-ev.idx;
  let shown=ev.shown,html='';
  for(const rd of x.pbp){if(shown<=0)break;shown--;html+=`<div class="rd">Round ${rd.rd}</div>`;for(const l of rd.lines){if(shown<=0)break;shown--;html+=`<p class="${l.big?'big':''}">${esc(l.t)}</p>`}}
  const total=x.pbp.reduce((s,q)=>s+q.lines.length+1,0),done=ev.shown>=total;
  const W=x.w===-1?null:(x.w===0?r.a:r.b);
  const verdict=done?`<div class="verdict"><span>${r.bt.title?'Title fight · ':''}${x.method}</span><h2>${W?esc(W.name):'Draw'}</h2><span>${W?'Wins':'No winner'} · R${x.rd} ${x.time}</span></div>
    ${x.cards?`<div class="cards3 num">${x.cards.map((c,j)=>`<div><span class="lbl">Judge ${j+1}</span><br>${c[0]}–${c[1]}</div>`).join('')}</div>`:''}
    <div class="tape num"><span class="l">${x.sig[0]}</span><span class="c">Sig. strikes</span><span>${x.sig[1]}</span><span class="l">${x.td[0]}</span><span class="c">Takedowns</span><span>${x.td[1]}</span><span class="l">${x.kd[0]}</span><span class="c">Knockdowns</span><span>${x.kd[1]}</span></div>`:'';
  const slot=ev.idx===0?'Main event':ev.idx===1?'Co-main':ev.idx<5?'Main card':'Prelims';
  if(partial){const p=document.getElementById('pbp');if(p){p.innerHTML=html;const v=document.getElementById('verd');if(v)v.innerHTML=verdict;const ab=el.querySelector('.abody');ab.scrollTop=ab.scrollHeight;
    const ft=el.querySelector('.afoot');if(ft&&done)ft.innerHTML=nextBtn(ev);return}}
  el.innerHTML=`<div class="ahead"><span style="font-family:var(--f-display);font-weight:900;font-size:20px;text-transform:uppercase">${esc(ev.name)}</span><span class="lbl">Bout ${pos} of ${n}</span></div>
   <div class="abody"><div class="lbl" style="color:var(--acc)">${slot}${r.bt.title?' · Title fight':''} · ${ml(r.info.p)} / ${ml(1-r.info.p)}</div>
    <div class="face"><div class="n" style="${nz(r.a.last)}">${esc(r.a.last)}<small>${r.a.rank} · ${r.a.rec}</small></div><div class="vs">VS</div><div class="n r" style="${nz(r.b.last)}">${esc(r.b.last)}<small>${r.b.rank} · ${r.b.rec}</small></div></div>
    <div class="pbp" id="pbp">${html}</div><div id="verd" style="display:flex;flex-direction:column;gap:10px">${verdict}</div></div>
   <div class="afoot">${done?nextBtn(ev):`<button class="btn ghost" data-act="golive">Go live</button><button class="btn ghost" id="nextb" data-act="skip">Skip to result</button>`}</div>`;
  if(ev.liveChoose&&!done){el.querySelector('.abody').insertAdjacentHTML('afterbegin',`<div class="list"><div class="item"><div class="lbl">Go live</div>
    <button class="mrow" data-act="livepick" data-v="w">${svg(PLAYI)}<span>Watch it live</span></button><button class="mrow" data-act="livepick" data-v="0">${svg(USERI)}<span>Play as ${esc(r.a.name)}</span></button><button class="mrow" data-act="livepick" data-v="1">${svg(USERI)}<span>Play as ${esc(r.b.name)}</span></button>
    <div class="lbl">Difficulty</div>${diffSeg('mdiff')}</div></div>`);el.querySelector('.abody').scrollTop=0;fitNames(el);return}
  fitNames(el);const ab=el.querySelector('.abody');ab.scrollTop=ab.scrollHeight}
function nextBtn(ev){return ev.idx>0?`<button class="btn" id="nextb" data-act="nextbout">Next bout</button>`:`<button class="btn" id="nextb" data-act="tosummary">Event results</button>`}
function summaryV(){const ev=U.ev,pr=ev.proj;
  if(!ev.cand){const c=[];const fotn=ev.res.filter(r=>!r.x.fin||r.x.rd>1).sort((a,b)=>(b.x.sig[0]+b.x.sig[1]+(b.x.kd[0]+b.x.kd[1])*20)-(a.x.sig[0]+a.x.sig[1]+(a.x.kd[0]+a.x.kd[1])*20))[0];
    if(fotn){c.push({k:'Fight of the Night',ids:[fotn.a.id,fotn.b.id],t:`${fotn.a.last} vs ${fotn.b.last}`})}
    ev.res.filter(r=>r.x.fin).sort((a,b)=>a.x.rd-b.x.rd||a.x.time.localeCompare(b.x.time)).slice(0,2).forEach(r=>{const W=r.x.w===0?r.a:r.b;c.push({k:'Performance of the Night',ids:[W.id],t:`${W.name}: ${r.x.method}`})});
    ev.cand=c;c.forEach(x=>x.ids.forEach(id=>ev.bonus[id]=true))}
  const nb=Object.values(ev.bonus).filter(Boolean).length;
  return `<div class="ahead"><span style="font-family:var(--f-display);font-weight:900;font-size:20px;text-transform:uppercase">${esc(ev.name)}</span><span class="lbl">Final</span></div>
   <div class="abody"><div class="list">${ev.res.map(r=>{const W=r.x.w===-1?null:(r.x.w===0?r.a:r.b),L=W?(W===r.a?r.b:r.a):null;return `<div class="item"><div class="k"><span class="t">${W?`${esc(W.name)} def. ${esc(L.name)}`:`${esc(r.a.name)} vs ${esc(r.b.name)}: draw`}</span>${r.bt.title?'<span class="tag acc">Title</span>':''}</div><p>${r.x.method} · R${r.x.rd} ${r.x.time}</p></div>`}).join('')}</div>
   <section class="sec"><header><h3>Bonuses</h3><span class="lbl">$50K each · raises morale</span></header><div class="list">${ev.cand.map(c=>c.ids.map(id=>`<div class="item"><div class="k"><span><span class="lbl">${c.k}</span><br>${esc(S.F[id]?fname(S.F[id]):'')}${c.ids.length===1?' · '+esc(c.t.split(': ')[1]):''}</span><button class="chip ${ev.bonus[id]?'on':''}" data-act="bonus" data-v="${id}">${ev.bonus[id]?'Awarded':'Award'}</button></div></div>`).join('')).join('')}</div></section>
   <section class="sec"><header><h3>The books</h3></header><div class="list"><div class="item"><div class="money num">
    <span>Attendance ${pr.att.toLocaleString()}</span><span>${fm(pr.gate)}</span>${ev.proj.buys?`<span>PPV buys ${pr.buys.toLocaleString()}</span><span>${fm(pr.ppv)}</span>`:`<span>TV rights</span><span>${fm(pr.tv)}</span>`}<span>Sponsors</span><span>${fm(pr.spons)}</span>
    <span>Expenses</span><span class="neg">${fm(-pr.cost)}</span><span>Bonuses</span><span class="neg">${fm(-nb*.05)}</span><hr><b>Estimated profit</b><b class="${pr.profit-nb*.05<0?'neg':'pos'}">${fm(pr.profit-nb*.05)}</b></div><p>Final numbers land within a few percent once the buy rate settles.</p></div></div></section></div>
   <div class="afoot"><button class="btn" data-act="finish">Finish event</button></div>`}

/* ============ live-fight settings ============ */
function lsGet(k,d){try{return localStorage.getItem(k)||d}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
const DIFFS=[['easy','Easy'],['normal','Normal'],['hard','Hard']];
function diffSeg(act){const cur=lsGet('cr.diff','normal');return `<div class="seg">${DIFFS.map(([k,l])=>`<button class="${cur===k?'on':''}" data-act="${act}" data-v="${k}">${l}</button>`).join('')}</div>`}

/* ============ QUICK FIGHT ============ */
const QARENA=[['TFC','TFC',false],['GFL','GFL',false],['RYU','RYUJIN',true],['REG','Gym',false]];
function quickFighter(style,side){const nat=pick(Object.keys(NAT)),mod=STYLES[style],r={};
  for(const k of Object.keys(RATING_LBL))r[k]=clamp(Math.round(72+(mod[k]||0)*.8+rnd(-4,4)),45,95);
  return{id:'q'+side+Math.floor(Math.random()*1e6),first:pick(NAT[nat].f),last:pick(NAT[nat].l),nat,style,r,ovr:ovrOf(r),div:'MW'}}
function qfInit(){const q=U.qf||(U.qf={my:'Striker',op:'random',arena:'TFC',rounds:3});
  if(!q.a||q.a.style!==q.my)q.a=quickFighter(q.my,0);
  const os=q.op==='random'?pick(Object.keys(STYLES)):q.op;if(!q.b||(q.op!=='random'&&q.b.style!==q.op))q.b=quickFighter(os,1);return q}
function quickV(){const q=qfInit();
  if(q.res){const x=q.res,W=x.w<0?null:x.w===0?q.a:q.b;
    return `<main class="view notop" id="view"><div><div class="lbl">Quick fight result</div><h2 class="hero2">${x.w===0?'You <span>win</span>':x.w===1?'You <span>lose</span>':'<span>Draw</span>'}</h2></div>
     <div class="list"><div class="item"><div class="k"><span class="t">${W?esc(fname(W))+' wins':'The judges split it'}</span><span class="lbl">${x.fin?`R${x.rd} ${x.time}`:'Decision'}</span></div><p>${esc(x.method)}</p></div></div>
     <div class="tape num"><span class="l"><b>${esc(q.a.last)}</b></span><span class="c"></span><span><b>${esc(q.b.last)}</b></span><span class="l">${x.sig[0]}</span><span class="c">Landed</span><span>${x.sig[1]}</span><span class="l">${x.td[0]}</span><span class="c">Takedowns</span><span>${x.td[1]}</span><span class="l">${x.kd[0]}</span><span class="c">Knockdowns</span><span>${x.kd[1]}</span></div>
     </main>${ctaBar('Run it back?','Same fighters, new fight',`<button class="btn ghost" data-act="qnew">New fight</button><button class="btn" data-act="qgo">Rematch</button>`,true)}`}
  const seg=(k,opts,cls='')=>`<div class="seg ${cls}">${opts.map(([v,l])=>`<button class="${String(q[k])===String(v)?'on':''}" data-act="qset" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const st=Object.keys(STYLES).map(s=>[s,s]);
  const card=(F,lbl)=>`<div class="item"><div class="k"><span class="lbl">${lbl}</span><span class="tag">${F.style}</span></div><div class="k" style="align-items:center"><span class="t" style="font-size:18px">${esc(fname(F))}</span><span class="ovr num">${F.ovr}<small>OVR</small></span></div></div>`;
  return `<main class="view notop" id="view"><div><button class="btn ghost sm" data-act="smode" data-v="">${svg(BACK)} Back</button></div>
   <div><div class="lbl">Quick fight</div><h2 class="hero2">Step into the <span>cage</span></h2></div>
   <div class="list">${card(q.a,'Red corner · you')}${card(q.b,'Blue corner · CPU')}</div>
   <button class="btn ghost sm" data-act="qroll">New opponent</button>
   <section class="sec"><header><h3>Your style</h3></header>${seg('my',st,'g3')}</section>
   <section class="sec"><header><h3>Opponent</h3></header>${seg('op',[['random','Random'],...st],'g3')}</section>
   <section class="sec"><header><h3>Arena</h3></header>${seg('arena',QARENA.map(a=>[a[0],a[1]]))}</section>
   <section class="sec"><header><h3>Rounds</h3></header>${seg('rounds',[[1,'1 round'],[3,'3 rounds'],[5,'5 rounds']])}</section>
   <section class="sec"><header><h3>Difficulty</h3></header>${diffSeg('qdiff')}</section>
  </main>${ctaBar(`${esc(q.a.last)} vs ${esc(q.b.last)}`,`${q.rounds} × 5 min · ${QARENA.find(a=>a[0]===q.arena)[1]}`,`<button class="btn" data-act="qgo">Fight!</button>`,true)}`}
function qfGo(){const q=qfInit();q.res=null;const ar=QARENA.find(a=>a[0]===q.arena);
  openLive({a:q.a,b:q.b,rounds:Array(+q.rounds).fill(5),ring:ar[2],arena:ar[0],human:0,diff:lsGet('cr.diff','normal'),canQuit:true,
    onEnd:x=>{if(x)q.res=x;render()}})}

/* ============ START SCREEN (both modes) ============ */
function startScreen(){
  if(U.start==='create')return createV();
  if(U.start==='quick')return quickV();
  const backBtn=`<div><button class="btn ghost sm" data-act="smode" data-v="">${svg(BACK)} Back</button></div>`;
  if(U.start==='mm')return `<main class="view notop nobot start" id="view">${backBtn}
   <div><div class="lbl">Matchmaker</div><h2 class="hero2">Pick your <span>promotion</span></h2></div>
   ${Object.values(PROMOS).map(p=>`<button class="pick" data-act="new" data-v="${p.id}"><div class="stripe" style="background:${p.color}"></div>
    <div class="lbl" style="color:${p.color}">${p.ring?'Ring':'Cage'} · Prestige ${p.prestige}</div><h2>${p.short}</h2>
    <div style="font-weight:600;padding-right:58px">${p.name}</div><p>${p.tag}</p>
    <ul>${p.rules.map(r=>`<li>${r}</li>`).join('')}</ul><span class="go">Run ${p.short} ${svg(CHEV)}</span></button>`).join('')}</main>`;
  return `<main class="view notop nobot start" id="view">
   <div><div class="lbl">An MMA sim from SpecMagic Games</div><h1 class="hero">Championship<br><span>Rounds</span></h1></div>
   <p class="hint" style="max-width:40ch">Three promotions. One sport. Pick your side of the cage.</p>
   <button class="pick" data-act="smode" data-v="create"><div class="stripe" style="background:#d98b4b"></div><div class="lbl" style="color:#d98b4b">Mode 1</div><h2>Fighter Career</h2>
    <p>Create a fighter, grind the regional circuit, earn a contract, and train through fight camps to become champion.</p>
    <ul><li>Five playable training drills</li><li>Fight camps, gameplans and callouts</li><li>Contracts, rivals and title runs</li></ul><span class="go">Create a fighter ${svg(CHEV)}</span></button>
   <button class="pick" data-act="smode" data-v="mm"><div class="stripe" style="background:#e9b53c"></div><div class="lbl" style="color:#e9b53c">Mode 2</div><h2>Matchmaker</h2>
    <p>Run TFC, GFL or RYUJIN. Build the cards, sell the fights, and keep the owner happy.</p>
    <ul><li>Bouts, title fights and pay-per-views</li><li>Contracts, injuries and free agency</li><li>Fan and media reaction to every card</li></ul><span class="go">Pick a promotion ${svg(CHEV)}</span></button>
   <button class="pick" data-act="smode" data-v="quick"><div class="stripe" style="background:#ea4452"></div><div class="lbl" style="color:#ea4452">Mode 3</div><h2>Quick Fight</h2>
    <p>Jump straight into a fight. Pick your style and an opponent, then take control.</p>
    <ul><li>Hands-on striking, clinch and ground game</li><li>Three difficulty levels</li></ul><span class="go">Fight now ${svg(CHEV)}</span></button></main>`}
const CR_PTS=20,CR_MAX=12;
function crDefault(){return{first:'',last:'',nick:'',nat:'USA',div:'LW',style:'All-rounder',persona:'Humble',pts:{str:0,pow:0,wre:0,grp:0,car:0,chn:0}}}
function crRatings(cr){const mod=STYLES[cr.style],r={};for(const k of Object.keys(RATING_LBL))r[k]=clamp(Math.round(50+(mod[k]||0)*.6+cr.pts[k]),35,80);return r}
const PERSONA_D={Humble:'Fans warm up to you slowly but steadily.',Showman:'Promotion work pays off more. Crowds love you.','Trash talker':'Bigger hype, bigger callouts. You will make enemies.'};
const STYLE_D={Striker:'Hands first. Good power, weaker on the mat.',Kickboxer:'Long-range kicks and volume. Takedowns are a problem.',Wrestler:'Takedowns, control, cardio.',BJJ:'Submissions from anywhere.',Brawler:'Big power and a granite chin. Gasses early.','All-rounder':'No holes, no superpowers.'};
function createV(){const cr=U.cr||(U.cr=crDefault()),r=crRatings(cr),used=Object.values(cr.pts).reduce((a,b)=>a+b,0),left=CR_PTS-used;
  const seg=(k,opts,cls='')=>`<div class="seg ${cls}">${opts.map(([v,l,sm])=>`<button class="${cr[k]===v?'on':''}" data-act="cset" data-k="${k}" data-v="${esc(v)}">${l}${sm?`<small>${sm}</small>`:''}</button>`).join('')}</div>`;
  return `<main class="view notop" id="view">
  <div><button class="btn ghost sm" data-act="smode" data-v="">${svg(BACK)} Back</button></div>
  <div><div class="lbl">Fighter career</div><h2 class="hero2">Create your <span>fighter</span></h2></div>
  <section class="sec"><header><h3>Identity</h3></header>
   <div class="grid2"><label class="field"><span class="lbl">First name</span><input type="text" id="cr-first" data-cr="first" maxlength="14" autocomplete="off" autocapitalize="words" enterkeyhint="next" value="${esc(cr.first)}" placeholder="Marcus"></label>
   <label class="field"><span class="lbl">Last name</span><input type="text" id="cr-last" data-cr="last" maxlength="16" autocomplete="off" autocapitalize="words" enterkeyhint="next" value="${esc(cr.last)}" placeholder="Reyes"></label></div>
   <div class="grid2"><label class="field"><span class="lbl">Nickname</span><input type="text" id="cr-nick" data-cr="nick" maxlength="18" autocomplete="off" autocapitalize="words" enterkeyhint="done" value="${esc(cr.nick)}" placeholder="Optional"></label>
   <label class="field"><span class="lbl">Country</span><select id="cr-nat" data-cr="nat">${Object.keys(NAT).map(k=>`<option${cr.nat===k?' selected':''}>${k}</option>`).join('')}</select></label></div></section>
  <section class="sec"><header><h3>Weight class</h3><span class="lbl">${DIVN[cr.div]}</span></header>${seg('div',DIVS.map(d=>[d,d,DIVLB[d]+' lb']))}</section>
  <section class="sec"><header><h3>Style</h3></header>${seg('style',Object.keys(STYLES).map(s=>[s,s]),'g3')}<p class="hint">${STYLE_D[cr.style]}</p></section>
  <section class="sec"><header><h3>Personality</h3></header>${seg('persona',Object.keys(PERSONA_D).map(s=>[s,s]))}<p class="hint">${PERSONA_D[cr.persona]}</p></section>
  <section class="sec"><header><h3>Attributes</h3><span class="lbl">${left} point${left===1?'':'s'} to spend</span></header>
  <div class="list"><div class="item" style="gap:10px">${Object.keys(RATING_LBL).map(k=>`<div class="step"><span>${RATING_LBL[k]}</span><span class="tr"><i style="width:${r[k]}%"></i></span><button class="icon-btn" data-act="cpt" data-k="${k}" data-v="-1" aria-label="Lower ${RATING_LBL[k]}"${cr.pts[k]<=0?' disabled':''}>−</button><b class="num">${r[k]}</b><button class="icon-btn" data-act="cpt" data-k="${k}" data-v="1" aria-label="Raise ${RATING_LBL[k]}"${left<=0||cr.pts[k]>=CR_MAX?' disabled':''}>+</button></div>`).join('')}
  <p>Chin can never be trained, and every war wears it down. Spend here if you plan to stand and trade.</p></div></div></section>
  </main>${ctaBar(`OVR ${ovrOf(r)}`,`${cr.style} · ${left?`${left} point${left===1?'':'s'} unspent`:'all points spent'}`,`<button class="btn" data-act="cgo">Start career</button>`,true)}`}
/* ============ CAREER CORE ============ */
const PLANS={
  Balanced:{n:'Balanced',d:'Fight your natural game and take what he gives you.',m:{}},
  Pressure:{n:'Pressure',d:'Walk him down and throw heat. More power, burns more gas.',m:{str:2,pow:4,car:-5},hits:'str',style:'Brawler'},
  Counter:{n:'Counter-strike',d:'Make him miss and make him pay. Sharper striking, fewer shots.',m:{str:5,pow:1,wre:-3},hits:'str'},
  Wrestle:{n:'Take him down',d:'Shoot early and often. Grind him on the mat.',m:{wre:5,str:-3},hits:'wre',style:'Wrestler'},
  Submit:{n:'Hunt the submission',d:'Drag it to the floor and chase the tap.',m:{grp:5,wre:2,str:-3},hits:'grp',style:'BJJ'}};
const WEAKTXT={str:'stand-up defense',wre:'takedown defense',grp:'defense on the ground'};
const PLANBONUS={str:['str','pow'],wre:['wre'],grp:['grp']};
const MGAMES={
  str:{n:'Mitt Work',stat:'Striking',w:{str:1,pow:.2},d:"Pads light up. Hit them before they go dark. Swinging at empty air costs you."},
  pow:{n:'Heavy Bag',stat:'Power',w:{pow:1,str:.2},d:'Hold to load up the shot. Release inside the green zone. Eight shots.'},
  wre:{n:'Takedown Drill',stat:'Wrestling',w:{wre:1,car:.2},d:'Tap SHOOT when the marker crosses the green window. The window shrinks every time you land one.'},
  grp:{n:'Scramble Drill',stat:'Grappling',w:{grp:1,wre:.2},d:'Match each direction before the clock runs out. Sixteen transitions, faster each time.'},
  car:{n:'Sprint Intervals',stat:'Cardio',w:{car:1},d:'Alternate LEFT and RIGHT as fast as you can for ten seconds. Same side twice does not count.'}};
const COACH={str:['Striking coach','Striking and power'],wre:['Wrestling coach','Wrestling'],grp:['Jiu-jitsu coach','Grappling'],car:['Strength & conditioning','Cardio, faster recovery']};
const COACH_COST=[40,120,350];
const coachOf=k=>k==='pow'?'str':k==='chn'?null:k;
const needXP=v=>Math.round(30+Math.max(0,v-50)*3.5);
const ME=()=>S.F.me,C=()=>S.c;
const isCareer=()=>!!S&&S.mode==='career';
const gradeOf=s=>s>=90?'S':s>=75?'A':s>=60?'B':s>=40?'C':'D';
const curShort=()=>ME().promo==='REG'?'PGFC':PROMOS[ME().promo].short;

function setupChamps(){for(const id in PROMOS)for(const div of DIVS){
  const list=Object.values(S.F).filter(f=>f.promo===id&&f.div===div).sort((a,b)=>b.rs-a.rs);
  const c=list[0];S.promos[id].champs[div]=c.id;c.pop=clamp(c.pop+14,0,97);c.streak=Math.max(c.streak,3);c.purse=purseFor(c);
  if(Math.random()<.7){const a=list[ri(1,4)],b=list[ri(5,8)];a.rivals.push(b.id);b.rivals.push(a.id)}}}
function newCareer(cr){
  NAMES=new Set();
  S={v:1,mode:'career',pid:null,week:1,nid:1,promos:{},F:{},news:[],inbox:[],iid:1,events:[],season:{n:1,ev:1,len:6}};
  for(const id in PROMOS)S.promos[id]={prestige:PROMOS[id].prestige,num:PROMOS[id].start,champs:{},last:null};
  for(const id in PROMOS)for(const div of DIVS)for(let i=0;i<17;i++){const base=id==='TFC'?0:-3;
    const tier=i<3?rnd(80,88)+base:i<8?rnd(69,79)+base:rnd(57,68)+base;const f=genFighter(id,div,tier,PROMOS[id].pool,STYLE_W[id]);S.F[f.id]=f}
  addSignature();setupChamps();
  const r=crRatings(cr);
  const me={id:'me',first:cr.first.trim()||'Rookie',last:cr.last.trim()||'Prospect',nick:cr.nick.trim(),nat:cr.nat,age:21,div:cr.div,style:cr.style,persona:cr.persona,r,ovr:ovrOf(r),pot:99,
    w:0,l:0,d:0,ko:0,sub:0,streak:0,pop:6,morale:80,promo:'REG',fights:0,purse:4,avail:1,rs:0,pts:0,hist:[],rivals:[],callout:null,expiring:null,promised:false};
  NAMES.add(me.first+me.last);S.F.me=me;
  S.c={money:5,coach:{str:0,wre:0,grp:0,car:0},fatigue:0,sessions:2,xp:{str:0,pow:0,wre:0,grp:0,car:0,chn:0},fight:null,offers:[],offerWk:0,contracts:[],
    regWins:0,regNum:46,injury:null,titles:0,defenses:0,earned:0,callout:null,last:null,dmg:0,best:null};
  computeRanks();genOffers();
  addNews({tag:'results',outlet:'Regional Combat Report',h:`${fname(me)} turns pro on the regional circuit`,b:`The 21-year-old ${DIVN[me.div].toLowerCase()} ${me.style.toLowerCase()} from ${me.nat} signs with Proving Grounds FC. Win three and a Contender Showcase is on the table.`,social:posts(['Another regional hopeful. Show me something.',`Keep an eye on ${me.last}.`])});
  for(const id in PROMOS){const c2=S.F[S.promos[id].champs[pick(DIVS)]];
    addNews({tag:'rival',outlet:'The Ground Game',h:`${PROMOS[id].short} champion ${fname(c2)} wants a statement fight`,b:`${fname(c2)} (${rec(c2)}) says nobody in the ${PROMOS[id].short} ${DIVN[c2.div].toLowerCase()} division is ready.`})}
  addInbox({type:'note',title:'Message from your manager',body:'Welcome to the pros. Win three on the regional circuit and I can get you on a Contender Showcase. Pick a fight below, then get to the gym.'});
  save();
}
function regOpp(tier){const all={};for(const k in NAT)all[k]=1;
  const f=genFighter('REG',ME().div,tier,all,STYLE_W.GFL,ri(21,31));
  f.w=ri(1,4)+Math.max(0,Math.round((tier-50)/3));f.l=ri(0,3);f.d=0;f.ko=Math.round(f.w*.5);f.sub=Math.min(f.w-f.ko,ri(0,2));f.pop=ri(2,12);f.streak=ri(0,2);
  S.F[f.id]=f;return f}
function genOffers(){const c=C(),me=ME();c.offers=[];c.offerWk=S.week;
  for(const f of Object.values(S.F))if(f.promo==='REG'&&f.id!=='me'&&!me.hist.some(h=>h.opp===f.id)&&!(c.fight&&c.fight.opp===f.id))retireF(f);
  if(me.promo==='REG'){
    if(c.regWins>=3){const o=regOpp(rnd(57,61));c.offers.push({opp:o.id,camp:5,purse:10,label:'Contender Showcase',note:'Every big promotion is watching. Win and the contracts come to you.',showcase:true,pop:5})}
    else{const t=50+c.regWins*3;const a=regOpp(t-4+rnd(-2,2)),b=regOpp(t+3+rnd(-2,2));
      c.offers.push({opp:a.id,camp:3,purse:3,label:'Tune-up',note:'Lower risk, lower reward.'});
      c.offers.push({opp:b.id,camp:4,purse:5,label:'Step up',note:'A bigger name on the local scene. Pays more and builds your name.',pop:3})}
  }else{
    const pid=me.promo,{champ,list}=ranked(pid,me.div);
    const order=champ&&pid!=='GFL'?[champ,...list]:list,idx=order.indexOf(me);
    const fwk=k=>Math.max(S.week+k,me.avail);
    const ok=(f,k)=>f&&f.id!=='me'&&!f.reserved&&f.avail<=fwk(k)&&!c.offers.some(o=>o.opp===f.id);
    const near=(target,k)=>{let best=null,bd=1e9;order.forEach((f,i)=>{if(ok(f,k)){const d=Math.abs(i-target);if(d<bd){bd=d;best=f}}});return best};
    const add=(f,o)=>{if(f&&ok(f,o.camp))c.offers.push({opp:f.id,purse:me.purse,...o})};
    if(isChamp(me)){[1,2,3].forEach(t=>add(near(t,5),{camp:5,title:true,label:t===1?'Title defense vs. the #1 contender':'Title defense',note:'Five rounds with your belt on the line.',purse:Math.round(me.purse*1.5)}))}
    else{
      const shot=pid==='GFL'?idx<=1:idx<=2;
      if(champ&&champ.id!=='me'&&shot)add(champ,{camp:6,title:true,label:'Title shot',note:'Five rounds for the belt. This is the one.',purse:Math.round(me.purse*1.5),pop:6});
      if(c.callout&&S.F[c.callout])add(S.F[c.callout],{camp:5,label:'Callout accepted',note:'He heard you. Now back it up.',hype:1,pop:2});
      const caller=order.find(f=>f.callout==='me');if(caller)add(caller,{camp:5,label:'Answer the callout',note:`${caller.last} called you out. Shut him up.`,hype:1,pop:2});
      add(near(idx-3,5),{camp:5,label:'Step up',note:'Higher ranked. Big jump in the rankings if you win.',pop:2});
      add(near(idx-1,4),{camp:4,label:'Even fight',note:'Someone right around your spot.'});
      add(near(idx+2,4),{camp:4,label:'Stay busy',note:'Lower ranked. Safer, but a smaller reward.'});
      if(Math.random()<.3)add(near(Math.max(0,idx-2),2),{camp:2,short:true,label:'Short notice',note:'Two weeks to prepare. Pays 50% more.',purse:Math.round(me.purse*1.5),pop:2});
      if(pid==='RYU'&&Math.random()<.4){const d2=DIVS[DIVS.indexOf(me.div)+(Math.random()<.5?1:-1)];
        if(d2){const f=ranked('RYU',d2).list.find(f=>ok(f,5)&&rk(f)<=8);add(f,{camp:5,label:'Open-weight spectacle',note:'A bigger crowd and a bigger risk.',purse:Math.round(me.purse*1.4),pop:4})}}
    }
    c.offers=c.offers.slice(0,4);
  }
  for(const o of c.offers)o.week=Math.max(S.week+o.camp,me.avail);
}
function fightRounds(f){const me=ME(),opp=S.F[f.opp];if(me.promo==='REG')return [5,5,5];
  return roundsFor(me.promo,f.title,f.title||(rk(me)<=5&&rk(opp)<=5))}
const fightRing=()=>ME().promo==='RYU';
function contractOffers(debut){const me=ME(),out=[];
  for(const id in PROMOS){let base;
    if(debut)base=(id==='TFC'?12:id==='GFL'?18:15)+me.pop*.5;
    else base=Math.max(me.purse*1.1,purseFor(me))*(id===me.promo?1:.9+Math.random()*.35)*(id==='GFL'?1.08:id==='RYU'?.96:1);
    out.push({pid:id,purse:Math.round(base),fights:4,note:!debut&&id===me.promo?'Re-sign and keep your spot in the rankings.':PROMOS[id].tag})}
  return out}
function trainGain(w,score){const c=C(),me=ME(),out=[];
  const age=me.age<=27?1.15:me.age<=31?1:me.age<=34?.7:.45,fat=1-c.fatigue/250;
  for(const k in w){const ck=coachOf(k);const mult=1+.25*(ck?c.coach[ck]:0);
    const g=Math.round((15+score*.45)*w[k]*mult*age*fat);if(g<1)continue;
    const from=me.r[k];c.xp[k]+=g;while(me.r[k]<99&&c.xp[k]>=needXP(me.r[k])){c.xp[k]-=needXP(me.r[k]);me.r[k]++}
    out.push({k,g,from,to:me.r[k]})}
  me.ovr=ovrOf(me.r);return out}
function useSession(fat,risk){const c=C();c.sessions--;c.fatigue=clamp(c.fatigue+fat,0,100);
  const p=risk+(c.fatigue>80?.12:0);
  if(!c.injury&&Math.random()<p){const k=pick(['str','pow','wre','grp','car']);c.injury={k,amt:ri(4,8),until:S.week+ri(2,5)};
    addInbox({type:'note',title:'Injured in training',body:`You tweaked something. ${RATING_LBL[k]} is down ${c.injury.amt} until week ${(c.injury.until-1)%52+1}. Resting speeds up recovery.`});return true}
  return false}
function careerWeek(){const c=C(),me=ME();
  if(c.fight&&S.week>=c.fight.week)return false;
  if(c.contracts.length){toast('Choose a contract before moving on.');return false}
  S.week++;c.sessions=2;c.fatigue=Math.max(0,c.fatigue-12-c.coach.car*3);
  if(c.injury&&S.week>=c.injury.until){addInbox({type:'note',title:'Cleared to train',body:`Your ${RATING_LBL[c.injury.k].toLowerCase()} injury has healed.`});c.injury=null}
  const off={TFC:0,GFL:1,RYU:2};for(const id in PROMOS)if((S.week+off[id])%3===0)aiEvent(id);
  if(S.week%52===0)yearTick();
  if(!c.fight&&!c.contracts.length&&(!c.offers.length||S.week-c.offerWk>=4)&&S.week>=me.avail-4){genOffers();
    if(c.offers.length)addInbox({type:'note',title:'New fight offers',body:`Your manager has ${c.offers.length} offer${c.offers.length>1?'s':''} on the table. Check the Home tab.`})}
  if(me.promo!=='REG'&&Math.random()<.06){const x=ranked(me.promo,me.div).list.find(f=>f.id!=='me'&&!f.reserved&&Math.abs(rk(f)-rk(me))<=3&&f.callout!=='me');
    if(x){x.callout='me';addNews({tag:'fans',outlet:'The Ground Game',h:`${fname(x)} calls out ${fname(me)}`,b:`“${pick(["He's overrated and I'll prove it.",'Put him in front of me.','Easy work. Book it.'])}” said ${fname(x)} this week.`,social:posts([`${me.last} has to answer that.`,`${x.last} is asking for it.`])})}}
  if(me.age>=40&&!U.sheet)U.sheet={type:'retire',forced:true};
  computeRanks();save();return true}
function yearTick(){const me=ME();
  for(const f of Object.values(S.F)){if(f.id==='me')continue;f.age++;if(f.promo==='GFL')f.pts=0;
    if(f.age>=37&&Math.random()<.35&&!isChamp(f)&&!f.reserved&&f.promo!=='REG'&&retireOK(f)){addNews({tag:'rival',outlet:'The Ground Game',h:`${fname(f)} retires at ${f.age}`,b:`${fname(f)} hangs up the gloves with a ${rec(f)} record.`});retireF(f)}}
  me.age++;if(me.promo==='GFL')me.pts=0;
  if(me.age>=31){const n=me.age>=34?3:2;for(let i=0;i<n;i++){const k=pick(['str','pow','car','wre','grp']);me.r[k]=clamp(me.r[k]-ri(1,2),35,99)}me.ovr=ovrOf(me.r);
    addInbox({type:'note',title:`Happy birthday. You're ${me.age}`,body:me.age>=34?'Your body is slowing down. Several ratings dipped.':'Father Time is catching up. A couple of ratings dipped.'})}}

function takeOffer(i){const c=C(),me=ME(),o=c.offers[i],opp=S.F[o.opp];
  c.fight={...o,intel:0,hype:o.hype||0,pid:me.promo};opp.reserved=true;c.offers=[];
  if(c.callout===opp.id)c.callout=null;
  addNews({tag:me.promo==='REG'?'results':'business',outlet:me.promo==='REG'?'Regional Combat Report':'Cageside Wire',h:`${o.title?'Title fight set':'Booked'}: ${fname(me)} vs ${fname(opp)}`,
    b:`${fname(me)} (${rec(me)}) meets ${fname(opp)} (${rec(opp)}) on the ${curShort()} card in week ${(c.fight.week-1)%52+1}.${o.short?' He took it on two weeks notice.':''}`,
    social:posts([pick([`${me.last} by ${pick(['KO','submission','decision'])}.`,`${opp.last} is a bad matchup for him.`,'Sneaky good fight.','Instant classic incoming.']),pick(['Book it.','Who saw this coming?',`${opp.last} wins this easy.`])])});
  save();render()}
function signContract(i){const c=C(),me=ME(),o=c.contracts[i],from=me.promo;
  if(from!==o.pid){
    if(from!=='REG'&&isChamp(me)){delete S.promos[from].champs[me.div];addNews({tag:'business',outlet:'Cageside Wire',h:`${fname(me)} leaves ${PROMOS[from].short} as champion. The belt is vacant`,b:`${fname(me)} signs with ${PROMOS[o.pid].name}, leaving the ${DIVN[me.div].toLowerCase()} title behind.`,social:posts(['Chasing the bag. Respect.','Walking away from the belt is wild.'])})}
    me.promo=o.pid;me.pts=0;
    if(from==='REG'){const l=ranked(o.pid,me.div).list.filter(f=>f.id!=='me');me.rs=Math.min(...l.map(f=>f.rs))-2}
    else me.rs=me.ovr+me.pop*.15;
  }
  me.purse=o.purse;me.fights=o.fights;c.contracts=[];c.callout=null;
  addNews({tag:'business',outlet:'Cageside Wire',h:from===o.pid?`${fname(me)} re-signs with ${PROMOS[o.pid].short}`:`${PROMOS[o.pid].short} signs ${fname(me)}`,
    b:`${fname(me)} (${rec(me)}) agrees to a ${o.fights}-fight deal worth ${fk(o.purse)} to show and ${fk(o.purse)} to win.`,social:posts([from==='REG'?`${me.last} in the big leagues. Let's see it.`:'Smart business.',`${PROMOS[o.pid].short} got a good one.`])});
  computeRanks();genOffers();save();render()}

/* ---------- training actions ---------- */
function needSession(){if(C().sessions<=0){toast('No sessions left this week. Advance to next week.');return false}return true}
function quickTrain(k){if(!needSession())return;const c=C(),sc=ri(52,64);const g=trainGain(MGAMES[k].w,sc);const hurt=useSession(Math.max(6,15-c.coach.car*2),.01);
  U.sheet={type:'trained',title:'Quick session',gains:g,note:`${MGAMES[k].n}. Coach graded it ${gradeOf(sc)} (${sc}). Play the drill yourself to score higher.${hurt?' You picked up an injury.':''}`};save();render()}
function spar(){if(!needSession())return;const c=C(),sc=ri(55,80);
  const g=trainGain({str:.45,pow:.35,wre:.45,grp:.45,car:.35},sc);const hurt=useSession(Math.max(12,26-c.coach.car*2),.09);
  const partner=pick(['a former title challenger','a hungry regional prospect','a heavyweight who went too hard','your head coach','a visiting kickboxer','an Olympic wrestler']);
  U.sheet={type:'trained',title:'Sparring',gains:g,note:`You went rounds with ${partner}.${hurt?' You came out of it injured.':' You walked away healthy.'}`};save();render()}
function rest(){if(!needSession())return;const c=C();c.sessions--;c.fatigue=Math.max(0,c.fatigue-35);
  if(c.injury){c.injury.until-=2;if(S.week>=c.injury.until){c.injury=null}}
  save();toast(c.injury?'Rested. Your injury is healing faster.':'Rested. Fatigue down.')}
function study(){const c=C(),f=c.fight;if(!f){toast('Study film once you have an opponent.');return}if(f.intel>=2){toast('You already know everything about him.');return}if(!needSession())return;
  c.sessions--;f.intel++;save();const opp=S.F[f.opp];
  U.sheet={type:'trained',title:'Film study',gains:[],note:f.intel===1?`You broke down ${fname(opp)}'s last fights. His real ratings are now in your scouting report.`:`Your coaches found it: ${fname(opp)}'s weakest area is his ${WEAKTXT[weakOf(opp)]}. Pick a gameplan that attacks it for a bonus.`};render()}
function promote(){const c=C(),f=c.fight,me=ME();if(!f){toast('Promote once a fight is booked.');return}if(f.hype>=3){toast('The fight is already as hyped as it gets.');return}if(!needSession())return;
  c.sessions--;f.hype++;const g=ri(2,4)+(me.persona==='Showman'?2:me.persona==='Trash talker'?1:0);me.pop=clamp(me.pop+g,0,99);
  const opp=S.F[f.opp];let note=`Interviews, social posts and a podcast run. Popularity +${g}. Fight hype ${f.hype}/3 raises your win bonus and fan growth.`;
  if(me.persona==='Trash talker'&&!me.rivals.includes(opp.id)){me.rivals.push(opp.id);opp.rivals.push('me');note+=` ${opp.last} took the bait. This one is personal now.`;
    addNews({tag:'fans',outlet:'The Ground Game',h:`${me.last} and ${opp.last} trade insults online`,b:`${fname(me)} went after ${fname(opp)} on a podcast this week, and ${opp.last} fired back.`,social:posts([`${me.last} is living in his head.`,'This is going to be violent.'])})}
  U.sheet={type:'trained',title:'Promotion',gains:[],note};save();render()}
function buyCoach(k){const c=C(),lvl=c.coach[k];if(lvl>=3)return;const cost=COACH_COST[lvl];
  if(c.money<cost){toast(`You need ${fk(cost)} to hire that coach.`);return}c.money-=cost;c.coach[k]++;save();toast(`${COACH[k][0]} upgraded to level ${c.coach[k]}.`)}
function weakOf(f){return ['str','wre','grp'].sort((a,b)=>f.r[a]-f.r[b])[0]}

/* ---------- mini games ---------- */
let MGS=null;
function mgStop(){if(MGS){cancelAnimationFrame(MGS.raf);MGS.cleanup&&MGS.cleanup();MGS=null}}
function mgLoop(fn){const step=now=>{if(!MGS)return;if(fn(now)!==false&&MGS)MGS.raf=requestAnimationFrame(step)};MGS.raf=requestAnimationFrame(step)}
function mgPlay(kind){const root=document.querySelector('#mg .mgbody');if(!root)return;mgStop();MGS={};({str:mgMitts,pow:mgBag,wre:mgTD,grp:mgScramble,car:mgSprint})[kind](root)}
function mgEnd(score){if(!U.mg||U.mg.phase!=='play')return;mgStop();const k=U.mg.kind,c=C();
  const gains=trainGain(MGAMES[k].w,score);const hurt=useSession(Math.max(6,15-c.coach.car*2),.01);
  U.mg={kind:k,phase:'done',score,gains,hurt};save();render()}
const $q=(r,s)=>r.querySelector(s);
function mgMitts(root){const L=['JAB','CROSS','HOOK','UPPER','BODY','HOOK','KICK','KNEE','ELBOW'];
  root.innerHTML=`<div class="hud"><span id="mgT">20.0</span><span id="mgS">0 hits</span></div><div class="pads">${L.map((l,i)=>`<button class="pad" data-i="${i}">${l}</button>`).join('')}</div><div class="fb" id="mgF"></div>`;
  const pads=[...root.querySelectorAll('.pad')],lit=new Map();let t0=null,next=0,hits=0,miss=0,spawned=0,streak=0;const D=20000;
  const flash=(el,c)=>{el.classList.add(c);setTimeout(()=>el.classList.remove(c),160)};
  pads.forEach((p,i)=>p.addEventListener('pointerdown',e=>{e.preventDefault();if(t0==null)return;
    if(lit.has(i)){lit.delete(i);p.classList.remove('lit');hits++;streak++;flash(p,'hit');$q(root,'#mgF').textContent=streak>=5?`${streak} in a row`:''}
    else{miss++;streak=0;flash(p,'miss');$q(root,'#mgF').textContent='Air ball'}
    $q(root,'#mgS').textContent=`${hits} hits`}));
  mgLoop(now=>{if(t0==null){t0=now;next=now+500}const el=now-t0,pr=el/D;
    if(el>=D){mgEnd(clamp(Math.round(hits/Math.max(1,spawned)*105-miss*4),0,100));return false}
    $q(root,'#mgT').textContent=((D-el)/1000).toFixed(1);
    if(now>=next){const free=[...Array(9).keys()].filter(i=>!lit.has(i));if(free.length){const i=free[Math.floor(Math.random()*free.length)];lit.set(i,now+950-pr*400);pads[i].classList.add('lit');spawned++}next=now+780-pr*380}
    for(const [i,exp] of lit)if(now>exp){lit.delete(i);pads[i].classList.remove('lit');streak=0}})}
function mgBag(root){root.innerHTML=`<div class="hud"><span id="mgN">Shot 1 / 8</span><span id="mgS">0 pts</span></div><div class="vmeter"><div class="zone" id="mgZ"></div><div class="fill" id="mgV"></div></div><div class="fb" id="mgF">Hold to load up</div><button class="btn bigbtn" id="mgB">Hold</button>`;
  const Z=$q(root,'#mgZ'),V=$q(root,'#mgV'),B=$q(root,'#mgB'),fb=$q(root,'#mgF');let shot=0,tot=0,v=0,dir=1,charging=false,last=null,zone;
  const nz=()=>{const w=15-shot;const lo=rnd(52,96-w);zone=[lo,lo+w];Z.style.bottom=lo+'%';Z.style.height=w+'%'};nz();
  const down=e=>{e.preventDefault();if(shot>=8)return;charging=true;v=0;dir=1;fb.textContent='Loading...'};
  const up=()=>{if(!charging)return;charging=false;let s,t;
    if(v>=zone[0]&&v<=zone[1]){s=100;t='Perfect'}else if(v>=zone[0]-7&&v<=zone[1]+7){s=60;t='Solid'}else{s=20;t=v<zone[0]?'Too early':'Overloaded'}
    tot+=s;shot++;fb.textContent=t;$q(root,'#mgS').textContent=`${tot} pts`;
    if(shot>=8){setTimeout(()=>mgEnd(Math.round(tot/8)),550);return}$q(root,'#mgN').textContent=`Shot ${shot+1} / 8`;nz()};
  B.addEventListener('pointerdown',down);B.addEventListener('pointerup',up);B.addEventListener('pointerleave',up);B.addEventListener('pointercancel',up);
  B.addEventListener('contextmenu',e=>e.preventDefault());
  mgLoop(now=>{const dt=last==null?0:Math.min(50,now-last);last=now;if(charging){v+=dir*dt*(.085+shot*.012);if(v>=100){v=100;dir=-1}if(v<=0){v=0;dir=1}}V.style.height=v+'%'})}
function mgTD(root){root.innerHTML=`<div class="hud"><span id="mgN">Shot 1 / 10</span><span id="mgS">0 landed</span></div><div class="track"><div class="zone" id="mgZ"></div><div class="mk" id="mgM"></div></div><div class="fb" id="mgF"></div><button class="btn bigbtn" id="mgB">Shoot</button>`;
  const Z=$q(root,'#mgZ'),M=$q(root,'#mgM'),fb=$q(root,'#mgF');let n=0,ok=0,pts=0,w=24,p=0,dir=1,last=null,c,lock=false;
  const nz=()=>{c=rnd(w/2+2,98-w/2);Z.style.left=(c-w/2)+'%';Z.style.width=w+'%'};nz();
  $q(root,'#mgB').addEventListener('pointerdown',e=>{e.preventDefault();if(lock)return;const d=Math.abs(p-c);n++;
    if(d<=w/2){ok++;pts+=10*(1-.4*d/(w/2));fb.textContent=d<w/6?'Perfect double-leg':'Takedown';w=Math.max(8,w-2.2)}else fb.textContent='Stuffed';
    $q(root,'#mgS').textContent=`${ok} landed`;
    if(n>=10){lock=true;setTimeout(()=>mgEnd(Math.round(pts)),550);return}$q(root,'#mgN').textContent=`Shot ${n+1} / 10`;nz()});
  mgLoop(now=>{const dt=last==null?0:Math.min(50,now-last);last=now;p+=dir*dt*(.055+n*.008);if(p>=100){p=100;dir=-1}if(p<=0){p=0;dir=1}M.style.left=p+'%'})}
function mgScramble(root){const A=['←','↑','→','↓'];
  root.innerHTML=`<div class="hud"><span id="mgN">1 / 16</span><span id="mgS">0 pts</span></div><div class="timebar"><i id="mgT"></i></div><div class="prompt" id="mgP"></div><div class="fb" id="mgF"></div>
   <div class="arrows"><span></span><button data-d="1" aria-label="Up">↑</button><span></span><button data-d="0" aria-label="Left">←</button><button data-d="3" aria-label="Down">↓</button><button data-d="2" aria-label="Right">→</button></div>`;
  const P=$q(root,'#mgP'),T=$q(root,'#mgT'),fb=$q(root,'#mgF');let i=0,pts=0,cur=null,win=1500,start=0,done=false;
  const next=()=>{if(i>=16){done=true;setTimeout(()=>mgEnd(clamp(Math.round(pts),0,100)),400);return}cur=Math.floor(Math.random()*4);win=1500-i*55;start=performance.now();P.textContent=A[cur];$q(root,'#mgN').textContent=`${i+1} / 16`};
  const after=()=>{i++;cur=null;P.textContent='';$q(root,'#mgS').textContent=`${Math.round(pts)} pts`;setTimeout(next,180)};
  const answer=d=>{if(done||cur==null)return;if(d===cur){const rem=1-(performance.now()-start)/win;pts+=4+2.25*rem;fb.textContent=rem>.6?'Slick':'Got it'}else fb.textContent='Lost position';after()};
  root.querySelectorAll('.arrows button').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();answer(+b.dataset.d)}));
  const key=e=>{const m={ArrowLeft:0,ArrowUp:1,ArrowRight:2,ArrowDown:3}[e.key];if(m!=null){e.preventDefault();answer(m)}};
  document.addEventListener('keydown',key);MGS.cleanup=()=>document.removeEventListener('keydown',key);
  next();mgLoop(now=>{if(done||cur==null)return;const f=(now-start)/win;T.style.width=Math.max(0,100-f*100)+'%';if(f>=1){fb.textContent='Too slow';after()}})}
function mgSprint(root){root.innerHTML=`<div class="hud"><span id="mgT">10.0</span><span id="mgS">0 reps</span></div><div class="timebar"><i id="mgB" style="width:100%"></i></div><div class="sprint"><button data-s="0" class="next">Left</button><button data-s="1" class="next">Right</button></div><div class="fb" id="mgF">Start tapping</div>`;
  let t0=null,taps=0,last=-1,done=false;const btns=[...root.querySelectorAll('.sprint button')];
  btns.forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();if(done)return;const s=+b.dataset.s;if(t0==null){t0=performance.now();$q(root,'#mgF').textContent='Go go go'}
    if(s!==last){taps++;last=s;btns.forEach(x=>x.classList.toggle('next',+x.dataset.s!==s));$q(root,'#mgS').textContent=`${taps} reps`}}));
  mgLoop(now=>{if(t0==null)return;const el=now-t0;$q(root,'#mgT').textContent=Math.max(0,(10000-el)/1000).toFixed(1);$q(root,'#mgB').style.width=Math.max(0,100-el/100)+'%';
    if(el>=10000){done=true;mgEnd(clamp(Math.round((taps-20)/55*100),0,100));return false}})}
function gainsV(g){const c=C(),me=ME();if(!g||!g.length)return '';
  return `<div style="display:flex;flex-direction:column;gap:8px;width:min(100%,380px)">${g.map(x=>`<div class="bar" style="grid-template-columns:86px 1fr auto"><span>${RATING_LBL[x.k]}</span><span class="tr"><i style="width:${Math.round(c.xp[x.k]/needXP(me.r[x.k])*100)}%"></i></span><b class="num">${x.from===x.to?x.to:`${x.from} → ${x.to}`} <span style="color:var(--win);font-weight:600">+${x.g} XP</span></b></div>`).join('')}</div>`}
function mgV(){const m=U.mg,g=MGAMES[m.kind];let body='';
  if(m.phase==='intro')body=`<div class="lbl">${g.stat} training</div><h2 style="font-size:52px;text-align:center">${g.n}</h2><p style="color:var(--dim);max-width:34ch;text-align:center;margin:0">${g.d}</p><button class="btn bigbtn" data-act="mgstart">Start</button>`;
  else if(m.phase==='done')body=`<div class="lbl">${g.n} complete</div><div class="grade" style="font-size:96px">${gradeOf(m.score)}</div><div class="lbl">Score ${m.score} / 100</div>${gainsV(m.gains)}${m.hurt?'<span class="tag bad">You picked up an injury</span>':''}<button class="btn bigbtn" data-act="mgclose">Back to the gym</button>`;
  return `<div class="mg" id="mg"><div class="ahead"><span style="font-family:var(--f-display);font-weight:900;font-size:20px;text-transform:uppercase">${g.n}</span><button class="x" data-act="mgquit" aria-label="Quit drill">${svg(XI)}</button></div><div class="mgbody">${body}</div></div>`}
/* ---------- career fight night ---------- */
let cfT=null;
function walkOut(){const c=C(),f=c.fight,me=ME(),opp=S.F[f.opp],pl=PLANS[U.cf.plan];
  const m={...me,r:{...me.r}};for(const k in pl.m)m.r[k]=clamp(m.r[k]+pl.m[k],30,99);if(pl.style)m.style=pl.style;
  if(f.intel>=2&&pl.hits===weakOf(opp))for(const k of PLANBONUS[pl.hits])m.r[k]+=4;
  if(c.fatigue>40)m.r.car=clamp(m.r.car-Math.round((c.fatigue-40)/3),30,99);
  if(c.injury&&c.injury.until>S.week)m.r[c.injury.k]=clamp(m.r[c.injury.k]-c.injury.amt,30,99);
  const rounds=fightRounds(f),ring=fightRing();
  const p=odds(me,opp,rounds,ring);
  if(U.cf.mode==='live'){const lm={...me,r:{...me.r}};
    if(c.fatigue>40)lm.r.car=clamp(lm.r.car-Math.round((c.fatigue-40)/3),30,99);
    if(c.injury&&c.injury.until>S.week)lm.r[c.injury.k]=clamp(lm.r[c.injury.k]-c.injury.amt,30,99);
    openLive({a:lm,b:opp,rounds,ring,arena:me.promo,human:0,diff:lsGet('cr.diff','normal'),title:!!f.title,canQuit:false,
      onEnd:x=>{U.cf={...U.cf,phase:'fight',x,p,shown:1e9};render()}});return}
  const x=simFight(m,opp,{rounds,ring,pbp:true});
  U.cf={...U.cf,phase:'fight',x,p,shown:0};render();cfReveal()}
function cfTotal(){return U.cf.x.pbp.reduce((s,r)=>s+r.lines.length+1,0)}
function cfReveal(){clearInterval(cfT);if(!U.cf||U.cf.phase!=='fight')return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){U.cf.shown=cfTotal();renderCF();return}
  cfT=setInterval(()=>{if(!U.cf){clearInterval(cfT);return}U.cf.shown++;if(U.cf.shown>=cfTotal())clearInterval(cfT);renderCF(true)},620)}
function applyCareerFight(){const c=C(),f=c.fight,me=ME(),opp=S.F[f.opp],x=U.cf.x,pid=me.promo;
  const won=x.w===0,draw=x.w===-1,wasChamp=isChamp(me),rkB=pid==='REG'?'Regional':rkLbl(me),popB=me.pop,chinB=me.r.chn,recB=rec(me);
  let ev;if(pid==='REG'){c.regNum++;ev=f.showcase?'Contender Showcase':`Proving Grounds ${c.regNum}`}else{S.promos[pid].num++;ev=`${PROMOS[pid].short} ${S.promos[pid].num}`}
  applyResult(me,opp,x,{title:!!f.title,ev,pid,p:U.cf.p,main:true});opp.reserved=false;
  if(won)me.pop=clamp(me.pop+f.hype*2+(f.pop||0)+(me.persona==='Showman'?1:0),0,99);
  let dmg=(!won&&/KO/.test(x.method)?2:0)+(x.sig[1]>90?1:0)+(Math.random()<.15?1:0);me.r.chn=clamp(me.r.chn-dmg,30,99);me.ovr=ovrOf(me.r);c.dmg+=dmg;
  const show=f.purse,winB=won?Math.round(f.purse*(1+f.hype*.1)):0;let bonus=0,bonusL='';
  if(pid!=='REG'&&won&&x.fin){bonus=50;bonusL='Performance of the Night'}else if(pid!=='REG'&&x.sig[0]+x.sig[1]>140&&Math.random()<.5){bonus=50;bonusL='Fight of the Night'}
  const ppv=pid!=='REG'&&f.title?Math.round(me.pop*5):0,total=show+winB+bonus+ppv;
  c.money+=total;c.earned+=total;
  let titleNote='';if(f.title&&won){if(wasChamp){c.defenses++;titleNote='Title defended'}else{c.titles++;titleNote='New champion'}}else if(f.title&&wasChamp&&!won&&!draw)titleNote='Title lost';
  if(pid==='REG'&&won)c.regWins++;
  if(f.showcase){if(won)c.contracts=contractOffers(true);else c.regWins=1}
  else if(pid!=='REG'&&me.fights<=0)c.contracts=contractOffers(false);
  me.morale=80;c.fight=null;c.offers=[];c.fatigue=Math.min(c.fatigue,30);c.offerWk=S.week;
  computeRanks();
  const rkA=pid==='REG'?'Regional':rkLbl(me);
  // news
  const out=x.rd===1&&x.fin,p=won?U.cf.p:1-U.cf.p,outlet=pid==='REG'?'Regional Combat Report':pid==='RYU'?'Ringside Japan':'Cageside Wire';let h,soc=[];
  if(draw){h=`${fname(me)} and ${fname(opp)} fight to a draw`;soc=['Nobody won tonight.','Run it back.']}
  else if(won){
    if(titleNote==='New champion'){h=`${fname(me)} is the new ${PROMOS[pid].short} ${DIVN[me.div].toLowerCase()} champion`;soc=[`From the regional circuit to the belt. ${me.last} did it.`,'NEW CHAMP.',`${opp.last} looked lost in there.`]}
    else if(titleNote==='Title defended'){h=`${fname(me)} defends the title against ${fname(opp)}`;soc=[`${me.last} is building a real reign.`,'Who even beats him?']}
    else if(p<.4){h=`Upset: ${fname(me)} (${ml(p)}) stuns ${fname(opp)}`;soc=[`Had ${me.last} at ${ml(p)}. Drinks on me.`,`${opp.last} fans real quiet.`]}
    else if(/KO/.test(x.method)){h=`${fname(me)} stops ${fname(opp)} in round ${x.rd}`;soc=[out?`Blink and you missed it. ${me.last} is a problem.`:`${me.last} has real power.`,'Somebody check on '+opp.last+'.']}
    else if(/Submission/.test(x.method)){h=`${fname(me)} taps ${fname(opp)}`;soc=[`${me.last}'s ground game is legit.`,'Smooth finish.']}
    else if(x.method==='Split decision'){h=`${fname(me)} edges ${fname(opp)} on a split decision`;soc=[`ROBBERY. ${opp.last} won that.`,`${me.last} did enough. Barely.`]}
    else{h=`${fname(me)} outworks ${fname(opp)} over ${x.rd} rounds`;soc=[`${me.last} just keeps winning.`,'Solid, not spectacular.']}
    if(me.persona==='Trash talker')soc.push(`${me.last} talked the talk AND walked the walk.`);
  }else{h=`${fname(opp)} ${/KO/.test(x.method)?'knocks out':/Submission/.test(x.method)?'submits':'beats'} ${fname(me)}`;soc=[`Back to the drawing board for ${me.last}.`,`${opp.last} exposed him.`];if(me.persona==='Trash talker')soc.push(`All that talk and ${me.last} folded.`)}
  addNews({tag:'results',outlet,h,b:`${won?fname(me):fname(opp)} def. ${won?fname(opp):fname(me)} by ${x.method.toLowerCase()} (R${x.rd}, ${x.time}) at ${ev}.${x.cards?` Scorecards: ${x.cards.map(cd=>cd[Math.max(0,x.w)]+'-'+cd[1-Math.max(0,x.w)]).join(', ')}.`:''}`,social:posts(soc.slice(0,3))});
  if(c.contracts.length&&f.showcase&&won)addNews({tag:'business',outlet:'Cageside Wire',h:`Bidding war: all three promotions want ${fname(me)}`,b:`After a statement win at the Contender Showcase, ${fname(me)} has offers from TFC, GFL and RYUJIN.`,social:posts(['Sign with TFC. Biggest stage.','GFL pays better, just saying.','RYUJIN would make him a star.'])});
  // callout targets
  let targets=[];
  if(won&&pid!=='REG'&&!c.contracts.length){const {champ,list}=ranked(pid,me.div);
    if(champ&&champ.id!=='me'&&rk(me)<=6)targets.push(champ.id);
    list.filter(z=>z.id!=='me'&&rk(z)<rk(me)).slice(-3).reverse().forEach(z=>{if(targets.length<3&&!targets.includes(z.id))targets.push(z.id)});}
  c.last={ev,opp:fname(opp),res:draw?'D':won?'W':'L',m:x.method,rd:x.rd,t:x.time};
  U.cf={...U.cf,phase:'post',sum:{ev,won,draw,show,winB,bonus,bonusL,ppv,total,rkB,rkA,popB,popA:me.pop,chinB,chinA:me.r.chn,recB,recA:rec(me),titleNote,targets,called:null,method:x.method,rd:x.rd,time:x.time,opp:fname(opp)}};
  save();renderCF()}
function doCallout(id){const c=C(),me=ME(),t=S.F[id];c.callout=id;U.cf.sum.called=id;
  const lines={Humble:`I respect ${t.first}, but I want that fight next.`,Showman:`${t.first}! The fans want it, I want it. Let's give them a show.`,'Trash talker':`${t.first}, you're a paycheck. Sign the contract or retire.`};
  if(me.persona==='Trash talker'){me.pop=clamp(me.pop+2,0,99);if(!me.rivals.includes(id)){me.rivals.push(id);t.rivals.push('me')}}
  addNews({tag:'fans',outlet:'The Ground Game',h:`${fname(me)} calls out ${fname(t)}`,b:`In his post-fight interview: “${lines[me.persona]||lines.Humble}”`,social:posts([`${me.last} vs ${t.last} next. Make it happen.`,`${t.last} wants no part of that.`])});
  save();renderCF()}

/* ---------- career views ---------- */
const CTABS={home:['Home',ICONS.office],gym:['Gym','<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>'],me:['Fighter','<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21c1-4.2 3.8-6.5 7-6.5s6 2.3 7 6.5"/>'],news:['News',ICONS.news],world:['World',ICONS.world]};
function renderCareer(over){const me=ME(),c=C();document.body.className='p-'+(me.promo==='REG'?'REG':me.promo);
  if(!CTABS[U.tab])U.tab='home';
  const nmsg=S.inbox.length+(c.offers.length&&!c.fight?1:0)+(c.contracts.length?1:0);
  paint(`<div class="shell">${topBar(curShort(),[['Bank',fk(Math.round(c.money))],['Rank',me.promo==='REG'?'—':rkLbl(me)]])}
    <main class="view" id="view">${({home:homeV,gym:gymV,me:meV,news:newsV,world:cWorldV})[U.tab]()}</main>${careerCTA()}${tabsBar(CTABS,{home:nmsg,gym:c.sessions&&!c.contracts.length?c.sessions:0})}${over}</div>`,'c:'+U.tab);
  if(U.cf)renderCF()}
function careerCTA(){const c=C(),f=c.fight,me=ME();
  if(c.contracts.length)return ctaBar('Contract offers','Pick a promotion to sign with',`<button class="btn" data-act="tab" data-v="home">Choose</button>`);
  if(f&&S.week>=f.week)return ctaBar('Fight night',`vs ${esc(fname(S.F[f.opp]))}${f.title?' · Title':''}`,`<button class="btn" data-act="cfight">Walk out</button>`);
  const wk=f?f.week-S.week:0;
  const info=f?`vs ${esc(S.F[f.opp].last)} in ${wk} wk${wk>1?'s':''}`:c.offers.length?`${c.offers.length} fight offer${c.offers.length>1?'s':''}`:me.avail>S.week?`Cleared in week ${(me.avail-1)%52+1}`:'No fight booked';
  const sub=c.sessions?`${c.sessions} training session${c.sessions>1?'s':''} left this week`:'Training done this week';
  return ctaBar(info,sub,`<button class="btn" data-act="cadv">Next week</button>`)}
function meCard(){const me=ME(),c=C();
  return `<section class="poster"><div class="ev"><span class="lbl">${me.promo==='REG'?'Proving Grounds FC · Regional':PROMOS[me.promo].name}</span><span class="lbl">${DIVN[me.div]}</span></div>
   <div class="face" style="grid-template-columns:1fr auto"><div class="n" style="${nz(me.last)}">${esc(me.first)}<br>${esc(me.last)}<small>${me.nick?`“${esc(me.nick)}” · `:''}${rec(me)} · ${me.style}${isChamp(me)?' · Champion':''}</small></div><div class="ovr num" style="font-size:46px">${me.ovr}<small>OVR</small></div></div>
   <div class="stats"><div><span class="lbl">Age</span><b>${me.age}</b></div><div><span class="lbl">Popularity</span><b>${me.pop}</b></div><div><span class="lbl">Fatigue</span><b style="color:${c.fatigue>60?'var(--loss)':'var(--ink)'}">${Math.round(c.fatigue)}</b></div><div><span class="lbl">Belts</span><b>${c.titles}</b></div></div></section>`}
function offerRow(o,i){const me=ME(),opp=S.F[o.opp];if(!opp)return '';const p=odds(me,opp,fightRounds(o),fightRing());
  return `<div class="item"><div class="k"><span class="lbl" style="color:var(--acc)">${esc(o.label)}</span><span class="lbl">Week ${(o.week-1)%52+1} · ${o.week-S.week}-wk camp</span></div>
   <button class="frow" data-act="fighter" data-v="${opp.id}" style="padding-inline:0;min-height:0"><span class="rk${isChamp(opp)?' c':''}">${rkLbl(opp).replace('#','')}</span><span style="min-width:0"><div class="nm">${esc(fname(opp))}${opp.div!==me.div?` <span class="tag hot">${opp.div}</span>`:''}</div><div class="sub"><span>${rec(opp)}</span><span>${opp.style}</span><span>You ${ml(p)}</span></div></span><span class="ovr num">${opp.ovr}<small>OVR</small></span></button>
   <p>${esc(o.note)}</p><div class="k" style="align-items:center"><span class="lbl num">${fk(o.purse)} + ${fk(o.purse)} to win</span><button class="btn sm" data-act="ctake" data-v="${i}">Take fight</button></div></div>`}
function homeV(){const me=ME(),c=C(),f=c.fight;let main='';
  if(c.contracts.length){main=`<section class="sec"><header><h3>Contract offers</h3><span class="lbl">Pick one to continue</span></header><div class="list">${c.contracts.map((o,i)=>`<div class="item"><div class="k"><span style="font-family:var(--f-display);font-weight:900;font-size:26px;color:${PROMOS[o.pid].color}">${PROMOS[o.pid].short}</span><span class="lbl num">${o.fights} fights · ${fk(o.purse)} + ${fk(o.purse)}</span></div><p>${esc(o.note)}</p><button class="btn sm block" data-act="csign" data-v="${i}">Sign with ${PROMOS[o.pid].short}</button></div>`).join('')}</div></section>`}
  else if(f){const opp=S.F[f.opp],wk=f.week-S.week,p=odds(me,opp,fightRounds(f),fightRing());
    main=`<section class="poster"><div class="ev"><h2 style="font-size:26px">${wk<=0?'Fight week':`Fight camp · ${wk} wk${wk>1?'s':''} out`}</h2><span class="lbl">${esc(f.label)}${f.title?' · Title':''}</span></div>
     <div class="face"><div class="n" style="${nz(me.last)}">${esc(me.last)}<small>${me.promo==='REG'?'':rkLbl(me)+' · '}${rec(me)} · ${ml(p)}</small></div><div class="vs">VS</div><button class="n r" data-act="fighter" data-v="${opp.id}" style="${nz(opp.last)};text-align:right">${esc(opp.last)}<small>${ml(1-p)} · ${rec(opp)}${me.promo==='REG'?'':' · '+rkLbl(opp)}</small></button></div>
     <div class="tags"><span class="tag ${f.intel?'good':''}">Film ${f.intel}/2</span><span class="tag ${f.hype?'hot':''}">Hype ${f.hype}/3</span><span class="tag">${fightRounds(f).length} rounds</span>${c.injury?`<span class="tag bad">${RATING_LBL[c.injury.k]} injury −${c.injury.amt}</span>`:''}${c.fatigue>40?'<span class="tag bad">Fatigued</span>':''}</div>
     ${wk<=0?`<button class="btn block" data-act="cfight">Walk out</button>`:`<button class="btn sm ghost" data-act="tab" data-v="gym">Train in the gym · ${c.sessions} session${c.sessions===1?'':'s'} left</button>`}</section>`}
  else if(c.offers.length)main=`<section class="sec"><header><h3>Fight offers</h3><span class="lbl">From your manager</span></header><div class="list">${c.offers.map(offerRow).join('')}</div></section>`;
  else main=`<div class="list"><div class="item"><span class="t">${me.avail>S.week?`Recovering. Cleared in week ${(me.avail-1)%52+1}.`:'Waiting on offers.'}</span><p>New offers usually arrive a few weeks before you're cleared. Keep training in the meantime.</p></div></div>`;
  return `${meCard()}${main}
   <section class="sec"><header><h3>Messages</h3><span class="lbl">${S.inbox.length}</span></header>${S.inbox.length?`<div class="list">${S.inbox.slice(0,8).map(inboxItem).join('')}</div>`:'<div class="list"><div class="empty">No messages.</div></div>'}</section>
   ${c.last?`<section class="sec"><header><h3>Last fight</h3><span class="lbl">${esc(c.last.ev)}</span></header><div class="list"><div class="item"><div class="k"><span class="t"><span class="tag ${c.last.res==='W'?'good':c.last.res==='L'?'bad':''}">${c.last.res}</span> vs ${esc(c.last.opp)}</span></div><p>${c.last.m} · R${c.last.rd} ${c.last.t}</p></div></div></section>`:''}`}
function xpBar(k){const c=C(),me=ME();return `<div class="bar" style="grid-template-columns:86px 1fr 30px"><span>${RATING_LBL[k]}</span><span class="tr"><i style="width:${k==='chn'?me.r.chn:Math.round(c.xp[k]/needXP(me.r[k])*100)}%;${k==='chn'?'background:var(--loss)':''}"></i></span><b class="num">${me.r[k]}</b></div>`}
function gymV(){const c=C(),f=c.fight,me=ME(),opp=f?S.F[f.opp]:null;
  const fmsg=c.fatigue>80?'Overtrained. Injury risk is high, so rest.':c.fatigue>40?'Above 40, fatigue costs cardio on fight night and slows gains.':'Fresh. Gains are at full strength.';
  const tile=k=>{const g=MGAMES[k];return `<div class="tile"><span class="tt">${g.n}</span><span class="lbl">${g.stat} · ${me.r[k]}</span><div class="minibar"><i style="width:${Math.round(c.xp[k]/needXP(me.r[k])*100)}%"></i></div><div class="row"><button class="btn sm" data-act="mgopen" data-v="${k}">Play</button><button class="btn sm ghost" data-act="cquick" data-v="${k}">Quick</button></div></div>`};
  return `<div class="list"><div class="item"><div class="k" style="align-items:center"><span class="lbl">Sessions left this week</span><span class="pips">${[0,1].map(i=>`<i class="${i<c.sessions?'on':''}"></i>`).join('')}</span></div>
    <div class="hype"><span class="lbl">Fatigue</span>${meter(c.fatigue,true)}<b class="num">${Math.round(c.fatigue)}</b></div>
    <p>${fmsg}${c.injury?` Injured: ${RATING_LBL[c.injury.k]} −${c.injury.amt} until week ${(c.injury.until-1)%52+1}.`:''}</p>
    <button class="btn sm ghost" data-act="crest"${c.sessions?'':' disabled'}>Rest · −35 fatigue</button></div></div>
  <section class="sec"><header><h3>Training</h3><span class="lbl">Play a drill for big gains</span></header>
   <div class="tiles">${Object.keys(MGAMES).map(tile).join('')}
    <div class="tile"><span class="tt">Sparring</span><span class="lbl">All ratings</span><p>Live rounds train everything. Highest injury risk.</p><div class="row"><button class="btn sm" data-act="cspar">Spar</button></div></div></div></section>
  <section class="sec"><header><h3>Fight camp</h3><span class="lbl">${opp?'vs '+esc(opp.last):'Book a fight first'}</span></header><div class="list">
   <div class="item"><div class="k"><span class="t">Study film</span><span class="tag ${f&&f.intel?'good':''}">${f?f.intel:0} / 2</span></div><p>Session one reveals his real ratings. Session two finds his weakness for a gameplan bonus.</p><div><button class="btn sm" data-act="cstudy"${f&&f.intel<2?'':' disabled'}>Watch tape</button></div></div>
   <div class="item"><div class="k"><span class="t">Promote the fight</span><span class="tag ${f&&f.hype?'hot':''}">${f?f.hype:0} / 3</span></div><p>Raises your popularity, your win bonus and how much a win grows your fanbase.${me.persona==='Trash talker'?' As a trash talker, you will make it personal.':''}</p><div><button class="btn sm" data-act="cpromo"${f&&f.hype<3?'':' disabled'}>Do media</button></div></div></div></section>
  <section class="sec"><header><h3>Coaches</h3><span class="lbl">Bank ${fk(Math.round(c.money))}</span></header><div class="list">${Object.keys(COACH).map(k=>{const l=c.coach[k];return `<div class="item"><div class="k" style="align-items:center"><span class="t">${COACH[k][0]}</span><span class="pips">${[0,1,2].map(i=>`<i class="${i<l?'on':''}"></i>`).join('')}</span></div><div class="k" style="align-items:center"><p>${COACH[k][1]} +${l*25}%${l<3?` → +${(l+1)*25}%`:''}</p>${l<3?`<button class="btn sm${c.money>=COACH_COST[l]?'':' ghost'}" data-act="ccoach" data-v="${k}">Hire ${fk(COACH_COST[l])}</button>`:'<span class="tag good">Maxed</span>'}</div></div>`}).join('')}</div></section>`}
function legacy(){const me=ME(),c=C();return Math.round(me.w*2+c.titles*12+c.defenses*6+me.ko+me.sub+me.pop/4)}
function meV(){const me=ME(),c=C(),h=me.hist.slice(0,10);
  return `${meCard()}
  <section class="sec"><header><h3>Ratings</h3><span class="lbl">Bar = progress to next point</span></header><div class="list"><div class="item" style="gap:8px">${Object.keys(RATING_LBL).map(xpBar).join('')}<p>Chin cannot be trained. It has taken ${c.dmg} point${c.dmg===1?'':'s'} of damage so far.</p></div></div></section>
  <div class="stats"><div><span class="lbl">Record</span><b>${rec(me)}</b></div><div><span class="lbl">KO / SUB</span><b>${me.ko} / ${me.sub}</b></div><div><span class="lbl">Defenses</span><b>${c.defenses}</b></div><div><span class="lbl">Earned</span><b>${fk(Math.round(c.earned))}</b></div></div>
  <div class="list"><div class="item"><div class="k"><span class="lbl">Contract</span><span>${me.promo==='REG'?'Regional, fight by fight':`${PROMOS[me.promo].short} · ${me.fights} fight${me.fights===1?'':'s'} left · ${fk(me.purse)}/${fk(me.purse)}`}</span></div>
   <div class="k"><span class="lbl">Personality</span><span>${me.persona}</span></div><div class="k"><span class="lbl">Legacy score</span><span>${legacy()}</span></div>
   ${me.rivals.length?`<div class="k"><span class="lbl">Rivals</span><span>${me.rivals.filter(id=>S.F[id]).map(id=>esc(S.F[id].last)).join(', ')}</span></div>`:''}</div></div>
  ${h.length?`<section class="sec"><header><h3>Fight history</h3></header><div class="list">${h.map(x=>`<div class="item"><div class="k"><span class="t"><span class="tag ${x.res==='W'?'good':x.res==='L'?'bad':''}">${x.res}</span> ${esc(x.on)}</span><span class="lbl">Wk ${(x.wk-1)%52+1}</span></div><p>${x.m} · R${x.rd} ${x.t} · ${esc(x.ev)}${x.title?' · Title':''}</p></div>`).join('')}</div></section>`:''}
  <button class="btn ghost block" data-act="cretire">Retire</button>`}
function cWorldV(){const me=ME();if(!U.wp)U.wp=me.promo==='REG'?'TFC':me.promo;if(!U.wd)U.wd=me.div;
  const {champ,list}=ranked(U.wp,U.wd),all=champ&&U.wp!=='GFL'?[champ,...list]:list;
  const p4p=Object.values(S.F).filter(f=>PROMOS[f.promo]).map(f=>({f,s:f.ovr+clamp(f.streak,0,6)*.8+(isChamp(f)?4:0)})).sort((a,b)=>b.s-a.s).slice(0,10);
  return `<div class="seg">${Object.keys(PROMOS).map(id=>`<button class="${U.wp===id?'on':''}" data-act="cwp" data-v="${id}">${PROMOS[id].short}</button>`).join('')}</div>
   ${divSeg(U.wd,'cwd')}
   <section class="sec"><header><h3>${PROMOS[U.wp].short} ${DIVN[U.wd]}</h3><span class="lbl">${U.wp==='GFL'?'Season points':'Rankings'}</span></header><div class="list">${all.map(f=>frow(f)).join('').replace('<button class="frow" data-act="fighter" data-v="me"','<button class="frow me" data-act="fighter" data-v="me"')}</div></section>
   <section class="sec"><header><h3>Pound for pound</h3><span class="lbl">All promotions</span></header><div class="list">${p4p.map((x,i)=>frow(x.f,true).replace(/<span class="rk[^"]*">[^<]*<\/span>/,`<span class="rk">${i+1}</span>`)).join('')}</div></section>`}
function renderCF(partial){const el=document.getElementById('arena');if(!el||!U.cf)return;const cf=U.cf,c=C(),me=ME(),f=c.fight;
  const head=t=>`<div class="ahead"><span style="font-family:var(--f-display);font-weight:900;font-size:20px;text-transform:uppercase">${esc(t)}</span><span class="lbl">${curShort()}</span></div>`;
  if(cf.phase==='post'){el.innerHTML=postV(head);return}
  const opp=S.F[(f||{}).opp];if(!opp){U.cf=null;return}
  if(cf.phase==='plan'){const rounds=fightRounds(f),ring=fightRing(),p=odds(me,opp,rounds,ring),wk=weakOf(opp);
    const sv=v=>f.intel>=1?v:`${Math.floor(v/10)*10}s`,row=(l,a,b)=>`<span class="l">${a}</span><span class="c">${l}</span><span>${b}</span>`;
    el.innerHTML=`${head(f.label)}<div class="abody"><div class="lbl" style="color:var(--acc)">${f.title?'Title fight · ':''}${rounds.length} rounds · You ${ml(p)}</div>
     <div class="face"><div class="n" style="${nz(me.last)}">${esc(me.last)}<small>${rec(me)}</small></div><div class="vs">VS</div><div class="n r" style="${nz(opp.last)}">${esc(opp.last)}<small>${rec(opp)} · ${opp.style}</small></div></div>
     <div class="tape num">${Object.keys(RATING_LBL).map(k=>row(RATING_LBL[k],me.r[k],sv(opp.r[k]))).join('')}</div>
     <p style="margin:0;color:var(--dim);font-size:14px">${f.intel>=2?`Film study: his weakest area is ${WEAKTXT[wk]}. A gameplan that attacks it gets +4.`:f.intel===1?'Ratings scouted. One more film session would have found his weakness.':'You skipped film study. His ratings are estimates.'}${c.fatigue>40?` You are carrying fatigue (${Math.round(c.fatigue)}), which will cost you cardio.`:''}${c.injury?` Your ${RATING_LBL[c.injury.k].toLowerCase()} injury costs you ${c.injury.amt}.`:''}</p>
     <section class="sec"><header><h3>How do you fight it?</h3></header><div class="seg">${[['live','Fight it yourself'],['sim','Simulate']].map(([k,l])=>`<button class="${(cf.mode||'live')===k?'on':''}" data-act="cmode" data-v="${k}">${l}</button>`).join('')}</div>
      ${(cf.mode||'live')==='live'?`<div class="lbl">Difficulty</div>${diffSeg('cdiff')}<p class="hint">You control ${esc(me.last)}. Your ratings, fatigue and injuries all count. Pause any time for the controls.</p>`:''}</section>
     ${(cf.mode||'live')==='live'?'':`<section class="sec"><header><h3>Gameplan</h3></header><div class="list">${Object.keys(PLANS).map(k=>`<button class="item" data-act="cplan" data-v="${k}" style="width:100%;text-align:left;${cf.plan===k?'background:var(--panel2);box-shadow:inset 3px 0 0 var(--acc)':''}"><div class="k"><span class="t">${PLANS[k].n}</span>${f.intel>=2&&PLANS[k].hits===wk?'<span class="tag good">Exploits weakness</span>':cf.plan===k?'<span class="tag acc">Selected</span>':''}</div><p>${PLANS[k].d}</p></button>`).join('')}</div></section>`}</div>
     <div class="afoot"><button class="btn ghost" data-act="cfback">Not yet</button><button class="btn" data-act="walkout">${(cf.mode||'live')==='live'?'Walk out':'Simulate fight'}</button></div>`;fitNames(el);return}
  const x=cf.x;let shown=cf.shown,html='';
  for(const rd of x.pbp){if(shown<=0)break;shown--;html+=`<div class="rd">Round ${rd.rd}</div>`;for(const l of rd.lines){if(shown<=0)break;shown--;html+=`<p class="${l.big?'big':''}">${esc(l.t)}</p>`}}
  const done=cf.shown>=cfTotal(),won=x.w===0;
  const verdict=done?`<div class="verdict" style="${x.w===1?'background:var(--loss);color:#fff':''}"><span>${f.title?'Title fight · ':''}${x.method}</span><h2>${x.w===-1?'Draw':won?'You win':'You lose'}</h2><span>${x.w===-1?'':won?esc(fname(me)):esc(fname(opp))} · R${x.rd} ${x.time}</span></div>
    ${x.cards?`<div class="cards3 num">${x.cards.map((cd,j)=>`<div><span class="lbl">Judge ${j+1}</span><br>${cd[0]}–${cd[1]}</div>`).join('')}</div>`:''}
    <div class="tape num"><span class="l">${x.sig[0]}</span><span class="c">Sig. strikes</span><span>${x.sig[1]}</span><span class="l">${x.td[0]}</span><span class="c">Takedowns</span><span>${x.td[1]}</span><span class="l">${x.kd[0]}</span><span class="c">Knockdowns</span><span>${x.kd[1]}</span></div>`:'';
  const foot=done?`<button class="btn" data-act="cpost">Post-fight</button>`:`<button class="btn ghost" data-act="cskip">Skip to result</button>`;
  if(partial){const p=document.getElementById('pbp');if(p){p.innerHTML=html;document.getElementById('verd').innerHTML=verdict;document.getElementById('cfoot').innerHTML=foot;const ab=el.querySelector('.abody');ab.scrollTop=ab.scrollHeight;return}}
  el.innerHTML=`${head(f.label)}<div class="abody"><div class="lbl" style="color:var(--acc)">${x.live?'Fought it yourself':PLANS[cf.plan].n+' gameplan'} · You ${ml(cf.p)}</div>
   <div class="face"><div class="n" style="${nz(me.last)}">${esc(me.last)}<small>${rec(me)}</small></div><div class="vs">VS</div><div class="n r" style="${nz(opp.last)}">${esc(opp.last)}<small>${rec(opp)}</small></div></div>
   <div class="pbp" id="pbp">${html}</div><div id="verd" style="display:flex;flex-direction:column;gap:10px">${verdict}</div></div><div class="afoot" id="cfoot">${foot}</div>`;
  fitNames(el);const ab=el.querySelector('.abody');ab.scrollTop=ab.scrollHeight}
function postV(head){const s=U.cf.sum,c=C();
  const arrow=(a,b)=>a===b?`${b}`:`${a} → ${b}`;
  return `${head(s.ev)}<div class="abody">
   <div class="verdict" style="${!s.won&&!s.draw?'background:var(--loss);color:#fff':''}"><span>${s.method} · R${s.rd} ${s.time}</span><h2>${s.draw?'Draw':s.won?'Victory':'Defeat'}</h2><span>vs ${esc(s.opp)}${s.titleNote?' · '+s.titleNote:''}</span></div>
   <div class="stats"><div><span class="lbl">Record</span><b>${s.recA}</b></div><div><span class="lbl">Rank</span><b>${arrow(s.rkB,s.rkA)}</b></div><div><span class="lbl">Popularity</span><b>${arrow(s.popB,s.popA)}</b></div><div><span class="lbl">Chin</span><b style="${s.chinA<s.chinB?'color:var(--loss)':''}">${arrow(s.chinB,s.chinA)}</b></div></div>
   <section class="sec"><header><h3>Payday</h3></header><div class="list"><div class="item"><div class="money num"><span>Show money</span><span>${fk(s.show)}</span>${s.winB?`<span>Win bonus${C().last?'':''}</span><span>${fk(s.winB)}</span>`:''}${s.bonus?`<span>${s.bonusL}</span><span>${fk(s.bonus)}</span>`:''}${s.ppv?`<span>Pay-per-view points</span><span>${fk(s.ppv)}</span>`:''}<hr><b>Total</b><b class="pos">${fk(s.total)}</b></div></div></div></section>
   ${c.contracts.length?`<div class="quote">Your manager's phone is ringing. Contract offers are waiting on the Home tab.</div>`:''}
   ${s.targets.length?`<section class="sec"><header><h3>The mic is yours</h3><span class="lbl">Call someone out</span></header>${s.called?`<div class="quote">${s.called==='none'?'You thanked your team and the fans.':`You called out ${esc(fname(S.F[s.called]))}. Expect that offer soon.`}</div>`:`<div class="list">${s.targets.map(id=>{const t=S.F[id];return `<div class="item"><div class="k"><span class="t">${esc(fname(t))}</span><span class="lbl">${rkLbl(t)} · ${rec(t)}</span></div><div><button class="btn sm" data-act="ccall" data-v="${id}">Call him out</button></div></div>`}).join('')}<div class="item"><button class="btn sm ghost" data-act="ccall" data-v="none">Thank the fans</button></div></div>`}</section>`:''}
  </div><div class="afoot"><button class="btn" data-act="cdone">Continue</button></div>`}

const CSHEET={
  trained:s=>({title:s.title,body:`${s.gains.length?gainsV(s.gains):''}<p style="margin:0;color:var(--dim)">${esc(s.note)}</p><p class="hint">${C().sessions} session${C().sessions===1?'':'s'} left this week · Fatigue ${Math.round(C().fatigue)}</p>`,foot:`<button class="btn" data-act="close">Done</button>`}),
  retire:s=>{const me=ME(),c=C(),L=legacy(),hof=L>=90;
    if(s.done||s.forced)return{title:s.done?'Career over':'Time to hang them up',lock:true,body:`<div class="grade">${L}</div><div class="lbl">Legacy score${hof?' · Hall of Fame':''}</div>
     <div class="money num"><span>Record</span><span>${rec(me)}</span><span>Finishes</span><span>${me.ko} KO · ${me.sub} SUB</span><span>Titles won</span><span>${c.titles}</span><span>Title defenses</span><span>${c.defenses}</span><span>Career earnings</span><span>${fk(Math.round(c.earned))}</span></div>
     <p style="margin:0;color:var(--dim)">${hof?`${esc(fname(me))} goes down as one of the greats.`:L>=45?`${esc(fname(me))} had a career to be proud of.`:`${esc(fname(me))} gave it everything.`}</p>`,foot:`<button class="btn" data-act="restart">Start a new game</button>`};
    return{title:'Retire?',body:`<p style="margin:0">${esc(fname(me))} walks away at ${me.age} with a ${rec(me)} record. This ends the career.</p>`,foot:`<button class="btn ghost" data-act="close">Keep fighting</button><button class="btn warn" data-act="cretireyes">Retire</button>`}}
};

const CH={
  qset(t,v){U.qf[t.dataset.k]=t.dataset.k==='rounds'?+v:v;if(t.dataset.k==='op'&&v==='random')U.qf.b=null;render()},
  qroll(){U.qf.b=null;render()},qnew(){U.qf.b=null;U.qf.res=null;render()},qgo(){qfGo()},qdiff(t,v){lsSet('cr.diff',v);render()},
  cdiff(t,v){lsSet('cr.diff',v);renderCF()},cmode(t,v){lsSet('cr.ctrl',v);U.cf.mode=v;renderCF()},
  smode(t,v){U.start=v||null;if(v==='create'&&!U.cr)U.cr=crDefault();render()},
  cset(t,v){U.cr[t.dataset.k]=v;render()},
  cpt(t,v){const k=t.dataset.k,cr=U.cr,used=Object.values(cr.pts).reduce((a,b)=>a+b,0),d=+v;
    if(d>0&&(used>=CR_PTS||cr.pts[k]>=CR_MAX))return;if(d<0&&cr.pts[k]<=0)return;cr.pts[k]+=d;render()},
  cgo(){const cr=U.cr;for(const k of ['first','last','nick']){const el=document.getElementById('cr-'+k);if(el)cr[k]=el.value}
    const n=document.getElementById('cr-nat');if(n)cr.nat=n.value;
    if(!cr.first.trim()||!cr.last.trim()){toastPre('Give your fighter a first and last name.');return}
    newCareer(cr);U.tab='home';U.start=null;render();const v=document.getElementById('view');if(v)v.scrollTop=0},
  cadv(){if(careerWeek()!==false)render()},
  ctake(t,v){takeOffer(+v)},csign(t,v){signContract(+v)},
  mgopen(t,v){if(!needSession())return;U.mg={kind:v,phase:'intro'};render()},
  mgstart(){U.mg.phase='play';render();mgPlay(U.mg.kind)},
  mgquit(){mgStop();U.mg=null;render()},mgclose(){U.mg=null;render()},
  cquick(t,v){quickTrain(v)},cspar(){spar()},crest(){rest();render()},cstudy(){study()},cpromo(){promote()},ccoach(t,v){buyCoach(v)},
  cfight(){U.cf={phase:'plan',plan:'Balanced',mode:lsGet('cr.ctrl','live')};render()},cplan(t,v){U.cf.plan=v;renderCF()},cfback(){U.cf=null;render()},
  walkout(){walkOut()},cskip(){clearInterval(cfT);U.cf.shown=cfTotal();renderCF()},cpost(){applyCareerFight()},
  ccall(t,v){if(v==='none'){U.cf.sum.called='none';renderCF()}else doCallout(v)},
  cdone(){U.cf=null;U.sheet=null;U.tab=C().contracts.length?'home':'news';U.nf='all';render()},
  cwp(t,v){U.wp=v;render()},cwd(t,v){U.wd=v;render()},
  cretire(){U.sheet={type:'retire'};render()},cretireyes(){U.sheet={type:'retire',done:true};save();render()}
};
function toastPre(m){toast(m)}
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.cr;if(k&&U.cr)U.cr[k]=e.target.value});
document.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.cr;if(k&&U.cr)U.cr[k]=e.target.value});

/* ============ sheet gestures ============ */
function closeSheet(){if(!U.sheet)return;U.sheet=null;render()}
let DRAG=null;
document.addEventListener('pointerdown',e=>{const h=e.target.closest('.grab,.sheet>header:not(.lock)');if(!h||e.target.closest('button'))return;const sh=h.closest('.sheet');DRAG={sh,y0:e.clientY,dy:0};sh.style.transition='none'});
document.addEventListener('pointermove',e=>{if(!DRAG)return;DRAG.dy=Math.max(0,e.clientY-DRAG.y0);DRAG.sh.style.transform=`translateY(${DRAG.dy}px)`});
function endDrag(){if(!DRAG)return;const {sh,dy}=DRAG;DRAG=null;
  if(dy>90){sh.style.transition='transform .18s ease-in';sh.style.transform='translateY(110%)';setTimeout(closeSheet,170)}
  else{sh.style.transition='transform .2s ease-out';sh.style.transform=''}}
document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!U.sheet||MGS)return;const p=sheetParts(U.sheet);if(p&&p.lock)return;U.sheet=U.sheet.prev||null;render()});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('input[data-cr]')){e.preventDefault();const ids=['cr-first','cr-last','cr-nick'],i=ids.indexOf(e.target.id);const n=i>=0&&i<2&&document.getElementById(ids[i+1]);if(n)n.focus();else e.target.blur()}});

/* ============ input ============ */
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(!t||t.disabled||(!S&&!['new','smode','cset','cpt','cgo','qset','qgo','qroll','qnew','qdiff'].includes(t.dataset.act)))return;
  const a=t.dataset.act,v=t.dataset.v;
  if(a==='scrim'&&e.target!==t)return;
  const H={
    new(){newGame(v);U.tab='office';render()},
    tab(){if(U.tab===v&&!U.sheet){const vw=document.getElementById('view');if(vw)vw.scrollTo({top:0,behavior:'smooth'});return}U.tab=v;U.sheet=null;render()},
    advance(){advanceWeek();render()},
    run(){startEvent()},
    askpostpone(){U.sheet={type:'confirm',title:'Delay the event?',body:`Push ${P().short} ${S.next.num} back one week to finish the card. Owner approval drops by 8.`,yes:'Delay one week',act:'postpone'};render()},
    postpone(){U.sheet=null;S.next.week++;S.approval=clamp(S.approval-8,0,100);addNews({tag:'business',outlet:'Cageside Wire',h:`${P().short} ${S.next.num} pushed back a week`,b:'The promotion could not put together a full card in time.',social:posts(['Embarrassing.','Can they book anything?'])});save();render()},
    etype(){S.next.type=v;save();render()},venue(){S.next.venue=+v;save();render()},
    mv(){const b=S.next.bouts,i=+v,j=i+(+t.dataset.d);if(j<0||j>=b.length)return;[b[i],b[j]]=[b[j],b[i]];if(U.sheet&&U.sheet.type==='bout')U.sheet.bi=j;save();render()},
    mkmain(){const b=S.next.bouts,[x]=b.splice(+v,1);b.unshift(x);if(U.sheet)U.sheet.bi=0;save();toast('Moved to the main event.')},
    boutmenu(){U.sheet={type:'bout',bi:+v};render()},
    sback(){U.sheet=U.sheet&&U.sheet.prev||null;render()},
    howto(){U.sheet={type:'howto',prev:U.sheet};render()},
    rm(){const bt=S.next.bouts[+v];if(!bt)return;S.next.bouts.splice(+v,1);for(const id of [bt.a,bt.b]){const f=S.F[id];if(f&&f.id!==bt.out)f.morale=clamp(f.morale-6,0,100)}S.inbox=S.inbox.filter(i=>!(i.type==='withdraw'&&i.fid===bt.out));U.sheet=null;save();toast('Bout removed. Both fighters are a little unhappy.')},
    book(){U.sheet={type:'book',div:U.div};render()},
    bookfrom(){U.sheet={type:'book',div:S.F[v].div,a:v};render()},
    bookpair(){const A=S.F[t.dataset.a],B=S.F[t.dataset.b];if(!availFor(A)||!availFor(B)){toast('One of them is unavailable for this card.');return}U.sheet={type:'book',div:A.div,a:A.id,b:B.id};render()},
    replace(){const bt=S.next.bouts[+v];if(!bt){return}const keep=bt.a===bt.out?bt.b:bt.a;U.sheet={type:'book',div:S.F[keep].div,a:keep,replace:+v};render()},
    scrap(){const bt=S.next.bouts[+v];if(!bt)return;S.next.bouts.splice(+v,1);S.inbox=S.inbox.filter(i=>!(i.type==='withdraw'&&i.fid===bt.out));U.sheet=null;save();toast('Bout scrapped.')},
    bdiv(){U.sheet.div=v;render()},pickA(){U.sheet.a=v;render()},pickB(){U.sheet.b=v;U.sheet.res=null;U.sheet.title=canTitle(S.F[U.sheet.a],S.F[v]);render()},
    unA(){U.sheet.a=null;U.sheet.b=null;render()},unB(){U.sheet.b=null;U.sheet.res=null;render()},ttl(){U.sheet.title=!U.sheet.title;U.sheet.res=null;render()},
    offer(){const s=U.sheet,A=S.F[s.a],B=S.F[s.b],short=s.replace!=null&&S.next.week-S.week<=2;const r=accept(A,B,{title:s.title,short});
      if(!r.ok){s.res=r;render();return}
      const bt={a:A.id,b:B.id,title:!!s.title,short};
      if(s.title&&S.pid!=='GFL'){const ch=isChamp(A)?A:B;const other=ch===A?B:A;for(const f of Object.values(S.F))if(f.promised&&f.promo===S.pid&&f.div===ch.div&&f.id!==other.id){f.morale=clamp(f.morale-25,0,100);f.promised=false;addInbox({type:'owner',title:`${f.last} feels betrayed`,body:`You promised ${fname(f)} the next title shot and gave it to ${fname(other)}. His morale dropped sharply.`})}other.promised=false}
      if(s.replace!=null){const old=S.next.bouts[s.replace];S.next.bouts[s.replace]=bt;S.inbox=S.inbox.filter(i=>!(i.type==='withdraw'&&old&&i.fid===old.out))}else S.next.bouts.push(bt);
      const idx=s.replace!=null?s.replace:S.next.bouts.length-1;
      if(idx===0)addNews({tag:'business',outlet:'Cageside Wire',h:`Official: ${fname(A)} vs ${fname(B)} headlines ${P().short} ${S.next.num}`,b:`${s.title?'The title is on the line. ':''}${fname(A)} (${rec(A)}) meets ${fname(B)} (${rec(B)}) in week ${(S.next.week-1)%52+1}.`,social:posts([pick(['Instant buy.','This is the fight to make.','Who asked for this?','Finally.']),`${A.last} by ${pick(['KO','submission','decision'])}. Book it.`])});
      U.sheet=null;save();toast(`${A.last} vs ${B.last} is signed.`)},
    fighter(){U.sheet={type:'fighter',id:v,prev:U.sheet&&U.sheet.type!=='fighter'?U.sheet:null};render()},
    div(){U.div=v;render()},nf(){U.nf=v;render()},
    close(){U.sheet=null;render()},scrim(){U.sheet=null;render()},
    dismiss(){S.inbox=S.inbox.filter(i=>i.id!==+v);save();render()},
    promise(){const it=S.inbox.find(i=>i.id===+v);const f=S.F[it.fid];if(f){f.promised=true;f.morale=clamp(f.morale+10,0,100)}S.inbox=S.inbox.filter(i=>i.id!==+v);save();toast(`${f?f.last:'He'} has your word. Book him against the champ.`)},
    ignore(){const it=S.inbox.find(i=>i.id===+v);const f=S.F[it.fid];if(f)f.morale=clamp(f.morale-10,0,100);S.inbox=S.inbox.filter(i=>i.id!==+v);save();render()},
    neg(){const f=S.F[v];const r=negotiate(f,+t.dataset.m,4);if(!r.ok&&+t.dataset.m<1){}save();toast(r.msg)},
    sign(){const f=S.F[v];const r=negotiate(f,+t.dataset.m,4);if(r.ok)U.sheet=null;save();toast(r.msg)},
    letgo(){toFA(S.F[v],'contract expired');save();render()},
    askrelease(){const f=S.F[v];U.sheet={type:'confirm',title:'Release fighter?',body:`${esc(fname(f))} becomes a free agent immediately${isChamp(f)?' and the title is vacated':''}. Rival promotions may sign him.`,yes:'Release him',act:'release',v,prev:U.sheet};render()},
    release(){const f=S.F[v];toFA(f,'released');U.sheet=null;save();toast(`${fname(f)} has been released.`)},
    skip(){const ev=U.ev;clearInterval(revealT);ev.shown=1e9;ev.liveChoose=false;renderArena()},
    golive(){clearInterval(revealT);U.ev.liveChoose=!U.ev.liveChoose;renderArena()},
    mdiff(){lsSet('cr.diff',v);renderArena()},
    livepick(){const ev=U.ev,r=ev.res[ev.idx];ev.liveChoose=false;
      openLive({a:S.F[r.a.id],b:S.F[r.b.id],rounds:r.info.rounds,ring:P().ring,arena:S.pid,human:v==='w'?null:+v,diff:lsGet('cr.diff','normal'),title:!!r.bt.title,canQuit:false,
        onEnd:x=>{if(x)r.x=x;ev.shown=1e9;render()}})},
    nextbout(){U.ev.idx--;U.ev.shown=0;renderArena();startReveal()},
    tosummary(){U.ev.phase='summary';renderArena()},
    bonus(){U.ev.bonus[v]=!U.ev.bonus[v];renderArena()},
    finish(){finishEvent()},
    menu(){U.sheet={type:'menu'};render()},
    askreset(){U.sheet={type:'confirm',title:'Start a new game?',body:'This erases your current save and takes you back to the mode select screen.',yes:'Erase save',act:'restart',prev:U.sheet};render()},
    restart(){mgStop();clearInterval(cfT);clearInterval(revealT);S=null;U.sheet=null;U.ev=null;U.cf=null;U.mg=null;U.start=null;U.cr=null;U.tab='office';try{localStorage.removeItem(KEY)}catch(e){}render()}
  };
  if(CH[a])CH[a](t,v);else if(H[a])H[a]()});

/* ============ boot ============ */
function start(data){S=(data&&data.S)||load();if(S){for(const f of Object.values(S.F))NAMES.add(f.first+f.last);try{migrateSave()}catch(e){}}render();try{document.fonts&&document.fonts.ready.then(()=>{if(!MGS)fitNames(document)})}catch(e){}}
if(typeof document!=='undefined'&&document.getElementById('app'))start({});
