'use strict';
// Pongie rules engine: copied from the game client so server and client agree.
module.exports=function createEngine(cfg){
cfg=cfg||{};
const cnt=a=>{const c=Array(34).fill(0);a.forEach(t=>c[t]++);return c};
const T=[0,2,4,8,16,24,32,48,64,96,128],O=[0,8,9,17,18,26,27,28,29,30,31,32,33];
let MIN=cfg.min||3,dealer=0,W=[],H=[[],[],[],[]],M=[[],[],[],[]],pool=[],pools=[[],[],[],[]],lastP=-1,bloomF=false,fresh=-1,inTut=0,lvForce=0,PA=[1,1,2,3];
const U={set:{seat:cfg.seat||[0,0,0,0],lv:cfg.lv||2},ad:{lv:2,r:[]},st:{pg:0,ch:0,kg:0}};
const sw=p=>27+(p-dealer+4)%4;
function decomp(c){const out=[];(function go(i,pair,sets){while(i<34&&!c[i])i++;
 if(i==34){if(pair!=null)out.push({pair,sets:sets.slice()});return}
 if(c[i]>=3){c[i]-=3;sets.push([i,i,i]);go(i,pair,sets);sets.pop();c[i]+=3}
 if(pair==null&&c[i]>=2){c[i]-=2;go(i,i,sets);c[i]+=2}
 if(i<27&&i%9<7&&c[i+1]&&c[i+2]){c[i]--;c[i+1]--;c[i+2]--;sets.push([i,i+1,i+2]);go(i,pair,sets);sets.pop();c[i]++;c[i+1]++;c[i+2]++}})(0,null,[]);return out}
function faan(p,c,mel,self,bl){
 if(c.reduce((a,b)=>a+b)!=14-3*mel.length)return null;
 if(!mel.length&&O.every(i=>c[i]))return{f:13,n:[['Thirteen orphans 十三幺',13]]};
 let best=null;
 for(const d of decomp(c.slice())){
  const ss=d.sets.concat(mel.map(m=>m.k=='chow'?m.t:m.t.slice(0,3))),pr=ss.filter(s=>s[0]==s[1]),pa=d.pair,L=[],add=(a,b)=>b&&L.push([a,b]);
  const tl=ss.flat().concat(pa,pa),su=new Set(tl.filter(x=>x<27).map(x=>x/9|0));
  if(!su.size)add('All honors 字一色',10);else if(su.size==1)tl.some(x=>x>26)?add('Mixed one suit 混一色',3):add('Pure one suit 清一色',7);
  if(pr.length==4)add('All pungs 對對糊',3);
  const dp=pr.filter(s=>s[0]>30).length;
  if(dp==3)add('Great dragons 大三元',8);else if(dp==2&&pa>30)add('Small dragons 小三元',5);else add('Dragon pungs 番牌',dp);
  const wp=pr.filter(s=>s[0]>26&&s[0]<31);
  if(wp.length==4)add('Great winds 大四喜',13);else if(wp.length==3&&pa>26&&pa<31)add('Small winds 小四喜',6);else wp.forEach(s=>add('Wind pung 風牌',(s[0]==sw(p))+(s[0]==27)));
  if(ss.length-pr.length==4&&!(pa>30||pa==27||pa==sw(p)))add('All chows 平糊',1);
  if(self)add('Self-drawn 自摸',1);if(!mel.some(m=>m.open))add('Concealed hand 門前清',1);if(bl)add('Kong bloom 槓上開花',1);
  const f=Math.min(13,L.reduce((a,x)=>a+x[1],0));if(!best||f>best.f)best={f,n:L}}
 return best}
const win=(p,c,self)=>{const r=faan(p,c,M[p],self,self&&bloomF);return r&&r.f>=MIN?r:null};
let PL=[],SK=[];
const LV=[null,
 {n:'Easy',err:.14,noise:2.4,miss:.15,def:0,plan:0,eff:0,read:0,cl:.5},
 {n:'Normal',err:.04,noise:1.4,miss:.03,def:.3,plan:.5,eff:.5,read:.3,cl:.7},
 {n:'Hard',err:0,noise:.4,miss:0,def:.65,plan:.85,eff:1,read:.75,cl:.9},
 {n:'Master',err:0,noise:.05,miss:0,def:1,plan:1,eff:1,read:1,cl:1}],
PERS=[null,{n:'Cautious',d:.3,pl:.8,pg:.7,ch:1.15,big:.6},{n:'Greedy for big hands',d:-.1,pl:1.4,pg:.9,ch:.5,big:2.2},{n:'Aggressive pung-claimer',d:-.15,pl:1,pg:1.8,ch:.75,big:1}],
lvOf=p=>{if(lvForce)return lvForce;const o=(U.set.seat||[])[p-1];return o?o:U.set.lv?U.set.lv:Math.max(1,Math.min(4,Math.round(U.ad.lv)))},
skill=p=>{const L=LV[lvOf(p)],P=PERS[PA[p]||1];return{...L,lv:lvOf(p),def:L.def?Math.max(.05,Math.min(1,L.def+P.d)):0,pl:L.plan*P.pl,pg:P.pg,ch:P.ch,big:P.big}};
function adaptUpdate(won){const a=U.ad;a.r.push(won?1:0);a.r=a.r.slice(-8);if(a.r.length>=4){const r=a.r.reduce((x,y)=>x+y)/a.r.length;a.lv+=r>.4?.25:r>.3?.08:r<.12?-.25:r<.2?-.08:0;a.lv=Math.max(1,Math.min(4,a.lv))}}
function shan(c,m){let best=8-2*m;const go=(i,s,t,p)=>{if(best<0)return;while(i<34&&!c[i])i++;
 if(i>=34){const v=8-2*(m+s)-Math.min(t,4-m-s)-p;if(v<best)best=v;return}
 if(c[i]>=3){c[i]-=3;go(i,s+1,t,p);c[i]+=3}
 if(i<27&&i%9<7&&c[i+1]&&c[i+2]){c[i]--;c[i+1]--;c[i+2]--;go(i,s+1,t,p);c[i]++;c[i+1]++;c[i+2]++}
 if(m+s+t<4){
  if(c[i]>=2){c[i]-=2;if(!p)go(i,s,t,1);go(i,s,t+1,p);c[i]+=2}
  if(i<27){const n=i%9;if(n<8&&c[i+1]){c[i]--;c[i+1]--;go(i,s,t+1,p);c[i]++;c[i+1]++}if(n<7&&c[i+2]){c[i]--;c[i+2]--;go(i,s,t+1,p);c[i]++;c[i+2]++}}
 }else if(c[i]>=2&&!p){c[i]-=2;go(i,s,t,1);c[i]+=2}
 c[i]--;go(i,s,t,p);c[i]++};
 go(0,0,0,0);return best}
const seenAll=()=>{const c=cnt(pool);M.forEach(m=>m.forEach(x=>x.t.forEach(t=>c[t]++)));return c};
function ukeire(c,m,live){const b=shan(c,m);let u=0;for(let x=0;x<34;x++)if(live[x]>0&&c[x]<4){c[x]++;if(shan(c,m)<b)u+=live[x];c[x]--}return u}
function threats(p){return[0,1,2,3].map(q=>{if(q==p)return 0;const m=M[q].length;let t=m>=3?.9:m==2?.6:m==1?.25:.12;if(pools[q].length>=10)t+=.12;return Math.min(1,t)})}
function dng(q,t,sn){if(pools[q].includes(t))return 0;let d;if(t>26){d=sn[t]>=3?.02:sn[t]==2?.08:sn[t]==1?.16:.28}else{const n=t%9;d=n==0||n==8?.14:n==1||n==7?.2:.3;if((n>2&&pools[q].includes(t-3))||(n<6&&pools[q].includes(t+3)))d*=.5;
  const ss=new Set(M[q].flatMap(x=>x.t).filter(x=>x<27).map(x=>x/9|0));if(ss.size==1&&M[q].length>=2)d*=ss.has(t/9|0)?1.5:.4}return d}
function chooseDiscard(p){const c=cnt(H[p]),k=SK[p],m=M[p].length,pl=PL[p]||{k:'open'},cand=[...new Set(H[p])];
 if(Math.random()<k.err)return cand[Math.random()*cand.length|0];
 const rows=cand.map(t=>({t,v:val(p,c,t)+(Math.random()-.5)*2*k.noise}));
 if((k.eff>0||k.def>0)&&pl.k!='orphans'){const sn=seenAll(),live=sn.map((x,i)=>k.read>.5?4-x-c[i]:4-c[i]);
  rows.forEach(r=>{c[r.t]--;r.s=shan(c,m);r.u=k.eff>0?ukeire(c,m,live):0;c[r.t]++});
  const mn=Math.min(...rows.map(r=>r.s)),big=pl.k!='open'&&pl.k!='mix',th=threats(p),tm=Math.max(...th),sc=k.read>.3?sn:Array(34).fill(0),fold=k.def>=.6&&mn>=2&&tm>=.6,Wd=fold?60:mn<=0?8:mn==1?16:26;
  rows.forEach(r=>{if(k.eff>0)r.v+=(r.s-mn)*(big?4:10)*k.eff-r.u*.4*k.eff;if(k.def>0){let d=0;for(let q=0;q<4;q++)if(q!=p&&th[q])d=Math.max(d,th[q]*dng(q,r.t,sc));r.v+=k.def*d*Wd}});
  r_last=mn}
 rows.sort((a,b)=>a.v-b.v);return rows[0].t}
let r_last=0;
function improves(p,t,kind,s){const c=cnt(H[p]),m=M[p].length,s0=shan(c,m),c2=c.slice();if(kind=='pung')c2[t]-=2;else s.filter(x=>x!=t).forEach(x=>c2[x]--);let b=9;for(let x=0;x<34;x++)if(c2[x]){c2[x]--;b=Math.min(b,shan(c2,m+1));c2[x]++}return b<s0?2:b==s0?1:0}
function pickPlan(p){const k=SK[p],c=cnt(H[p]),su=[0,1,2].map(q=>c.slice(q*9,q*9+9).reduce((a,b)=>a+b)),hon=c.slice(27).reduce((a,b)=>a+b),bs=su.indexOf(Math.max(...su)),n=su[bs],pairs=c.filter(x=>x>=2).length,dg=c[31]+c[32]+c[33],od=O.filter(i=>c[i]).length,
 a=k.pl*k.big*(k.lv>=3?1.4:1),w={open:30*(MIN>=3?.5:1.5),mix:(25+Math.max(0,n+hon-6)*8)*(.3+Math.min(1,k.pl)*.7),pure:(10+Math.max(0,n-6)*12)*a,pungs:(12+Math.max(0,pairs-2)*10)*a*k.pg,dragons:(6+Math.max(0,dg-2)*14)*a,orphans:(od>=9?(od-8)*12:.5)*a};
 let r=Math.random()*Object.values(w).reduce((x,y)=>x+y);for(const q in w){if((r-=w[q])<=0)return{k:q,s:bs}}return{k:'open',s:bs}}
const want=(p,t,k)=>{const pl=PL[p]||{k:'open'},ss=t<27?t/9|0:-1,fit=pl.k=='pure'?ss==pl.s:pl.k=='mix'?ss==pl.s||ss<0:1;
 if(k=='pung'){if(pl.k=='orphans')return 0;if(pl.k=='dragons')return t>26?.95:.35;if(pl.k=='pungs')return .9;return fit?(t>26?.9:.7):0}
 return pl.k=='mix'||pl.k=='pure'?(fit?.5:0):pl.k=='open'?.25:0};
function val(p,c,t){const pl=PL[p]||{k:'open',s:0},k=pl.k,ss=t<27?t/9|0:-1,pc=k=='pungs'||k=='dragons'||k=='orphans';
 let v=c[t]*6;
 if(t<27){const n=t%9,q=t-n;if(!pc)v+=(n>0?c[t-1]:0)*3+(n<8?c[t+1]:0)*3+(n>1?c[t-2]:0)*1.5+(n<7?c[t+2]:0)*1.5;if(n==0||n==8)v-=1;for(let i=0;i<9;i++)v+=c[q+i]*.25}
 else if(t>30||t==27||t==sw(p))v+=4;
 if(k=='mix'||k=='pure'){if(t<27?ss!=pl.s:k=='pure')v-=9;else v+=2}
 if(k=='pungs'&&c[t]>=2)v+=5;
 if(k=='dragons')v+=t>30?8:(t==27||t==sw(p))?3:0;
 if(k=='orphans')v=O.includes(t)?(c[t]==1?14:3):-6;
 v-=pool.filter(x=>x==t).length*1.2;
 M.forEach((m,o)=>{if(o!=p&&m.length>=2){const z=new Set(m.flatMap(x=>x.t).filter(x=>x<27).map(x=>x/9|0));if(z.size==1&&ss==[...z][0])v+=3}});
 return v}
function aiTurn(p,decl){const c=cnt(H[p]),pl=PL[p],k=SK[p];if(pl&&W.length<=34&&['pure','dragons','orphans'].includes(pl.k))PL[p]={k:'mix',s:pl.s};
 if(decl&&win(p,c,1)&&Math.random()>=k.miss)return{k:'win'};
 for(let t=0;t<34;t++)if(c[t]==4)return{k:'kong',t};
 const t=chooseDiscard(p);
 if(k.eff>0&&k.lv>=3&&W.length<=44&&r_last>=3&&PL[p]&&PL[p].k!='open')PL[p]={k:'open',s:PL[p].s};
 return{k:'d',t}}
function opts(p,t,from){const c=cnt(H[p]);c[t]++;const w=win(p,c,0);c[t]--;const ch=[];
 if((from+1)%4==p&&t<27){const n=t%9;[[-2,-1],[-1,1],[1,2]].forEach(([a,b])=>{if(n+a>=0&&n+b<=8&&c[t+a]&&c[t+b])ch.push([t+a,t,t+b].sort((x,y)=>x-y))})}
 return{w,pung:c[t]>=2,kong:c[t]>=3,ch}}
const rm=(p,a)=>a.forEach(x=>H[p].splice(H[p].indexOf(x),1));
function doClaim(p,k,t,s){pool.pop();if(lastP>=0)pools[lastP].pop();lastP=-1;fresh=p;if(!p&&!inTut)U.st[{pung:'pg',chow:'ch',kong:'kg'}[k]]++;
 if(k=='chow'){rm(p,s.filter(x=>x!=t));M[p].push({k,t:s,open:1})}
 else{const n=k=='pung'?3:4;rm(p,Array(n-1).fill(t));M[p].push({k,t:Array(n).fill(t),open:1})}
 H[p].sort((a,b)=>a-b);}
function doKong(p,a){const t=a.t;if(!p&&!inTut)U.st.kg++;if(a.add){const m=M[p].find(m=>m.k=='pung'&&m.t[0]==t);m.t.push(t);m.k='kong';rm(p,[t])}else{rm(p,[t,t,t,t]);M[p].push({k:'kong',t:[t,t,t,t],open:0})}H[p].sort((a,b)=>a-b);}

function deal(d){const a=[];for(let t=0;t<34;t++)for(let k=0;k<4;k++)a.push(t);
 for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}
 W=a;H=[0,1,2,3].map(()=>W.splice(0,13).sort((x,y)=>x-y));M=[[],[],[],[]];pool=[];pools=[[],[],[],[]];lastP=-1;bloomF=false;dealer=d;
 SK=[0,1,2,3].map(p=>skill(p));PL=[0,1,2,3].map(pickPlan)}
const v={};['MIN','dealer','W','H','M','pool','pools','lastP','bloomF','PL','SK','PA'].forEach(k=>Object.defineProperty(v,k,{get:()=>eval(k),set:x=>{eval(k+'=x')}}));
return{v,deal,cnt,T,O,sw,decomp,faan,win,opts,aiTurn,want,improves,doClaim,doKong,rm,skill,pickPlan,U,tileCount:()=>W.length};
}
