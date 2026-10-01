import { parseDocument } from 'htmlparser2';
import type { AnyNode, Element } from 'domhandler';
import { parseGoogleProperty } from '../../src/lib/googleProperty';
import { addressKey } from '../../functions/lib/maricopa';
const text = (node: AnyNode): string => {
  if(node.type==='text') return node.data;
  if(node.type==='script'||node.type==='style'||node.type==='comment') return '';
  return 'children' in node ? node.children.map(text).join(' ') : '';
};
export function extractOverview(html:string,address:string) {
  const doc=parseDocument(html);const elements:Element[]=[];const stack:AnyNode[]=[doc];let count=0;
  while(stack.length){if(++count>100000) throw new Error('Page too large to inspect.');const node=stack.pop()!;
    if(node.type==='script'||node.type==='style')continue;
    if(node.type==='tag')elements.push(node);
    if('children' in node)stack.push(...node.children);
  }
  const pageText=text(doc);
  if(/unusual traffic from your computer network|our systems have detected unusual traffic|verify you are human|not a robot/i.test(pageText))
    return {status:'verification_required',message:'Google requires verification. This cloud attempt stopped; use Search this address and copy/paste on your device.'};
  if(/before you continue to Google/i.test(pageText)) return {status:'consent_required',message:'Google returned a consent screen. Use the manual search for this pilot.'};
  const markers=elements.filter(n=>text(n).trim()==='AI Overview');
  if(!markers.length)return {status:'no_overview',message:'Google did not return an AI Overview to the cloud browser.'};
  for(const marker of markers){let node:AnyNode|null=marker;
    for(let level=0;node&&level<7;level++,node=node.parent){
      if(node.type==='tag' && ['body','html'].includes(node.name))break;
      const lists:Element[]=[];const pending:AnyNode[]=[node];
      while(pending.length){const item=pending.pop()!;if(item.type==='tag'&&item.name==='li')lists.push(item);else if('children' in item)pending.push(...[...item.children].reverse());}
      const lines=lists.map(n=>text(n).replace(/\s+/g,' ').trim()).filter(t=>/^[A-Za-z ]+:/.test(t));
      const rawText=lines.join('\n');const parsed=parseGoogleProperty(rawText);
      if(Object.keys(parsed.fields).length<3)continue;
      if(!parsed.reportedAddress||addressKey(parsed.reportedAddress)!==addressKey(address))return {status:'address_unverified',message:'An overview was found, but its address could not be matched exactly. Use manual review.'};
      return {status:'candidate',message:'Overview captured. Review the fields and confirm the address before saving.',rawText,fields:parsed.fields};
    }
  }
  return {status:'unrecognized_overview',message:'An AI Overview appeared, but the requested labeled property list was not found.'};
}
