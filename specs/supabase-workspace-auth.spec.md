# Feature: Supabase Workspace Auth

**Status:** In Progress  
**Last updated:** 2026-06-18
**Owner:** Mike Hilton

---

## Goal
Enable DoorStep CRM to operate as a multi-user, multi-workspace app backed by Supabase Auth, RLS, roles, permissions, and entitlements.

## Current Behavior
Production renders a Supabase sign-in/sign-up screen when runtime config is present. Users can request a password reset email and set a new password after opening the Supabase recovery link. On first authenticated load, the app attempts to find an active workspace membership and calls `doorstep.create_workspace` if none exists. The app reads `doorstep.profiles.is_platform_owner` for the signed-in user and shows the `/platform` dashboard only for Platform Owners. Address records are loaded from `doorstep.addresses`; nested MVP data such as quotes, invoices, interactions, appointments, tags, and child contacts still rides through the address `custom_data` bridge until those flows are normalized. Workspace-level app state such as catalog, settings, team, goals, and routes persists through `doorstep.workspace_app_state` as a bridge table. Browser storage is not used as a CRM data source.

## Desired Behavior
Every authenticated user belongs to one or more workspaces. Signup is open to anyone for MVP, but users must use real email addresses. Workspace membership controls access to address/contact/quote/appointment data through Supabase RLS. Roles are renameable and cloneable later, with MVP defaults for Owner, Admin, Sales Rep, Scheduler, and Technician.

## User Flow
1. User opens `https://app.clearview.win`.
2. User signs in or creates an account.
3. If the user has no password or forgot it, user requests a password reset email.
4. User opens the recovery link and sets a new password.
5. App loads the user's active workspace.
6. If no workspace exists, app creates one and makes the user Owner.
7. App loads workspace-scoped CRM data.
8. User can sign out from the app chrome.

## Business Rules
- Signup is open to anyone for MVP.
- Auth requires real email addresses; do not create synthetic `@doorstep.local` usernames.
- Existing OAuth/email users must be able to set a password through Supabase password recovery.
- Workspace data must be scoped by `workspace_id`.
- Ordinary workspace views must explicitly filter by the active `workspace_id`, even when the signed-in user is a Platform Owner.
- Platform Owner status must not make `is_workspace_member()` or normal workspace RLS policies return true for every workspace.
- Supabase service-role keys must never be used in browser code.
- RLS must be enabled on workspace-owned tables.
- Owner/Admin can manage workspace configuration later.
- Platform Owner capabilities are separate from Workspace Owner capabilities and are controlled by `doorstep.profiles.is_platform_owner`.
- Platform-owner cross-workspace reads must use audited, explicit RPCs or policies; service-role credentials must never be used in browser code.
- Entitlements are hardcoded for MVP but must remain updateable via future platform APIs.

## Edge Cases
- Empty states: New user with no workspace gets a default workspace.
- Error states: Failed workspace bootstrap shows a recoverable setup screen.
- Permissions: Users cannot read another workspace's records.
- Duplicate data: Workspace slugs should be unique; app uses user-derived slug for default bootstrap.
- Dependency failures: Supabase outage should show a clear login/load error, not a blank app.

## Non-Goals
- Full platform-owner UI beyond the first read-only dashboard.
- Full role cloning UI.
- Territory-based access control for MVP.
- SSO or OAuth login.

## Acceptance Criteria
- Given Supabase env vars exist, when production loads, then the Supabase auth screen appears for signed-out users.
- Given a user signs up or signs in, when they enter an identity, then it must be a real email address accepted by the email input.
- Given an existing user has no known password, when they request a reset, then Supabase sends a recovery email to their real email address.
- Given a user opens a valid recovery link, when they enter matching passwords, then their Supabase password is updated.
- Given an authenticated user has no workspace, when the app loads, then a workspace and Owner membership are created.
- Given a user is not a workspace member, when they query workspace data, then RLS denies access.
- Given a Platform Owner is inside a normal DoorStep workspace view, when the dashboard, contacts, map, or log stream loads, then it shows only the active workspace's addresses, contacts, activities, appointments, and app state.
- Given a Platform Owner is not an explicit member of another user's workspace, when normal workspace tables are queried directly, then RLS denies those rows unless an explicit audited platform RPC is used.
- Given Supabase env vars are missing, when the app loads, then it shows a Supabase configuration-required screen instead of running a separate local CRM.
- Given address CRM data changes in the app, when persistence is needed, then data is written through `doorstep.addresses` rather than browser storage.
- Given workspace-level app state changes in the app, when persistence is needed, then catalog, settings, team, goals, and routes are written through `doorstep.workspace_app_state` rather than browser storage.
- Given catalog products, bundles, or global discounts are created/edited/deleted, when persistence is needed, then those workspace-level changes are saved through `doorstep.workspace_app_state`.
- Given a Platform Owner signs in, when the app loads, then the Platform dashboard is available from the global nav and `/platform`.
- Given a non-platform user signs in, when the app loads, then the Platform dashboard is not visible and platform overview RPCs deny access.

## Validation Plan
- Verify Supabase migrations exist and are listed in Supabase.
- Verify production `/config` returns public runtime config.
- Verify production renders sign-in screen.
- Verify password recovery email sends and recovery link opens the set-password screen.
- Test sign-up/sign-in and first workspace creation with a real user.

## Open Questions
- [x] Should sign-up be open to anyone for MVP or invitation-only before launch? Decision: open to anyone.
- [ ] What should the first workspace name be: user-provided, company name, or default "DoorStep Workspace"?
- [x] Should username login remain email-backed with `@doorstep.local`, or should we require real emails? Decision: require real emails.

## Decisions Made
- 2026-06-08: Use Supabase Auth email/password API with real email addresses.
- 2026-06-08: Use `doorstep.create_workspace` RPC to bootstrap workspace, roles, role permissions, entitlements, and owner membership.
- 2026-06-08: Keep signup open for MVP unless abuse or launch constraints require invitation-only later.
- 2026-06-09: Browser storage is not an acceptable source of truth for CRM data; Supabase is required.
- 2026-06-09: Use `doorstep.workspace_app_state` as a bridge for workspace-level JSON state until normalized tables are implemented.
- 2026-06-10: Catalog product/bundle CRUD and global discount CRUD continue to use `doorstep.workspace_app_state` until normalized catalog tables are implemented.
- 2026-06-18: Platform Owner is modeled on `doorstep.profiles.is_platform_owner`; cross-workspace dashboard reads go through audited internal RPCs.
- 2026-06-18: Platform Owner visibility must not broaden ordinary workspace dashboards; normal app data loads still filter to the active workspace, and all-workspace visibility belongs on explicit platform routes/RPCs.
- 2026-06-18: Platform Owner must not be treated as an implicit workspace member in normal workspace RLS helper functions.

## Iteration History
- 2026-06-08: Initial auth/workspace bootstrap shipped.
- 2026-06-08: Replaced username-style auth language with real-email requirement.
- 2026-06-08: Added password reset and set-new-password flow for existing users.
- 2026-06-09: Removed local CRM persistence and local demo fallback from the live app.
- 2026-06-09: Added Supabase workspace app-state bridge for catalog, settings, team, goals, and routes.
- 2026-06-10: Confirmed catalog and discount CRUD changes persist through the workspace app-state bridge.
- 2026-06-18: Added Platform Owner dashboard foundation and session/platform audit logging.
