# Feature: Supabase Workspace Auth

**Status:** In Progress  
**Last updated:** 2026-06-08  
**Owner:** Mike Hilton

---

## Goal
Enable DoorStep CRM to operate as a multi-user, multi-workspace app backed by Supabase Auth, RLS, roles, permissions, and entitlements.

## Current Behavior
Production renders a Supabase sign-in/sign-up screen when runtime config is present. On first authenticated load, the app attempts to find an active workspace membership and calls `doorstep.create_workspace` if none exists. Address records are loaded from `doorstep.addresses`. Much of the app still keeps settings, catalog, team, goals, routes, quotes, and invoices in local component/localStorage state.

## Desired Behavior
Every authenticated user belongs to one or more workspaces. Workspace membership controls access to address/contact/quote/appointment data through Supabase RLS. Roles are renameable and cloneable later, with MVP defaults for Owner, Admin, Sales Rep, Scheduler, and Technician.

## User Flow
1. User opens `https://app.clearview.win`.
2. User signs in or creates an account.
3. App loads the user's active workspace.
4. If no workspace exists, app creates one and makes the user Owner.
5. App loads workspace-scoped CRM data.
6. User can sign out from the app chrome.

## Business Rules
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
- Given an authenticated user has no workspace, when the app loads, then a workspace and Owner membership are created.
- Given a user is not a workspace member, when they query workspace data, then RLS denies access.
- Given local env vars are missing, when developing locally, then the app renders local demo mode instead of crashing.

## Validation Plan
- Verify Supabase migrations exist and are listed in Supabase.
- Verify production `/config` returns public runtime config.
- Verify production renders sign-in screen.
- Test sign-up/sign-in and first workspace creation with a real user.

## Open Questions
- [ ] Should sign-up be open to anyone for MVP or invitation-only before launch?
- [ ] What should the first workspace name be: user-provided, company name, or default "DoorStep Workspace"?
- [ ] Should username login remain email-backed with `@doorstep.local`, or should we require real emails?

## Decisions Made
- 2026-06-08: Use Supabase Auth username/password style via email/password API.
- 2026-06-08: Use `doorstep.create_workspace` RPC to bootstrap workspace, roles, role permissions, entitlements, and owner membership.

## Iteration History
- 2026-06-08: Initial auth/workspace bootstrap shipped.
