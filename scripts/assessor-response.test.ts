import assert from 'node:assert/strict';
import { readAssessorResponse } from '../src/lib/assessorResponse';
for (const status of [200,403,500,502]) {
 await assert.rejects(readAssessorResponse(new Response('<!DOCTYPE html><html>private error</html>',{status,headers:{'content-type':'text/html','cf-ray':'test-ray'}})),new RegExp(`unexpected webpage.*HTTP ${status}.*test-ray`));
}
await assert.rejects(readAssessorResponse(new Response('{',{headers:{'content-type':'application/json'}})),/unreadable data/);
await assert.rejects(readAssessorResponse(Response.json({error:'Session expired. Sign in again.'},{status:401})),/Session expired/);
await assert.rejects(readAssessorResponse(Response.json({})),/incomplete data/);
assert.deepEqual(await readAssessorResponse(Response.json({assessor:{fields:{'Lot size':'9000'}}})),{assessor:{fields:{'Lot size':'9000'}}});
console.log('County response handling passed: HTML statuses, malformed JSON, API errors, invalid shape and valid data.');
const {onRequest} = await import('../functions/api/property-assessor');
const originalError = console.error;
const logs: string[] = [];
console.error = message => {logs.push(String(message));};
try {
 const response = await onRequest({request:new Request('https://crm.test/api/property-assessor',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer test-placeholder'},body:JSON.stringify({recordId:'11111111-1111-4111-8111-111111111111'})}),env:{VITE_SUPABASE_URL:'not-a-url',VITE_SUPABASE_ANON_KEY:'public-placeholder'}});
 assert.equal(response.status,500);
 assert.match(response.headers.get('content-type') || '',/application\/json/);
 assert.match((await response.json()).error,/Reference:/);
 assert.equal(JSON.parse(logs[0]).stage,'authentication');
 assert.ok(!logs.join().includes('test-placeholder'));
} finally {console.error=originalError;}
console.log('Unexpected server errors return JSON with safe diagnostic reference.');
