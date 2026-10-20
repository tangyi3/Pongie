'use strict';
// Pongie multiplayer server. Run with: node server.js  (needs: npm install)
const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');
const sbx=require('./sandbox');
sbx.load(path.join(__dirname,'public'));
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
const BAD=/f+u+c+k|sh[i1]t|b[i1]tch|cunt|nigg|fag+[o0]t|assh[o0]le|d[i1]ck|pussy|slut|wh[o0]re|rape|nazi|hitler|屌|撚|柒|仆街|撲街|幹你|操你|傻逼|他媽|你媽|婊子/i;
const MINS={hk:{o:[1,2,3],d:3},sg:{o:[1,2,3],d:1},my:{o:[3,4,5],d:3},tw:{o:[0,1,3],d:1},sc:{o:[0],d:0}};
const TURN_MS=+process.env.PONGIE_TURN_MS||30000,CLAIM_MS=+process.env.PONGIE_CLAIM_MS||15000,K=+process.env.PONGIE_TIME_SCALE||1,sleep=ms=>new Promise(r=>setTimeout(r,ms*K));
const send=(ws,o)=>{try{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))}catch(e){}};
const clean=(s,n)=>String(s||'').replace(/[<>&"'`]/g,'').trim().slice(0,n);
const cleanName=s=>{const n=clean(s,14);return BAD.test(n.replace(/[\s._-]+/g,''))?'Player':n};
const AVOK=['🐉','🐯','🐼','🐲','🧧','🏮','🥟','🀄','🐓','🐒','🐇','🐂','🐍','🐑','🦁','🍵','🎋','🍜','🦄','🦚','🐅','🦉','🐙','🦊','🐬','🦋'];
const AIP=[{name:'Auntie Liu',av:'👵',persona:1},{name:'Uncle Wong',av:'👴',persona:2},{name:'Ah Fai',av:'👲',persona:3}];
const code=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ';let c;do{c=Array.from({length:4},()=>A[Math.random()*A.length|0]).join('')}while(rooms.has(c));return c};
const isHuman=(r,q)=>{const s=r.seats[q];return s&&!s.ai&&!s.auto&&s.ws&&s.ws.readyState===1};

function info(r,seat){return{t:'room',code:r.code,cfg:r.cfg,qm:!!r.qm,you:seat,host:r.seats[seat]&&r.seats[seat].id===r.host,started:r.started,seats:r.seats.map(s=>s?{name:s.name,av:s.av,ai:!!s.ai,on:!!(s.ai||(s.ws&&s.ws.readyState===1)),auto:!!s.auto}:null)}}
function pushRoom(r){r.seats.forEach((s,i)=>{if(s&&!s.ai)send(s.ws,info(r,i))})}
function all(r,o){r.seats.forEach(s=>{if(s&&!s.ai)send(s.ws,o)})}
function pushState(r,drew){if(!r.snap)return;r.seats.forEach((s,i)=>{if(s&&!s.ai)send(s.ws,r.snap(i,drew))})}
const ev=(r,o)=>all(r,{t:'ev',...o});

// Quick Match: players wait in a queue per rule style; after QM_MS (or 4 players) a table starts and AI fills empty seats.
const QM_MS=+process.env.PONGIE_QM_MS||12000,qmq=new Map();
function qmRemove(ws){if(ws.qm){const a=qmq.get(ws.qm);if(a){const i=a.indexOf(ws);if(i>=0)a.splice(i,1)}ws.qm=null}}
function makeQm(sty,g){const r={code:code(),cfg:{sty,min:MINS[sty].d,len:2,lv:2,speed:650,sw:3,an:1,stack:300},qm:1,seats:[null,null,null,null],host:g[0].uid,started:false,pend:{}};
 g.forEach((w,i)=>{r.seats[i]={id:w.uid,name:w.name,av:w.av,ws:w};w.room=r;w.seat=i});rooms.set(r.code,r);
 runGame(r).catch(e=>console.error('qm game error',e))}
function qmTick(){const now=Date.now();for(const [sty,a] of qmq){for(let i=a.length-1;i>=0;i--)if(a[i].readyState!==1){a[i].qm=null;a.splice(i,1)}
  while(a.length>=4||(a.length&&now-a[0].qt>=QM_MS)){const g=a.splice(0,4);g.forEach(w=>{w.qm=null});makeQm(sty,g)}
  a.forEach(w=>send(w,{t:'qm',on:1,n:a.length,ms:now-w.qt}))}}
setInterval(qmTick,1000);

// ask a human for a decision; resolves with their reply or the default on timeout/disconnect
function askSeat(r,q,msg,ms,dflt){return new Promise(res=>{
 let done=false;const s=r.seats[q];
 const fin=(v,timedOut)=>{if(done)return;done=true;clearTimeout(tm);delete r.pend[q];all(r,{t:'tm',off:q});
  // two missed turns in a row: the AI plays for them until they tap "Take back control"
  if(msg.kind=='turn'){if(timedOut){s.miss=(s.miss||0)+1;if(s.miss>=2&&!s.auto){s.auto=true;ev(r,{k:'auto',p:q});send(s.ws,{t:'auto',on:true});pushRoom(r)}}else s.miss=0}
  res(v)};
 const tm=setTimeout(()=>fin(dflt(),true),ms);r.pend[q]={kind:msg.kind,fin:v=>fin(v),dflt};
 all(r,{t:'tm',on:[q],ms,kind:msg.kind});
 send(s.ws,{t:'ask',ms,...msg})})}

function waitNext(r){return new Promise(res=>{r.ready=new Set();r.nextFn=res;const chk=()=>{const hs=r.seats.map((s,i)=>isHuman(r,i)?i:-1).filter(i=>i>=0);if(hs.every(i=>r.ready.has(i)))res()};r.nextChk=chk;setTimeout(res,25000);chk()}).then(()=>{r.nextFn=null;r.nextChk=null})}

// One isolated copy of the game's own rules code per room, so every style plays exactly like it does offline.
async function runGame(r){
 const personas=[];let ai=0;
 r.seats.forEach((s,i)=>{if(!s){const p=AIP[ai++%3];r.seats[i]={ai:true,name:p.name,av:p.av,persona:p.persona}}});
 r.seats.forEach((s,i)=>{personas[i]=s.ai?s.persona:1});
 const g=sbx.create(),IO=g.IO,snapFn=g.run('srvSnap');r.g=g;
 Object.assign(IO,{persona:personas,dealer0:Math.random()*4|0,turn:0,speed:r.cfg.speed||650,turnMs:TURN_MS,claimMs:CLAIM_MS,
  human:q=>isHuman(r,q),dead:()=>!!r.dead,sleep,
  emit:o=>o.t?all(r,o):ev(r,o),
  pushAll:drew=>r.seats.forEach((s,i)=>{if(s&&!s.ai)send(s.ws,snapFn(i,drew))}),
  ask:(q,msg,ms,dflt)=>askSeat(r,q,msg,ms,dflt),
  end:async o=>{all(r,o);await waitNext(r)}});
 r.snap=snapFn;
 g.run('srvSetup('+JSON.stringify({stack:r.cfg.stack||300,sty:r.cfg.sty,min:r.cfg.min,len:r.cfg.len,lv:r.cfg.lv,sw:r.cfg.sw,an:r.cfg.an})+')');
 r.started=true;r.over=false;pushRoom(r);
 try{for(let n=0;!r.dead&&n<60;n++){const v=await g.run('srvHand()');if(r.dead||v=='dead')return;if(g.run('isOver()'))break}
  all(r,{t:'over',S:g.run('S'),RD:g.run('RD'),sty:r.cfg.sty})}catch(e){console.error('game error',e);all(r,{t:'err',msg:'Game error, returning to lobby'})}
 r.started=false;r.pend={};r.g=null;r.seats=r.seats.map(s=>s&&s.ai?null:s);if(!r.dead&&!r.qm)pushRoom(r)}

function leaveRoom(ws){const r=ws.room;if(!r)return;ws.room=null;
 const s=r.seats[ws.seat];if(s&&s.ws===ws){if(r.started){s.ws=null;ev(r,{k:'left',p:ws.seat});if(r.pend[ws.seat])r.pend[ws.seat].fin(r.pend[ws.seat].dflt())}else r.seats[ws.seat]=null}
 if(r.nextChk)r.nextChk();
 const left=r.seats.some(x=>x&&!x.ai&&x.ws&&x.ws.readyState===1);
 if(!left){r.dead=true;setTimeout(()=>rooms.delete(r.code),1000)}else{if(!r.started&&r.host===ws.uid){const n=r.seats.find(x=>x&&!x.ai&&x.ws);if(n)r.host=n.id}pushRoom(r)}}

wss.on('connection',ws=>{ws.uid='';ws.name='Player';ws.av='🐉';ws.alive=true;ws.on('pong',()=>ws.alive=true);
 ws.on('message',buf=>{let m;try{m=JSON.parse(buf)}catch(e){return}if(!m||typeof m.t!='string')return;
  if(m.t=='hello'){ws.uid=clean(m.id,24)||('g'+Math.random().toString(36).slice(2,8));ws.name=cleanName(m.name)||'Player';ws.av=AVOK.includes(m.av)?m.av:'🐉';send(ws,{t:'hi',v:1});return}
  if(!ws.uid)return;
  if(m.t=='qm'){const sty=MINS[m.sty]?m.sty:'hk';leaveRoom(ws);qmRemove(ws);ws.qm=sty;ws.qt=Date.now();if(!qmq.has(sty))qmq.set(sty,[]);qmq.get(sty).push(ws);send(ws,{t:'qm',on:1,n:qmq.get(sty).length,ms:0});return}
  if(m.t=='qmc'){qmRemove(ws);send(ws,{t:'qm',off:1});return}
  if(m.t=='create'){qmRemove(ws);leaveRoom(ws);const r={code:code(),cfg:{sty:'hk',min:3,len:4,lv:2,speed:650,sw:3,an:1},seats:[null,null,null,null],host:ws.uid,started:false,pend:{},};
   r.seats[0]={id:ws.uid,name:ws.name,av:ws.av,ws};ws.room=r;ws.seat=0;rooms.set(r.code,r);pushRoom(r);return}
  if(m.t=='join'){qmRemove(ws);const r=rooms.get(clean(m.code,4).toUpperCase());if(!r){send(ws,{t:'err',msg:'Room not found. Check the code.'});return}
   leaveRoom(ws);let i=r.seats.findIndex(s=>s&&s.id===ws.uid);
   if(i>=0){const old=r.seats[i].ws;if(old&&old!==ws){old.room=null;send(old,{t:'err',msg:'Joined from another device'})}r.seats[i].ws=ws;r.seats[i].name=ws.name;r.seats[i].av=ws.av;r.seats[i].auto=false;r.seats[i].miss=0}
   else if(!r.started){i=r.seats.findIndex(s=>!s);if(i<0){send(ws,{t:'err',msg:'Room is full.'});return}r.seats[i]={id:ws.uid,name:ws.name,av:ws.av,ws}}
   else{send(ws,{t:'err',msg:'That game has already started.'});return}
   ws.room=r;ws.seat=i;pushRoom(r);if(r.started){pushState(r)}return}
  const r=ws.room;if(!r)return;
  if(m.t=='cfg'&&!r.started&&r.host===ws.uid){const c=r.cfg;
   if(MINS[m.sty]){c.sty=m.sty;c.min=MINS[m.sty].d}
   const mo=MINS[c.sty];if(mo.o.includes(m.min))c.min=m.min;
   if([2,4].includes(m.len))c.len=m.len;if([1,2,3,4].includes(m.lv))c.lv=m.lv;if([1,3].includes(m.sw))c.sw=m.sw;if([0,1].includes(m.an))c.an=m.an;pushRoom(r);return}
  if(m.t=='start'&&!r.started&&r.host===ws.uid){runGame(r);return}
  if(m.t=='act'){const p=r.pend[ws.seat];if(p&&p.kind==m.kind)p.fin(m.a);return}
  if(m.t=='resume'){const s=r.seats[ws.seat];if(s&&s.ws===ws&&s.auto){s.auto=false;s.miss=0;send(ws,{t:'auto',on:false});pushRoom(r)}return}
  if(m.t=='next'){if(r.ready){r.ready.add(ws.seat);if(r.nextChk)r.nextChk()}return}
  if(m.t=='leave'){leaveRoom(ws);send(ws,{t:'left'});return}
 });
 ws.on('close',()=>{qmRemove(ws);leaveRoom(ws)})});
setInterval(()=>{wss.clients.forEach(ws=>{if(!ws.alive){ws.terminate();return}ws.alive=false;try{ws.ping()}catch(e){}})},25000);
server.listen(PORT,()=>console.log('Pongie server on port '+PORT));
