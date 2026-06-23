# Feature: ZIP Income Demographics Reference Data

**Status:** In Progress
**Last updated:** 2026-06-23
**Owner:** Mike Hilton

---

## Goal
Load ACS S1901 ZIP-level income demographics into Supabase as platform reference data so property records and future bid recommendation logic can look up income context by ZIP code.

## Current Behavior
DoorStep CRM can capture property details on an address record, but it has no dedicated ZIP demographics table and no repeatable importer for Census ACS S1901 CSV exports.

## Desired Behavior
DoorStep CRM stores a curated subset of ACS S1901 ZIP Code Tabulation Area data in `doorstep.zip_income_demographics`. The table is shared reference data, indexed by ZIP code, readable to authenticated users, and writable only through platform-owner/import paths. The importer extracts ZIP from the Census `NAME` field, skips the label row, normalizes Census missing-value markers to `NULL`, and upserts selected fields.

## Source Data
- Dataset: ACSST5Y2024.S1901
- Metadata CSV: `ACSST5Y2024.S1901-Column-Metadata.csv`
- Data CSV: `ACSST5Y2024.S1901-Data.csv`
- ZIP extraction: first 5-digit value from column `NAME`, for example `ZCTA5 85142`.

## Selected CSV Fields
- `GEO_ID`
- `NAME`
- `S1901_C01_001E`, `S1901_C01_001M` — household total estimate and margin of error
- `S1901_C01_012E`, `S1901_C01_012M` — household median income estimate and margin of error
- `S1901_C01_013E`, `S1901_C01_013M` — household mean income estimate and margin of error
- `S1901_C02_001E`, `S1901_C02_001M` — family total estimate and margin of error
- `S1901_C02_012E`, `S1901_C02_012M` — family median income estimate and margin of error
- `S1901_C02_013E`, `S1901_C02_013M` — family mean income estimate and margin of error
- `S1901_C01_002E` through `S1901_C01_011E` — household income distribution percentage estimate buckets

## Business Rules
- Demographics are platform reference data, not workspace-owned CRM data.
- ZIP code is stored as `text`, not numeric, so leading-zero ZIPs remain valid.
- The source label row in the Census data CSV must be skipped.
- Values of `N`, `(X)`, `-`, and blank strings are stored as `NULL`.
- Household income distribution buckets are stored as numeric percentage estimates in a single JSONB field.
- The full raw Census row may be stored in JSONB for traceability and future re-mapping.
- The table API is internal authenticated Supabase Data API surface.
- Writes are restricted to platform owners or service-role/import contexts; ordinary workspace users only read.

## Edge Cases
- Missing ZIP in `NAME`: skip the row and report it in importer output.
- Duplicate ZIP rows for the same source dataset: upsert by `(source_dataset, zip_code)`.
- Non-numeric estimate/MOE value: store `NULL` instead of throwing during import.
- New ACS release: insert with a new `source_dataset` and `survey_year` instead of overwriting historical datasets.

## Non-Goals
- Bid recommendation formulas.
- Frontend UI for Census demographics.
- Importing all 130 Census columns as first-class table columns.
- Workspace-specific demographic overrides.

## Acceptance Criteria
- Given the migration is applied, then `doorstep.zip_income_demographics` exists with RLS enabled, ZIP indexes, and a unique source/ZIP constraint.
- Given an authenticated user queries by ZIP, then they can read the matching demographic row.
- Given a non-platform user tries to insert/update/delete through RLS, then the mutation is denied.
- Given the importer runs against the ACS S1901 data CSV, then it skips the label row, extracts ZIP from `NAME`, normalizes selected values, and upserts rows.
- Given a new API surface is introduced, then it is listed in `doorstep.api_registry`.

## Validation Plan
- Run importer in dry-run mode against the provided CSV and confirm row count/first rows.
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run verify:deploy-artifact`.
- Apply migration and run a sample ZIP lookup query.

## Open Questions
- [ ] Should future bid recommendation snapshots copy ZIP demographics into each property info row at quote time for auditability?
- [ ] Should household distribution margin-of-error buckets be stored if confidence scoring becomes important?

## Decisions Made
- 2026-06-23: Store ACS ZIP demographics as platform reference data shared across workspaces.
- 2026-06-23: Keep 24 source CSV fields for MVP and store distribution percentage buckets in JSONB rather than 10 separate typed columns.
- 2026-06-23: Keep the full raw row in JSONB for traceability without promoting every Census field to first-class schema.

## Iteration History
- 2026-06-23: Spec created from ACS S1901 CSV review and user approval to proceed.
