# Supabase And Cloudflare Environment Setup

## Supabase Project

DoorStep CRM is currently pointed at this Supabase project:

```txt
https://vupriscnyrqmibmfowdx.supabase.co
```

## Local Development

Create a local-only `.env.local` file in the repository root:

```bash
VITE_SUPABASE_URL=https://vupriscnyrqmibmfowdx.supabase.co
VITE_SUPABASE_ANON_KEY=PASTE_PUBLIC_ANON_KEY_HERE
VITE_APP_URL=http://localhost:3000
```

Do not put the Supabase service role key in frontend environment variables.

## Cloudflare Pages

Set these in Cloudflare Pages for the `doorstep-crm` project:

```bash
VITE_SUPABASE_URL=https://vupriscnyrqmibmfowdx.supabase.co
VITE_SUPABASE_ANON_KEY=PASTE_PUBLIC_ANON_KEY_HERE
VITE_APP_URL=https://app.clearview.win
```

Add the variables to both Production and Preview unless a separate preview Supabase project is created later.

## Supabase Auth Redirect URLs

Add these URLs in Supabase Auth settings:

```txt
https://app.clearview.win
https://doorstep-crm.pages.dev
http://localhost:3000
```

## Map Provider Direction

Google Maps should be pulled out of the platform direction. For MVP, leave Google Maps environment variables unset and use the Leaflet/OpenStreetMap path.

Do not set these unless Google Maps is intentionally reintroduced:

```bash
GOOGLE_MAPS_PLATFORM_KEY
VITE_GOOGLE_MAPS_PLATFORM_KEY
```

