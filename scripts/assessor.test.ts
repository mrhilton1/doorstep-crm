import assert from 'node:assert/strict';
import fs from 'node:fs';
import { addressKey, parseMaricopaPage, fetchMaricopa, cacheMatches, boundedText } from '../functions/lib/maricopa';
import { onRequest } from '../functions/api/property-assessor';
const address='19848 East Raven Drive, Queen Creek, Arizona, 85142';
const parcel='31404472';
const page=`<input value="31404472" id="APN_RAW"/><a href="https://maps.mcassessor.maricopa.gov/?esearch=31404472">19848 E RAVEN DR QUEEN CREEK, AZ 85142</a>
<div class="td-header">Lot Size</div><div class="td-body">17,097 sq ft.</div>
<div class="td-header">Sale Price</div><div class="td-body">$470,000</div>
<div class="td-header">Mailing Address</div><div class="td-body">Private mailing information</div>`;
const parsed=parseMaricopaPage(page,address,parcel);
assert.equal(parsed.fields['Lot size'],'17,097 sq ft.');
assert.equal(Object.keys(parsed.fields).length,2);
assert.equal(parsed.status,'partial');
assert.ok(!JSON.stringify(parsed).includes('Private mailing'));
assert.throws(()=>parseMaricopaPage(page,'19828 E Raven Dr, Queen Creek, AZ 85142',parcel),/does not match/);
assert.throws(()=>parseMaricopaPage(page,address,'31404473'),/different parcel/);
assert.equal(addressKey(address),addressKey('19848 E RAVEN DR QUEEN CREEK AZ 85142'));
assert.ok(!cacheMatches(parsed,address,parcel),'Old cache refreshes for additional fields');
assert.ok(cacheMatches({...parsed,version:2,status:'complete'},address,parcel));
assert.ok(!cacheMatches({...parsed,fetchedAt:'2020-01-01'},address,parcel));
assert.ok(!cacheMatches(parsed,address,'31404473'));
await assert.rejects(()=>boundedText(new Response('12345'),3),/too large/);
await assert.rejects(()=>fetchMaricopa(address,parcel,async()=>new Response('',{status:403})),/403/);
const env={VITE_SUPABASE_URL:'https://test.supabase.co',VITE_SUPABASE_ANON_KEY:'test-public-key'};
const request=()=>new Request('https://crm.test/api/property-assessor',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer test-user-token'},body:JSON.stringify({recordId:'11111111-1111-4111-8111-111111111111'})});
assert.equal((await onRequest({request:new Request('https://crm.test/api/property-assessor',{method:'POST'}),env})).status,401);
assert.equal((await onRequest({request:new Request('https://crm.test/api/property-assessor'),env})).status,405);
const originalFetch=globalThis.fetch;
let countyRequests=0, updated:any=null, allowRow=true, concurrent=false, useCache=false;
globalThis.fetch=async(input:any,init:any)=>{
 const url=String(input instanceof Request ? input.url : input);
 if(url.includes('/auth/v1/user')) return Response.json({id:'22222222-2222-4222-8222-222222222222'});
 if(url.includes('/rest/v1/property_info_records')) {
   if(init?.method==='PATCH') { updated=JSON.parse(init.body);return Response.json(concurrent ? null : {id:'11111111-1111-4111-8111-111111111111'}); }
   return Response.json(allowRow ? {id:'11111111-1111-4111-8111-111111111111',display_address:address,updated_at:'2026-10-01',parsed_data:{county:'Maricopa County',apnNumber:parcel,squareFootage:'2757',countyAssessor:useCache?{...parsed,version:2,status:'complete'}:undefined}} : null);
 }
 if(url.startsWith('https://doorstep-browser-pilot.'))return Response.json({fields:{Pool:'Yes','County living area':'2,501 sq ft.'}});
 if(url.startsWith('https://mcassessor.maricopa.gov/mcs/')) {countyRequests++;return new Response(page);}
 throw new Error('Unexpected URL');
};
try {
 const response=await onRequest({request:request(),env});assert.equal(response.status,200);assert.equal(updated.parsed_data.squareFootage,'2757');assert.equal(updated.parsed_data.countyAssessor.parcel,parcel);
 useCache=true;countyRequests=0;assert.equal((await onRequest({request:request(),env})).status,200);assert.equal(countyRequests,0);
 allowRow=false;assert.equal((await onRequest({request:request(),env})).status,404);assert.equal(countyRequests,0);
 allowRow=true;useCache=false;concurrent=true;assert.equal((await onRequest({request:request(),env})).status,409);
} finally {globalThis.fetch=originalFetch;}
if(process.env.ASSESSOR_LIVE_CHECK==='1') {
 const live=await fetchMaricopa(address,parcel);console.log(JSON.stringify(live,null,2));assert.equal(live.fields['Lot size'],'17,097 sq ft.');
}
console.log('Assessor parsing, address guard, cache, auth, RLS visibility and concurrency checks passed.');

await assert.rejects(fetchMaricopa(address,parcel,async (_input,init)=>{
 assert.equal(init?.redirect,'manual');
 return new Response(null,{status:302,headers:{location:'https://example.com/'}});
}),/redirected unexpectedly/);

const rendered = page + '<div class="td-header">Pool</div><div class="td-body" id="ResidentialPropertyData_Pool">No</div><div class="td-header">Garage Stalls</div><div class="td-body">0</div>';
assert.equal(parseMaricopaPage(rendered,address,parcel).fields.Pool,'No');
assert.equal(parseMaricopaPage(rendered,address,parcel).fields['Garage stalls'],'0');

assert.equal(parseMaricopaPage(rendered+'<a href="https://maps.mcassessor.maricopa.gov/?esearch=31404473">19828 E RAVEN DR QUEEN CREEK AZ 85142</a>',address,parcel).fields.Pool,'No','Similar-property links must not replace target parcel address');
