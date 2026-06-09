# Feature: Contact Summary Quick Edit

**Status:** Implemented  
**Last updated:** 2026-06-09  
**Owner:** Mike Hilton

---

## Goal
Let a user open the existing address/contact edit panel directly from the contact summary drawer so they can log activity, change stage/status, add notes, and update contact details without returning to the map and losing their place.

## Current Behavior
In the Contacts Directory, clicking a contact opens a summary drawer with demographics, profile information, tags, activity logs, messaging, invoices, and scheduling actions. The summary drawer has a Map View button that jumps to the map and opens the address editor. There is no direct edit/update action beside the contact name in the summary header.

## Desired Behavior
The summary drawer header includes a compact edit/update icon beside the contact name. Clicking it closes the summary drawer and opens the existing address/contact edit panel for the same record. The edit panel remains the single MVP surface for changing stage, visit status, notes, address details, and contact details.

## User Flow
1. User opens Contacts Directory.
2. User clicks a contact card.
3. App opens the contact summary drawer.
4. User clicks the edit/update icon beside the contact name.
5. App closes the summary drawer and opens the existing editor for that same address record.
6. User changes active stage, visit status, notes, or contact details.

## Business Rules
- Address record remains the primary CRM object.
- This feature reuses the existing editor instead of duplicating status/activity controls.
- The summary drawer should not remain stacked above the editor.
- Map View remains available as a separate action for locating the address.

## Edge Cases
- If the selected contact no longer exists, no edit action should run.
- Long names must not overlap the edit icon or header actions.
- Mobile and desktop headers must keep controls tappable.

## Non-Goals
- New activity-log composer inside the summary drawer.
- New database tables or Supabase schema changes.
- Full terminology refactor from contact/property/lead to address.

## Acceptance Criteria
- Given a contact summary drawer is open, when the user clicks the edit/update icon beside the name, then the existing edit panel opens for the same record.
- Given the edit panel opens from the summary drawer, then the summary drawer is closed and does not cover the editor.
- Given the edit panel is open, when the user changes stage, visit status, notes, or contact fields, then the existing update behavior is preserved.
- Given the user wants map context, when they click Map View, then the existing map focus behavior still works.

## Validation Plan
- Run `npm run build`.
- Run `npm run lint`.
- Run `npm run verify:deploy-artifact`.
- Manually inspect the contact summary header at desktop and mobile widths if a local server is available.

## Open Questions
- [ ] Should a future version add a one-click activity composer directly inside the summary drawer?
- [ ] Should the summary drawer show a primary CTA label such as "Update" for less technical users, or stay icon-only for compactness?

## Decisions Made
- 2026-06-09: Reuse the existing address/contact editor for MVP quick edit.

## Iteration History
- 2026-06-09: Spec created for summary-to-editor quick edit path.
- 2026-06-09: Added summary header edit action that opens the existing address/contact editor.
