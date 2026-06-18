# Feature: Platform Owner Administration

**Status:** In Progress  
**Last updated:** 2026-06-18  
**Owner:** Mike Hilton

---

## Goal
Give the Platform Owner a safe, audited way to see every workspace, user, account, and usage signal across DoorStep CRM while preserving workspace-level RLS for normal users.

## Current Behavior
DoorStep has Supabase Auth, `doorstep.profiles.is_platform_owner`, workspaces, workspace members, roles, permissions, entitlements, and workspace-scoped RLS. Normal app users load one active workspace. There is no first-class Platform Owner dashboard, no platform audit log table, no login/session event log, and no approved impersonation flow.

## Desired Behavior
Platform Owner can open a platform dashboard that lists all workspaces, users, active members, and MVP usage metrics. Cross-workspace reads happen through explicit platform-owner RPCs or policies with permission checks, not through browser service-role access. Platform-sensitive actions write audit events with actor, target user/workspace where applicable, action, timestamp, and metadata.

The Platform Owner experience should follow the support-tool pattern where platform-only controls live in a distinct Platform/Admin nav section, impersonation/stealth mode is visible through a global banner/menu state, and workspace/user switching is audited rather than silent.

## User Flow
1. Platform Owner signs in with a real Supabase Auth user.
2. App detects `profiles.is_platform_owner = true`.
3. Platform Owner sees a Platform dashboard option in the global nav.
4. Platform dashboard shows workspace/user counts, recent workspaces, recent users, usage totals, and recent audit/session events.
5. When Platform Owner views platform data, the backend records the audited platform action.
6. Future impersonation or "view as" actions require a reason, visible banner, and audit entry before any target account/workspace is viewed or acted on.
7. Platform Owner can choose a workspace from the workspace control, confirm the access, optionally enter a reason, and view that workspace through a short-lived audited access session.

## Business Rules
- Platform Owner is a platform-wide control plane role, not a workspace role.
- Platform Owner status must not make normal workspace RLS treat the user as an implicit member of every workspace.
- Workspace Owner/Admin permissions do not grant platform-wide access.
- Service-role keys must never be shipped to the browser.
- Platform dashboard APIs are internal-only unless explicitly changed in Platform API Governance.
- Platform actions must be auditable.
- True impersonation must use a backend-only endpoint or Supabase-approved server path and must not be done by exposing privileged credentials to the frontend.
- "Stealth" access must still be visible to the Platform Owner through a global banner/control state and recorded in the audit trail; it must not be silent, unlogged access.
- Platform Owner may see soft-deleted records only through approved investigation/admin surfaces.
- Normal workspace users remain constrained to their workspace by RLS.
- Platform-wide reads belong behind approved platform RPCs/routes, not shared workspace membership helper functions.
- Platform workspace access sessions must create a dedicated audit row with actor, target workspace, reason, timestamp, and source app context before normal workspace views can load target workspace data.

## MVP Usage Metrics
- Total workspaces, including active and deleted counts.
- Total profiles/users.
- Total active workspace members.
- Total addresses, contacts, and activities.
- Per-workspace counts for members, addresses, contacts, activities, and most recent activity.
- Per-workspace usage rows display the workspace settings business name, with `Unknown` when no business name is configured.
- Recent login/session audit events recorded by the app.

## Edge Cases
- Empty state: Platform dashboard shows zero-state cards if only one workspace exists.
- Error state: If platform overview RPC denies access, app hides the dashboard and surfaces a non-destructive error.
- Permissions: Non-platform users must not see the Platform nav item or receive platform overview data.
- Audit failure: Platform-sensitive RPCs should fail closed if required audit writes cannot complete.
- Data scale: Platform overview may later need pagination; MVP can return limited recent arrays and aggregate counts.

## Non-Goals
- Full role-cloning UI in this slice.
- Full workspace user-management UI in this slice.
- True user impersonation in this slice.
- Billing-grade usage metering in this slice.
- Public external API for platform reporting.

## Acceptance Criteria
- Given a signed-in Platform Owner, when the app loads, then the global nav shows a Platform dashboard option.
- Given a non-platform user, when the app loads, then no Platform dashboard option is visible.
- Given a Platform Owner opens the Platform dashboard, then the app shows workspace/user/usage rollups returned from Supabase.
- Given a Platform Owner opens the Platform dashboard, then an audit event is recorded.
- Given a user signs in or refreshes with a valid session, then a session/login audit event is recorded without storing secrets.
- Given platform admin RPCs exist, then they are documented as internal APIs in the API registry.
- Given browser code queries platform data, then it uses authenticated Supabase RPC/table access only, never a service-role key.
- Given a Platform Owner chooses another workspace from the workspace switcher, when they confirm the modal, then an audited workspace access session is created before the dashboard switches.
- Given a workspace has a business name in workspace settings, then Platform dashboard Workspace Usage displays that business name; otherwise it displays `Unknown`.

## Validation Plan
- Apply migration in Supabase.
- Verify RLS is enabled on new tables.
- Verify non-platform users cannot call platform overview RPC.
- Verify Platform Owner can call platform overview RPC and receives aggregate counts.
- Run `npm run build`.
- Run `npm run lint`.
- Run `npm run verify:deploy-artifact`.

## Open Questions
- [ ] Should first impersonation be "read-only view as workspace/user" or true "act as user"?
- [ ] Should Platform Owner be able to change workspace entitlements from the first Platform dashboard iteration?
- [ ] Should staging use a Supabase branch, a second Supabase project, or both a branch plus Cloudflare preview deployment?

## Decisions Made
- 2026-06-18: Start with platform overview and audit foundation before true impersonation.
- 2026-06-18: Platform dashboard APIs default to internal-only.
- 2026-06-18: Lightweight staging is recommended before true impersonation or entitlement editing ships.
- 2026-06-18: Support-tool platform admin patterns are the reference for DoorStep: distinct Platform nav section, audited impersonation log, visible impersonation banner, workspace overrides, feature/limit registry, and API endpoint registry.

## Iteration History
- 2026-06-18: Initial platform-owner administration spec created.
