/* ---- server flow, runs inside the game's own rules sandbox ---- */
['render','say','snd','buzz','toast','callout','save','chk','tkEv','fitHand','fitPool','zApply','musSync'].forEach(n=>{try{globalThis[n]=function(){}}catch(e){}});
const IO={};
function srvSetup(cfg){const o=JSON.parse(JSON.stringify(PERS.slice(1,4)));
 U.set.sty=cfg.sty;if(cfg.sty=='hk')U.set.min=cfg.min;else if(U.set.mn[cfg.sty]!=null)U.set.mn[cfg.sty]=cfg.min;
 U.set.lv=cfg.lv;U.set.seat=[0,0,0];U.set.sw=cfg.sw==1?1:3;U.set.hf=0;U.set.an=cfg.an==0?0:1;onl.playing=1;inTut=0;lvForce=0;
 for(let q=0;q<4;q++)PERS[q]=o[(IO.persona[q]||1)-1];
 setRS();S=Array(4).fill(cfg.stack||300);RD={n:0,h:0,max:cfg.len,ds:0};dealer=IO.dealer0}
function srvSnap(seat,drew){return{t:'st',dealer,turn:IO.turn,wall:W.length-RS.dead,S,M,pools,lastP,hc:H.map(h=>h.length),hand:H[seat],drew:drew===seat,RD,min:MIN,FL,QS,won,sty:RS.id}}
function srvTiles(){return[0,1,2,3].map(q=>({melds:M[q],hand:H[q],fl:FL[q]}))}
async function srvEnd(o,cont){RD.h+=cont?0:1;const over=!cont&&isOver();IO.pushAll();await IO.end({t:'end',S,S0:S0h,RD,tiles:srvTiles(),FL,over,cont:!!cont,sty:RS.id,...o});return over}
async function srvFinish(p,self,from,t,spc){
 const c=cnt(H[p]);if(!self)c[t]++;const wt=self?H[p][H[p].length-1]:t;
 const r=spc||(RS.id=='hk'?faanF(p,c,M[p],self,self&&bloomF):RS.sc(p,c,M[p],self,cxo(p,self,wt))),dl=RS.pay(r,p,self,from);
 if(RS.id=='sc')r.note=`base ${r.base}${r.raw>r.f?' · capped at '+r.f+' fan':''}`;
 dl.forEach((x,q)=>S[q]+=x);
 IO.emit({k:'win',p,self:self?1:0});
 won[p]=1;nWon++;if(RD.fw==null)RD.fw=p;
 const end=!RS.multi||nWon>=(U.set.sw==1?1:3);
 if(end){const fp=RD.fw;if(fp!=dealer){dealer=(dealer+1)%4;RD.n++;RD.ds=0}else RD.ds=(RD.ds||0)+1}
 const over=await srvEnd({kind:'win',winner:p,self:!!self,from:from==null?-1:from,tile:t==null?-1:t,res:{f:r.f,n:r.n,lim:r.lim,note:r.note},dl,spc:!!spc,nw:nWon,unit:RS.unit},!end);
 return end?(over?'over':'end'):'go'}
const srvFlwWin=p=>srvFinish(p,1,-1,null,{f:RS.al[1]+(RS.id=='tw'&&p==dealer?1+2*(RD.ds||0):0),n:[[RS.al[0],RS.al[1]]],lim:RS.id!='tw'});
async function srvBonus(p){
 while(isB(H[p][H[p].length-1])){const t=H[p].pop();FL[p].push(t);IO.emit({k:'flower',p,tile:t});IO.pushAll();await IO.sleep(IO.human(p)?500:450);
  if(RS.al&&FL[p].filter(x=>x<42).length==8)return'win';
  if(W.length<=RS.dead)return'draw';H[p].push(W.shift());flwF=true}
 return null}
async function srvDraw(){
 if(RS.q){const live=[0,1,2,3].filter(q=>!won[q]),inf={};
  live.forEach(q=>{const all=new Set([...H[q],...M[q].flatMap(m=>m.t)].filter(x=>x<27).map(x=>x/9|0)).size==3;let mx=0;
   if(!all){const c=cnt(H[q]);for(let t=0;t<27;t++){if(inQ(t,q)||c[t]>=4)continue;c[t]++;const r=RS.sc(q,c,M[q],0,{wt:t,last:0,bl:0,kd:0});c[t]--;if(r)mx=Math.max(mx,r.base)}}
   inf[q]={pig:all,rd:mx>0,mx}});
  const d=[0,0,0,0];
  live.forEach(a=>{if(inf[a].pig)live.forEach(b=>{if(b!=a&&!inf[b].pig){d[a]-=160;d[b]+=160}})});
  live.forEach(a=>{if(!inf[a].pig&&inf[a].rd)live.forEach(b=>{if(b!=a&&!inf[b].pig&&!inf[b].rd){d[b]-=inf[a].mx*20;d[a]+=inf[a].mx*20}})});
  d.forEach((x,q)=>S[q]+=x);
  if(RD.fw!=null){if(RD.fw!=dealer){dealer=(dealer+1)%4;RD.n++;RD.ds=0}else RD.ds=(RD.ds||0)+1}
  const lines=live.map(q=>[q,inf[q].pig?'Mixed all three suits 花豬':inf[q].rd?'Ready · best base '+inf[q].mx:'Not ready']);
  return srvEnd({kind:'draw',settle:lines,nw:nWon},false)}
 RD.ds=(RD.ds||0)+1;return srvEnd({kind:'draw'},false)}
function srvOpts(q,t,from){return opts(q,t,from)}
const srvClaimOK=o=>!!(o.w||o.pung||o.kong||o.ch.length);
function srvValid(a,oo){if(!a)return{k:'pass'};
 if(a.k=='win'&&oo.w)return{k:'win'};if(a.k=='kong'&&oo.kong)return{k:'kong'};if(a.k=='pung'&&oo.pung)return{k:'pung'};
 if(a.k=='chow'&&Array.isArray(a.s)){const m=oo.ch.find(x=>x.join()==a.s.join());if(m)return{k:'chow',s:m}}
 return{k:'pass'}}
async function srvClaims(t,from){
 const order=[1,2,3].map(i=>(from+i)%4),o={},dec={},asks=[];
 order.forEach(q=>o[q]=opts(q,t,from));
 for(const q of order){const oo=o[q];if(!srvClaimOK(oo)){dec[q]={k:'pass'};continue}
  if(IO.human(q))asks.push(IO.ask(q,{kind:'claim',tile:t,from,opts:oo},IO.claimMs,()=>({k:'pass'})).then(a=>{dec[q]=srvValid(a,oo)}));
  else{const k=SK[q];let d={k:'pass'};
   if(oo.w&&Math.random()>=k.miss)d={k:'win'};
   else if(oo.pung){const pr=Math.min(1,want(q,t,'pung')*k.pg)*k.cl;if(Math.random()<pr&&!(k.eff>=1&&!(t>30||t==27||t==sw(q))&&improves(q,t,'pung')<1))d={k:'pung'}}
   if(d.k=='pass'&&oo.ch.length&&q==(from+1)%4&&Math.random()<Math.min(1,want(q,t,'chow')*k.ch)*k.cl){let bs=oo.ch[0],ok=1;if(k.eff>=1){const sc=oo.ch.map(x=>[improves(q,t,'chow',x),x]).sort((x,y)=>y[0]-x[0]);if(sc[0][0]>=1)bs=sc[0][1];else ok=0}if(ok)d={k:'chow',s:bs}}
   dec[q]=d}}
 await Promise.all(asks);
 const ps=order.filter(q=>dec[q].k=='win');
 if(ps.length)return{p:ps[0],k:'win',ps:RS.multi?ps:[ps[0]]};
 for(const q of order)if(dec[q].k=='kong'||dec[q].k=='pung')return{p:q,...dec[q]};
 for(const q of order)if(dec[q].k=='chow')return{p:q,...dec[q]};
 return null}
async function srvPickMissing(){
 const pick=q=>{const c=cnt(H[q]),n=[0,1,2].map(s=>c.slice(s*9,s*9+9).reduce((a,b)=>a+b)),m=Math.min(...n),o=[0,1,2].filter(s=>n[s]==m);return o[Math.random()*o.length|0]};
 const ps=[];
 for(let q=0;q<4;q++){if(IO.human(q))ps.push(IO.ask(q,{kind:'suit'},IO.turnMs,()=>pick(q)).then(v=>{QS[q]=(v===0||v===1||v===2)?v:pick(q)}));else QS[q]=pick(q)}
 await Promise.all(ps);IO.emit({k:'qs',QS});IO.pushAll();await IO.sleep(1400)}
async function srvHand(){
 const a=RS.wall();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}
 W=a;H=[0,1,2,3].map(()=>W.splice(0,RS.hs).sort((x,y)=>x-y));M=[[],[],[],[]];FL=[[],[],[],[]];won=[0,0,0,0];nWon=0;QS=[-1,-1,-1,-1];RD.fw=null;pool=[];pools=[[],[],[],[]];lastP=-1;bloomF=false;flwF=false;kdF=false;nDisc=0;claimed=0;turn=dealer;
 if(RS.flw)for(let i=0;i<4;i++){const p=(dealer+i)%4;for(;;){const k=H[p].findIndex(isB);if(k<0)break;FL[p].push(H[p].splice(k,1)[0]);H[p].push(W.shift())}H[p].sort((x,y)=>x-y)}
 SK=[0,1,2,3].map(p=>skill(p));PL=[0,1,2,3].map(pickPlan);S0h=S.slice();
 let skip=false,decl=true;IO.turn=turn;IO.pushAll();IO.emit({t:'hand',n:Math.min(RD.n+1,RD.max),max:RD.max,dealer,sty:RS.id,r:RD.n/4|0});await IO.sleep(1500);
 if(RS.q)await srvPickMissing();
 for(;;){if(IO.dead())return'dead';
  if(!skip){if(W.length<=RS.dead)return srvDraw();const t=W.pop();H[turn].push(t);flwF=false;
   if(RS.flw){const b=await srvBonus(turn);if(b=='draw')return srvDraw();if(b=='win'){const v=await srvFlwWin(turn);if(v!='go')return v;turn=nextLive(turn);decl=true;continue}}}
  skip=false;IO.turn=turn;IO.pushAll(turn);
  let a;
  if(IO.human(turn)){const c=cnt(H[turn]),w=decl&&win(turn,c,1),kg=[];
   for(let t=0;t<34;t++){if(inQ(t,turn))continue;if(c[t]==4)kg.push({t});else if(c[t]==1&&M[turn].some(m=>m.k=='pung'&&m.t[0]==t))kg.push({t,add:1})}
   const q=turn;a=await IO.ask(q,{kind:'turn',win:!!w,kongs:kg},IO.turnMs,()=>aiTurn(q,decl));
   const must=RS.q&&QS[turn]>=0&&H[turn].some(x=>inQ(x,turn));
   if(!a||a.k=='win'&&!(decl&&win(turn,cnt(H[turn]),1)))a=aiTurn(turn,decl);
   else if(a.k=='kong'&&!kg.some(x=>x.t==a.t))a=aiTurn(turn,decl);
   else if(a.k=='d'&&(!H[turn].includes(a.t)||(must&&!inQ(a.t,turn))))a=aiTurn(turn,decl);
   else if(a.k!='win'&&a.k!='kong'&&a.k!='d')a=aiTurn(turn,decl);
   if(a.k=='kong'){const m=kg.find(x=>x.t==a.t);a={k:'kong',t:a.t,add:m&&m.add}}}
  else{await IO.sleep(IO.speed);a=aiTurn(turn,decl)}
  if(IO.dead())return'dead';
  if(a.k=='win'){const v=await srvFinish(turn,1);if(v!='go')return v;turn=nextLive(turn);decl=true;bloomF=false;flwF=false;continue}
  if(a.k=='kong'){doKong(turn,a);IO.emit({k:'kong',p:turn,tile:a.t});if(W.length<=RS.dead){IO.pushAll();return srvDraw()}H[turn].push(W.shift());bloomF=true;skip=true;decl=true;
   if(RS.flw){const b=await srvBonus(turn);if(b=='draw')return srvDraw();if(b=='win'){const v=await srvFlwWin(turn);if(v!='go')return v;turn=nextLive(turn);decl=true;skip=false;continue}}
   IO.pushAll(turn);await IO.sleep(700);continue}
  kdF=bloomF;bloomF=false;fresh=-1;const t=a.t,from=turn;H[from].splice(H[from].indexOf(t),1);H[from].sort((x,y)=>x-y);pool.push(t);pools[from].push(t);lastP=from;nDisc++;
  IO.emit({k:'discard',p:from,tile:t});IO.pushAll();await IO.sleep(IO.human(from)?500:900);
  const cl=await srvClaims(t,from);if(IO.dead())return'dead';
  if(!cl){turn=nextLive(turn);decl=true;continue}
  if(cl.k=='win'){let end=0;for(const w of cl.ps){const v=await srvFinish(w,0,from,t);if(v!='go'){end=v;break}}
   if(end)return end;pool.pop();pools[from].pop();lastP=-1;turn=nextLive(from);decl=true;continue}
  doClaim(cl.p,cl.k,t,cl.s);IO.emit({k:'claim',p:cl.p,kind:cl.k,tile:t});turn=cl.p;skip=true;decl=false;IO.turn=turn;IO.pushAll(-1);await IO.sleep(900);
  if(cl.k=='kong'){if(W.length<=RS.dead)return srvDraw();H[turn].push(W.shift());bloomF=true;decl=true;
   if(RS.flw){const b=await srvBonus(turn);if(b=='draw')return srvDraw();if(b=='win'){const v=await srvFlwWin(turn);if(v!='go')return v;turn=nextLive(turn);decl=true;skip=false;continue}}}
 }}
