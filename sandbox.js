'use strict';
// Loads the game's own rules code (from public/index.html) into an isolated VM, one per room.
const vm=require('vm'),fs=require('fs'),path=require('path');
let SRC=null,FLOW=null;
function load(dir){const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const m=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);SRC=m.sort((a,b)=>b.length-a.length)[0];
 FLOW=fs.readFileSync(path.join(__dirname,'flow.js'),'utf8');return SRC.length}
function stub(){const f=function(){};return new Proxy(f,{get:(t,k)=>{if(k===Symbol.toPrimitive)return()=>'';if(k==='length')return 0;if(k==='then')return undefined;if(k===Symbol.iterator)return function*(){};return stub()},set:()=>true,apply:()=>stub(),construct:()=>stub(),has:()=>true})}
function create(){
 const sb={console,Math,Date,JSON,Promise,Array,Object,String,Number,Set,Map,RegExp,Error,Symbol,parseInt,parseFloat,isNaN,
  setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
  document:stub(),navigator:{userAgent:'node',language:'en',vibrate(){}},location:{protocol:'https:',host:'x',href:'',search:''},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},AudioContext:function(){return stub()},requestAnimationFrame(){},matchMedia(){return{matches:false,addEventListener(){}}},
  screen:{},history:{},addEventListener(){},innerWidth:390,innerHeight:844,getComputedStyle(){return stub()},WebSocket:function(){},fetch(){return Promise.reject()},Audio:function(){return stub()},Image:function(){return stub()},CSS:stub(),visualViewport:null,performance:{now:()=>Date.now()}};
 sb.window=sb;const ctx=vm.createContext(sb);
 vm.runInContext(SRC,ctx);vm.runInContext(FLOW,ctx);
 return{ctx,run:s=>vm.runInContext(s,ctx),IO:vm.runInContext('IO',ctx)}}
module.exports={load,create};
