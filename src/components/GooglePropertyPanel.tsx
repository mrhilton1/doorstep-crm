import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { googleFields, googlePropertyUrl, parseGoogleProperty } from '../lib/googleProperty';

type RecordView = { parsedData: object; sourceUrl?: string | null; createdAt: number };
type Props = {
  key?: string;
  address: string;
  searchAddress: string;
  load: () => Promise<RecordView | null>;
  save: (fields: Record<string, string>, text: string, url: string) => Promise<RecordView>;
  close: () => void;
};
export function GooglePropertyPanel({ address, searchAddress, load, save, close }: Props) {
  const [cached, setCached] = useState<RecordView | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
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
  const url = googlePropertyUrl(searchAddress);
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
          {!editing && cached && <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-950">
            <p className="font-bold">{saved ? 'Saved to CRM and cached' : 'Saved property details'}</p>
            <p>Saved {new Date(cached.createdAt).toLocaleString()}. No new search needed.</p>
            <p className="mt-2">{cached.sourceUrl?.startsWith('https://www.google.com/') ? 'Source: Google AI Overview · unverified' : 'Source: previous property import'}</p>
            {cached.sourceUrl?.startsWith('https://') && <a className="underline" href={cached.sourceUrl} target="_blank" rel="noopener noreferrer">View source search</a>}
          </div>}
          {editing && <>
            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-950 space-y-3">
              <p>Open Google, copy the AI Overview’s property details, then return here and paste. Google opens in another tab.</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-bold text-white">Search this address <ExternalLink size={16}/></a>
              <p>Complete any Google verification there. If no AI Overview appears, try again later.</p>
            </div>
            <label className="block text-sm font-bold text-slate-800">Paste Google property details
              <textarea disabled={busy} value={text} maxLength={30000} onChange={e => { setText(e.target.value); setConfirmed(false); }} placeholder="Address: …\nBedrooms: 4\nTotal Interior Area: 2,757 square feet" className="mt-2 w-full min-h-44 rounded-xl border border-slate-300 p-3 text-base font-normal"/>
            </label>
            {text.trim() && !rows.length && <p role="status" className="text-sm text-amber-800">No labeled property fields found. Copy the bulleted details with labels such as Bedrooms: and Year Built:.</p>}
            {parsed.conflicts.length > 0 && <p className="text-sm text-amber-800">Conflicting duplicate fields were excluded: {parsed.conflicts.join(', ')}.</p>}
            {parsed.reportedAddress && <p className="text-sm text-slate-700">Address in pasted text: <strong>{parsed.reportedAddress}</strong></p>}
          </>}
          {rows.length > 0 && <section><h3 className="font-bold text-slate-900 mb-2">{editing ? 'Review before saving' : 'Property details'}</h3><dl className="divide-y rounded-xl border px-3">{rows.map(([key, label]) => <div key={key} className="py-3 grid grid-cols-2 gap-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-900 break-words">{String(data[key])}</dd></div>)}</dl></section>}
          {editing && rows.length > 0 && <label className="flex gap-3 items-start rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0"/><span>I checked that these details belong to <strong>{address}</strong>. Google AI results will be saved as unverified. This becomes the latest property snapshot; previous imports remain in history.</span></label>}
        </>}
      </div>
      {!loading && <footer className="border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {editing ? <button type="button" disabled={busy || !confirmed || !rows.length} onClick={submit} className="min-h-12 w-full rounded-xl bg-blue-600 p-3 font-bold text-white disabled:opacity-40">{busy ? 'Saving…' : 'Save to CRM'}</button> : <button type="button" onClick={() => { setEditing(true); setSaved(false); setError(''); }} className="min-h-12 w-full rounded-xl border border-blue-200 p-3 font-bold text-blue-700">Refresh from Google</button>}
      </footer>}
    </div>
  </div>;
}
