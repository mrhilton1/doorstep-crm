# Feature: Platform API Governance

**Status:** In Progress  
**Last updated:** 2026-06-23  
**Owner:** Mike Hilton

---

## Goal
Ensure every API created for DoorStep CRM is registered, documented, and configurable as internal-only or publicly available from a platform-level settings model.

## Current Behavior
The frontend uses Supabase Data API and a Cloudflare Pages `/config` function. Supabase has a foundation entitlement for `platform.api_registry`, and migration 010 adds `doorstep.api_registry` with initial entries for `/config`, platform dashboard/audit RPCs, and the address soft-delete RPC. A registry UI/settings page is not implemented yet.

## Desired Behavior
Every internal API, public API, RPC, webhook, edge function, or Pages Function is registered with ownership, exposure level, auth requirements, and entitlement/permission linkage. Platform Owner settings can dictate whether APIs are internal-only or public.

## User Flow
1. Developer creates or changes an API.
2. Developer registers the API in the platform API registry.
3. Platform Owner reviews exposure settings.
4. API is available only according to its configured exposure/auth policy.
5. Docs/specs link to the API contract.

## Business Rules
- All APIs must be discoverable in the registry.
- APIs default to internal unless explicitly marked public.
- Public APIs require documented auth, rate-limit, and data exposure rules.
- Platform Owner controls platform-wide exposure.
- Workspace Owner controls workspace-level integrations only where permitted by entitlement.

## Edge Cases
- Empty states: Registry starts with known APIs: `/config`, `doorstep.record_platform_audit_event`, `doorstep.platform_dashboard_overview`, `doorstep.soft_delete_address`, and internal Supabase tables such as `doorstep.property_info_records` and `doorstep.zip_income_demographics`.
- Error states: Unregistered API should fail review before deployment, once enforcement exists.
- Permissions: Platform Owner can change global API exposure; workspace roles cannot.
- Duplicate data: API key/path/version combination should be unique.
- Dependency failures: If registry cannot load, default exposure should be conservative.

## Non-Goals
- Full external developer portal in MVP.
- OAuth app marketplace.
- Public API monetization.

## Acceptance Criteria
- Given a new API is introduced, when work is complete, then it is listed in the API registry/spec docs.
- Given an API is public, when reviewed, then auth and data exposure rules are documented.
- Given an API has no registry entry, then it is treated as internal-only.

## Validation Plan
- Verify `doorstep.api_registry` exists and RLS is enabled.
- Document `/config` and Supabase RPCs as initial registry entries.
- Add PR/deploy checklist item once a PR workflow exists.

## Open Questions
- [x] Should API registry tables live in `doorstep` or a separate platform schema? Decision: `doorstep` for MVP to match the exposed custom schema and existing platform entitlements.
- [x] Should `/config` be considered public but non-sensitive, or internal platform runtime? Decision: public but non-sensitive; never include secrets.
- [ ] What rate-limiting layer should public APIs use: Cloudflare WAF/Rules, Workers, or Supabase only?

## Decisions Made
- 2026-06-08: APIs default to internal unless specifically marked public.
- 2026-06-18: `doorstep.api_registry` lives in the `doorstep` schema for MVP, with Platform Owner RLS and initial internal/public entries.
- 2026-06-18: `/config` is public but non-sensitive runtime config; all privileged Supabase RPCs are internal.
- 2026-06-23: `doorstep.property_info_records` is registered as an internal authenticated Supabase table API.
- 2026-06-23: `doorstep.zip_income_demographics` is registered as an internal authenticated Supabase table API for shared ACS reference data.

## Iteration History
- 2026-06-08: Initial spec created.
- 2026-06-18: Added migration-backed API registry foundation.
