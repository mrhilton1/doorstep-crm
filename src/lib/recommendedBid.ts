export type BidRule = { id: string; maxSalePrice: number; rate: number };
export function validateBidRules(rules: BidRule[]): string | null {
  const seen = new Set<number>();
  for (const rule of rules) {
    if (!Number.isFinite(rule.maxSalePrice) || rule.maxSalePrice <= 0 || !Number.isFinite(rule.rate) || rule.rate <= 0)
      return 'Each rule needs a positive last sale price limit and rate.';
    if (seen.has(rule.maxSalePrice)) return 'Use a different sale price limit for each rule.';
    seen.add(rule.maxSalePrice);
  }
  return null;
}
// Accept explicit single values only; ranges, dates and explanatory prose are ambiguous.
export function propertyNumber(value: unknown, kind: 'money' | 'area'): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== 'string') return null;
  const pattern = kind === 'money'
    ? /^\s*\$?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(?:USD)?\s*$/i
    : /^\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(?:sq\.?\s*ft\.?|square feet|sqft|ft²)?\s*$/i;
  const match = value.match(pattern);
  if (!match) return null;
  const number = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(number) && number > 0 ? number : null;
}
export function recommendedBid(fields: Record<string, unknown>, rules: BidRule[] = []) {
  const unavailable = (reason: string) => ({ amount: null as number | null, reason });
  if (!rules.length) return unavailable('Add price thresholds in Settings → Bid Rules.');
  if (validateBidRules(rules)) return unavailable('Check your bid rules in Settings.');
  const sale = propertyNumber(fields.salePrice, 'money');
  const area = propertyNumber(fields.squareFootage, 'area');
  if (sale === null) return unavailable('A clear last sale price is required.');
  if (area === null) return unavailable('A clear interior square footage is required.');
  const rule = [...rules].sort((a,b) => a.maxSalePrice-b.maxSalePrice).find(item => sale <= item.maxSalePrice);
  if (!rule) return unavailable('Last sale price exceeds your highest threshold. Add a bid rule.');
  const rawAmount = area * rule.rate;
  const amount = Math.round((rawAmount + Number.EPSILON * rawAmount) * 100) / 100;
  if (!Number.isFinite(amount)) return unavailable('The calculated bid is outside the supported range.');
  return {amount, reason: `${area.toLocaleString('en-US')} sq ft × $${rule.rate}/sq ft; last sale $${sale.toLocaleString('en-US')} ≤ $${rule.maxSalePrice.toLocaleString('en-US')}. Based on imported property data.`};
}
export const bidCurrency = (amount: number) => amount.toLocaleString('en-US', {style:'currency', currency:'USD'});
