export const IDLE_MS=60_000;
export const MAX_SESSION_MS=300_000;
// Runs in each document/frame, including verification frames. Only actual input
// updates activity; our status checks and page rendering do not keep it alive.
export function installActivityTracker() {
  const state={lastInputAt:0};
  Object.defineProperty(window,'__doorstepActivity',{value:state});
  for(const name of ['pointerdown','pointermove','keydown','touchstart','wheel']) {
    window.addEventListener(name,event=>{if(event.isTrusted)state.lastInputAt=Date.now();},{capture:true,passive:true});
  }
}
export function idleDeadline(startedAt:number,lastInputAt:number,expiresAt:number) {
  return Math.min(Math.max(startedAt,lastInputAt)+IDLE_MS,expiresAt);
}
