# Feature: Unified Address Record

**Status:** In Progress  
**Last updated:** 2026-06-10
**Owner:** Mike Hilton

---

## Goal
Replace the separate PWA Client Management summary drawer and CRM Canvassing editor with one canonical, mobile-first address record screen. The unified record must support the door workflow in one place: orient, log, review history, edit address context, manage contacts, and take follow-up actions.

## Current Behavior
The Unified Address Record is the canonical surface for address detail work. It supports Live Event Logger, read-only-by-default Contact Info and Job Info, top-right quick actions, notes filtering, normalized Add Contact creation, and Move to New Address entry points. Some deeper quote/invoice and reassignment workflows still need later passes.

## Desired Behavior
Every address opens into the Unified Address Record. The first implementation may use the existing address editor as the canonical shell while the UI is consolidated, but all entry points should route to the same screen. The layout is role-ready and organized in this order: Address Header, Live Event Logger, Activity Feed, Address/Property Details, Quote & Transaction History, Contacts at Address, compact action menu. Contact-record PRDs should be interpreted as changes to the contact/address sections inside this unified address record, not as a move away from address-first CRM.

## User Flow
1. User opens an address from the contact directory, recent activity, appointment list, map, route, or dashboard.
2. App opens the Unified Address Record.
3. User sees address identity, type, stage, latest outcome, and activity logger near the top.
4. User logs events or reviews history.
5. User edits notes, tags, or contacts inline.
6. User uses compact actions for scheduling, quote creation, and transaction recording.

## Business Rules
- Address remains the primary MVP CRM object.
- Replace duplicate drawers immediately because live usage has not started.
- Live Event Logger replaces the old visit-status-first workflow.
- Active Stage remains manually editable but can auto-move from events.
- Notes are stored in `doorstep.notes`; related timeline entries are stored in `doorstep.activities`.
- Quotes use dedicated tables, not generic activity payloads.
- Invoices use dedicated tables with JSON adjustment/line data for MVP.
- Record Transaction remains the action label when text is shown.
- Compact action controls should sit in the top-right stage/header area beside the stage progress dots; do not use a bottom floating footer that covers record content.
- App-level navigation should be a shared shell-level hamburger menu, not separate floating account/nav controls per page.
- All sections and CTAs must be role-ready via a config object, defaulting visible/editable for MVP.
- The Unified Address Record opens in read-only mode by default. Fields render as static text until a section-level Edit button is activated.
- Contact Info and Job Info have independent edit modes; editing one section must not switch the other section into edit mode.
- Contact Info edit mode exposes "Move to New Address" and delegates safe move/merge behavior to `/specs/contact-address-move-and-merge.spec.md`.
- Contact Info edit mode exposes contact delete actions. Primary contact delete clears the primary contact card; additional contact delete removes that contact card and soft-deletes normalized contact rows when available.
- Address delete is available from the Unified Address Record header and uses address soft-delete behavior.
- Activity Feed edit controls render behind a permission flag that defaults visible/editable for MVP.
- Activity Feed includes a session-only "Notes Only" filter that shows only human-entered note/message events, not system-generated stage or audit logs.
- Residential/Commercial designation should move out of the top header badge and become inline address metadata below the address line; it is only tappable in edit mode.
- Add Contact requires immediate disabled/loading feedback and backend idempotency so double taps cannot create duplicate contacts.
- Admin Settings include default premises type for new address creation, defaulting to Residential.
- The Unified Address Record can open for a draft map-tapped address. In that state, activity logging is the creation action; closing without logging discards the draft.

## Edge Cases
- Mobile: header/logger/feed should be attempted above the fold; if cramped, iterate.
- Empty history: show a clear "No activity yet" state.
- Failed autosave/event write: show visible error and do not fake success.
- Inline contact edits should not lose partially typed data.
- Existing legacy nested quote/invoice/contact data may need bridge display until normalized UI migration is complete.
- Duplicate add-contact submissions must create at most one contact even when two requests reach the backend.

## Non-Goals
- Full role/permission enforcement in v1.
- Offline sync.
- Bulk address editing.
- Complete quote/invoice UI migration in the first unified-screen slice.

## Acceptance Criteria
- Given any address entry point is clicked, then the same unified editor opens.
- Given the unified record opens on mobile, then address header and Live Event Logger are immediately visible.
- Given a user logs an event, then Activity Feed updates without reload.
- Given a user edits address notes, then the current address note persists to Supabase after idle/blur save.
- Given a user logs an event note, then the note body persists to `doorstep.notes` and the related event appears in `doorstep.activities`.
- Given the role config is evaluated in MVP, then all sections return visible/editable true.
- Given quote/invoice/transaction schema is needed, then dedicated Supabase tables exist before deeper UI wiring.
- Given an address record opens, then Contact Info and Job Info fields are read-only until their section Edit button is tapped.
- Given a user double-taps Add Contact, then only one normalized contact is created.
- Given Activity Feed Notes Only is active, then only human-entered note/message events are shown and the filter resets on next record open.
- Given Add Contact is used, then the UI creates a `doorstep.contacts` row, links it through `doorstep.address_contacts`, and records an idempotency key in `doorstep.contact_idempotency_keys`.
- Given the optional `create_address_contact_idempotent` RPC is available, then Add Contact uses that RPC; otherwise the deployed frontend falls back to table-level idempotency until migration 008 is applied.
- Given the record is opened from an untracked normal map tap, then logging an activity creates the address and closing without logging does not.
- Given Contact Info is in edit mode, when a user deletes a primary or additional contact, then the contact disappears from the current record and normalized contact rows are soft-deleted when the app has their ID.
- Given a user confirms Delete Address, then the record closes and disappears from normal views.

## Validation Plan
- Run `npm run build`.
- Run `npm run lint`.
- Run `npm run verify:deploy-artifact`.
- Apply Supabase migration for notes/quotes/invoices/transactions.
- Smoke test opening an address from Contacts, Recent Activity, Appointments, and Map.

## Open Questions
- [ ] Exact referral type options.
- [ ] Which roles can archive notes/activities in the future.
- [x] Whether compact action menu should be bottom-right floating or bottom dock after mobile testing.
- [ ] Should the read-only default be introduced in one pass for all sections or start with Contact Info and Job Info?

## Decisions Made
- 2026-06-09: Replace both duplicate address views immediately.
- 2026-06-09: Use 5-second idle autosave plus blur-save for address notes.
- 2026-06-09: Dedicated quotes table approved.
- 2026-06-09: Invoices use dedicated table with JSON line/adjustment detail for MVP.
- 2026-06-09: Digital invoice is a real send flow; Stripe payment is stubbed and not customer-visible yet.
- 2026-06-09: Keep Record Transaction action.
- 2026-06-09: Notes use dedicated `doorstep.notes` with related `doorstep.activities` feed entries.
- 2026-06-10: Move Schedule, Quote, and Transaction actions to top-right icon buttons beside the stage progress dots; remove the bottom floating action bar.
- 2026-06-10: Replace the oversized floating workspace pill with a shared hamburger navigation menu in the app shell.
- 2026-06-10: Contact-record redesign keeps the address as the canonical object and adds read-only default with section-level edit modes.
- 2026-06-10: Notes Only filter means human-entered notes/messages only.
- 2026-06-10: Add Contact requires backend idempotency, not only frontend debounce/spinner.
- 2026-06-10: Add Contact now writes normalized contacts and address links. Migration 008 adds the preferred one-call RPC, while the frontend also supports a table-backed fallback.
- 2026-06-10: Untracked normal map taps open the Unified Address Record as a draft activity session and do not persist until the first activity is logged.
- 2026-06-12: Contact delete is available in Contact Info edit mode; Address delete is available from the record header.

## Iteration History
- 2026-06-09: Spec created from target-user PRD and follow-up decisions.
- 2026-06-09: First implementation slice added role-ready section config, normalized schema foundation, unified dashboard entry routing, event-note persistence, and compact sticky address actions.
- 2026-06-10: Corrected quick-action placement from bottom sticky bar to top-right icon cluster.
- 2026-06-10: Added shared shell hamburger nav and reserved page-header space to avoid top-right collisions.
- 2026-06-10: Wired normalized contact loading, Supabase-backed Add Contact idempotency, and Move to New Address access from Contact Info edit mode.
- 2026-06-10: Added draft address support so normal map taps go directly to activity logging instead of the Add Lead form.
- 2026-06-12: Added delete controls for addresses, primary contacts, and additional contacts.
