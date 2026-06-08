# Supabase Setup

DoorStep CRM uses a dedicated Postgres schema named `doorstep`.

## Apply The Foundation Migration

Run this SQL in the Supabase SQL editor:

```txt
supabase/migrations/001_doorstep_foundation.sql
```

Or apply it through the Supabase CLI after linking the project.

## Expose The Schema

Supabase only exposes selected schemas through the Data API. After applying the migration, go to:

```txt
Project Settings -> API -> Exposed schemas
```

Add:

```txt
doorstep
```

## Frontend Query Pattern

Use the schema-scoped client exported from `src/lib/supabase.ts`:

```ts
import { doorstepDb } from '@/src/lib/supabase';

const { data, error } = await doorstepDb.from('addresses').select('*');
```

Create new workspaces through the `doorstep.create_workspace` RPC. It creates the workspace, default roles, role permissions, entitlements, and the first owner membership together so RLS does not leave the workspace half-created.

```ts
const { data: workspaceId, error } = await doorstepDb.rpc('create_workspace', {
  workspace_name: 'Clearview',
  workspace_slug: 'clearview',
});
```

## Environment Variables

Cloudflare Pages and local development need:

```bash
VITE_SUPABASE_URL=https://vupriscnyrqmibmfowdx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_SCHEMA=doorstep
VITE_APP_URL=https://app.clearview.win
```

Never expose the Supabase service role key to the frontend.
