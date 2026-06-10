# Scratchpad

## 2026-06-10 — Current Objective
**Task:** Move Unified Address Record quick actions out of the floating footer and into top-right icon buttons beside the stage progress dots.
**Target spec:** `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Re-read operating docs and unified address record spec.
- [x] Update spec/scratchpad with top-right action placement decision.
- [x] Move Schedule, Quote, and Transaction actions to icon buttons by stage dots.
- [x] Remove bottom floating action bar.
- [x] Run verification.
- [x] Commit, push, and deploy if verification passes.

## Assumptions
- The three icons should preserve the same actions: Schedule, Quote, and Record Transaction.
- Icon-only buttons need `title` and `aria-label` because their purpose is not always obvious.
- The previous sticky footer should be fully removed to avoid covering content.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-09 — Current Objective
**Task:** Implement the first Unified Address Record slice: replace duplicate drawers, add role-ready section config, create Supabase notes/quote/invoice/transaction schema, and route notes through notes + activities.
**Target spec:** `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Re-read operating docs and impacted specs.
- [x] Capture user decisions for unified address record, quote/invoice model, notes, and compact actions.
- [x] Create unified address record spec and update impacted specs.
- [x] Add Supabase migration for notes, quotes, invoices, transactions.
- [x] Route old summary-drawer opens to the unified editor.
- [x] Add notes insert behavior for event notes.
- [x] Run verification.
- [x] Apply Supabase migration and verify new tables/RLS.
- [ ] Commit, push, deploy if verification passes.

## Assumptions
- The existing `PropertyDrawer` becomes the first version of Unified Address Record while the monolith is refactored.
- Old summary drawer code can remain temporarily if no longer reachable, to keep this first slice lower-risk.
- Notes table is source of truth for note bodies; `doorstep.activities` remains the timeline/audit feed and references notes via metadata.
- Quote/invoice/transaction tables are added now, but deep UI migration can follow after the unified screen shell.

## Gotchas Discovered This Session
- `HomeDashboard` still has its own selected-contact summary drawer and action state; contact cards/recent events/appointments currently open that duplicate drawer.
- Supabase migration apply succeeded; `notes`, `quotes`, `invoices`, and `transactions` exist with RLS enabled.
- Local browser smoke test reached the expected Supabase-required setup screen without runtime errors; authenticated UI smoke should happen after Cloudflare deployment because runtime env vars live there.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-09 — Current Objective
**Task:** Replace Visit Status controls with a Supabase-backed Live Event Logger that supports knock/call/service/admin outcomes and stage movement rules.
**Target spec:** `/specs/address-activity-logging.spec.md`

## Micro-Steps
- [x] Read operating docs and current activity spec.
- [x] Review target-user PRD and user decisions.
- [x] Inspect existing `doorstep.activities` schema/RLS and editor props.
- [x] Update activity spec for Live Event Logger.
- [x] Load/write activities through Supabase.
- [x] Replace Visit Status area with progressive event logger UI.
- [x] Run verification.
- [x] Commit, push, and deploy if verification passes.

## Assumptions
- `doorstep.activities` is the canonical event store for this pass.
- Existing `PropertyStatus` can remain as a derived/latest outcome for filters and cards until we fully remove status-driven UI elsewhere.
- Quote-request events should open the existing quote builder after successful event write.
- Referral given will persist event metadata now; auto-creating the referred lead is a follow-up unless a clean existing lead path is available during implementation.

## Gotchas Discovered This Session
- Existing activities table has a broad `type` enum plus `metadata`; the detailed PRD taxonomy can live in metadata without a schema enum migration.
- Existing policy allows workspace members to insert activities when `actor_user_id = auth.uid()`.
- Address loads now merge `doorstep.activities` rows into the visible activity feed; legacy `custom_data.interactions` is only a fallback.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-09 — Current Objective
**Task:** Add address-level activity logging so repeated knocks/conversations can be recorded independently from one-time visit status.
**Target spec:** `/specs/address-activity-logging.spec.md`

## Micro-Steps
- [x] Read operating docs and relevant address spec.
- [x] Inspect existing interaction persistence and editor UI.
- [x] Create focused activity logging spec.
- [x] Add Knock/Conversation interaction types and editor composer.
- [x] Run verification.
- [x] Commit, push, and deploy if verification passes.

## Assumptions
- Visit Status remains the latest/current address state.
- Activity logs are repeated historical events and should not be limited to one per address.
- MVP can persist activity logs through `doorstep.addresses.custom_data.interactions` before fully normalizing `doorstep.activities`.

## Gotchas Discovered This Session
- The existing summary drawer already reads `interactions`, but the editor does not provide a way to create Knock/Conversation log entries.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-09 — Current Objective
**Task:** Remove browser-storage-backed CRM state so Supabase is the app source of truth.
**Target spec:** `/specs/supabase-workspace-auth.spec.md`

## Micro-Steps
- [x] Stop local smoke-test server.
- [x] Inventory `localStorage` and `sessionStorage` usage.
- [x] Remove live app browser-storage reads/writes.
- [x] Add Supabase bridge table for workspace app state.
- [x] Remove stale backup file containing old browser-storage behavior.
- [x] Update spec and agent guardrails.
- [x] Run verification.
- [x] Apply migration to Supabase project `vupriscnyrqmibmfowdx`.
- [x] Commit and push if appropriate.

## Assumptions
- MVP can keep nested quotes, invoices, interactions, appointments, tags, and child contacts in `doorstep.addresses.custom_data` until those tables are wired into the UI.
- Catalog, settings, team, goals, and routes can use `doorstep.workspace_app_state` as a bridge table until they receive normalized tables.
- Missing Supabase config should be treated as setup-required, not as a separate local CRM mode.

## Gotchas Discovered This Session
- `src/App.backup.tsx` still contained old browser-storage behavior and was removed to prevent pattern drift.
- The current address upsert bridge already persists most per-address nested MVP data through Supabase `custom_data`.
- Migration `005_workspace_app_state.sql` was applied successfully to Supabase project `vupriscnyrqmibmfowdx`.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-08 — Current Objective
**Task:** Install a spec-driven AI engineering workflow in the DoorStep CRM repo so future deploys become more efficient and higher quality.  
**Target spec:** `/specs/spec-driven-ai-engineering.spec.md`

## Micro-Steps
- [x] Read the attached framework text.
- [x] Create root agent operating files.
- [x] Create initial feature specs for current product direction.
- [x] Run verification.
- [ ] Commit and push if requested or appropriate.

## Assumptions
- `CLAUDE.md` should be the primary root operating file because the user mentioned Claude and Codex.
- `AGENTS.md` should point Codex-style agents to `CLAUDE.md` without duplicating instructions.
- Feature specs should start with the current MVP-critical areas, not every future feature.

## Gotchas Discovered This Session
- No dedicated long-term memory tool is available in this thread, so repo docs are the durable memory source.
- The generated README still had AI Studio starter copy, so a DoorStep-specific AI workflow pointer was added at the top.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-09 — Current Objective
**Task:** Add a direct edit/update action from the contact summary drawer so a rep can change stage, visit status, notes, and contact details without bouncing back to the map.
**Target spec:** `/specs/contact-summary-quick-edit.spec.md`

## Micro-Steps
- [x] Read `CLAUDE.md`, `AGENTS.md`, `SCRATCHPAD.md`, and `DO_NOT_TOUCH.md`.
- [x] Locate current contact summary and existing property editor behavior.
- [x] Create focused feature spec.
- [x] Add quick edit action to the summary drawer.
- [x] Run verification.
- [x] Commit and push if appropriate.

## Assumptions
- The third screenshot is the existing `PropertyDrawer` edit panel.
- MVP should reuse the existing editor rather than creating a second edit surface.
- The quick action should close the summary drawer before opening the editor to avoid stacked panels.

## Gotchas Discovered This Session
- The contact summary drawer renders above the root property editor, so the summary drawer must close when launching edit mode.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-08 — Current Objective
**Task:** Protect proprietary spec strategy files from Cloudflare deploy artifacts and lock the user's spec workflow decisions.  
**Target spec:** `/specs/spec-driven-ai-engineering.spec.md`

## Micro-Steps
- [x] Update specs with user decisions.
- [x] Add deploy artifact verification script.
- [x] Add npm verification scripts and PR checklist.
- [x] Align auth UI with real-email requirement.
- [x] Run build, lint, artifact verification, and inspect `dist`.
- [x] Commit and push.

## Assumptions
- Cloudflare deployment should continue to upload only `dist`.
- Specs/docs are allowed in GitHub but must never be served by Cloudflare.
- Real email requirement should be reflected in both spec and auth UI.

## Gotchas Discovered This Session
- Vite copies everything in `public/` into `dist`, so proprietary docs must never be placed there.
- `dist` currently contains only `index.html`, one JS asset, one CSS asset, and `config`.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-08 — Process Correction
**Task:** Document the password recovery work and tighten the read-first ritual after it was not fully followed before coding.  
**Target spec:** `/specs/auth-password-recovery.spec.md`

## Micro-Steps
- [x] Re-read `CLAUDE.md`, `SCRATCHPAD.md`, and the auth spec.
- [x] Confirm existing auth spec includes password recovery behavior.
- [x] Add a narrower password recovery feature spec for auditability.
- [x] Add a process correction rule to `CLAUDE.md`.
- [x] Run verification.
- [ ] Commit and push.

## Assumptions
- The existing `supabase-workspace-auth` spec remains the parent auth/workspace spec.
- Password recovery deserves its own focused spec because it was a distinct user-facing auth change.

## Gotchas Discovered This Session
- The password recovery change was implemented after inspecting relevant code/specs, but without first updating `SCRATCHPAD.md`; this is now explicitly recorded as process drift.

---
*Wipe entries older than 30 days. This is working memory, not history.*
