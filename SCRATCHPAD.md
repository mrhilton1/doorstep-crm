# Scratchpad

## 2026-06-23 — Current Objective
**Task:** Polish property lookup modal with latest Supabase view, transient copy feedback, and explicit refresh mode.
**Target specs:** `/specs/property-info-enrichment.spec.md`

## Micro-Steps
- [x] Inspect existing property-info save/load paths and modal UI.
- [x] Add direct latest-row Supabase check when opening the modal.
- [x] Add saved-info view with Refresh-to-paste mode.
- [x] Add transient copied feedback and blank-tab opening from Copy Link.
- [x] Run verification, commit, push, and deploy.

## Assumptions
- Existing property info should be shown read-only first so users do not accidentally overwrite it.
- Refreshing means adding a new latest property-info row while preserving history.
- Opening `about:blank` after Copy Link is safer than navigating directly to FamilyTreeNow and should reduce bot-check friction.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-23 — Current Objective
**Task:** Simplify FamilyTreeNow property lookup source controls and tighten pasted Property Details parsing.
**Target specs:** `/specs/property-info-enrichment.spec.md`

## Micro-Steps
- [x] Re-read scratchpad/spec and inspect property lookup modal/parser.
- [x] Remove Open Source button and permanent copy-success banner.
- [x] Replace bleed-prone parser with approved-label boundary parsing for run-together copied text.
- [x] Run verification, commit, push, and deploy.

## Assumptions
- The source URL should stay visible/selectable, but the app should not directly launch FamilyTreeNow from the modal.
- Clipboard success can be silent; only blocked clipboard access needs inline feedback.
- FamilyTreeNow pasted text may concatenate values with the next label, so labels must be parsing boundaries regardless of whitespace.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-23 — Current Objective
**Task:** Fix FamilyTreeNow source URL/UX, preserve property-info modal state when returning from the source tab, and prevent tab-focus auth refreshes from resetting the app.
**Target specs:** `/specs/property-info-enrichment.spec.md`, `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Re-read operating docs/scratchpad and inspect property info URL, visibility handlers, source opener, auth refresh handling, and address route render path.
- [x] Update spec with city/state-only source URL, copy-link-first UX, visible paste box, and no tab-focus reset.
- [x] Patch URL builder, source opener, auth refresh handling, and visible paste modal.
- [x] Run verification, commit, push, and deploy.

## Assumptions
- FamilyTreeNow search should receive street plus city/state only, because ZIP harms this workflow.
- FamilyTreeNow should receive `AZ`, not `Arizona`, for current Arizona addresses.
- The previous hidden-tab route cleanup should not run while the user is in a modal that expects them to leave and return.
- Supabase token refresh events on browser focus should not be treated as a new login or workspace switch.
- If an unexpected render failure happens, showing an in-app recovery screen is better than leaving the user on a blank tab.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-23 — Current Objective
**Task:** Add ACS S1901 ZIP income demographics as platform reference data for future bid recommendations.
**Target specs:** `/specs/zip-income-demographics.spec.md`, `/specs/property-info-enrichment.spec.md`, `/specs/platform-api-governance.spec.md`

## Micro-Steps
- [x] Re-read operating docs, scratchpad, relevant specs, and inspect Census CSV metadata/data shape.
- [x] Create a focused ZIP demographics reference-data spec.
- [x] Add Supabase migration for `doorstep.zip_income_demographics`, RLS, indexes, and API registry entry.
- [x] Add an import script that extracts ZIP from `NAME`, skips the Census label row, normalizes values, and upserts selected fields.
- [x] Run verification and document how to import/apply.

## Assumptions
- ACS ZIP demographics are global platform reference data, not workspace-owned CRM data.
- MVP keeps 24 source CSV fields: GEO_ID, NAME, 12 household/family summary values, and 10 household distribution bucket estimates.
- Raw full Census rows can be kept in JSONB for traceability without making every source column part of the product contract.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-23 — Current Objective
**Task:** Add FamilyTreeNow-assisted property info enrichment from the Unified Address Record.
**Target specs:** `/specs/property-info-enrichment.spec.md`, `/specs/unified-address-record.spec.md`, `/specs/address-crm-core.spec.md`, `/specs/platform-api-governance.spec.md`

## Micro-Steps
- [x] Re-read operating docs, scratchpad, relevant specs, and the AiStudio reference file.
- [x] Create a focused property info enrichment spec.
- [x] Add Supabase migration for `doorstep.property_info_records`, RLS, permission, and API registry entry.
- [x] Add parser, FamilyTreeNow URL builder, modal flow, and latest property info display.
- [ ] Run verification, apply migration, commit, push, and deploy.

## Assumptions
- MVP uses manual copy/paste from FamilyTreeNow, not scraping.
- Income by ZIP belongs in a future demographics/enrichment pass after choosing a data source such as Census ACS or a paid provider.
- The latest property info row can be cached into `customData.propertyInfoLatest` for immediate display while Supabase remains the source of truth.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-22 — Current Objective
**Task:** Fix Supabase CORS failure when activity notes try to PATCH `doorstep.notes`.
**Target specs:** `/specs/address-activity-logging.spec.md`, `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Re-read operating docs, scratchpad, and impacted specs.
- [x] Inspect reported console errors and the activity note persistence path.
- [x] Remove the blocked note PATCH from the activity save path.
- [x] Preserve notes/activity linkage without relying on PATCH.
- [x] Verify, commit, push, and deploy.

## Assumptions
- The extension console errors are unrelated browser extension noise; the app error is the Supabase CORS preflight rejecting PATCH to `doorstep.notes`.
- Activity logging should use POST/insert-only writes where practical until the Supabase Data API PATCH allowance is corrected.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-22 — Current Objective
**Task:** Fix follow-up activity save feedback and replace the awkward native due datetime picker with an in-modal selector.
**Target specs:** `/specs/address-activity-logging.spec.md`, `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Re-read operating docs, scratchpad, and impacted specs.
- [x] Inspect event modal due-date and Supabase activity save paths.
- [x] Add in-modal due date/time picker with explicit Set/Clear actions.
- [x] Improve activity save network/Supabase error messaging without faking success.
- [x] Update specs, verify, commit, push, and deploy if possible.

## Assumptions
- The existing `doorstep.activities` write remains the source of truth; the fix should improve UX and diagnostics without adding a new endpoint.
- Follow-up due values should still persist as exact `dueAt` ISO datetimes.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-22 — Current Objective
**Task:** Clear stale Not Interested sub-status when a later interested activity is logged.
**Target specs:** `/specs/address-activity-logging.spec.md`, `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Re-read operating docs, scratchpad, and impacted specs.
- [x] Inspect central event stage/status/sub-status derivation.
- [x] Patch sub-status derivation so positive events clear `not_interested`.
- [x] Update specs with the renewed-interest rule.
- [ ] Run verification, commit, push, and deploy.

## Assumptions
- Quote requested, follow-up needed, referral given, completed cleaning, and generic answered knocks are positive/renewed-interest signals.
- Clearing `not_interested` should remove sub-status metadata instead of leaving an old set timestamp/user attached to an empty sub-status.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-22 — Current Objective
**Task:** Finish activity modal outcome workflows: inline quote builder, next-action follow-up, referral contact capture/linking.
**Target specs:** `/specs/address-activity-logging.spec.md`, `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Inspect current quote/contact/next-action data shapes.
- [x] Add inline quote item/quantity builder to Estimate / Quote outcome.
- [x] Add next-action fields to Follow-Up Needed outcome.
- [x] Add referral contact capture, optional address, referring-contact link, and follow-up task creation.
- [x] Run lint/build/deploy-artifact checks, then push/deploy if clean.

## Assumptions
- MVP can save modal-created quotes to the existing address `quotes` array and let the current sync layer persist it.
- Referral contacts can be added as address contacts with `customData.source = activity_referral` until a dedicated referral table is introduced.
- Referral follow-up can use existing `customData.nextAction`.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-22 — Current Objective
**Task:** Stop stale address records from reopening after leaving/returning to Clearview, and redesign activity logging modal as a forward/back PWA-style flow.
**Target specs:** `/specs/unified-address-record.spec.md`, `/specs/address-activity-logging.spec.md`

## Micro-Steps
- [x] Re-read operating docs, scratchpad, and impacted specs.
- [x] Inspect URL state synchronization and current activity modal.
- [x] Update specs for tab-resume URL behavior and stepwise modal logging.
- [x] Patch transient address URL cleanup on page hide.
- [x] Convert activity modal from flat form to step-by-step flow with back navigation.
- [x] Run verification, commit, push, and deploy.

## Assumptions
- Address deep links should still work on direct load, but ordinary tab/background resume should not reopen a stale record drawer.
- The MVP step modal should cover the current event paths and leave quote-builder/referral expansion hooks in place without inventing new tables today.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-19 — Current Objective
**Task:** Fix Not Interested event outcome and move event logging into a modal while keeping activity history visible on the contact record.
**Target specs:** `/specs/unified-address-record.spec.md`, `/specs/address-activity-logging.spec.md`

## Micro-Steps
- [x] Re-read operating docs, scratchpad, and impacted specs.
- [x] Inspect current event status/stage derivation and record logger UI.
- [x] Update specs for modal logger and Not Interested sub-status behavior.
- [x] Patch event derivation so Not Interested sets `subStatus: not_interested`.
- [x] Move event composer into modal and keep record activity timeline visible.
- [x] Run verification, commit, push, and deploy.

## Assumptions
- "Not Interested" should remain a sub-status tied to the address record instead of becoming a new top-level stage.
- Activity history should remain visible without requiring users to open the event composer.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-19 — Current Objective
**Task:** Replace free-text Next Action due label with a date/time picker and derive overdue status from the saved due datetime.
**Target specs:** `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Re-read current scratchpad/spec and inspect Next Action implementation.
- [x] Update spec with datetime/overdue behavior.
- [x] Add datetime-local picker and save `customData.nextAction.dueAt`.
- [x] Display due datetime and overdue state.
- [x] Verify, commit, push, and deploy.

## Assumptions
- MVP can store Next Action due date in address `customData.nextAction.dueAt` as an ISO timestamp.
- Existing records with only `dueLabel` should continue to display without breaking.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-19 — Current Objective
**Task:** Revamp the Unified Address Record contact panel to match the provided action-first designs while keeping address as the primary CRM object.
**Target specs:** `/specs/unified-address-record.spec.md`, `/specs/address-activity-logging.spec.md`

## Micro-Steps
- [x] Re-read operating docs, scratchpad, relevant specs, and current record implementation.
- [x] Confirm implementation can use existing activities table and address `customData` without a migration.
- [x] Update the spec with current design decisions.
- [x] Replace the current record drawer with the action-first contact panel layout.
- [x] Add persistent Next Action and inline primary-contact phone editing.
- [x] Keep existing activity logging wired to Supabase and improve mobile More/actions behavior.
- [x] Run verification, then push/deploy if clean.

## Assumptions
- Contact info displays first, but all mutations still belong to the address record unless explicitly tied to a normalized contact.
- Next Action can persist in address `customData.nextAction` for this slice and can later migrate to a dedicated reminders/tasks table.
- New job/property info fields can persist in address `customData.jobInfo` without adding schema today.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-18 — Current Objective
**Task:** Improve admin trays, add AR entry creation, and add audited platform workspace switching with confirmation reason.
**Target specs:** `/specs/platform-owner-admin.spec.md`, `/specs/quotes-invoices-payments.spec.md`, `/specs/app-shell-navigation.spec.md`

## Micro-Steps
- [x] Re-read relevant specs and inspect AR overlay/admin tray/workspace code.
- [x] Update specs for half-width admin trays, AR add-entry flow, and audited platform workspace access.
- [x] Implement half-width desktop trays.
- [x] Implement AR Add button and form with contact/address search.
- [x] Implement audited platform workspace access session and workspace switch UI.
- [x] Run verification and apply migration.
- [x] Push and deploy.

## Assumptions
- "Expense" on the AR page means a manually logged receivable/invoice-like charge tied to an address/contact.
- Platform workspace viewing should be audited before access and should not restore broad platform-owner RLS access.
- Existing `platform_audit_events` is the correct audit table for platform workspace viewing events.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-18 — Current Objective
**Task:** Stop Platform Owner status from broadening normal workspace membership/RLS, clarify dashboard workspace identity, and explain why Mike saw data that felt like another workspace.
**Target specs:** `/specs/supabase-workspace-auth.spec.md`, `/specs/platform-owner-admin.spec.md`, `/specs/app-shell-navigation.spec.md`

## Micro-Steps
- [x] Re-read Supabase/app shell specs and inspect workspace bootstrap/data queries.
- [x] Query live Supabase memberships and address rows for Mike/Preston workspaces.
- [x] Identify that live visible rows are currently in Mike's workspace, while RLS helpers still over-grant platform owner workspace membership.
- [x] Add migration to remove Platform Owner bypass from normal workspace membership/permission helpers.
- [x] Clarify dashboard copy so the page reads as the current workspace instance, not generic operator dashboard.
- [x] Run verification, apply migration, push, and deploy.

## Assumptions
- Platform Owner should see all-workspace data only through explicit platform RPCs/routes, not by being treated as a member of every workspace.
- Mike's ordinary workspace dashboard should load only `doorstep-ab6c5780`; Preston's workspace remains `doorstep-b0499230`.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-18 — Current Objective
**Task:** Force the hamburger slide-out tray to occupy 100% viewport height so the full stacked menu is visible and only the menu area scrolls.
**Target specs:** `/specs/app-shell-navigation.spec.md`

## Micro-Steps
- [x] Re-read current drawer code and app shell acceptance criteria.
- [x] Patch tray sizing from inferred `inset-y-0` to explicit viewport height.
- [x] Run verification and deploy.

## Assumptions
- The deployed browser is collapsing the fixed tray height despite `inset-y-0`; explicit `100dvh` plus flex `min-h-0` should remove ambiguity.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-18 — Current Objective
**Task:** Aggressively rebuild the hamburger tray body to match the support-tool menu reference: app identity, user/status row, stacked nav items, Platform Admin section, bottom sign out.
**Target specs:** `/specs/app-shell-navigation.spec.md`

## Micro-Steps
- [x] Re-read operating docs and app shell spec.
- [x] Re-inspect support-tool `AppNav` and current DoorStep drawer body.
- [x] Update spec with visual/menu structure expectations.
- [x] Replace grouped DoorStep drawer body with support-tool-style stacked menu.
- [x] Run verification and deploy.

## Assumptions
- The drawer should prioritize menu clarity over compact grouping.
- Main workspace routes and operations should be visible as stacked rows with icon, label, description, and chevron.
- Platform-only options should live under a `Platform Admin` label like the reference.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-18 — Current Objective
**Task:** Correct the hamburger navigation so it is a proper support-tool-style slide-out menu tray instead of a partial under-header panel with duplicated close controls.
**Target specs:** `/specs/app-shell-navigation.spec.md`

## Micro-Steps
- [x] Re-read operating docs and app shell spec.
- [x] Inspect current `AppHeaderNav` implementation and screenshot symptoms.
- [x] Update the spec with the corrected tray expectation.
- [x] Patch `AppHeaderNav` so the hamburger remains the trigger and the tray owns the full slide-out menu.
- [x] Run verification before pushing/deploying.

## Assumptions
- The tray should slide from the right edge like support-tool `SheetContent side="right"`, not appear as a below-header partial panel.
- The header hamburger should not turn into a second competing close button while the tray also has its own close affordance.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-18 — Current Objective
**Task:** Fix the shared hamburger menu to behave like the support-tool slide-out tray and force ordinary workspace dashboards to show only the active workspace's data, even for Platform Owners.
**Target specs:** `/specs/app-shell-navigation.spec.md`, `/specs/supabase-workspace-auth.spec.md`

## Micro-Steps
- [x] Re-read operating docs and impacted specs.
- [x] Inspect support-tool `AppNav` tray pattern.
- [x] Inspect DoorStep workspace data loading and dashboard log stream source.
- [x] Update specs with tray behavior and active-workspace dashboard scoping.
- [x] Implement tray animation/layout and explicit workspace filters.
- [x] Run verification before pushing/deploying.

## Assumptions
- The DoorStep workspace dashboard is not a platform-wide dashboard; it should show only rows for the active `workspaceId`.
- Platform-owner all-workspace visibility should remain isolated to platform routes/RPCs, not leak into normal workspace views.
- The hamburger menu should be a side tray that slides in from the right without dimming or covering the shared header.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-18 — Current Objective
**Task:** Compare `/Users/mikehilton/Downloads/support-tool-main` and replicate its shared header/nav, platform, stealth/impersonation, roles, permissions, and entitlements patterns in DoorStep CRM where appropriate.
**Target specs:** `/specs/platform-owner-admin.spec.md`, `/specs/supabase-workspace-auth.spec.md`, `/specs/platform-api-governance.spec.md`

## Micro-Steps
- [x] Re-read operating docs and relevant platform/workspace specs.
- [x] Inspect support-tool shared header/nav components and platform-related flows.
- [x] Inspect support-tool migrations for entitlements, roles/permissions, API registry, and impersonation.
- [x] Decide which patterns should be copied directly, adapted, or deferred.
- [x] Update DoorStep specs with the shared app shell/platform-control decisions.
- [ ] Implement the next safe slice if scope is clear.
- [ ] Run verification before pushing/deploying.

## Assumptions
- DoorStep should get a single shared app shell/header/nav component instead of one-off header/menu patterns per page.
- Support-tool concepts should be adapted to DoorStep's workspace/address CRM model, not copied table-for-table if names or tenancy assumptions differ.
- True impersonation/stealth mode remains high-risk and must stay backend-only and fully audited.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-18 — Current Objective
**Task:** Add platform-owner foundation for cross-workspace visibility, usage rollups, audit logging, and future audited impersonation.
**Target specs:** `/specs/platform-owner-admin.spec.md`, `/specs/supabase-workspace-auth.spec.md`, `/specs/platform-api-governance.spec.md`

## Micro-Steps
- [x] Re-read operating docs, scratchpad, Supabase workflow, workspace auth spec, and API governance spec.
- [x] Inspect current workspace/RLS/schema and app routing.
- [x] Verify live Supabase does not already have platform audit/API registry tables.
- [x] Create/update platform-owner spec and decisions.
- [x] Add a new migration for platform audit events, API registry, session login logging, and platform overview RPC.
- [x] Add a platform dashboard route visible only to platform owners.
- [x] Register new RPC/API contracts as internal APIs.
- [x] Run build/lint and Supabase verification.
- [x] Commit, push, deploy, then document final learnings.

## Assumptions
- Platform Owner is a platform-wide role stored on `doorstep.profiles.is_platform_owner`, separate from workspace Owner.
- True "login as any user" must not be implemented in browser code and needs a separately approved backend-only, fully audited flow.
- MVP usage should start with counts and recency: workspaces, users, members, addresses, contacts, activities, and login/audit events.
- A lightweight staging path is worthwhile now because RLS and cross-workspace admin behavior are high-risk.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-12 — Current Objective
**Task:** Fix the stuck Delete Address modal by moving address soft delete to a Supabase RPC and surfacing modal errors.
**Target specs:** `/specs/address-crm-core.spec.md`, `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Verify live Supabase rows are not receiving `deleted_at`.
- [x] Add `doorstep.soft_delete_address` as a `SECURITY INVOKER` RPC with explicit permission checks.
- [x] Add matching migration file.
- [x] Wire frontend delete to the RPC instead of direct table update.
- [x] Add modal-visible error handling and timeout guard.
- [x] Run verification.
- [ ] Commit, push, and deploy.

## Assumptions
- Delete must stay a soft delete.
- The RPC should not be `SECURITY DEFINER`; it should continue to respect current RLS/permission helpers.
- If backend delete fails or hangs, the user should see the error in the modal and the record should remain visible.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-12 — Current Objective
**Task:** Fix address delete persistence and add URL-backed navigation so refreshes/updates preserve the user's place.
**Target specs:** `/specs/address-crm-core.spec.md`, `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Re-read operating docs, scratchpad, impacted specs, and Supabase workflow.
- [x] Inspect delete persistence path, Supabase address row mapping, and RLS/update behavior.
- [x] Inspect current `currentView`, selected record, drawer, and overlay state ownership.
- [x] Fix delete persistence so deleted address rows stay hidden after refresh.
- [x] Add URL structure for primary pages and opened address records.
- [x] Update specs/rules for URL-backed navigation.
- [x] Run verification.
- [ ] Commit, push, and deploy.

## Assumptions
- Address delete must not be optimistic-only; if Supabase cannot mark `deleted_at`, the UI should surface the failure.
- URL structure should cover the current MVP pages first: dashboard/home, contacts, appointments, map, and address record.
- Browser refresh should restore the user's page/record where possible after data loads.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-12 — Current Objective
**Task:** Add delete from contact/address card view and replace native delete confirmations with in-app modals.
**Target specs:** `/specs/address-crm-core.spec.md`, `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Confirm local/GitHub state is synced before changes.
- [x] Re-read operating docs and locate current card/delete flows.
- [x] Add card-view delete action that uses the existing soft-delete path.
- [x] Replace native delete `confirm` calls with an app modal.
- [x] Add "no native alerts/confirms; use modals" to the rules docs.
- [x] Update impacted specs after implementation.
- [x] Run verification.
- [x] Commit, push, and deploy.

## Assumptions
- Card-view delete should delete the address record, not just the visible contact card, because addresses remain the primary object.
- Delete remains a soft delete that hides addresses from normal views while preserving records for investigation.
- Destructive UX should be handled with in-app modal dialogs, not browser-native alerts or confirms.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-12 — Current Objective
**Task:** Add UI actions to delete addresses and contacts from the Unified Address Record.
**Target specs:** `/specs/address-crm-core.spec.md`, `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Confirm local/GitHub/deploy state are up to date.
- [x] Re-read operating docs and impacted specs.
- [x] Inspect current delete handlers and contact persistence paths.
- [x] Add address delete action using existing soft-delete behavior.
- [x] Add primary/additional contact delete actions from Contact Info edit mode.
- [x] Run verification.
- [x] Update specs/decisions if shipped behavior changes.
- [ ] Commit, push, and deploy.

## Assumptions
- Address delete should soft-delete the address row and remove it from normal app views/routes.
- Contact delete should remove the address-contact relationship from the current record and soft-delete normalized contact rows when the app knows their normalized ID.
- Primary contact delete clears the primary contact card; additional contact delete removes that contact card.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-10 — Current Objective
**Task:** Change default house-click flow so it opens activity logging first and only creates/persists the prospect address after an activity is logged.
**Target specs:** `/specs/address-crm-core.spec.md`, `/specs/address-activity-logging.spec.md`, `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Re-read operating docs and current scratchpad.
- [x] Inspect map click, selected address, and activity logging code.
- [x] Implement draft address selection for non-route map clicks.
- [x] Persist draft address only when logging activity.
- [x] Verify route creation still creates route/prospect records while in route mode.
- [x] Run verification.
- [x] Push to GitHub and deploy to Cloudflare first.
- [x] Update docs after deploy.

## Assumptions
- Existing address marker clicks should still open the existing record.
- Route Creation mode keeps its current behavior of creating address/prospect route records as homes are tapped.
- A draft address may be visible in the drawer before persistence but must not be added to `properties` until activity save succeeds.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-10 — Current Objective
**Task:** Finish the remaining PRD implementation after migration 007 succeeded: wire normalized Add Contact idempotency, Move to New Address RPC flow, and admin displaced contacts visibility.
**Target specs:** `/specs/unified-address-record.spec.md`, `/specs/contact-address-move-and-merge.spec.md`, `/specs/address-crm-core.spec.md`

## Micro-Steps
- [x] Re-read operating docs and impacted specs.
- [x] Inspect current contact, address, Supabase bridge, and navigation code.
- [x] Implement Supabase-backed Add Contact idempotency and address contact linking.
- [x] Implement Move to New Address UI using the atomic RPC.
- [x] Add admin/owner displaced contacts queue visibility.
- [x] Update specs/scratchpad decisions if implementation reality changes.
- [x] Run verification.
- [x] Deploy verified build to Cloudflare Pages.
- [ ] Commit and push implementation/docs.

## Assumptions
- Migration 007 is now applied in Supabase, so frontend code can call `doorstep.move_address_contacts`.
- Existing nested `custom_data.contacts` remains a display bridge, but new Add Contact should create normalized `doorstep.contacts` rows and `doorstep.address_contacts` links.
- The first displaced queue can be a visibility/recovery list, not full reassignment tooling.
- Supabase MCP auth expired while applying migration 008, so `008_contact_idempotent_create_rpc.sql` is committed locally and the frontend includes an idempotency-table fallback until 008 is applied.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-10 — Current Objective
**Task:** Implement the approved PRD slices for Route Creation, stage/sub-status, contact read/edit/idempotency foundation, and safe move/merge database foundation.
**Target specs:** `/specs/unified-address-record.spec.md`, `/specs/address-crm-core.spec.md`, `/specs/scheduling-routes.spec.md`, `/specs/contact-address-move-and-merge.spec.md`

## Micro-Steps
- [x] Re-read operating docs and impacted specs.
- [x] Inspect current React route/contact/stage code and Supabase migrations.
- [x] Implement Route Creation naming, save prompt, progress, marker shape, and non-Google satellite layer.
- [x] Implement stage/sub-status UI/state helpers and scheduled appointment behavior where reachable.
- [x] Implement contact read/edit shell and Add Contact idempotency guard.
- [x] Add new migration for contact normalization/move-merge RPC foundation without altering applied migrations.
- [x] Run verification.
- [ ] Commit, push, and deploy if verification passes.

## Assumptions
- Full move/merge UI may require a second pass after the database RPC foundation because it is the riskiest data path.
- Route Creation can continue to use existing address persistence bridge while route tables are normalized later.
- Satellite layer should use a working non-Google provider and remain session-only.
- Supabase MCP auth is expired, so migration `007_contact_move_stage_route_foundation.sql` could not be applied from this session; frontend sub-status persistence uses the existing Supabase `custom_data` bridge until that migration is applied.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-10 — Current Objective
**Task:** Convert the Contact Record Redesign / Stage System / Address Move / Route Fixes PRD decisions into implementation-ready specs before coding.
**Target specs:** `/specs/unified-address-record.spec.md`, `/specs/address-crm-core.spec.md`, `/specs/scheduling-routes.spec.md`, `/specs/contact-address-move-and-merge.spec.md`

## Micro-Steps
- [x] Re-read operating docs and impacted specs.
- [x] Read the new PRD and cautions.
- [x] Ask alignment questions for spec-changing behavior.
- [x] Capture user decisions on address primacy, move scope, stage labels, route creation, satellite maps, and idempotency.
- [x] Create/update specs with the approved decisions and implementation guardrails.
- [x] Validate docs-only changes.
- [ ] Commit and push if appropriate.

## Assumptions
- "Contact Record" in the PRD means the contact/address section of the Unified Address Record; the address remains the primary CRM object.
- Route Creation creates route-address/prospect records without creating contacts until an attempted contact is logged.
- The dangerous address move/merge path must be implemented as a Supabase RPC transaction, not a frontend sequence of updates.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-10 — Current Objective
**Task:** Fix map-view header/menu overlap and add an easy route-builder toggle that does not select addresses behind map controls.
**Target spec:** `/specs/address-crm-core.spec.md`

## Micro-Steps
- [x] Re-read operating docs and address/map spec.
- [x] Inspect map header, floating controls, and route-builder state.
- [x] Update address CRM spec with map control safety rules.
- [x] Reserve visual space for the shared hamburger menu on map view.
- [x] Make the map route icon toggle route-builder mode on/off.
- [x] Stop map control click/pointer events from reaching the map.
- [x] Run verification.
- [x] Commit, push, and deploy if verification passes.

## Assumptions
- The right-side route icon should mean "build/select route addresses" rather than only "show route overlay."
- Exiting route-builder mode should preserve any in-progress selected addresses so a rep can resume without losing work.
- The shared hamburger remains the global nav; map-specific controls should work around it instead of duplicating nav.
- Local browser smoke reached the expected Supabase runtime-config screen, so authenticated map visual QA should happen against the Cloudflare deployment.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-10 — Current Objective
**Task:** Tighten Leaflet map click selection so neighboring houses do not accidentally open an existing nearby address record.
**Target spec:** `/specs/address-crm-core.spec.md`

## Micro-Steps
- [x] Re-read operating docs and map/address specs.
- [x] Inspect map click, marker click, and reverse-geocode behavior.
- [x] Replace broad degree threshold with meter-based address hit radius.
- [x] Prevent reverse-geocode address matching from opening an existing record when the click is too far from that record's pin.
- [x] Update spec notes about click precision limits and parcel boundaries.
- [x] Run verification.
- [x] Commit, push, and deploy if verification passes.

## Assumptions
- Leaflet tile imagery does not provide parcel polygons; precise property boundaries require parcel data or a provider API, not just switching map rendering libraries.
- Marker clicks should still open existing records immediately.
- Blank map clicks should prefer creating/searching the clicked address instead of snapping to a nearby existing record.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-10 — Current Objective
**Task:** Replace the top-right floating workspace pill with a shared hamburger navigation menu that does not cover page actions.
**Target spec:** `/specs/unified-address-record.spec.md`

## Micro-Steps
- [x] Re-read operating docs and relevant specs.
- [x] Inspect current app/page header ownership.
- [x] Add shared app-shell hamburger nav component.
- [x] Remove oversized floating workspace pill.
- [x] Wire menu actions to existing page/navigation handlers.
- [x] Reserve header space where needed so page buttons are not covered.
- [x] Run verification.
- [ ] Commit, push, and deploy if verification passes.

## Assumptions
- This pass should avoid rewriting all page headers; the shared hamburger can live at the app shell level and control existing views/actions.
- Existing bottom nav can remain until we intentionally replace it.
- The menu should show workspace/user status and sign out without permanently occupying header width.

---
*Wipe entries older than 30 days. This is working memory, not history.*

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
