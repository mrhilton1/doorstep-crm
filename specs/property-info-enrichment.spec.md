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

## Google import pilot — 2026-10-01
Current: house button opens existing manual enrichment; latest property rows are loaded from Supabase.
Acceptance: Google icon immediately right of house; full-width phone slide-out; check latest saved record first; explicit refresh opens Google query `property details bulleted list {full address}` in a new tab. User copies AI Overview, returns, pastes, previews and confirms address before saving. Preserve qualifiers and raw text, label source google_ai_overview and unverified metadata. Empty/unrecognized text cannot save. Failed saves retain input. No iframe, scraping, localStorage, schema change or automatic clipboard access. Older rows remain history.

Search prompt updated per user: property details for "{street}" {city} {state} {ZIP}. Return ONLY a bulleted list using exactly this template: Address: | Home Type: | Bedrooms: | Bathrooms: | Total Interior Area: | Lot Size: | Year Built: | Roof Material: | Parking Spaces: | HOA Fee: | Parcel Number: | Tax Assessed Value: | Annual Tax Amount:. Use "Not found" if unavailable.
Parser handles bullets or pipe-delimited responses, preserves qualifiers, excludes Not found and conflicting duplicate values.

Follow-up acceptance: County after Address and Neighborhood after Parcel Number in prompt. County is taken from pasted text, not inferred from city. Neighborhood maps to subdivision. Maricopa assessor link uses explicit county plus a validated 8-digit APN (optional letter suffix), strips hyphens, appears in preview and saved view. Other/missing counties or invalid/missing APNs produce no assessor link. Link is external lookup only; assessor retrieval/import is not implemented.

Bid essentials acceptance: display imported square footage prominently, then County and Parcel at top in both preview and cached view. Missing values read Not found; partial imports remain saveable. Keep qualifiers and source label. Populate supported county URL immediately when County/APN are usable. Keep all remaining details below. County data must not overwrite Google square footage; this iteration only opens assessor links.

Automatic enrichment acceptance: on opening a saved property with supported county/APN, and after Google save, request backend assessor enrichment without another click. Use authenticated user's RLS; no service key. Verify exact normalized address and parcel. Cache nested countyAssessor for 30 days in existing row; preserve source/raw text and Google values. Compare updated_at before patching to prevent lost updates. Show loading, retryable failures, fetched timestamp and fields separately. Public-page-only enrichment is explicitly partial; building detail API requires issued token.

Cloud browser pilot: manual Test cloud lookup action in import view on all device sizes; no UA-based claims of desktop access. Authenticate and require active CRM membership; fixed Google query template, bounded address/body/output, capped page timeout and request rate. Only extract labeled list under AI Overview marker, require returned address match; no generic search-result parsing as overview. On challenge, stop and show copy/paste fallback. One-shot sessions close automatically; no live CAPTCHA handoff in pilot. Candidate text requires existing review/confirm/save.

## Human verification handoff — supersedes one-shot pilot
- On-device Google remains primary; verification occurs in its own tab; paste results on return; no cloud browser starts automatically.
- Cloud fallback launches only on explicit click. Return a short-lived interactive Live View for challenge/consent/missing overview. Embed if supported and provide external Live View fallback.
- Authenticated user owns one session; requests use unguessable lookup ID, cannot access another user's session, and cannot resume an old session against a new address.
- Continue reads the same browser tab after user verification; only Google search results with matching address produce preview data. No CRM write until existing review/save.
- Close on success/cancel, panel dismissal best effort, and backend five-minute alarm; no polling or automatic retry.
- Preserve pasted text; cloud fallback disabled while text exists.

Latest acceptance overrides review-only cloud behavior: cloud candidates with exact normalized full address automatically save through existing Supabase workflow, metadata marks automatic address match and unverified Google source. Manual paste retains user confirmation. Trusted mouse/touch/key/wheel input in browser frames extends 60s idle deadline; rendered pages/status polling do not. Server checks every5s and closes idle/success sessions independently of the client; five-minute hard limit remains.

Display implementation: hosted Live View did not render in the embedded test. Use authenticated browser screenshot and user-tap/scroll forwarding in the panel, with full Live View as optional external control. Screens are temporary session state, never CRM data. Browser closes before client Supabase persistence so save latency does not add browser time. If the app closes before receiving a candidate, no server-only save is promised.

## Current flow — Google copy/paste primary (supersedes cloud UI)
Google opens on the user's device in a new tab. User copies property details, pastes, reviews, confirms address and saves. No cloud lookup controls or browser-session requests remain in the panel. Cached-first behavior and existing automatic county assessor lookup after save/on cached record remain unchanged. Prior cloud pilot code is retained separately, unused by current UI.

## Last sale price and bid recommendation — 2026-10-01
Google prompt now starts with Last Sale Price, uses Square Footage, and asks for no field explanations. Formula instructions are excluded per user. Preview shows last sale price and the workspace-rule recommendation; the record header derives the same bid from saved fields. See recommended-bid.spec.md. County enrichment remains separate.

County error handling: non-JSON or malformed county endpoint responses must show a readable error with HTTP status and Cloudflare request reference if available, never raw parser errors or HTML. Unexpected application exceptions must return JSON500 with a diagnostic reference; logs contain stage/type only, not tokens, addresses, record IDs, or response bodies. Valid success response must contain assessor fields before display.

Cloudflare runtime compatibility: county fetch uses redirect manual (error mode unsupported on edge), rejects 3xx without following location. Validate remote-runtime request in addition to Node fixtures.
