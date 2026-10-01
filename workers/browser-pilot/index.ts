import { createClient } from '@supabase/supabase-js';
import { boundedText } from '../../functions/lib/maricopa';
import { lookup } from './lookup';
const origin='https://app.clearview.win';
const json=(body:object,status=200)=>Response.json(body,{status,headers:{'access-control-allow-origin':origin,'vary':'Origin','cache-control':'no-store'}});
export default {async fetch(request:Request,env:any){
 if(request.headers.get('origin') && request.headers.get('origin')!==origin)return json({error:'Origin not allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST','access-control-allow-headers':'authorization,content-type','vary':'Origin'}});
 if(request.method!=='POST')return json({error:'POST required'},405);
 const auth=request.headers.get('authorization')||'';if(!/^Bearer \S+$/.test(auth))return json({error:'Sign in to test cloud retrieval.'},401);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);
 let address:string;try{const data=JSON.parse(await boundedText(new Response(request.body),2048));address=data.address;
 if(typeof address!=='string'||address.length>300||!/^\d/.test(address)||address.includes('://')||address.length<15)throw new Error();}catch{return json({error:'A complete property address is required.'},400);}
 const db=createClient(env.SUPABASE_URL,env.SUPABASE_ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:user,error}=await db.auth.getUser(auth.slice(7));if(error||!user.user)return json({error:'Session expired.'},401);
 const {data:member,error:membershipError}=await db.schema('doorstep').from('workspace_members').select('workspace_id').eq('user_id',user.user.id).eq('status','active').limit(1).maybeSingle();
 if(membershipError||!member)return json({error:'Active DoorStep membership required.'},403);
 if(!(await env.PILOT_LIMIT.limit({key:user.user.id})).success)return json({error:'Pilot limit reached. Wait a minute before another test.'},429);
 if(!(await env.TOTAL_LIMIT.limit({key:'pilot'})).success)return json({error:'Pilot is busy. Try again later.'},429);
 try{return json(await lookup(env.BROWSER,address));}catch{return json({status:'browser_error',message:'Cloud browser timed out or failed. No retry was made; use manual copy/paste.'},502);}
}};
