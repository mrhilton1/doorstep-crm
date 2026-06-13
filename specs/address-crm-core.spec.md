# Feature: Address CRM Core

**Status:** In Progress
**Last updated:** 2026-06-12
**Owner:** Mike Hilton

---

## Goal
Make address records the primary MVP CRM object for field sales, route planning, contacts, quotes, appointments, activities, and future object-oriented CRM expansion.

## Current Behavior
The UI still uses mixed language such as property, lead, prospect, and pin. Supabase has `doorstep.addresses`, and production syncs basic address records plus legacy UI fields in `custom_data`. The app has had two address surfaces: a summary drawer and an editor drawer. Activities are now moving to `doorstep.activities`; notes, quotes, invoices, and transactions need dedicated tables.

## Desired Behavior
Address records are the stable unit of work. Contacts, labels, quotes, invoices, activities, appointments, and routes relate to addresses. The UI should gradually rename "property" and "lead" concepts into address/object CRM language without breaking MVP workflows.
The Unified Address Record is the canonical address view and replaces duplicate address drawers.

## User Flow
1. User views dashboard or map.
2. User opens an address from an existing marker, or taps a new house to start a draft activity session.
3. User updates status, stage, notes, contacts, labels, quotes, appointments, and activities.
4. App persists changes to Supabase for the active workspace.
5. Deleted records disappear from normal views but remain available for platform investigation.

## Business Rules
- Address is the MVP primary object.
- `normalized_address` is used for duplicate prevention within a workspace.
- Deletes are soft deletes when persisted to Supabase.
- Address delete must be available from the Unified Address Record and address/contact card views, and should soft-delete the address from normal views while preserving the row for investigation.
- Address delete must wait for Supabase to confirm exactly one row was soft-deleted before removing the record from the UI.
- Destructive actions must use in-app confirmation modals; do not use browser-native `alert`, `confirm`, or `prompt` for app UX.
- Primary page and opened-record state must be URL-backed so refresh, deployment reloads, and browser back/forward do not return the user to the home page unexpectedly.
- Stage and status are separate concepts.
- Active Stage system keys are locked to `prospect`, `lead`, `opportunity`, and `customer`; admin label settings may control display labels/descriptions/colors, but implementation logic must use the locked keys.
- Automatic stage advancement is forward-only: address with no contact data is Prospect, address plus any contact data is Lead, issued quote is Opportunity, and logged payment is Customer.
- Manual stage override remains allowed for MVP; future permissions should allow Sales Reps to override records they can edit and Owner/Admin to override all records.
- Sub-status is optional and separate from Active Stage. It can be manually set to stage-compatible values such as Not Interested, Loss, or Scheduled, and when present its color overrides the parent stage color on the map.
- Creating or rescheduling an appointment through the Schedule CTA should set sub-status to Scheduled when that sub-status is valid for the address stage.
- Residential and commercial address types must both be supported.
- Default premises type for new address creation comes from workspace settings, defaulting to Residential, and can be changed later in address edit mode.
- Address data must be workspace-scoped.
- The Unified Address Record is the only address-level detail surface.
- Activity and notes should be Supabase-backed, not browser/local nested state.
- Contacts should be normalized into `doorstep.contacts` before implementing higher-risk contact move/merge flows.
- Map clicks should only open an existing address when the click is within a tight, meter-based hit radius of that address pin; nearby blank-map clicks should not snap to a neighboring record.
- Default non-route map clicks on an untracked house open the Unified Address Record as a draft activity session, not the Add Lead form and not an immediate persisted address.
- Draft map-click addresses become real `doorstep.addresses` rows only after the user logs an activity. If the user closes the drawer without logging activity, no address is created.
- Opening an existing address marker must not auto-promote Prospect to Lead; stage movement should come from activity/contact/quote/payment rules.
- Leaflet/OpenStreetMap tiles do not provide parcel boundaries. True parcel-level boundary selection requires parcel data or a provider/API that exposes property polygons.
- Map-view chrome must reserve space for the shared hamburger navigation so stats/actions are not hidden underneath it.
- Map control buttons must intercept click/pointer events and never trigger address selection, reverse geocoding, or route point changes on the map behind them.
- Route-builder mode must be easy to enter and exit directly from the map view with a visible active state.
- Route Creation mode is the exception to draft activity behavior: route taps may create Prospect address records immediately so routes can be planned before contact attempts.

## Edge Cases
- Empty states: Dashboard and map must handle zero address records.
- Error states: Failed Supabase sync should surface visibly without losing current UI state.
- Permissions: Sales Rep can create/update assigned records; territory rules come later.
- Duplicate data: Same normalized address cannot exist twice in one workspace.
- Dependency failures: Geocoding failure should still allow manual address creation.
- Dense neighborhoods: adjacent houses may be only a few meters apart, so map-click hit testing must not use broad nearest-record tolerances.
- Stage colors: sub-status color overrides parent stage color; admin color edits should propagate to active sessions within 60 seconds.

## Non-Goals
- Full custom object builder.
- Complete terminology refactor in one pass.
- Full contact normalization UI.
- Territory assignment rules for MVP.

## Acceptance Criteria
- Given a signed-in user has a workspace, when addresses exist in Supabase, then the app loads them.
- Given a user creates an address in the UI, when sync succeeds, then `doorstep.addresses` has the record.
- Given a user taps an untracked house in normal map mode, then the Unified Address Record opens for activity logging without persisting the address yet.
- Given the user logs an activity from that draft record, then the address is persisted as a Prospect and the activity is saved against it.
- Given the user closes the draft record without logging activity, then no address row is created.
- Given a user deletes an address, when sync succeeds, then `deleted_at` is set and normal views hide it.
- Given a user opens an address record or address card, when they choose Delete Address and confirm in the app modal, then the address is removed from the current UI, removed from routes, and soft-deleted in Supabase.
- Given Supabase does not confirm an address delete, then the address remains visible and the app surfaces an error instead of pretending the delete succeeded.
- Given a user is on Contacts, Appointments, Map, or an opened address record, when the browser refreshes, then the app restores that page/record from the URL after data loads.
- Given local mode is active, when the user adds records, then the local demo still behaves.

## Validation Plan
- Test add/update/delete address in production with Supabase.
- Query `doorstep.addresses` to verify rows, workspace IDs, soft delete, and `custom_data`.
- Run `npm run build` and `npm run lint`.

## Open Questions
- [ ] When should contacts move from `custom_data` bridge into first-class `doorstep.contacts` UI flows?
- [ ] Should duplicate detection be strict by normalized address only or also by lat/lng proximity?
- [ ] What address fields are required for MVP: display address only, or city/state/zip split fields?
- [ ] Should MVP source parcel boundary polygons, or is tight pin/address hit testing sufficient for first user testing?

## Decisions Made
- 2026-06-08: Use `doorstep.addresses` as first Supabase-backed CRM table.
- 2026-06-08: Keep legacy nested UI data in `custom_data` as a bridge while the monolithic app is refactored.
- 2026-06-09: Replace duplicate address screens with a Unified Address Record.
- 2026-06-09: Add dedicated notes/quotes/invoices/transactions schema as the next normalization step.
- 2026-06-10: Keep Leaflet/OpenStreetMap for MVP and tighten map click hit testing before reconsidering Google Maps.
- 2026-06-10: Keep global navigation in the shared hamburger and use the map's right-side control rail for map-specific route-builder toggling.
- 2026-06-10: Keep address as primary object while normalizing contacts for contact editing, idempotent add-contact, and address move/merge.
- 2026-06-10: Active Stage system keys are locked in application logic, while admin settings can still manage labels, colors, and descriptions.
- 2026-06-10: Appointment scheduling should set Scheduled sub-status when valid.
- 2026-06-10: Normal map taps should open activity logging first and only create a prospect address after activity is logged; Route Creation mode still creates route/prospect records immediately.
- 2026-06-12: Unified Address Record and card views expose Delete Address using existing soft-delete behavior with app modal confirmation.
- 2026-06-12: Address delete is backend-confirmed before UI removal; MVP pages and address records are URL-backed.

## Iteration History
- 2026-06-08: Supabase address load/upsert/soft-delete wired into app.
- 2026-06-09: Unified Address Record direction added.
- 2026-06-10: Map click selection changed from broad degree-based nearest-record matching to tight meter-based hit testing.
- 2026-06-10: Changed untracked house taps from Add Lead prompt/immediate creation to draft activity logging before persistence.
- 2026-06-12: Added address delete action to the Unified Address Record and address/contact cards.
- 2026-06-12: Added URL-backed navigation for dashboard, contacts, appointments, map, and opened address records.
