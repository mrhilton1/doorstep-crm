-- Platform owners can temporarily view a workspace only after an explicit,
-- audited access request. This preserves normal workspace isolation while
-- allowing support/control-plane investigation.

create table if not exists doorstep.platform_workspace_access_sessions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references doorstep.profiles(id) on delete cascade,
  target_workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  reason text,
  source text not null default 'workspace_switcher',
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now()
);

create index if not exists platform_workspace_access_sessions_actor_idx
  on doorstep.platform_workspace_access_sessions (actor_user_id, expires_at desc);

create index if not exists platform_workspace_access_sessions_target_idx
  on doorstep.platform_workspace_access_sessions (target_workspace_id, created_at desc);

alter table doorstep.platform_workspace_access_sessions enable row level security;

drop policy if exists "platform owners can read workspace access sessions" on doorstep.platform_workspace_access_sessions;
create policy "platform owners can read workspace access sessions"
on doorstep.platform_workspace_access_sessions for select
to authenticated
using (doorstep.is_platform_owner());

create or replace function doorstep.has_platform_workspace_access(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = doorstep, public
as $$
  select exists (
    select 1
    from doorstep.platform_workspace_access_sessions sessions
    where sessions.actor_user_id = auth.uid()
      and sessions.target_workspace_id = target_workspace_id
      and sessions.expires_at > now()
  );
$$;

create or replace function doorstep.start_platform_workspace_access(
  p_target_workspace_id uuid,
  p_reason text default null,
  p_source text default 'workspace_switcher'
)
returns uuid
language plpgsql
security definer
set search_path = doorstep, public
as $$
declare
  v_session_id uuid;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_source text := coalesce(nullif(trim(coalesce(p_source, '')), ''), 'workspace_switcher');
  v_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not doorstep.is_platform_owner() then
    raise exception 'Platform owner permission required';
  end if;

  if not exists (
    select 1
    from doorstep.workspaces
    where id = p_target_workspace_id
      and deleted_at is null
  ) then
    raise exception 'Workspace not found';
  end if;

  insert into doorstep.platform_workspace_access_sessions (
    actor_user_id,
    target_workspace_id,
    reason,
    source
  )
  values (
    auth.uid(),
    p_target_workspace_id,
    v_reason,
    v_source
  )
  returning id, expires_at into v_session_id, v_expires_at;

  insert into doorstep.platform_audit_events (
    actor_user_id,
    action,
    target_workspace_id,
    metadata
  )
  values (
    auth.uid(),
    'platform.workspace_access.start',
    p_target_workspace_id,
    jsonb_build_object(
      'reason', v_reason,
      'source', v_source,
      'sessionId', v_session_id,
      'expiresAt', v_expires_at
    )
  );

  return v_session_id;
end;
$$;

create or replace function doorstep.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = doorstep, public
as $$
  select exists (
    select 1
    from doorstep.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  ) or doorstep.has_platform_workspace_access(target_workspace_id);
$$;

revoke all on function doorstep.has_platform_workspace_access(uuid) from public, anon;
grant execute on function doorstep.has_platform_workspace_access(uuid) to authenticated;

revoke all on function doorstep.start_platform_workspace_access(uuid, text, text) from public, anon;
grant execute on function doorstep.start_platform_workspace_access(uuid, text, text) to authenticated;

insert into doorstep.api_registry (
  api_key,
  api_type,
  display_name,
  exposure,
  auth_required,
  owner_notes
)
values
  (
    'doorstep.start_platform_workspace_access',
    'supabase_rpc',
    'Start Platform Workspace Access',
    'internal',
    true,
    'Creates an audited, temporary platform-owner workspace access session.'
  ),
  (
    'doorstep.has_platform_workspace_access',
    'supabase_rpc',
    'Check Platform Workspace Access',
    'internal',
    true,
    'Internal RLS helper for temporary platform-owner workspace access.'
  )
on conflict (api_key, api_type) do update
set
  display_name = excluded.display_name,
  exposure = excluded.exposure,
  auth_required = excluded.auth_required,
  owner_notes = excluded.owner_notes,
  updated_at = now();
