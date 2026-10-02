import assert from 'node:assert/strict';
import puppeteer from '@cloudflare/puppeteer';
import {extractRenderedCountyDetails,countyDetails} from '../workers/browser-pilot/county';
const env={} as any;
assert.equal((await countyDetails(new Request('https://worker.test/county-details',{method:'POST'}),env)).status,401);
let closed=0;
const original=puppeteer.launch;
const html='<input id="APN_RAW" value="31404476"><a href="https://maps.mcassessor.maricopa.gov/?esearch=31404476">19833 E RAVEN DR QUEEN CREEK AZ 85142</a><div class="td-header">Lot Size</div><div class="td-body">10000</div><div class="td-header">Pool</div><div class="td-body" id="ResidentialPropertyData_Pool">Yes</div><div class="td-header">Owner</div><div class="td-body">Do not import</div>';
try {
 (puppeteer as any).launch=async()=>({newPage:async()=>({goto:async()=>{},waitForFunction:async()=>{},url:()=> 'https://mcassessor.maricopa.gov/mcs/?q=31404476',content:async()=>html}),close:async()=>{closed++;}});
 assert.deepEqual(await extractRenderedCountyDetails(env,'19833 East Raven Drive, Queen Creek, AZ 85142','31404476'),{Pool:'Yes'});
 assert.equal(closed,1);
 await assert.rejects(extractRenderedCountyDetails(env,'19848 East Raven Drive, Queen Creek, AZ 85142','31404476'),/does not match/);
 assert.equal(closed,2);
 (puppeteer as any).launch=async()=>({newPage:async()=>{throw new Error('timeout');},close:async()=>{closed++;}});
 await assert.rejects(extractRenderedCountyDetails(env,'19833 E Raven Dr, Queen Creek, AZ 85142','31404476'),/timeout/);
 assert.equal(closed,3);
} finally {(puppeteer as any).launch=original;}
console.log('County browser tests passed: auth required, allowed fields only, address guard, close on success/error/timeout.');
