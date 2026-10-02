export const googlePropertyPrompt = (address: string) => {
  const [street, ...location] = address.replace(/"/g, '').split(',').map(part => part.trim());
  return `property details for "${street}" ${location.join(' ')}. Return ONLY a bulleted list using exactly this template: Last Sale Price: | Address: | County: | Home Type: | Bedrooms: | Bathrooms: | Square Footage: | Lot Size: | Year Built: | Roof Material: | Parking Spaces: | HOA Fee: | Parcel Number: | Neighborhood: | Tax Assessed Value: | Annual Tax Amount:. Use "Not found" if unavailable. Don't explain any of the fields at all.`;
};
export const googlePropertyUrl = (address: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(googlePropertyPrompt(address))}`;

export const googleFields = [
  ['county', 'County', ['County']],
  ['subdivision', 'Neighborhood', ['Neighborhood', 'Subdivision']],
  ['bedrooms', 'Bedrooms', ['Bedrooms', 'Beds']],
  ['bathrooms', 'Bathrooms', ['Bathrooms', 'Baths']],
  ['squareFootage', 'Interior square feet', ['Total Interior Area', 'Interior Area', 'Living Area', 'Square Footage', 'Square Feet', 'Sq Ft']],
  ['yearBuilt', 'Year built', ['Year Built']],
  ['landUse', 'Home type', ['Home Type', 'Property Type', 'Land Use']],
  ['lotSize', 'Lot size', ['Lot Size']],
  ['lotSquareFeet', 'Lot square feet', ['Lot Square Feet', 'Lot Sq Ft']],
  ['apnNumber', 'Parcel number', ['Parcel Number', 'Parcel ID', 'APN']],
  ['roofMaterial', 'Roof material', ['Roof Material']],
  ['parkingSpaces', 'Parking', ['Parking Spaces', 'Parking']],
  ['hoaFee', 'HOA fee', ['HOA Fee']],
  ['taxAssessedValue', 'Tax assessed value', ['Tax Assessed Value', 'Assessed Value']],
  ['annualTaxAmount', 'Annual tax', ['Annual Tax Amount', 'Annual Taxes']],
  ['estimatedValue', 'Estimated value', ['Estimated Value', 'Zestimate']],
  ['salePrice', 'Last sale price', ['Last Sale Amount', 'Last Sale Price']],
  ['saleDate', 'Last sale date', ['Last Sale Date']],
] as const;

// Require labeled lines; never infer values from unrelated search-result prose.
export function parseGoogleProperty(text: string) {
  const fields: Record<string, string> = {};
  let reportedAddress = '';
  const conflicts = new Set<string>();
  const labels = googleFields.flatMap(([key, , aliases]) => aliases.map(label => ({key, label})));
  for (const line of text.replace(/\r/g, '').split(/\n|\s*\|\s*/)) {
    const cleaned = line.replace(/^[\s•*\-]+/, '').replace(/\*\*/g, '').trim();
    const pair = cleaned.match(/^([^:]+):\s*(.+)$/);
    if (!pair) continue;
    const label = pair[1].trim().toLowerCase();
    const value = pair[2].trim().slice(0, 500);
    if (label === 'address') reportedAddress = value;
    const match = labels.find(item => item.label.toLowerCase() === label);
    if (!match || /^(n\/a|unknown|not available|not found)$/i.test(value)) continue;
    if (fields[match.key] && fields[match.key] !== value) conflicts.add(match.key);
    else fields[match.key] = value;
  }
  for (const key of conflicts) delete fields[key];
  return { fields, reportedAddress, conflicts: [...conflicts] };
}

// Explicit county matching prevents routing same-named cities to the wrong assessor.
export function countyAssessorUrl(fields: Record<string, unknown>): string | null {
  if (typeof fields.county !== 'string' || !/^maricopa(?: county)?$/i.test(fields.county.trim())) return null;
  if (typeof fields.apnNumber !== 'string') return null;
  const parcel = fields.apnNumber.trim().replace(/[-\s]/g, '');
  if (!/^\d{8}[a-z]?$/i.test(parcel)) return null;
  return `https://mcassessor.maricopa.gov/mcs/?q=${encodeURIComponent(parcel)}`;
}
