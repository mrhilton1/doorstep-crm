import { Buffer } from 'node:buffer';
import { DurableObject } from 'cloudflare:workers';
import puppeteer, { type Browser, type Page } from '@cloudflare/puppeteer';
import { googlePropertyUrl } from '../../src/lib/googleProperty';
import { extractOverview } from './extract';
import { installActivityTracker, idleDeadline, MAX_SESSION_MS } from './activity';

type Session = { lookupId:string; address:string; sessionId:string; targetId:string; expiresAt:number; startedAt:number; lastInputAt:number };
const expired = {status:'expired', message:'Cloud session ended. Open Google on your device or start a new cloud lookup.'};

export class LookupSession extends DurableObject<Env> {
  private busy = false;
  async run(action:string,address:string,lookupId:string,input?:{x?:number;y?:number;scroll?:number}) {
    if(this.busy) return {status:'busy',message:'A browser operation is already running. Try again shortly.'};
    this.busy=true;
    try {
      let state=await this.ctx.storage.get<Session>('session');
      if(action==='status') {
        const done=await this.ctx.storage.get<{lookupId:string;result:object}>('result');
        if(done?.lookupId===lookupId)return done.result;
        return state?.lookupId===lookupId && state.address===address ? {status:'waiting',screen:await this.ctx.storage.get<string>('screen'),idleExpiresAt:idleDeadline(state.startedAt,state.lastInputAt,state.expiresAt)} : expired;
      }
      if(action==='cancel') {
        if(state?.lookupId===lookupId) await this.finish(state);
        return {status:'closed',message:'Cloud browser closed.'};
      }
      if(action==='start') {
        if(state && state.expiresAt>Date.now()) return {status:'busy',message:'You already have a cloud lookup open. Close it in the other panel or wait up to five minutes.'};
        if(state) await this.finish(state);
        await this.ctx.storage.delete('result');
        const browser=await puppeteer.launch(this.env.BROWSER,{keep_alive:300000});
        let keep=false;
        try {
          const page=await browser.newPage();
          await page.evaluateOnNewDocument(installActivityTracker);
          await page.setViewport({width:480,height:720});
          const cdp=await page.createCDPSession();
          const {targetInfo}=await cdp.send('Target.getTargetInfo');
          await cdp.detach();
          state={lookupId,address,sessionId:browser.sessionId(),targetId:targetInfo.targetId,expiresAt:Date.now()+MAX_SESSION_MS,startedAt:Date.now(),lastInputAt:0};
          await this.ctx.storage.put('session',state);
          await this.ctx.storage.setAlarm(Date.now()+5000);
          await page.goto(googlePropertyUrl(address),{waitUntil:'domcontentloaded',timeout:20000});
          state.startedAt=Date.now();
          await this.ctx.storage.put('session',state);
          const result=await this.inspect(page,state);
          keep=result.status==='human_input';
          if(!keep) await this.clear();
          return result;
        } catch { await this.clear(); throw new Error('Browser launch/navigation failed'); }
        finally {if(keep) await browser.disconnect(); else await browser.close();}
      }
      if(!state || state.lookupId!==lookupId || state.address!==address) return expired;
      if(state.expiresAt<=Date.now()) {await this.finish(state);return expired;}
      const browser=await puppeteer.connect(this.env.BROWSER,state.sessionId);
      let keep=false;
      try {
        const targets=browser.targets();
        let page:Page|null=null;
        for(const target of targets) {
          if(target.type()!=='page') continue;
          const candidate=await target.page();
          if(!candidate)continue;
          const cdp=await candidate.createCDPSession();
          const {targetInfo}=await cdp.send('Target.getTargetInfo');await cdp.detach();
          if(targetInfo.targetId===state.targetId){page=candidate;break;}
        }
        if(!page){await this.clear();return expired;}
        if(action==='input' && input){
          if(typeof input.scroll==='number')await page.mouse.wheel({deltaY:input.scroll});
          else if(typeof input.x==='number' && typeof input.y==='number')await page.mouse.click(input.x,input.y);
          state.lastInputAt=Date.now();await this.ctx.storage.put('session',state);
          await this.ctx.storage.setAlarm(Date.now()+1000);
          keep=true;return {status:'waiting'};
        }
        const result=await this.inspect(page,state);
        keep=result.status==='human_input';
        if(!keep) await this.clear();
        return result;
      } finally {if(keep)await browser.disconnect();else {await browser.close();await this.clear();}}
    } finally {this.busy=false;}
  }
  private async inspect(page:Page,state:Session,withView=true) {
    // A person may navigate in Live View. Never extract a different site's page.
    const url=new URL(page.url());
    if(url.protocol!=='https:' || !['www.google.com','google.com','consent.google.com'].includes(url.hostname))
      return {status:'wrong_page',message:'The cloud tab left Google. The session has been closed; use the direct search option.'};
    const html=await page.content();
    if(html.length>4000000)throw new Error('Page too large');
    const result=extractOverview(html,state.address);
    if(result.status==='candidate')return {...result,lookupId:state.lookupId,sourceUrl:googlePropertyUrl(state.address)};
    const screen=Buffer.from(await page.screenshot({type:'jpeg',quality:65})).toString('base64');
    await this.ctx.storage.put('screen',screen);
    if(!withView)return {status:'waiting',message:'Waiting for Google property details.'};
    const remaining=state.expiresAt-Date.now();
    if(remaining<60000)return {status:'expired',message:'Cloud session is ending. Use direct Google search or start a new lookup.'};
    const cdp=await page.createCDPSession();
    try {
      const {devtoolsFrontendUrl}=await cdp.send('Cloudflare.getLiveView',{mode:'tab',expiresInMs:remaining});
      const view=new URL(devtoolsFrontendUrl);
      if(view.protocol!=='https:'||view.hostname!=='live.browser.run')throw new Error('Unexpected Live View URL');
      return {status:'human_input',screen,reason:result.status,lookupId:state.lookupId,liveViewUrl:devtoolsFrontendUrl,expiresAt:state.expiresAt,idleExpiresAt:idleDeadline(state.startedAt,state.lastInputAt,state.expiresAt),
        message:result.status==='verification_required'?'Complete Google verification in the browser below, the matching details will save automatically.':'Interact with Google below until the property details appear, the matching details will save automatically.'};
    } finally {await cdp.detach();}
  }
  private async clear(){await this.ctx.storage.delete('screen');await this.ctx.storage.delete('session');await this.ctx.storage.deleteAlarm();}
  private async finish(state:Session){
    // Preserve state/alarm on transient failure so cleanup can be retried.
    const sessions=await puppeteer.sessions(this.env.BROWSER);
    if(sessions.some(s=>s.sessionId===state.sessionId)) {
      const browser:Browser=await puppeteer.connect(this.env.BROWSER,state.sessionId);
      await browser.close();
    }
    await this.clear();
  }
  async alarm(){
    if(this.busy){await this.ctx.storage.setAlarm(Date.now()+1000);return;}
    this.busy=true;
    let browser:Browser|undefined;
    try {
      const state=await this.ctx.storage.get<Session>('session');
      if(!state){await this.ctx.storage.delete('result');return;}
      browser=await puppeteer.connect(this.env.BROWSER,state.sessionId);
      const pages=await browser.pages();
      let page:Page|undefined;
      for(const candidate of pages){
        const cdp=await candidate.createCDPSession();
        const {targetInfo}=await cdp.send('Target.getTargetInfo');await cdp.detach();
        if(targetInfo.targetId===state.targetId){page=candidate;break;}
      }
      if(!page){await this.finish(state);return;}
      for(const frame of page.frames()) {
        try {
          const timestamp=await frame.evaluate(()=>Number((window as any).__doorstepActivity?.lastInputAt)||0);
          if(Number.isFinite(timestamp))state.lastInputAt=Math.max(state.lastInputAt,Math.min(Date.now(),timestamp));
        } catch { /* A navigating verification frame may disappear. */ }
      }
      const idleAt=idleDeadline(state.startedAt,state.lastInputAt,state.expiresAt);
      const result=Date.now()>=idleAt
        ? {status:'expired',message:'Cloud browser closed after 60 seconds without interaction or reaching the five-minute session limit.'}
        : await this.inspect(page,state,false);
      if(result.status!=='waiting') {
        await browser.close();browser=undefined;
        await this.ctx.storage.delete('session');
        await this.ctx.storage.delete('screen');
        await this.ctx.storage.put('result',{lookupId:state.lookupId,result});
        await this.ctx.storage.setAlarm(Date.now()+600000);
      } else {
        await this.ctx.storage.put('session',state);
        await this.ctx.storage.setAlarm(Math.min(Date.now()+5000,idleAt));
      }
    } catch {
      const state=await this.ctx.storage.get<Session>('session');
      if(state && Date.now()>=idleDeadline(state.startedAt,state.lastInputAt,state.expiresAt)) {
        // List sessions first so an already-closed browser is cleaned up too.
        await this.finish(state);
      } else await this.ctx.storage.setAlarm(Date.now()+5000);
    } finally {try{if(browser)await browser.disconnect();}finally{this.busy=false;}}
  }
}
