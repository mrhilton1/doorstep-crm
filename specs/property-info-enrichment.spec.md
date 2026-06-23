# Feature: Property Info Enrichment

**Status:** In Progress
**Last updated:** 2026-06-23
**Owner:** Mike Hilton

---

## Goal
Let a user enrich an address record with public property details copied from FamilyTreeNow, then persist the parsed result as a first-class Supabase record that can later support bid recommendations and other property intelligence.

## Current Behavior
The Unified Address Record has a Job Info section backed mostly by address `customData.jobInfo`. There is no dedicated property-info table, no source-assist workflow, and no parser for copied public property details.

## Desired Behavior
Next to the address on the Unified Address Record, show a house lookup icon. Clicking it opens an in-app modal explaining that the user should highlight and copy the property details from the source page, then return to DoorStep and paste the text. After the user confirms, DoorStep opens a FamilyTreeNow search URL in a new tab using the current address. The modal remains available with a paste textarea. On submit, DoorStep parses the pasted text into a stable JSON shape and inserts a row into `doorstep.property_info_records`.

## User Flow
1. User opens an address record.
2. User clicks the house/property lookup icon next to the address.
3. Modal explains the copy/paste workflow.
4. User clicks OK/Open Source.
5. App opens `https://www.familytreenow.com/search/genealogy/results?...` using the record street plus city/state, omitting ZIP from the `citystatezip` query value.
6. User copies property details from the source site.
7. User returns to DoorStep, pastes the copied text, and submits.
8. App parses the text, saves a row in Supabase, updates the current address record with the latest parsed result, and displays a compact property info summary.

## Business Rules
- Address remains the primary CRM object; property info rows link to `doorstep.addresses`.
- Property info rows are workspace-scoped and RLS-protected.
- The parser captures only the approved MVP fields: bedrooms, bathrooms, squareFootage, yearBuilt, estimatedValue, estimatedEquity, salePrice, saleDate, occupancyType, ownershipType, landUse, propertyClass, subdivision, lotSquareFeet, apnNumber, schoolDistrict, city, state, county.
- Raw pasted text is stored for traceability/debugging.
- Source URL is stored for auditability.
- The table permits 1:many property info rows per address over time, with newest row displayed on the record.
- Do not scrape FamilyTreeNow from DoorStep in this MVP pass; use user-driven copy/paste to avoid brittle scraping and source-site blocking.
- Leaving DoorStep for the source tab must not clear the open address record or property-info modal state when the user returns.
- ZIP income demographics are stored as platform reference data in `doorstep.zip_income_demographics`; property info rows can later copy a point-in-time demographic snapshot into `demographics` when bid recommendation logic is introduced.
- The Supabase table API is internal-only.

## Edge Cases
- Popup blocked: modal should show the source URL as a clickable fallback.
- Partial pasted text: parser should save known fields and mark missing values as `N/A`.
- Missing city/state/county: derive city/state from address where possible and county from text or common city mapping when available.
- Source save failure: modal remains open, preserves pasted text, and shows the backend/network error.
- Draft/unpersisted address records: hide or disable property info save until the address exists in Supabase.

## Non-Goals
- Automated scraping.
- Full demographic enrichment.
- Bid recommendation engine logic.
- Contact/property ownership verification.

## Acceptance Criteria
- Given a persisted address record is open, when the user clicks the house lookup icon, then the property info modal opens.
- Given the user clicks OK/Open Source, then a new tab opens to FamilyTreeNow with URL-encoded street address and city/state query params, excluding ZIP.
- Given the user returns to DoorStep after opening the source tab, then the address record and paste modal remain open.
- Given the user pastes property details and submits, then the app parses the approved JSON shape and saves a row to `doorstep.property_info_records`.
- Given the save succeeds, then the latest property info summary appears on the address record without a page reload.
- Given the record reloads later, then the latest property info row is loaded from Supabase and displayed.
- Given save fails, then the modal shows an inline error and keeps the pasted text.

## Validation Plan
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run verify:deploy-artifact`.
- Apply Supabase migration.
- Smoke test parsing the provided sample text against an existing address.

## Open Questions
- [x] Which demographic source should power average/median income by ZIP: Census ACS, paid property data provider, or manual import? Decision: ACS S1901 ZIP-level data imported into `doorstep.zip_income_demographics`.
- [ ] Should property info rows be editable after save, or append-only with superseding rows?

## Decisions Made
- 2026-06-23: Use manual copy/paste from FamilyTreeNow for MVP rather than scraping.
- 2026-06-23: Persist parsed property details in a dedicated Supabase table with 1:many rows per address.
- 2026-06-23: Keep income/demographics as future enrichment fields; do not block the MVP property parser.
- 2026-06-23: Use ACS S1901 ZIP-level demographics as the first income reference source for future bid recommendations.
- 2026-06-23: FamilyTreeNow source URLs omit ZIP and tab-hide behavior must preserve the property-info modal workflow.

## Iteration History
- 2026-06-23: Spec created from user request and AiStudio parser reference.
