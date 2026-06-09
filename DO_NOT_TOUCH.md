# Do Not Touch Without Explicit Approval

The following files, modules, or patterns must not be modified without explicitly confirming with the project owner first.

## Files
- `.env*` files with real values — may contain secrets or deployment-specific credentials.
- `supabase/migrations/*.sql` after they have been applied — append a new migration instead of rewriting history, unless this is a local-only correction before application.
- `dist/` — generated build output. Do not edit by hand.
- `node_modules/` — dependency output. Do not edit by hand.
- `.git/` — repository internals.

## Patterns
- Do not expose Supabase service-role keys or private API keys to browser code.
- Do not change the `doorstep` schema/table contracts without a recorded migration.
- Do not hard-delete CRM records for normal user deletes; use soft delete where the schema supports it.
- Do not bypass Supabase RLS for workspace-scoped data in the browser.
- Do not change Cloudflare Pages runtime config behavior without confirming the deploy path.
- Do not replace Leaflet/OpenStreetMap with Google Maps as the default map provider without approval.
- Do not rename address/contact/status/stage concepts without updating specs and migration/data mapping plans.
