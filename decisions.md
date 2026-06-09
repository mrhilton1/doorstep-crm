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
