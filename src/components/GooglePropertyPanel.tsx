import { RecordedOwnerCard } from './RecordedOwnerCard';
import { OwnerContact } from '../lib/recordedOwner';
import { readAssessorResponse } from '../lib/assessorResponse';
import { BidRule, recommendedBid, bidCurrency } from '../lib/recommendedBid';
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { countyAssessorUrl, googleFields, googlePropertyUrl, parseGoogleProperty } from '../lib/googleProperty';

type RecordView = { id?: string; parsedData: object; sourceUrl?: string | null; createdAt: number };
type Props = {
  key?: string;
  bidRules: BidRule[];
  recordedOwner: string;
  canEditOwner: boolean;
  saveOwner: (text: string) => Promise<void>;
  addOwnerContact: (contact: OwnerContact & { id: string }) => Promise<void>;
  address: string;
  searchAddress: string;
  load: () => Promise<RecordView | null>;
  save: (fields: Record<string, string>, text: string, url: string, automatic?: boolean) => Promise<RecordView>;
  close: () => void;
};
export function GooglePropertyPanel({ address, searchAddress, load, save, close, bidRules, recordedOwner, saveOwner, addOwnerContact, canEditOwner }: Props) {
  const [cached, setCached] = useState<RecordView | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [bidRefreshCount, setBidRefreshCount] = useState(0);
  const [countyBusy, setCountyBusy] = useState(false);
  const [countyError, setCountyError] = useState('');
  const [countyRetry, setCountyRetry] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    load().then(record => { if (active) { setCached(record); setEditing(!record); } })
      .catch(e => { if (active) { setError(e.message || 'Could not check saved data.'); setEditing(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; previous?.focus(); };
  }, []);
  const parsed = parseGoogleProperty(text);
  const data = editing ? parsed.fields : (cached?.parsedData || {}) as Record<string, unknown>;
  const rows = googleFields.filter(([key]) => typeof data[key] === 'string' && data[key] !== 'N/A');
  const bid = recommendedBid(data, bidRules);
  const url = googlePropertyUrl(searchAddress);
  const assessorUrl = countyAssessorUrl(data);
  const otherRows = rows.filter(([key]) => !['squareFootage', 'county', 'apnNumber'].includes(key));
  const summaryValue = (key: string) => typeof data[key] === 'string' && data[key] !== 'N/A' && data[key] ? String(data[key]) : 'Not found';
  const isGoogleSource = editing || cached?.sourceUrl?.startsWith('https://www.google.com/');
  const countyData = (cached?.parsedData as any)?.countyAssessor;
  useEffect(() => {
    if (editing || !cached?.id || !countyAssessorUrl(cached.parsedData as Record<string, unknown>)) return;
    let active = true;
    setCountyBusy(true); setCountyError('');
    (async () => {
      try {
        const {data:sessionData} = await supabase.auth.getSession();
        if (!sessionData.session) throw new Error('Sign in to load county details.');
        const response = await fetch('/api/property-assessor', {method:'POST',
          headers:{'content-type':'application/json',Authorization:`Bearer ${sessionData.session.access_token}`},
          body:JSON.stringify({recordId:cached.id}),signal:AbortSignal.timeout(60000)});
        const result = await readAssessorResponse(response);
        if (active) {
          setCached(previous => previous ? {...previous,parsedData:{...previous.parsedData,countyAssessor:result.assessor}} : previous);
          // Refresh the parent address summary after the backend persists the enrichment.
          await load();
        }
      } catch(e:any) { if(active) setCountyError(e.message || 'County lookup failed.'); }
      finally { if(active) setCountyBusy(false); }
    })();
    return () => { active=false; };
  }, [cached?.id, editing, countyRetry]);
  const submit = async () => {
    if (busy || !confirmed || !rows.length || !text.trim()) return;
    setBusy(true); setError('');
    try {
      const record = await save(parsed.fields, text.trim(), url);
      setCached(record); setEditing(false); setText(''); setConfirmed(false); setSaved(true);
    } catch (e: any) { setError(e.message || 'Could not save. Your pasted text is still here.'); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[2200] bg-slate-900/30">
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="google-property-title"
      onKeyDown={event => {
        if (event.key === 'Escape' && !busy) { event.stopPropagation(); close(); }
        if (event.key === 'Tab') {
          const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),textarea,input') || []) as HTMLElement[];
          const first = nodes[0], last = nodes[nodes.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}
      className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl">
      <header className="border-b p-5 flex items-start gap-3">
        <div className="min-w-0 flex-1"><h2 id="google-property-title" className="text-xl font-bold text-slate-900">Google property details</h2><p className="mt-1 text-sm text-slate-600 break-words">{address}</p></div>
        <button ref={closeButton} type="button" disabled={busy} onClick={close} aria-label="Close Google property details" className="h-11 w-11 shrink-0 grid place-items-center rounded-xl bg-slate-100"><X size={20}/></button>
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5">
        {loading ? <p role="status" className="flex gap-2"><Loader2 className="animate-spin" size={20}/>Checking saved property details…</p> : <>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <RecordedOwnerCard canEdit={canEditOwner} value={recordedOwner} save={saveOwner} add={addOwnerContact} onBusy={setBusy}/>
          <section aria-label="Bid essentials" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 items-start">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-blue-950">Square footage</h3>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 break-words">{summaryValue('squareFootage')}</p>
                <p className="mt-1 text-xs text-slate-600">{isGoogleSource ? 'Google AI Overview · unverified' : 'Previously imported property data'}</p>
              </div>
              <button type="button" disabled={editing} onClick={() => setBidRefreshCount(count => count + 1)}
                title={editing ? 'Preview from pasted data' : 'Recalculate using saved property data and current bid rules'}
                aria-label="Refresh recommended bid from saved data"
                className="min-w-0 min-h-11 rounded-xl text-left text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 enabled:hover:bg-emerald-100">
                <span className="block text-sm font-bold">Recommended bid</span>
                <span className="mt-1 block text-2xl sm:text-3xl font-black break-words">{bid.amount === null ? '—' : bidCurrency(bid.amount)}</span>
                <span className="mt-1 block text-xs">{editing ? 'Preview · save to apply' : 'Tap to recalculate'}</span>
              </button>
            </div>
            {!editing && bidRefreshCount > 0 && <p key={bidRefreshCount} role="status" className="text-xs text-emerald-800">Recalculated using saved data and current rules.</p>}
            <dl className="grid grid-cols-2 gap-3 border-t border-blue-200 pt-3 text-sm">
              <div className="min-w-0"><dt className="text-slate-600">County</dt><dd className="font-bold text-slate-900 break-words">{summaryValue('county')}</dd></div>
              <div className="min-w-0"><dt className="text-slate-600">Parcel number</dt><dd className="font-bold text-slate-900 break-words">{summaryValue('apnNumber')}</dd></div>
            </dl>
            <div className="border-t border-blue-200 pt-3">
              <p className="text-sm">Last sale price: <strong>{summaryValue('salePrice')}</strong></p>
              <p className="mt-1 text-xs text-slate-600">{bid.reason}</p>
            </div>
            {assessorUrl ? <>
              <a href={assessorUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white border border-blue-200 p-3 font-bold text-blue-700">Open county assessor <ExternalLink size={16}/></a>
              <p className="text-xs text-slate-600">Confirm the address on the county page. County details load separately after saving; your original square footage stays unchanged.</p>
            </> : <p className="text-xs text-slate-600">{summaryValue('county') === 'Not found' || summaryValue('apnNumber') === 'Not found' ? 'Add County and Parcel Number from Google to populate the assessor link. You can save square footage without them.' : 'Automatic links currently support Maricopa County with a valid parcel number. You can still save these details.'}</p>}
          </section>
          {!editing && cached && <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-950">
            <p className="font-bold">{saved ? 'Saved to CRM and cached' : 'Saved property details'}</p>
            <p>Saved {new Date(cached.createdAt).toLocaleString()}. No new search needed.</p>
            <p className="mt-2">{cached.sourceUrl?.startsWith('https://www.google.com/') ? 'Source: Google AI Overview · unverified' : 'Source: previous property import'}</p>
            {cached.sourceUrl?.startsWith('https://') && <a className="underline" href={cached.sourceUrl} target="_blank" rel="noopener noreferrer">View source search</a>}
          </div>}
          {!editing && assessorUrl && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3" aria-label="County enrichment">
            <h3 className="font-bold text-slate-900">County assessor details</h3>
            {countyBusy && <p role="status" className="text-sm flex items-center gap-2"><Loader2 size={16} className="animate-spin"/>Loading county record in the background…</p>}
            {countyError && <div role="alert" className="text-sm text-red-800"><p>{countyError}</p><button type="button" onClick={() => setCountyRetry(value=>value+1)} className="mt-2 min-h-11 underline font-bold">Retry county lookup</button></div>}
            {countyData && <>
              <p className="text-xs text-slate-600">Maricopa County · address matched · fetched {new Date(countyData.fetchedAt).toLocaleString()}</p>
              <p className="text-sm text-slate-700">{countyData.notice}</p>
              <dl className="divide-y divide-emerald-200">{Object.entries(countyData.fields || {}).map(([label,value]) => <div key={label} className="py-2 grid grid-cols-2 gap-3 text-sm"><dt className="text-slate-600">{label}</dt><dd className="font-semibold break-words">{String(value)}</dd></div>)}</dl>
            </>}
          </section>}
          {editing && <>
            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-950 space-y-3">
              <p className="font-bold">Look up property details on Google</p><p>Open Google, copy the property details, then return here and paste. Review the fields and confirm the address before saving.</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-bold text-white">Open Google on this device <ExternalLink size={16}/></a>
              <p className="text-xs">Google opens in its own tab. If no AI Overview appears, try again later.</p>
            </div>
            <label className="block text-sm font-bold text-slate-800">Paste Google property details
              <textarea disabled={busy} value={text} maxLength={30000} onChange={e => { setText(e.target.value); setConfirmed(false); }} placeholder="Address: …\nBedrooms: 4\nTotal Interior Area: 2,757 square feet" className="mt-2 w-full min-h-44 rounded-xl border border-slate-300 p-3 text-base font-normal"/>
            </label>
            {text.trim() && !rows.length && <p role="status" className="text-sm text-amber-800">No labeled property fields found. Copy the bulleted details with labels such as Bedrooms: and Year Built:.</p>}
            {parsed.conflicts.length > 0 && <p className="text-sm text-amber-800">Conflicting duplicate fields were excluded: {parsed.conflicts.join(', ')}.</p>}
            {parsed.reportedAddress && <p className="text-sm text-slate-700">Address in pasted text: <strong>{parsed.reportedAddress}</strong></p>}
          </>}
          {otherRows.length > 0 && <section><h3 className="font-bold text-slate-900 mb-2">Other property details</h3><dl className="divide-y rounded-xl border px-3">{otherRows.map(([key, label]) => <div key={key} className="py-3 grid grid-cols-2 gap-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-900 break-words">{String(data[key])}</dd></div>)}</dl></section>}
          {editing && rows.length > 0 && <label className="flex gap-3 items-start rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0"/><span>I checked that these details belong to <strong>{address}</strong>. Google AI results will be saved as unverified. This becomes the latest property snapshot; previous imports remain in history.</span></label>}
        </>}
      </div>
      {!loading && <footer className="border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {editing ? <button type="button" disabled={busy || !confirmed || !rows.length} onClick={submit} className="min-h-12 w-full rounded-xl bg-blue-600 p-3 font-bold text-white disabled:opacity-40">{busy ? 'Saving…' : 'Save to CRM'}</button> : <button type="button" disabled={busy} onClick={() => { setEditing(true); setSaved(false); setError(''); }} className="min-h-12 w-full rounded-xl border border-blue-200 p-3 font-bold text-blue-700">Refresh from Google</button>}
      </footer>}
    </div>
  </div>;
}
