import React, { useState } from 'react';
import { BidRule, validateBidRules } from '../lib/recommendedBid';
export function BidRulesSettings({rules, apply}: {rules: BidRule[]; apply: (rules: BidRule[]) => void}) {
  const [rows, setRows] = useState(() => rules.map(r => ({id:r.id, maxSalePrice:String(r.maxSalePrice), rate:String(r.rate)})));
  const [applied, setApplied] = useState(false);
  const values = rows.map(r => ({id:r.id, maxSalePrice:Number(r.maxSalePrice), rate:Number(r.rate)}));
  const error = validateBidRules(values);
  const change = (id: string, key: 'maxSalePrice'|'rate', value: string) => {
    setRows(previous => previous.map(r => r.id === id ? {...r,[key]:value} : r)); setApplied(false);
  };
  return <section className="space-y-4">
    <h3 className="text-lg font-bold">Recommended bid rules</h3>
    <p className="text-sm text-slate-600">Bid = interior square feet × rate. The lowest price limit that covers the last sale price wins. Prices above all limits have no recommendation. Changes apply to existing records too.</p>
    {!rows.length && <p className="rounded-xl bg-blue-50 p-4 text-sm">No rules yet. Add your first price limit and rate below.</p>}
    {rows.map((row,index) => <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 rounded-xl border bg-white p-4 items-end">
      <label className="text-sm font-semibold">Last sale price ≤ ($)
        <input aria-label={`Rule ${index+1} last sale price limit`} type="number" min="0.01" step="0.01" value={row.maxSalePrice} onChange={e=>change(row.id,'maxSalePrice',e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
      </label>
      <label className="text-sm font-semibold">Rate ($ per sq ft)
        <input aria-label={`Rule ${index+1} rate`} type="number" min="0.0001" step="0.0001" placeholder="0.05" value={row.rate} onChange={e=>change(row.id,'rate',e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
      </label>
      <button type="button" aria-label={`Remove rule ${index+1}`} className="min-h-11 rounded-lg border px-3 text-red-700" onClick={()=>{setRows(previous=>previous.filter(r=>r.id!==row.id));setApplied(false);}}>Remove</button>
    </div>)}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="button" className="min-h-11 rounded-xl border px-4 font-bold" onClick={()=>{setRows(previous=>[...previous,{id:crypto.randomUUID(),maxSalePrice:'',rate:''}]);setApplied(false);}}>Add rule</button>
      <button type="button" disabled={!!error} className="min-h-11 rounded-xl bg-blue-600 px-4 font-bold text-white disabled:opacity-40" onClick={()=>{apply(values);setApplied(true);}}>Apply rules</button>
    </div>
    {applied && <p role="status" className="text-sm text-blue-800">Rules applied. Workspace settings sync automatically.</p>}
  </section>;
}
