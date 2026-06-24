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
Next to the address on the Unified Address Record, show a house lookup icon. Clicking it opens an in-app modal explaining that the user should copy the FamilyTreeNow search URL, paste it into a new tab manually, copy the property details from the source page, then return to DoorStep and paste the text. The modal remains available with a paste textarea. On submit, DoorStep parses the pasted text into a stable JSON shape and inserts a row into `doorstep.property_info_records`.

## User Flow
1. User opens an address record.
2. User clicks the house/property lookup icon next to the address.
3. Modal explains the copy/paste workflow.
4. App provides a copyable `https://www.familytreenow.com/search/genealogy/results?...` link using the record street plus city/state abbreviation, omitting ZIP from the `citystatezip` query value.
5. User copies the source URL and pastes it into a new browser tab manually.
6. User copies property details from the source site.
7. User returns to DoorStep, pastes the copied text, and submits.
8. App parses the text, saves a row in Supabase, updates the current address record with the latest parsed result, and displays a compact property info summary.

## Business Rules
- Address remains the primary CRM object; property info rows link to `doorstep.addresses`.
- Property info can be saved for a newly selected route/address record before any activity is logged; the app must persist the address row first, then attach the property info row.
- Property info rows are workspace-scoped and RLS-protected.
- The parser captures only the approved MVP fields: bedrooms, bathrooms, squareFootage, yearBuilt, estimatedValue, estimatedEquity, salePrice, saleDate, occupancyType, ownershipType, landUse, propertyClass, subdivision, lotSquareFeet, apnNumber, schoolDistrict, city, state, county.
- Raw pasted text is stored for traceability/debugging.
- Source URL is stored for auditability.
- The table permits 1:many property info rows per address over time, with newest row displayed on the record.
- Do not scrape FamilyTreeNow from DoorStep in this MVP pass; use user-driven copy/paste to avoid brittle scraping and source-site blocking.
- Leaving DoorStep for the source tab must not clear the open address record or property-info modal state when the user returns.
- Source navigation should prefer copy-to-clipboard so the user can paste the URL into a new tab when source-site bot checks object to app-directed navigation.
- The paste textarea must be visible in the same modal as the source URL/copy controls; the user should not have to rely on a second hidden step after returning.
- Do not show an Open Source button for FamilyTreeNow; direct app-driven navigation is brittle and can trigger source-site bot checks.
- Copy Link should not leave a permanent copied/success banner in the modal.
- Copy Link should give transient feedback, such as a toast or short button-label change, so the user knows the link was copied.
- Copy Link may open a blank tab after copying so the user can paste the FamilyTreeNow URL manually without app-directed source navigation.
- Opening the property info modal must check Supabase for the latest `property_info_records` row for the current address. If one exists, show that latest saved data first.
- If latest saved data exists, refreshing property info is an explicit action that switches the modal into copy/paste mode and saves a new latest row after submit.
- Do not show a duplicate paste-instruction bubble between the source URL and textarea when the primary help text already explains the paste flow.
- Do not show the FamilyTreeNow paste/copy instruction card when latest saved property info is already displayed; only show it in refresh/paste mode.
- Copy Link should avoid browser permission prompts where possible; if copy is blocked, leave the source URL visible for manual copy.
- Parsing must use approved field labels as hard boundaries so run-together copied text such as `N/ABathrooms` or `$616,000Estimated Equity` resolves to separate values without bleeding into the next field.
- External source URLs should use state abbreviations, such as `AZ`, where the app can derive them.
- Property info records should derive `state` and `postal_code` from the address display string when the address contains either a full state name such as `Arizona` or a two-letter abbreviation such as `AZ`.
- Workspace settings let admins choose which saved property fields are visible on the address record and in the property info modal.
- ZIP income demographics are stored as platform reference data in `doorstep.zip_income_demographics`; property info rows can later copy a point-in-time demographic snapshot into `demographics` when bid recommendation logic is introduced.
- The Supabase table API is internal-only.

## Edge Cases
- Clipboard blocked: modal should show an inline error and leave the source URL visible for manual selection/copy.
- Partial pasted text: parser should save known fields and mark missing values as `N/A`.
- Missing city/state/county: derive city/state from address where possible and county from text or common city mapping when available.
- Source save failure: modal remains open, preserves pasted text, and shows the backend/network error.
- Draft/unpersisted address records created from map selection should be promoted to persisted address records when property info is saved, even if no activity has been logged.

## Non-Goals
- Automated scraping.
- Full demographic enrichment.
- Bid recommendation engine logic.
- Contact/property ownership verification.

## Acceptance Criteria
- Given a persisted address record is open, when the user clicks the house lookup icon, then the property info modal opens.
- Given the user clicks Copy Link, then the FamilyTreeNow URL is copied and the paste textarea remains visible in the modal.
- Given the user clicks Copy Link, then the app shows transient copied feedback and opens a blank tab when the browser allows it.
- Given the address already has saved property info, when the user opens the modal, then the latest saved row from Supabase is displayed before any refresh workflow.
- Given saved property info is displayed, when the user clicks Refresh, then the modal switches to copy/paste mode for a new source paste.
- Given the user returns to DoorStep after opening the source tab, then the address record and paste modal remain open.
- Given the user pastes property details and submits, then the app parses the approved JSON shape and saves a row to `doorstep.property_info_records`.
- Given the address was created from a map click and has no activity yet, when the user saves property info, then the app creates the address row and saves the property info row without requiring an activity first.
- Given FamilyTreeNow removes copied line breaks, when labels and values touch each other, then the parser still captures only the value between each approved field label and the next approved field label.
- Given the save succeeds, then the latest property info summary appears on the address record without a page reload.
- Given the record reloads later, then the latest property info row is loaded from Supabase and displayed.
- Given a workspace admin changes visible property info fields in settings, then the address record and property info modal use that same configured field list.
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
- 2026-06-23: Source opening uses an anchor-based new-tab link and the app has a recovery fallback instead of a blank screen if a render route fails.
- 2026-06-23: Property lookup now uses copy-link-first UX, keeps the paste box visible in the same modal, and formats Arizona as `AZ` for FamilyTreeNow.
- 2026-06-23: Remove the FamilyTreeNow Open Source button and persistent copy-success banner; keep the workflow manual-copy-first.
- 2026-06-23: Property info parsing treats FamilyTreeNow labels as boundaries to handle pasted text where labels are concatenated to previous values.
- 2026-06-23: Property lookup modal checks Supabase on open, displays latest saved info first, and uses Refresh to enter the paste/update workflow.
- 2026-06-23: Copy Link uses transient copied feedback and can open a blank tab for manual URL paste.
- 2026-06-23: Property info address parsing accepts full state names and two-letter state abbreviations so `Arizona 85142` saves as `AZ` plus postal code `85142`.
- 2026-06-23: Hide FamilyTreeNow paste instructions when showing saved data, and use a click-scoped copy path that avoids the browser Clipboard API permission prompt.
- 2026-06-23: Property info save can promote a draft map-selected address into a persisted address without requiring an activity event first.
- 2026-06-23: Property info display fields are workspace-configurable and shared by the address record summary and property lookup modal.

## Iteration History
- 2026-06-23: Spec created from user request and AiStudio parser reference.
