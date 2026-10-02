import puppeteer from '@cloudflare/puppeteer';
import {createClient} from '@supabase/supabase-js';
import {boundedText, parcelId, parseMaricopaPage} from '../../functions/lib/maricopa';
type CountyEnv = { BROWSER: Parameters<typeof puppeteer.launch>[0]; SUPABASE_URL:string; SUPABASE_ANON_KEY:string; PILOT_LIMIT:{limit(input:{key:string}):Promise<{success:boolean}>}; TOTAL_LIMIT:{limit(input:{key:string}):Promise<{success:boolean}>} };
const json=(body:object,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
export async function countyDetails(request:Request,env:CountyEnv):Promise<Response> {
 if(request.method!=='POST')return json({error:'POST required'},405);
 const origin=request.headers.get('origin');
 if(origin && origin!=='https://app.clearview.win')return json({error:'Origin not allowed'},403);
 const authorization=request.headers.get('authorization') || '';
 if(!/^Bearer \S+$/.test(authorization))return json({error:'Sign in required'},401);
 let recordId:string;
 try {recordId=JSON.parse(await boundedText(new Response(request.body),2048)).recordId;if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(recordId))throw new Error();}
 catch{return json({error:'Valid record ID required'},400);}
 try {
 const client=createClient(env.SUPABASE_URL,env.SUPABASE_ANON_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await client.auth.getUser(authorization.slice(7));
 if(authError||!auth.user)return json({error:'Session expired'},401);
 const {data:row,error}=await client.schema('doorstep').from('property_info_records').select('display_address,parsed_data').eq('id',recordId).is('deleted_at',null).maybeSingle();
 if(error||!row)return json({error:'Property unavailable'},404);
 if(!/^maricopa(?: county)?$/i.test(String(row.parsed_data?.county||'').trim()))return json({error:'County unsupported'},422);
 const parcel=parcelId(row.parsed_data?.apnNumber);
 if(!(await env.PILOT_LIMIT.limit({key:`county:${auth.user.id}`})).success || !(await env.TOTAL_LIMIT.limit({key:'county'})).success)return json({error:'County browser is busy. Try later.'},429);
 return json({fields:await extractRenderedCountyDetails(env,row.display_address,parcel)});
 } catch {return json({error:'Additional county information could not be loaded. Basic county details remain available.'},502);}
}

export async function extractRenderedCountyDetails(env:Pick<CountyEnv,'BROWSER'>,address:string,parcel:string) {
 const browser=await puppeteer.launch(env.BROWSER,{keep_alive:60000});
 try {
 const page=await browser.newPage();
 await page.goto(`https://mcassessor.maricopa.gov/mcs/?q=${parcel}`,{waitUntil:'domcontentloaded',timeout:15000});
 await page.waitForFunction(()=>!!document.getElementById('ResidentialPropertyData_Pool')?.textContent?.trim(),{timeout:12000});
 if(!page.url().startsWith('https://mcassessor.maricopa.gov/mcs/'))throw new Error('Unexpected county navigation');
 // Only return allowlisted property facts. Never return/store owner or contact sections.
 const html=await page.content();
 if(html.length>500000)throw new Error('County response too large');
 const parsed=parseMaricopaPage(html,address,parcel);
 const keys=['Construction year','Weighted construction year','Improvement quality','Pool','County living area','Detached living area','Patios','Exterior wall type','Roof type','Bath fixtures','Garage stalls','Carport stalls','Locational characteristics'];
 const fields=Object.fromEntries(Object.entries(parsed.fields).filter(([key])=>keys.includes(key)));
 if(!['Yes','No'].includes(fields.Pool))throw new Error('Additional information unavailable');
 return fields;
 } finally {await browser.close();}

}
