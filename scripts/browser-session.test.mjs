import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['workers/browser-pilot/session.ts'],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'browser-fixtures',setup(build){
 build.onResolve({filter:/^(@cloudflare\/puppeteer|cloudflare:workers)$/},args=>({path:args.path,namespace:'fixture'}));
 build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='cloudflare:workers'?'export class DurableObject {constructor(ctx,env){this.ctx=ctx;this.env=env;}}':'export default globalThis.browserFixture;'}));
}}]});
let html='<p>Our systems have detected unusual traffic from your computer network.</p>', now=1000000, input=0, closed=0, launched=0;
const address='19848 E Raven Dr, Queen Creek, AZ 85142';
const cdp={send:async name=>name==='Target.getTargetInfo'?{targetInfo:{targetId:'target'}}:{devtoolsFrontendUrl:'https://live.browser.run/ui/view?mode=tab&wss=fixture'},detach:async()=>{}};
const page={evaluateOnNewDocument:async()=>{},setViewport:async()=>{},createCDPSession:async()=>cdp,goto:async()=>{},url:()=> 'https://www.google.com/search?q=fixture',content:async()=>html,screenshot:async()=>new Uint8Array([1,2,3]),mouse:{click:async()=>{},wheel:async()=>{}},frames:()=>[{evaluate:async()=>input}]};
const browser={newPage:async()=>page,sessionId:()=> 'session',disconnect:async()=>{},close:async()=>{closed++;},pages:async()=>[page],targets:()=>[{type:()=> 'page',page:async()=>page}]};
globalThis.browserFixture={launch:async()=>{launched++;return browser;},connect:async()=>browser,sessions:async()=>[{sessionId:'session'}]};
const {LookupSession}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const store=new Map();let alarm;
const ctx={storage:{get:async k=>store.get(k),put:async(k,v)=>store.set(k,structuredClone(v)),delete:async k=>store.delete(k),setAlarm:async t=>{alarm=t;},deleteAlarm:async()=>{alarm=undefined;}}};
const env={BROWSER:{deleteSession:async()=>{closed++;}}};
const realNow=Date.now;Date.now=()=>now;
try {
 let session=new LookupSession(ctx,env);
 let result=await session.run('start',address,'lookup1');assert.equal(result.status,'human_input');assert.equal(launched,1);
 assert.equal((await session.run('resume',address,'different')).status,'expired');assert.equal(closed,0);
 assert.equal((await session.run('start',address,'lookup2')).status,'busy');assert.equal(launched,1);
 // Recreate the object to prove the lifecycle is recovered from durable state.
 session=new LookupSession(ctx,env);
 now+=55000;input=now;await session.alarm();assert.equal(closed,0);
 now+=59000;await session.run('status',address,'lookup1');await session.alarm();assert.equal(closed,0);
 now+=1000;await session.alarm();assert.equal(closed,1);assert.equal(store.has('session'),false);
 assert.equal((await session.run('status',address,'lookup1')).status,'expired');
 html='<section><h2>AI Overview</h2><ul><li>Address: '+address+'</li><li>County: Maricopa County</li><li>Parcel Number: 314-04-472</li><li>Total Interior Area: 2,501 square feet</li></ul></section>';
 result=await session.run('start',address,'lookup3');assert.equal(result.status,'candidate');assert.equal(closed,2);
 html='<p>not a robot</p>';await session.run('start',address,'lookup4');
 await session.run('cancel',address,'old');assert.equal(closed,2);
 await session.run('cancel',address,'lookup4');assert.equal(closed,3);assert.equal(store.has('session'),false);
 await session.run('start',address,'lookup5');html='<section><h2>AI Overview</h2><ul><li>Address: '+address+'</li><li>County: Maricopa County</li><li>Bedrooms: 4</li><li>Total Interior Area: 2,501 square feet</li></ul></section>';
 await session.alarm();assert.equal(closed,4);assert.equal((await session.run('status',address,'lookup5')).status,'candidate');
 await session.alarm();assert.equal(store.has('result'),false);
 console.log('Session fixtures passed: ownership, duplicate start, restart recovery, input extends idle, polling does not, auto extraction, cancel, result cleanup.');
} finally {Date.now=realNow;delete globalThis.browserFixture;}
