# Feature: Address CRM Core

**Status:** In Progress  
**Last updated:** 2026-06-09  
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
2. User adds an address from map click, search, or manual entry.
3. User updates status, stage, notes, contacts, labels, quotes, appointments, and activities.
4. App persists changes to Supabase for the active workspace.
5. Deleted records disappear from normal views but remain available for platform investigation.

## Business Rules
- Address is the MVP primary object.
- `normalized_address` is used for duplicate prevention within a workspace.
- Deletes are soft deletes when persisted to Supabase.
- Stage and status are separate concepts.
- Residential and commercial address types must both be supported.
- Address data must be workspace-scoped.
- The Unified Address Record is the only address-level detail surface.
- Activity and notes should be Supabase-backed, not browser/local nested state.
- Map clicks should only open an existing address when the click is within a tight, meter-based hit radius of that address pin; nearby blank-map clicks should not snap to a neighboring record.
- Leaflet/OpenStreetMap tiles do not provide parcel boundaries. True parcel-level boundary selection requires parcel data or a provider/API that exposes property polygons.

## Edge Cases
- Empty states: Dashboard and map must handle zero address records.
- Error states: Failed Supabase sync should surface visibly without losing current UI state.
- Permissions: Sales Rep can create/update assigned records; territory rules come later.
- Duplicate data: Same normalized address cannot exist twice in one workspace.
- Dependency failures: Geocoding failure should still allow manual address creation.
- Dense neighborhoods: adjacent houses may be only a few meters apart, so map-click hit testing must not use broad nearest-record tolerances.

## Non-Goals
- Full custom object builder.
- Complete terminology refactor in one pass.
- Full contact normalization UI.
- Territory assignment rules for MVP.

## Acceptance Criteria
- Given a signed-in user has a workspace, when addresses exist in Supabase, then the app loads them.
- Given a user creates an address in the UI, when sync succeeds, then `doorstep.addresses` has the record.
- Given a user deletes an address, when sync succeeds, then `deleted_at` is set and normal views hide it.
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

## Iteration History
- 2026-06-08: Supabase address load/upsert/soft-delete wired into app.
- 2026-06-09: Unified Address Record direction added.
- 2026-06-10: Map click selection changed from broad degree-based nearest-record matching to tight meter-based hit testing.
