# DoorStep CRM — Agent Operating File
Last updated: 2026-06-08

## What This Is
DoorStep CRM is a multi-user, object-oriented CRM for field sales and service teams. For MVP, the primary operating object is the address; contacts, quotes, invoices, routes, appointments, labels, and activities relate back to address records. The product should become more reliable, more scalable, and easier to deploy with every iteration.

## Stack
- React 19, TypeScript, Vite 6, Tailwind CSS v4
- Supabase/Postgres/Auth with custom schema `doorstep`
- Cloudflare Pages at `https://app.clearview.win`
- Leaflet/OpenStreetMap for MVP map experience
- `@supabase/supabase-js`, lucide-react, motion, uuid

## Coding Standards
- Read this file, `SCRATCHPAD.md`, and the relevant `/specs/*.spec.md` before coding.
- Keep changes small, independently testable, and tied to acceptance criteria.
- Prefer domain language: address record, contact, label, workspace, role, entitlement.
- Preserve existing behavior unless the active spec explicitly changes it.
- Use Supabase RLS and workspace scoping for multi-user data.
- Never expose Supabase service-role keys or private secrets in frontend code.
- Add migrations for database changes; do not hand-edit production schema without recording it.
- Prefer Leaflet/OpenStreetMap paths unless a spec intentionally reintroduces Google Maps.
- Run `npm run build` and `npm run lint` before pushing deployable changes.
- Update specs and decisions after shipping when reality changed.

## Forbidden Patterns
- Do not model the product as lead-first; addresses are the MVP primary object.
- Do not use `localStorage` or `sessionStorage` for CRM data, auth tokens, workspace state, settings, routes, catalog, or user-owned records; persist through Supabase-backed APIs/tables instead.
- Do not put secret values in `.env.example`, docs, commits, or browser code.
- Do not make destructive database changes without a migration and explicit approval.
- Do not rename schema/table/column contracts without a migration plan.
- Do not reintroduce Google Maps as the default map provider without approval.

## Before You Write Any Code
1. Read this file completely.
2. Open `SCRATCHPAD.md`; write objective, assumptions, and micro-steps before touching code.
3. Locate or create the relevant feature spec in `/specs/`.
4. Confirm current behavior matches the spec's Current Behavior.
5. Clarify open questions that materially affect implementation.
6. Implement against the spec's Acceptance Criteria.
7. Run local verification and record what passed or failed.
8. Update the spec and append decisions to `decisions.md` when needed.

If you realize you skipped steps 1-3, stop before continuing, update `SCRATCHPAD.md` with the miss and current objective, then update or create the relevant spec before making more code changes.

## Agent Behavior Expectations
- Treat specs as source of truth for intent and code as source of truth for current reality.
- Prefer understanding before coding, but execute once the path is clear.
- Keep the user looped in with concise progress updates.
- Explain tradeoffs before major structural or data-model changes.
- Record assumptions in `SCRATCHPAD.md` in real time.
- If instructions conflict, the newest user request wins unless it risks data/security.

## What You Are Never Allowed To Do Without Asking
See `DO_NOT_TOUCH.md`.
