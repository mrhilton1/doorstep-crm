import { parseDocument } from 'htmlparser2';
import type { AnyNode, Element } from 'domhandler';
export type AssessorData = {
  version: 1; status: 'partial'; source: 'maricopa_assessor'; sourceUrl: string;
  parcel: string; address: string; fetchedAt: string; fields: Record<string, string>; notice: string;
};
export function parcelId(value: unknown) {
  const parcel = typeof value === 'string' ? value.replace(/[-.\s]/g, '').toUpperCase() : '';
  if (!/^\d{8}[A-Z]?$/.test(parcel)) throw new Error('A valid Maricopa parcel number is required.');
  return parcel;
}
export function addressKey(value: string) {
  const replacements: Record<string,string> = {east:'e',west:'w',north:'n',south:'s',drive:'dr',street:'st',road:'rd',avenue:'ave',lane:'ln',court:'ct',place:'pl',boulevard:'blvd',circle:'cir',arizona:'az'};
  return value.toLowerCase().replace(/\busa\b|\bunited states\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).map(word => replacements[word] || word).join(' ');
}
const nodeText = (node: AnyNode): string => {
  if(node.type === 'text') return node.data;
  if(node.type === 'script' || node.type === 'style' || node.type === 'comment') return '';
  return 'children' in node ? node.children.map(nodeText).join('') : '';
};
const clean = (node: AnyNode) => nodeText(node).replace(/\s+/g,' ').trim();
export function parseMaricopaPage(html: string, expectedAddress: string, expectedParcel: string): AssessorData {
  const document = parseDocument(html);
  const elements: Element[] = [];
  const pending: AnyNode[] = [...document.children];
  let visited = 0;
  while(pending.length) {
    if(++visited > 40000) throw new Error('County page is too complex.');
    const node = pending.pop()!;
    if(node.type === 'script' || node.type === 'style') continue;
    if(node.type === 'tag') elements.push(node);
    if('children' in node) pending.push(...node.children);
  }
  const parcel = elements.find(node => node.attribs.id === 'APN_RAW')?.attribs.value;
  if (!parcel || parcelId(parcel) !== expectedParcel) throw new Error('County returned a different parcel or no parcel record.');
  const addressNode = elements.find(node => node.name === 'a' && /^https?:\/\/maps\.mcassessor\.maricopa\.gov\/\?esearch=/.test(node.attribs.href || '') && /^\d/.test(clean(node)));
  const address = addressNode ? clean(addressNode) : '';
  if (!address || addressKey(address) !== addressKey(expectedAddress)) throw new Error('County address does not match this house. No county data was saved.');
  const allowed: Record<string,string> = {
    'Description':'Subdivision description', 'Lot Size':'Lot size', 'Lot #':'Lot number',
    'High School District':'High school district', 'Elementary School District':'Elementary school district',
    'Local Jurisdiction':'Jurisdiction', 'S/T/R':'Section / township / range',
    'Market Area/Neighborhood':'Market area / neighborhood code', 'Deed Number':'Deed number',
    'Last Deed Date':'Last deed date', 'Sale Date':'Last sale date', 'Sale Price':'Last sale price'
  };
  const fields: Record<string,string> = {};
  for (const node of elements) {
    if(!(node.attribs.class || '').split(/\s+/).includes('td-header')) continue;
    const key = allowed[clean(node).replace(/[^a-zA-Z0-9 /#]/g,'').trim()];
    let sibling = node.next;
    while(sibling && sibling.type !== 'tag') sibling = sibling.next;
    if(!key || !sibling || sibling.type !== 'tag' || !(sibling.attribs.class || '').split(/\s+/).includes('td-body')) continue;
    const value = clean(sibling);
    if(value && value.length < 600) fields[key] = value;
  }
  if (!Object.keys(fields).length) throw new Error('County page format was not recognized. No data was saved.');
  return {version:1,status:'partial',source:'maricopa_assessor',sourceUrl:`https://mcassessor.maricopa.gov/mcs/?q=${expectedParcel}`,
    parcel:expectedParcel,address,fetchedAt:new Date().toISOString(),fields,
    notice:'Public county record imported. Building details (including county square footage, roof and pool) require county API access and have not been imported. Your original square footage is unchanged.'};
}
export function cacheMatches(value: any, address: string, parcel: string) {
  const age = Date.now() - Date.parse(value?.fetchedAt || '');
  return value?.version === 1 && value?.source === 'maricopa_assessor' && value?.parcel === parcel &&
    typeof value?.address === 'string' && addressKey(value.address) === addressKey(address) && age >= 0 && age < 30*24*60*60*1000;
}
export async function boundedText(response: Response, limit = 500000) {
  if (!response.body) throw new Error('Empty response.');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const {done,value} = await reader.read(); if(done) break;
    size += value.byteLength; if(size > limit) { await reader.cancel(); throw new Error('Response too large.'); } chunks.push(value);
  } } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset=0; for(const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.length;}
  return new TextDecoder().decode(bytes);
}
export async function fetchMaricopa(address: string, parcel: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher(`https://mcassessor.maricopa.gov/mcs/?q=${parcel}`, {
    headers:{Accept:'text/html'}, redirect:'error', signal:AbortSignal.timeout(15000)
  });
  if(!response.ok) throw new Error(`County retrieval unavailable (HTTP ${response.status}). Try again later.`);
  return parseMaricopaPage(await boundedText(response),address,parcel);
}
