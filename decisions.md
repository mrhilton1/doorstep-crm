# Architectural Decision Log

Append-only. Never edit past entries except to fix typos that obscure meaning.

## 2026-06-08 17:22 MST — Adopt Spec-Driven AI Engineering Workflow
**Context:** DoorStep CRM is moving quickly with AI-assisted changes across Supabase, Cloudflare, and a large React app. The user wants each deploy to become more efficient and the product quality to improve instead of accumulating confusion.
**Decision:** Add `CLAUDE.md`, `AGENTS.md`, `ENVIRONMENT.md`, `DO_NOT_TOUCH.md`, `SCRATCHPAD.md`, and `/specs/*.spec.md` files as durable project memory.
**Rationale:** The repo should carry decisions, constraints, and acceptance criteria so Claude, Codex, and future agents can start with shared context rather than rediscovering it each session.
**Alternatives considered:** Keep context only in chat history; too brittle. Create a large architecture handbook; too heavy for the current pace.
**Consequences:** Agents must update docs/specs as part of delivery. This adds small maintenance overhead but should reduce rework and drift.

## 2026-06-08 17:22 MST — Use Addresses As MVP Primary CRM Object
**Context:** The product goal is an object-oriented CRM where different object types may become primary in future, but this build focuses on doorstep/address workflows.
**Decision:** Treat `address` as the primary MVP object. Contacts, labels, quotes, invoices, appointments, routes, and activities relate to addresses.
**Rationale:** Addresses are the stable field-sales unit and support both residential and commercial workflows. This also preserves the future option to support other primary objects.
**Alternatives considered:** Lead-first CRM model; rejected because it makes contacts/deals the center and weakens route/address workflows.
**Consequences:** Specs, schema, UI language, and APIs should gradually move away from "property/lead" terminology toward address/object terminology.

## 2026-06-08 17:22 MST — Prefer Supabase Custom Schema `doorstep`
**Context:** DoorStep needs to coexist with possible existing Supabase `public` tables and future platform-level data.
**Decision:** Store DoorStep CRM tables in the custom Postgres schema `doorstep`.
**Rationale:** A dedicated schema keeps DoorStep tables grouped without noisy table prefixes and aligns with Supabase exposed-schema configuration.
**Alternatives considered:** `doorstep_` table prefixes in `public`; rejected as less clean and easier to mix with unrelated tables.
**Consequences:** The Supabase Data API must expose `doorstep`; frontend queries should use `supabase.schema('doorstep')`.

## 2026-06-08 17:22 MST — Runtime Config For Cloudflare Pages
**Context:** Manual Wrangler deploys build Vite locally, so Cloudflare Pages env vars are not injected at build time.
**Decision:** Serve public frontend config through `/config` via Cloudflare Pages Functions and read `window.__DOORSTEP_CONFIG__`.
**Rationale:** Runtime config lets manual deploys use Cloudflare env vars reliably without committing public keys into generated bundles.
**Alternatives considered:** Build locally with env vars; rejected because it is easy to forget and creates inconsistent deploys.
**Consequences:** `functions/config.ts`, `public/config`, and `src/lib/supabase.ts` are part of the deploy contract.

## 2026-06-08 17:22 MST — Keep Spec Strategy Out Of Cloudflare Artifacts
**Context:** The spec-driven workflow is proprietary product/operating strategy and should be visible in GitHub only, not served by Cloudflare Pages.
**Decision:** Deploy only `dist` and add `npm run verify:deploy-artifact` to fail if markdown/spec/strategy files or private markers appear in `dist`.
**Rationale:** Vite only emits imported app assets and files from `public`; a deploy-time guard prevents accidental future leakage.
**Alternatives considered:** Keep relying on convention only; rejected because a future agent could accidentally move docs into `public` or deploy the wrong directory.
**Consequences:** `npm run verify` should be used before deploys, and Cloudflare deploy commands must continue targeting `dist`.

## 2026-06-10 20:35 MST — Normalize Contacts Before Address Move/Merge
**Context:** The Contact Record Redesign and Address Move Flow PRD introduces moving all contacts from one address to another, displacing destination contacts, re-associating invoices, and preserving quotes at the original address.
**Decision:** Implement contact move/merge only after or as part of normalizing contacts into `doorstep.contacts`; the move/merge itself must be a single Supabase RPC/database transaction with audit logging and idempotency protection.
**Rationale:** Moving nested contact JSON through frontend state would risk silent data loss, partial invoice reassociation, and unrecoverable displaced contacts. The operation touches customer data and financial history, so it needs database-level atomicity.
**Alternatives considered:** Implement move/merge as frontend updates against `doorstep.addresses.custom_data`; rejected as too fragile. Move one contact at a time; rejected because the product decision is to move all contacts at the address.
**Consequences:** A new migration/RPC is required before move/merge UI ships. Contacts Without Address is admin/owner-visible for MVP. Gate-side notes stay with the original address; invoices follow moved contacts; quotes stay with the original address.

## 2026-06-10 20:35 MST — Route Creation Creates Addresses, Not Contacts
**Context:** Route Creation is used before a rep has visited homes and before any contact information exists. The route tap workflow needs to create routeable CRM units without inventing people.
**Decision:** Rename user-facing Rapid Mode to Route Creation. Route Creation taps create or confirm address/prospect records and add them to the active route, but they do not create contact records. Contact records are created only when attempted contact is logged and actual contact data is captured.
**Rationale:** Addresses are the canvassing unit; premature contact records pollute the CRM and make route-created prospects look more qualified than they are.
**Alternatives considered:** Create placeholder contacts for every route tap; rejected because the rep has not contacted anyone yet.
**Consequences:** Route address markers need to support address-only records. Unvisited route addresses use square markers; once activity is logged, they use normal colored teardrop/pin markers based on the resulting stage/status.

## 2026-06-10 23:18 MST — Add Contact Uses Normalized Rows With Idempotency
**Context:** The Unified Address Record needs Add Contact to create real Supabase contacts and avoid duplicates from double-taps or repeated requests.
**Decision:** Create additional contacts in `doorstep.contacts`, link them with `doorstep.address_contacts`, and record idempotency through `doorstep.contact_idempotency_keys`. Add migration 008 for a preferred single-call `doorstep.create_address_contact_idempotent(...)` RPC while keeping a frontend table-backed fallback until the migration is applied.
**Rationale:** Idempotency belongs in the database because UI spinners cannot prevent concurrent duplicate requests. The fallback lets the deployed UI keep working if Supabase MCP auth is expired and migration 008 has not been applied yet.
**Alternatives considered:** Keep only the frontend spinner; rejected because it does not satisfy the accepted duplicate-submit guardrail. Block deployment until MCP auth refresh; rejected because the fallback still uses Supabase tables and preserves the user testing path.
**Consequences:** Migration 008 should be applied when Supabase MCP/auth is available. Future contact edit/delete flows should continue writing normalized contact rows rather than only `addresses.custom_data`.
