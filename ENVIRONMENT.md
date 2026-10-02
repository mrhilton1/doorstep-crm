# Environment

## Runtime
- Language version: TypeScript 5.8, Node runtime via Vite/Cloudflare Pages
- Framework: React 19 with Vite 6
- Package manager: npm
- Database/Auth: Supabase Postgres/Auth, project `vupriscnyrqmibmfowdx`
- Deployment: Cloudflare Pages project `doorstep-crm`

## Key Dependencies
- `@supabase/supabase-js` `^2.108.0` — browser auth and schema-scoped data access
- `react` / `react-dom` `^19.0.0` — frontend runtime
- `vite` `^6.2.0` — local dev and production build
- `tailwindcss` / `@tailwindcss/vite` `^4.1.14` — styling
- `leaflet` `^1.9.4` and `react-leaflet` `^5.0.0` — MVP map provider
- `@vis.gl/react-google-maps` `^1.8.3` — legacy/optional Google Maps path, not default
- `lucide-react` `^0.546.0` — icons
- `motion` `^12.23.24` — UI animation
- `uuid` `^14.0.0` — client-generated IDs

## Environment Variables
List names only. Never commit values.

- `VITE_SUPABASE_URL` — public Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — public Supabase anon key
- `VITE_SUPABASE_SCHEMA` — expected to be `doorstep`
- `VITE_APP_URL` — deployed app URL
- `APP_URL` — legacy app URL value used by some generated app contexts
- `GEMINI_API_KEY` — future AI integration key, not currently part of core CRM flow
- `GOOGLE_MAPS_PLATFORM_KEY` — legacy Google Maps key; leave unset unless approved
- `VITE_GOOGLE_MAPS_PLATFORM_KEY` — legacy Google Maps key; leave unset unless approved

## Local vs. Deployed Differences
- Local Vite reads `.env.local` or falls back to local demo mode when Supabase env vars are absent.
- Cloudflare Pages serves `/config` from `functions/config.ts`, injecting public runtime config from Pages environment variables.
- The deployed frontend must never require a service-role key.
- Supabase Data API must expose the `doorstep` schema for the frontend client.

## Deploy Process
Build with `npm run build`, verify with `npm run lint`, push to GitHub, then deploy `dist` to Cloudflare Pages with Wrangler unless Git-linked deployment is later adopted.

Only deploy `dist`. Never deploy the repository root, because root-level docs and `/specs` contain proprietary product and AI operating strategy.

## Current URLs
- Production app: `https://app.clearview.win`
- Pages domain: `https://doorstep-crm.pages.dev`
- Supabase project URL: `https://vupriscnyrqmibmfowdx.supabase.co`

## Verification Commands
- `npm run build`
- `npm run lint`
- `npm run verify:deploy-artifact`
- `npm run verify`
- `curl -I https://app.clearview.win/`
- `curl -s https://app.clearview.win/config`

## County enrichment
`POST /api/property-assessor` is a Pages Function using the caller's Supabase JWT and existing property_info_records RLS. It accepts only a saved record ID; county, parcel and address come from that authorized row. Maricopa public-page property facts are cached under parsed_data.countyAssessor for 30 days. Google fields and raw text remain intact. Detailed building API access requires a county-issued token and is not implemented in this public-page adapter. No new environment secrets or schema changes.

## Cloud browser pilot (retained, not used by the current UI)
As of the copy/paste-primary change, GooglePropertyPanel no longer exposes or calls this pilot. The existing assessor endpoint remains active.
Isolated Worker `doorstep-browser-pilot`; deploy with local Wrangler and `workers/browser-pilot/wrangler.jsonc`. Uses @cloudflare/puppeteer1.4.0 and one SQLite Durable Object per authenticated active member. Google on-device remains first/manual and never launches a cloud session automatically.
Cloud lookup offers an authenticated screen-and-tap panel plus short-lived full Live View link for extra controls. Trusted input in all browser frames and forwarded user taps/scrolls extend a 60-second idle deadline; server alarms inspect every5s. Status polling never extends it. Sessions close on matching extraction, cancel, idle, or five-minute hard maximum. Successful candidates close the browser before the existing frontend Supabase save, with automatic-address-match metadata and unverified Google source. Failed saves preserve text for manual retry. If the user leaves before client save, no server-only CRM write occurs.
Session state and screen are deleted on close. Completed property results expire after10min. No cookies/session credentials from the user's browser are copied. URLs are credentials, held only in panel memory. Rate limit starts2/min per member,6/min overall (Cloudflare approximate per-location limiter). Worker browser time and Durable Object operations apply. No CAPTCHA solving or automated human simulation.
Validation: npm run verify includes separate frontend and Worker typechecks. `node scripts/browser-session.test.mjs` covers lifecycle with browser fixtures; `tsx scripts/browser-pilot.test.ts` covers extraction and access denial. Wrangler4.146.0 was required for local runtime support of compatibility date2026-10-01.

## County Additional Information browser enrichment
The existing browser Worker now serves authenticated `/county-details` separately from the unused Google pilot. Pages forwards the caller JWT and saved record ID; Worker revalidates auth/RLS and fixed county parcel, then loads the normal public page. Only allowlisted property facts are returned. Browser closes in finally;60s idle fallback. No owner/contact extraction. Pages caches complete version2 county results30days, partial results1hour. Deploy this Worker before Pages for changes to this route. Browser usage applies only to uncached/upgraded county lookups; no new bindings/secrets.
