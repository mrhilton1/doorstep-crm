import assert from 'node:assert/strict';
import {grantedDeviceLocation, requestDeviceLocation} from '../src/lib/deviceLocation';
let calls=0;
let options:PositionOptions|undefined;
const geo={getCurrentPosition(success:PositionCallback,_error:PositionErrorCallback,opts:PositionOptions){calls++;options=opts;success({coords:{latitude:33.25,longitude:-111.6}} as GeolocationPosition);}} as Geolocation;
const nav=(state:PermissionState)=>({geolocation:geo,permissions:{query:async()=>({state})}} as unknown as Pick<Navigator,'permissions'|'geolocation'>);
assert.deepEqual(await grantedDeviceLocation(nav('granted')),[33.25,-111.6]);
assert.equal(calls,1);assert.equal(options?.enableHighAccuracy,true);assert.equal(options?.timeout,10000);
for(const state of ['prompt','denied'] as const)assert.equal(await grantedDeviceLocation(nav(state)),null);
assert.equal(calls,1,'Automatic startup must not trigger an ungranted request');
assert.equal(await grantedDeviceLocation({geolocation:geo,permissions:undefined} as any),null);
assert.equal(await grantedDeviceLocation({geolocation:geo,permissions:{query:async()=>{throw new Error('Unsupported');}}} as any),null);
assert.equal(calls,1);
await assert.rejects(requestDeviceLocation(undefined),/does not support/);
for(const code of [1,2,3]){
 const unavailable={getCurrentPosition(_success:PositionCallback,error:PositionErrorCallback){error({code} as GeolocationPositionError);}} as Geolocation;
 await assert.rejects(requestDeviceLocation(unavailable),/blocked|could not|timed out/);
 assert.equal(await grantedDeviceLocation({...nav('granted'),geolocation:unavailable}),null);
}
assert.deepEqual(await requestDeviceLocation(geo),[33.25,-111.6]);
console.log('Device location checks passed: granted-only startup, no prompt on denied/prompt/unsupported, explicit request, failures and bounded timeout.');
