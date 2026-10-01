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

## Cloud browser pilot
Isolated Worker `doorstep-browser-pilot` deployed with `wrangler deploy --config workers/browser-pilot/wrangler.jsonc`. Browser binding uses content Quick Action, 1365x900 viewport, networkidle2, 20s navigation timeout. Only authenticated active DoorStep members can call; 2 requests/min per user and 6/min pilot-wide per Cloudflare rate limiter (approximate local enforcement, not global billing cap). One attempt, no retries or challenge bypass. Pilot returns candidate text for review and does not write CRM records. Supabase URL/anon key in worker vars are public browser-equivalent configuration, not privileged credentials.
