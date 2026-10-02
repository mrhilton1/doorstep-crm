export type OwnerContact = { sourceName: string; firstName: string; lastName: string };

// Only transforms owner wording explicitly supplied by the user.
export function recordedOwnerContacts(text: string): OwnerContact[] {
  return text.split('/').map(value => value.trim().replace(/\s+/g, ' ')).filter(Boolean).map(sourceName => {
    const words = sourceName.split(' ');
    const organization = /\b(trust|trustee|trustees|llc|l\.l\.c|inc|corp|corporation|company|co|ltd|lp|llp|association|holdings|partners|partnership)\b/i.test(sourceName);
    return organization || words.length < 2
      ? { sourceName, firstName: sourceName, lastName: '' }
      : { sourceName, firstName: words[1], lastName: words[0] };
  });
}
