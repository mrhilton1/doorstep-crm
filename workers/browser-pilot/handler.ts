import { createClient } from '@supabase/supabase-js';
import { boundedText } from '../../functions/lib/maricopa';

const origin='https://app.clearview.win';
const json=(body:object,status=200)=>Response.json(body,{status,headers:{'access-control-allow-origin':origin,'vary':'Origin','cache-control':'no-store'}});
export default {async fetch(request:Request,env:Env){
 if(request.headers.get('origin') && request.headers.get('origin')!==origin)return json({error:'Origin not allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST','access-control-allow-headers':'authorization,content-type','vary':'Origin'}});
 if(request.method!=='POST')return json({error:'POST required'},405);
 const auth=request.headers.get('authorization')||'';if(!/^Bearer \S+$/.test(auth))return json({error:'Sign in to test cloud retrieval.'},401);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);
 let address:string; let action:string; let lookupId:string; let input:{x?:number;y?:number;scroll?:number}|undefined; try{const data=JSON.parse(await boundedText(new Response(request.body),2048));address=data.address; action=data.action || "start"; lookupId=data.lookupId; input=data.input;
 if(!["start","resume","cancel","status","input"].includes(action)||typeof lookupId!=="string"||! /^[a-f0-9-]{36}$/.test(lookupId)) throw new Error();
 if(action==='input' && (!input || !(Number.isFinite(input.scroll) && Math.abs(input.scroll!)<=600 || Number.isFinite(input.x)&&Number.isFinite(input.y)&&input.x!>=0&&input.x!<=480&&input.y!>=0&&input.y!<=720)))throw new Error();
 if(typeof address!=='string'||address.length>300||!/^\d/.test(address)||address.includes('://')||address.length<15)throw new Error();}catch{return json({error:'A complete property address is required.'},400);}
 const db=createClient(env.SUPABASE_URL,env.SUPABASE_ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:user,error}=await db.auth.getUser(auth.slice(7));if(error||!user.user)return json({error:'Session expired.'},401);
 const {data:member,error:membershipError}=await db.schema('doorstep').from('workspace_members').select('workspace_id').eq('user_id',user.user.id).eq('status','active').limit(1).maybeSingle();
 if(membershipError||!member)return json({error:'Active DoorStep membership required.'},403);
 if(action==='start' && !(await env.PILOT_LIMIT.limit({key:user.user.id})).success)return json({error:'Pilot limit reached. Wait a minute before another test.'},429);
 if(action==='start' && !(await env.TOTAL_LIMIT.limit({key:'pilot'})).success)return json({error:'Pilot is busy. Try again later.'},429);
 try{return json(await env.LOOKUP_SESSIONS.getByName(user.user.id).run(action,address,lookupId,input));}catch{return json({status:'browser_error',message:'Cloud browser could not complete the request. Use Google on your device, or close the cloud session and try later.'},502);}
}};
