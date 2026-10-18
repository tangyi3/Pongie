'use strict';
// Pongie multiplayer server. Run with: node server.js  (needs: npm install)
const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');
const createEngine=require('./engine');
const PORT=process.env.PORT||3000;
const PUB=path.join(__dirname,'public');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
 let u=decodeURIComponent((req.url||'/').split('?')[0]);
 if(u=='/healthz'){res.end('ok');return}
 if(u=='/')u='/index.html';
 const f=path.normalize(path.join(PUB,u));
 if(!f.startsWith(PUB)){res.statusCode=403;res.end();return}
 fs.readFile(f,(e,d)=>{if(e){res.statusCode=404;res.end('Not found');return}res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');if(u=='/sw.js')res.setHeader('Cache-Control','no-cache');res.end(d)})});
const wss=new WebSocketServer({server,maxPayload:4096});
const rooms=new Map();
const K=+process.env.PONGIE_TIME_SCALE||1,sleep=ms=>new Promise(r=>setTimeout(r,ms*K));
const send=(ws,o)=>{try{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))}catch(e){}};
const clean=(s,n)=>String(s||'').replace(/[<>&"'`]/g,'').trim().slice(0,n);
const AVOK=['🐉','🐯','🐼','🐲','🧧','🏮','🥟','🀄','🐓','🐒','🐇','🐂','🐍','🐑','🦁','🍵','🎋','🍜'];
const AIP=[{name:'Auntie Liu',av:'👵',persona:1},{name:'Uncle Wong',av:'👴',persona:2},{name:'Ah Fai',av:'👲',persona:3}];
const code=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ';let c;do{c=Array.from({length:4},()=>A[Math.random()*A.length|0]).join('')}while(rooms.has(c));return c};
const isHuman=(r,q)=>{const s=r.seats[q];return s&&!s.ai&&s.ws&&s.ws.readyState===1};

function info(r,seat){return{t:'room',code:r.code,cfg:r.cfg,you:seat,host:r.seats[seat]&&r.seats[seat].id===r.host,started:r.started,seats:r.seats.map(s=>s?{name:s.name,av:s.av,ai:!!s.ai,on:!!(s.ai||(s.ws&&s.ws.readyState===1))}:null)}}
function pushRoom(r){r.seats.forEach((s,i)=>{if(s&&!s.ai)send(s.ws,info(r,i))})}
function all(r,o){r.seats.forEach(s=>{if(s&&!s.ai)send(s.ws,o)})}
function snap(r,seat,drew){const v=r.E.v;return{t:'st',dealer:v.dealer,turn:r.turn,wall:v.W.length-14,S:r.S,M:v.M,pools:v.pools,lastP:v.lastP,hc:v.H.map(h=>h.length),hand:v.H[seat],drew:drew===seat,RD:r.RD,min:v.MIN}}
function pushState(r,drew){r.seats.forEach((s,i)=>{if(s&&!s.ai)send(s.ws,snap(r,i,drew))})}
const ev=(r,o)=>all(r,{t:'ev',...o});

// ask a human for a decision; resolves with their reply or the default on timeout/disconnect
function askSeat(r,q,msg,ms,dflt){return new Promise(res=>{
 let done=false;const fin=v=>{if(done)return;done=true;clearTimeout(tm);delete r.pend[q];res(v)};
 const tm=setTimeout(()=>fin(dflt()),ms);r.pend[q]={kind:msg.kind,fin,dflt};
 send(r.seats[q].ws,{t:'ask',ms,...msg})})}

function claimOpts(oo){return oo.w||oo.pung||oo.kong||oo.ch.length}
function validClaim(a,oo){if(!a)return{k:'pass'};
 if(a.k=='win'&&oo.w)return{k:'win'};
 if(a.k=='kong'&&oo.kong)return{k:'kong'};
 if(a.k=='pung'&&oo.pung)return{k:'pung'};
 if(a.k=='chow'&&Array.isArray(a.s)){const m=oo.ch.find(x=>x.join()==a.s.join());if(m)return{k:'chow',s:m}}
 return{k:'pass'}}
function aiClaim(r,q,t,from,oo){const E=r.E,k=E.v.SK[q];
 if(oo.w&&Math.random()>=k.miss)return{k:'win'};
 if(oo.pung){const pr=Math.min(1,E.want(q,t,'pung')*k.pg)*k.cl;
  if(Math.random()<pr&&!(k.eff>=1&&!(t>30||t==27||t==E.sw(q))&&E.improves(q,t,'pung')<1))return{k:'pung'}}
 if(oo.ch.length&&q==(from+1)%4&&Math.random()<Math.min(1,E.want(q,t,'chow')*k.ch)*k.cl){
  let bs=oo.ch[0];if(k.eff>=1){const sc=oo.ch.map(x=>[E.improves(q,t,'chow',x),x]).sort((x,y)=>y[0]-x[0]);if(sc[0][0]>=1)bs=sc[0][1];else return{k:'pass'}}
  return{k:'chow',s:bs}}
 return{k:'pass'}}
async function resolveClaims(r,t,from){const E=r.E,order=[1,2,3].map(i=>(from+i)%4),o={},dec={},asks=[];
 order.forEach(q=>o[q]=E.opts(q,t,from));
 for(const q of order){const oo=o[q];if(!claimOpts(oo)){dec[q]={k:'pass'};continue}
  if(isHuman(r,q))asks.push(askSeat(r,q,{kind:'claim',tile:t,from,opts:oo},12000,()=>({k:'pass'})).then(a=>{dec[q]=validClaim(a,oo)}));
  else dec[q]=aiClaim(r,q,t,from,oo)}
 await Promise.all(asks);
 for(const q of order)if(dec[q].k=='win')return{p:q,k:'win'};
 for(const q of order)if(dec[q].k=='kong'||dec[q].k=='pung')return{p:q,...dec[q]};
 for(const q of order)if(dec[q].k=='chow')return{p:q,...dec[q]};
 return null}

function waitNext(r){return new Promise(res=>{r.ready=new Set();r.nextFn=res;const chk=()=>{const hs=r.seats.map((s,i)=>isHuman(r,i)?i:-1).filter(i=>i>=0);if(hs.every(i=>r.ready.has(i)))res()};r.nextChk=chk;setTimeout(res,25000);chk()}).then(()=>{r.nextFn=null;r.nextChk=null})}

async function endHand(r,win){const E=r.E,v=E.v,T=E.T,S0=r.S.slice();let out;
 r.RD.h++;
 if(win){const{p,self,from,t}=win,c=E.cnt(v.H[p]);if(!self)c[t]++;
  const f=E.faan(p,c,v.M[p],self,self&&v.bloomF),pts=T[Math.min(f.f,10)],h=Math.ceil(pts/2);
  if(self)[0,1,2,3].forEach(q=>{if(q!=p){r.S[q]-=h;r.S[p]+=h}});else{r.S[from]-=pts;r.S[p]+=pts}
  if(p!=v.dealer){v.dealer=(v.dealer+1)%4;r.RD.n++}
  out={t:'end',kind:'win',winner:p,self:!!self,from:from==null?-1:from,tile:t==null?-1:t,faan:f,pts,S:r.S,S0,tiles:v.H.map((h2,q)=>({melds:v.M[q],hand:h2}))}}
 else out={t:'end',kind:'draw',S:r.S,S0,tiles:v.H.map((h2,q)=>({melds:v.M[q],hand:h2}))};
 r.over=r.RD.n>=r.RD.max||r.RD.h>=r.RD.max*3;out.over=r.over;out.RD=r.RD;
 all(r,out);await waitNext(r)}

async function playHand(r){const E=r.E,v=E.v;E.deal(v.dealer);let turn=v.dealer,skip=false,decl=true;
 r.turn=turn;pushState(r);all(r,{t:'hand',n:Math.min(r.RD.n+1,r.RD.max),max:r.RD.max,dealer:v.dealer});await sleep(1500);
 for(;;){if(r.dead)return;
  if(!skip){if(v.W.length<=14)return endHand(r,null);v.H[turn].push(v.W.pop())}
  skip=false;r.turn=turn;pushState(r,turn);
  let a;
  if(isHuman(r,turn)){const c=E.cnt(v.H[turn]),w=decl&&E.win(turn,c,1),kg=[];
   for(let t=0;t<34;t++){if(c[t]==4)kg.push({t});else if(c[t]==1&&v.M[turn].some(m=>m.k=='pung'&&m.t[0]==t))kg.push({t,add:1})}
   a=await askSeat(r,turn,{kind:'turn',win:!!w,kongs:kg},30000,()=>{const x=E.aiTurn(turn,decl);return x});
   // validate
   if(a.k=='win'&&!(decl&&E.win(turn,E.cnt(v.H[turn]),1)))a=E.aiTurn(turn,decl);
   else if(a.k=='kong'&&!kg.some(x=>x.t==a.t))a=E.aiTurn(turn,decl);
   else if(a.k=='d'&&!v.H[turn].includes(a.t))a=E.aiTurn(turn,decl);
   if(a.k=='kong'){const m=kg.find(x=>x.t==a.t);a={k:'kong',t:a.t,add:m&&m.add}}}
  else{await sleep(r.cfg.speed||650);a=E.aiTurn(turn,decl)}
  if(r.dead)return;
  if(a.k=='win'){ev(r,{k:'win',p:turn,self:1});return endHand(r,{p:turn,self:1})}
  if(a.k=='kong'){E.doKong(turn,a);ev(r,{k:'kong',p:turn,tile:a.t});if(v.W.length<=14){pushState(r);return endHand(r,null)}v.H[turn].push(v.W.shift());v.bloomF=true;skip=true;decl=true;pushState(r,turn);await sleep(700);continue}
  v.bloomF=false;const t=a.t,from=turn;v.H[from].splice(v.H[from].indexOf(t),1);v.H[from].sort((x,y)=>x-y);v.pool.push(t);v.pools[from].push(t);v.lastP=from;
  ev(r,{k:'discard',p:from,tile:t});pushState(r);await sleep(from===turn&&!isHuman(r,from)?900:500);
  const cl=await resolveClaims(r,t,from);if(r.dead)return;
  if(!cl){turn=(turn+1)%4;decl=true;continue}
  if(cl.k=='win'){ev(r,{k:'win',p:cl.p,self:0});return endHand(r,{p:cl.p,self:0,from,t})}
  E.doClaim(cl.p,cl.k,t,cl.s);ev(r,{k:'claim',p:cl.p,kind:cl.k,tile:t});turn=cl.p;skip=true;decl=false;r.turn=turn;pushState(r,-1);await sleep(900);
  if(cl.k=='kong'){if(v.W.length<=14)return endHand(r,null);v.H[turn].push(v.W.shift());v.bloomF=true;decl=true}
 }}

async function runGame(r){
 const personas=[];let ai=0;
 r.seats.forEach((s,i)=>{if(!s){const p=AIP[ai++%3];r.seats[i]={ai:true,name:p.name,av:p.av,persona:p.persona}}});
 r.seats.forEach((s,i)=>{personas[i]=s.ai?s.persona:1});
 r.E=createEngine({min:r.cfg.min,lv:r.cfg.lv});r.E.v.PA=personas;r.E.v.MIN=r.cfg.min;
 r.S=[1000,1000,1000,1000];r.RD={n:0,h:0,max:r.cfg.len};r.started=true;r.over=false;r.E.v.dealer=Math.random()*4|0;
 pushRoom(r);
 try{while(!r.dead){await playHand(r);if(r.dead)return;if(r.over)break}
  all(r,{t:'over',S:r.S,RD:r.RD})}catch(e){console.error('game error',e);all(r,{t:'err',msg:'Game error, returning to lobby'})}
 // return to lobby: drop AI seats so friends can re-fill
 r.started=false;r.pend={};r.seats=r.seats.map(s=>s&&s.ai?null:s);if(!r.dead)pushRoom(r)}

function leaveRoom(ws){const r=ws.room;if(!r)return;ws.room=null;
 const s=r.seats[ws.seat];if(s&&s.ws===ws){if(r.started){s.ws=null;if(r.pend[ws.seat])r.pend[ws.seat].fin(r.pend[ws.seat].dflt())}else r.seats[ws.seat]=null}
 if(r.nextChk)r.nextChk();
 const left=r.seats.some(x=>x&&!x.ai&&x.ws&&x.ws.readyState===1);
 if(!left){r.dead=true;setTimeout(()=>rooms.delete(r.code),1000)}else{if(!r.started&&r.host===ws.uid){const n=r.seats.find(x=>x&&!x.ai&&x.ws);if(n)r.host=n.id}pushRoom(r)}}

wss.on('connection',ws=>{ws.uid='';ws.name='Player';ws.av='🐉';ws.alive=true;ws.on('pong',()=>ws.alive=true);
 ws.on('message',buf=>{let m;try{m=JSON.parse(buf)}catch(e){return}if(!m||typeof m.t!='string')return;
  if(m.t=='hello'){ws.uid=clean(m.id,24)||('g'+Math.random().toString(36).slice(2,8));ws.name=clean(m.name,14)||'Player';ws.av=AVOK.includes(m.av)?m.av:'🐉';send(ws,{t:'hi',v:1});return}
  if(!ws.uid)return;
  if(m.t=='create'){leaveRoom(ws);const r={code:code(),cfg:{min:3,len:4,lv:2,speed:650},seats:[null,null,null,null],host:ws.uid,started:false,pend:{},S:[1000,1000,1000,1000],RD:{n:0,h:0,max:4}};
   r.seats[0]={id:ws.uid,name:ws.name,av:ws.av,ws};ws.room=r;ws.seat=0;rooms.set(r.code,r);pushRoom(r);return}
  if(m.t=='join'){const r=rooms.get(clean(m.code,4).toUpperCase());if(!r){send(ws,{t:'err',msg:'Room not found. Check the code.'});return}
   leaveRoom(ws);let i=r.seats.findIndex(s=>s&&s.id===ws.uid);
   if(i>=0){const old=r.seats[i].ws;if(old&&old!==ws){old.room=null;send(old,{t:'err',msg:'Joined from another device'})}r.seats[i].ws=ws;r.seats[i].name=ws.name;r.seats[i].av=ws.av}
   else if(!r.started){i=r.seats.findIndex(s=>!s);if(i<0){send(ws,{t:'err',msg:'Room is full.'});return}r.seats[i]={id:ws.uid,name:ws.name,av:ws.av,ws}}
   else{send(ws,{t:'err',msg:'That game has already started.'});return}
   ws.room=r;ws.seat=i;pushRoom(r);if(r.started){pushState(r)}return}
  const r=ws.room;if(!r)return;
  if(m.t=='cfg'&&!r.started&&r.host===ws.uid){const c=r.cfg;if([1,2,3].includes(m.min))c.min=m.min;if([2,4].includes(m.len))c.len=m.len;if([1,2,3,4].includes(m.lv))c.lv=m.lv;pushRoom(r);return}
  if(m.t=='start'&&!r.started&&r.host===ws.uid){runGame(r);return}
  if(m.t=='act'){const p=r.pend[ws.seat];if(p&&p.kind==m.kind)p.fin(m.a);return}
  if(m.t=='next'){if(r.ready){r.ready.add(ws.seat);if(r.nextChk)r.nextChk()}return}
  if(m.t=='leave'){leaveRoom(ws);send(ws,{t:'left'});return}
 });
 ws.on('close',()=>leaveRoom(ws))});
setInterval(()=>{wss.clients.forEach(ws=>{if(!ws.alive){ws.terminate();return}ws.alive=false;try{ws.ping()}catch(e){}})},25000);
server.listen(PORT,()=>console.log('Pongie server on port '+PORT));
