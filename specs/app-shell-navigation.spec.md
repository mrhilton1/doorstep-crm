# Feature: Shared App Shell Navigation

**Status:** In Progress  
**Last updated:** 2026-06-18  
**Owner:** Mike Hilton

---

## Goal
Provide one common authenticated header and navigation system across DoorStep CRM pages, modeled after the support-tool shared `AppHeader` and `AppNav` pattern.

## Reference
Reference project: `/Users/mikehilton/Downloads/support-tool-main`

Relevant reference files:
- `components/app-header.tsx`
- `components/app-nav.tsx`
- `components/impersonation-banner.tsx`
- `hooks/use-auth.ts`
- `migrations/022_entitlements_and_billing_system.sql`
- `migrations/030_create_api_endpoint_config.sql`
- `migrations/038_create_impersonation_log.sql`

## Current Behavior
DoorStep has a reusable `AppHeaderNav` component, but it is rendered as a floating top-right menu while individual pages render their own page headers beneath it. The map view also has its own top overlay. This creates inconsistent header/nav behavior and can make controls overlap page content.

## Desired Behavior
All authenticated app pages render through one shared app shell:
- Sticky top header with app/workspace context.
- One nav drawer/menu with workspace navigation, operational tools, and platform-owner tools.
- The hamburger opens a right-side slide-out tray modeled after support-tool `AppNav`; the tray should slide in from the right, keep the shared header visible, and avoid dimming or covering the workspace page.
- Platform Owner controls are separated from workspace controls.
- Future impersonation/stealth status appears globally in the shell, not inside one page.
- Entitlement-locked or platform-only items can be hidden or marked locked from one central nav model.

## Business Rules
- Workspace Owner/Admin is not the same as Platform Owner.
- Platform Owner nav items appear only when `profiles.is_platform_owner = true`.
- No page should create its own unrelated hamburger/menu pattern.
- Browser-native alerts/confirms remain forbidden.
- Support-tool patterns must be adapted to DoorStep's Supabase/RLS model; do not copy service-role browser patterns.
- True impersonation must remain visible, auditable, and backend-only.

## Acceptance Criteria
- Given any primary app route, when the user is authenticated, then the same top header is visible.
- Given the nav menu opens, then workspace info, user email, sync state, app routes, operational tools, and sign-out are available in the same drawer.
- Given the hamburger is clicked, then the nav appears as a right-side slide-out tray below the shared header rather than a floating popover or page-obscuring modal.
- Given the signed-in user is Platform Owner, then Platform appears in the nav's Platform section.
- Given the signed-in user is not Platform Owner, then Platform Owner nav items are hidden.
- Given the user opens map view, then map overlays do not cover the shared app header.

## Validation Plan
- Run `npm run build`.
- Run `npm run lint`.
- Verify `/`, `/contacts`, `/map`, `/appointments`, and `/platform` render the shared header.
- Verify the nav drawer closes after route/tool selection.

## Open Questions
- [ ] Should desktop get a persistent left sidebar later, while mobile keeps the drawer?
- [ ] Which entitlements should lock or hide the first DoorStep nav items?
- [ ] Should the bottom mobile utility nav be removed entirely after the shared shell is proven?

## Decisions Made
- 2026-06-18: Use support-tool `AppHeader` + `AppNav` as the conceptual reference, but implement in DoorStep's existing React/Vite app without adding a new UI library.
- 2026-06-18: Keep true impersonation deferred until the backend audited flow is specified.
- 2026-06-18: Match support-tool's side-tray behavior more closely: header owns the trigger, nav content slides from the right as a tray, and the app page is not dimmed.

## Iteration History
- 2026-06-18: Initial shared app shell navigation spec created.
