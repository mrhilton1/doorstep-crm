import { boundedText } from '../../functions/lib/maricopa';
import { googlePropertyUrl } from '../../src/lib/googleProperty';
import { extractOverview } from './extract';
export async function lookup(browser:any,address:string) {
  const sourceUrl=googlePropertyUrl(address);const started=Date.now();
  const response=await browser.quickAction('content',{
    url:sourceUrl,viewport:{width:1365,height:900},gotoOptions:{waitUntil:'networkidle2',timeout:20000}
  });
  if(!response.ok)return {status:'browser_error',message:`Cloud browser returned HTTP ${response.status}. No retry was made.`,elapsedMs:Date.now()-started,sourceUrl};
  const body=await boundedText(response,4000000);
  let html=body;
  if(response.headers.get('content-type')?.includes('application/json')){
    const result=JSON.parse(body);html=typeof result==='string'?result:result.result;
    if(typeof html!=='string')throw new Error('Browser returned an unsupported response.');
  }
  return {...extractOverview(html,address),sourceUrl,elapsedMs:Date.now()-started,browserMs:response.headers.get('x-browser-ms-used')};
}
