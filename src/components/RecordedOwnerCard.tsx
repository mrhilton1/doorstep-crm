import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { recordedOwnerContacts, OwnerContact } from '../lib/recordedOwner';

type Candidate = OwnerContact & { id: string; added: boolean };
export function RecordedOwnerCard({ value, save, add, onBusy, canEdit }: {
  value: string;
  canEdit: boolean;
  save: (text: string) => Promise<void>;
  add: (contact: OwnerContact & { id: string }) => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [text, setText] = useState(value);
  const [savedText, setSavedText] = useState(value);
  const [editing, setEditing] = useState(!value);
  const [candidates, setCandidates] = useState<Candidate[]>(() => recordedOwnerContacts(value).map(c => ({...c, id: uuidv4(), added: false})));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); onBusy(true); setError(''); setStatus('');
    try { await action(); } catch (e: any) { setError(e.message || 'Could not save. Please retry.'); }
    finally { setBusy(false); onBusy(false); }
  };
  return <section aria-label="Recorded owner" className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
    <h3 className="font-bold text-slate-900">Recorded owner</h3>
    {savedText && <p className="font-semibold break-words text-slate-900">{savedText}</p>}
    <p className="text-xs text-slate-600">From your supplied document. Recorded ownership does not establish who lives here.</p>
    <fieldset disabled={!canEdit} className="space-y-3">
    {editing ? <>
      <label className="block text-sm font-semibold">Owner name(s) from document
        <textarea value={text} disabled={busy} maxLength={1000} onChange={e => setText(e.target.value)} placeholder="LAST FIRST / LAST FIRST, or trust/company name" className="mt-2 w-full rounded-lg border p-3 font-normal"/>
      </label>
      <div className="flex gap-3">
        <button type="button" disabled={busy || !text.trim()} onClick={() => run(async () => {
          const next = text.trim(); await save(next); setSavedText(next);
          setCandidates(recordedOwnerContacts(next).map(c => ({...c, id: uuidv4(), added: false})));
          setEditing(false); setStatus('Owner information saved. Choose a contact below to add.');
        })} className="min-h-11 rounded-lg bg-blue-600 px-3 text-white disabled:opacity-40">Save owner information</button>
        {savedText && <button type="button" disabled={busy} onClick={() => {setText(savedText); setEditing(false);}} className="min-h-11 px-3">Cancel</button>}
      </div>
    </> : <>
      <button type="button" disabled={busy} onClick={() => setEditing(true)} className="min-h-11 text-sm text-blue-700 underline">Edit owner information</button>
      <p className="text-xs text-slate-600">Original owner wording is kept on the contact. Review the suggested names below: surname first, then given name. Trusts and companies can use the full name.</p>
      {candidates.map((candidate, index) => <div key={candidate.id} className="rounded-lg border p-3 space-y-2">
        <p className="text-xs text-slate-600 break-words">Recorded owner: <strong>{candidate.sourceName}</strong></p>
        <div className="grid grid-cols-2 gap-2">
          {(['firstName', 'lastName'] as const).map(key => <label key={key} className="min-w-0 text-xs text-slate-600">{key === 'firstName' ? 'First / organization name' : 'Last name'}
            <input value={candidate[key]} disabled={busy || candidate.added} maxLength={1000} onChange={e => setCandidates(previous => previous.map((c, i) => i === index ? {...c, [key]: e.target.value} : c))} className="mt-1 w-full min-w-0 rounded border p-2 text-base text-slate-900"/>
          </label>)}
        </div>
        <button type="button" disabled={busy || candidate.added || !(candidate.firstName.trim() || candidate.lastName.trim())} onClick={() => run(async () => {
          await add({...candidate, firstName: candidate.firstName.trim(), lastName: candidate.lastName.trim()});
          setCandidates(previous => previous.map(c => c.id === candidate.id ? {...c, added: true} : c));
          setStatus('Contact added to this address.');
        })} className="min-h-11 rounded-lg border border-blue-200 px-3 font-semibold text-blue-700 disabled:opacity-40">{candidate.added ? 'Added' : 'Add as contact'}</button>
      </div>)}
    </>}
    </fieldset>
    {!canEdit && <p className="text-xs text-slate-600">Contact editing is unavailable for your role.</p>}
    {busy && <p role="status" className="text-sm">Saving…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {status && <p role="status" className="text-sm text-emerald-700">{status}</p>}
  </section>;
}
