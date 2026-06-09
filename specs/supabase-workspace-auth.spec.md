# Feature: Supabase Workspace Auth

**Status:** In Progress  
**Last updated:** 2026-06-08  
**Owner:** Mike Hilton

---

## Goal
Enable DoorStep CRM to operate as a multi-user, multi-workspace app backed by Supabase Auth, RLS, roles, permissions, and entitlements.

## Current Behavior
Production renders a Supabase sign-in/sign-up screen when runtime config is present. Users can request a password reset email and set a new password after opening the Supabase recovery link. On first authenticated load, the app attempts to find an active workspace membership and calls `doorstep.create_workspace` if none exists. Address records are loaded from `doorstep.addresses`; nested MVP data such as quotes, invoices, interactions, appointments, tags, and child contacts still rides through the address `custom_data` bridge until those flows are normalized. Workspace-level app state such as catalog, settings, team, goals, and routes persists through `doorstep.workspace_app_state` as a bridge table. Browser storage is not used as a CRM data source.

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
- Supabase service-role keys must never be used in browser code.
- RLS must be enabled on workspace-owned tables.
- Owner/Admin can manage workspace configuration later.
- Platform Owner capabilities are separate from Workspace Owner capabilities.
- Entitlements are hardcoded for MVP but must remain updateable via future platform APIs.

## Edge Cases
- Empty states: New user with no workspace gets a default workspace.
- Error states: Failed workspace bootstrap shows a recoverable setup screen.
- Permissions: Users cannot read another workspace's records.
- Duplicate data: Workspace slugs should be unique; app uses user-derived slug for default bootstrap.
- Dependency failures: Supabase outage should show a clear login/load error, not a blank app.

## Non-Goals
- Full platform-owner UI.
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
- Given Supabase env vars are missing, when the app loads, then it shows a Supabase configuration-required screen instead of running a separate local CRM.
- Given address CRM data changes in the app, when persistence is needed, then data is written through `doorstep.addresses` rather than browser storage.
- Given workspace-level app state changes in the app, when persistence is needed, then catalog, settings, team, goals, and routes are written through `doorstep.workspace_app_state` rather than browser storage.

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

## Iteration History
- 2026-06-08: Initial auth/workspace bootstrap shipped.
- 2026-06-08: Replaced username-style auth language with real-email requirement.
- 2026-06-08: Added password reset and set-new-password flow for existing users.
- 2026-06-09: Removed local CRM persistence and local demo fallback from the live app.
- 2026-06-09: Added Supabase workspace app-state bridge for catalog, settings, team, goals, and routes.
