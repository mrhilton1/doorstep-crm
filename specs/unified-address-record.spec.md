# Feature: Unified Address Record

**Status:** In Progress  
**Last updated:** 2026-06-09  
**Owner:** Mike Hilton

---

## Goal
Replace the separate PWA Client Management summary drawer and CRM Canvassing editor with one canonical, mobile-first address record screen. The unified record must support the door workflow in one place: orient, log, review history, edit address context, manage contacts, and take follow-up actions.

## Current Behavior
The app has two address-level surfaces: a summary drawer in the contacts/dashboard experience and a detailed address editor from the map flow. They show overlapping but different data, creating uncertainty about where address data lives and where activity should be logged.

## Desired Behavior
Every address opens into the Unified Address Record. The first implementation may use the existing address editor as the canonical shell while the UI is consolidated, but all entry points should route to the same screen. The layout is role-ready and organized in this order: Address Header, Live Event Logger, Activity Feed, Address/Property Details, Quote & Transaction History, Contacts at Address, compact action menu.

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
- All sections and CTAs must be role-ready via a config object, defaulting visible/editable for MVP.

## Edge Cases
- Mobile: header/logger/feed should be attempted above the fold; if cramped, iterate.
- Empty history: show a clear "No activity yet" state.
- Failed autosave/event write: show visible error and do not fake success.
- Inline contact edits should not lose partially typed data.
- Existing legacy nested quote/invoice/contact data may need bridge display until normalized UI migration is complete.

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

## Decisions Made
- 2026-06-09: Replace both duplicate address views immediately.
- 2026-06-09: Use 5-second idle autosave plus blur-save for address notes.
- 2026-06-09: Dedicated quotes table approved.
- 2026-06-09: Invoices use dedicated table with JSON line/adjustment detail for MVP.
- 2026-06-09: Digital invoice is a real send flow; Stripe payment is stubbed and not customer-visible yet.
- 2026-06-09: Keep Record Transaction action.
- 2026-06-09: Notes use dedicated `doorstep.notes` with related `doorstep.activities` feed entries.
- 2026-06-10: Move Schedule, Quote, and Transaction actions to top-right icon buttons beside the stage progress dots; remove the bottom floating action bar.

## Iteration History
- 2026-06-09: Spec created from target-user PRD and follow-up decisions.
- 2026-06-09: First implementation slice added role-ready section config, normalized schema foundation, unified dashboard entry routing, event-note persistence, and compact sticky address actions.
- 2026-06-10: Corrected quick-action placement from bottom sticky bar to top-right icon cluster.
