import { createClient } from '@supabase/supabase-js';
import { boundedText, cacheMatches, fetchMaricopa, parcelId } from '../lib/maricopa';
type Env = {VITE_SUPABASE_URL?:string; VITE_SUPABASE_ANON_KEY?:string; VITE_SUPABASE_SCHEMA?:string};
const json = (body: object, status=200) => Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function onRequest(context: {request:Request;env:Env}) {
  let stage = 'request';
  try { return await handleRequest(context, value => { stage = value; }); }
  catch (error) {
    const reference = crypto.randomUUID();
    console.error(JSON.stringify({event:'assessor_unexpected_error',stage,reference,errorType:error instanceof Error ? error.name : 'Unknown'}));
    return json({error:`County lookup encountered a server error. Your Google details are saved. Please retry. Reference: ${reference}`},500);
  }
}
async function handleRequest({request,env}: {request:Request;env:Env}, stage: (value:string)=>void) {
  if(request.method !== 'POST') return json({error:'POST required.'},405);
  const origin=request.headers.get('origin');
  if(origin && origin !== new URL(request.url).origin) return json({error:'Origin not allowed.'},403);
  const authorization=request.headers.get('authorization') || '';
  if(!/^Bearer \S+$/.test(authorization)) return json({error:'Sign in to enrich property details.'},401);
  if(!request.headers.get('content-type')?.startsWith('application/json')) return json({error:'JSON required.'},415);
  if(!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return json({error:'Property service is not configured.'},503);
  let recordId: string;
  try { const body=JSON.parse(await boundedText(new Response(request.body),2048));recordId=body.recordId;
    if(typeof recordId !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(recordId)) throw new Error();
  } catch {return json({error:'Valid property record ID required.'},400);}
  stage('authentication');
  const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{
    global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:auth,error:authError}=await client.auth.getUser(authorization.slice(7));
  if(authError || !auth.user) return json({error:'Session expired. Sign in again.'},401);
  stage('property_read');
  const db=client.schema(env.VITE_SUPABASE_SCHEMA || 'doorstep');
  const {data:row,error}=await db.from('property_info_records').select('id,display_address,parsed_data,updated_at').eq('id',recordId).is('deleted_at',null).maybeSingle();
  if(error || !row) return json({error:'Property record is unavailable in your workspace.'},404);
  const data=row.parsed_data || {};
  if(typeof data.county !== 'string' || !/^maricopa(?: county)?$/i.test(data.county.trim())) return json({error:'County is not supported for automatic enrichment.'},422);
  let parcel:string;
  try {parcel=parcelId(data.apnNumber);} catch {return json({error:'Valid parcel number required.'},422);}
  if(cacheMatches(data.countyAssessor,row.display_address,parcel)) return json({assessor:data.countyAssessor,cached:true});
  stage('county_fetch');
  let assessor;
  try {assessor=await fetchMaricopa(row.display_address,parcel);}
  catch(e) {return json({error:e instanceof Error ? e.message : 'County retrieval failed.'},502);}
  stage('additional_information');
  assessor.version=2;
  try {
    const response=await fetch('https://doorstep-browser-pilot.steep-field-929d.workers.dev/county-details',{
      method:'POST',headers:{'content-type':'application/json',Authorization:authorization},
      body:JSON.stringify({recordId}),redirect:'manual',signal:AbortSignal.timeout(40000)
    });
    if(!response.ok)throw new Error('Additional information unavailable');
    const extra=JSON.parse(await boundedText(response,20000));
    if(!extra.fields || !['Yes','No'].includes(extra.fields.Pool))throw new Error('Invalid additional information');
    assessor.fields={...assessor.fields,...extra.fields};
    assessor.status='complete';
    assessor.notice='County property details and Additional Information imported. Your original Google square footage and bid inputs are unchanged.';
  } catch {
    assessor.notice='Basic county details saved. Additional Information could not be loaded; it will be retried after one hour. Your original square footage is unchanged.';
  }
  // User's JWT and RLS apply to writes; compare version so concurrent edits cannot be overwritten.
  stage('property_save');
  const {data:updated,error:updateError}=await db.from('property_info_records')
    .update({parsed_data:{...data,countyAssessor:assessor},updated_by:auth.user.id})
    .eq('id',recordId).eq('updated_at',row.updated_at).is('deleted_at',null).select('id').maybeSingle();
  if(updateError || !updated) return json({error:'Could not save county data. Check edit access or reopen the property if it changed.'},409);
  return json({assessor,cached:false});
}
