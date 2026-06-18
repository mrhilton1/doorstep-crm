create table if not exists doorstep.platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references doorstep.profiles(id),
  action text not null,
  target_user_id uuid references doorstep.profiles(id),
  target_workspace_id uuid references doorstep.workspaces(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_events_created_at_idx
  on doorstep.platform_audit_events (created_at desc);

create index if not exists platform_audit_events_actor_idx
  on doorstep.platform_audit_events (actor_user_id, created_at desc);

create index if not exists platform_audit_events_target_workspace_idx
  on doorstep.platform_audit_events (target_workspace_id, created_at desc)
  where target_workspace_id is not null;

create table if not exists doorstep.api_registry (
  id uuid primary key default gen_random_uuid(),
  api_key text not null,
  api_type text not null check (api_type in ('pages_function', 'supabase_rpc', 'supabase_table', 'edge_function', 'webhook')),
  display_name text not null,
  exposure text not null default 'internal' check (exposure in ('internal', 'public')),
  auth_required boolean not null default true,
  entitlement_key text references doorstep.entitlements(key),
  permission_key text references doorstep.permissions(key),
  owner_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (api_key, api_type)
);

drop trigger if exists api_registry_set_updated_at on doorstep.api_registry;
create trigger api_registry_set_updated_at
before update on doorstep.api_registry
for each row execute function doorstep.set_updated_at();

alter table doorstep.platform_audit_events enable row level security;
alter table doorstep.api_registry enable row level security;

drop policy if exists "platform owners can read audit events" on doorstep.platform_audit_events;
create policy "platform owners can read audit events"
on doorstep.platform_audit_events for select
to authenticated
using (doorstep.is_platform_owner());

drop policy if exists "platform owners can read api registry" on doorstep.api_registry;
create policy "platform owners can read api registry"
on doorstep.api_registry for select
to authenticated
using (doorstep.is_platform_owner());

drop policy if exists "platform owners can manage api registry" on doorstep.api_registry;
create policy "platform owners can manage api registry"
on doorstep.api_registry for all
to authenticated
using (doorstep.is_platform_owner())
with check (doorstep.is_platform_owner());

create or replace function doorstep.record_platform_audit_event(
  p_action text,
  p_target_user_id uuid default null,
  p_target_workspace_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = doorstep, public
as $$
declare
  v_event_id uuid;
  v_is_platform_action boolean := p_action like 'platform.%';
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if v_is_platform_action and not doorstep.is_platform_owner() then
    raise exception 'Platform owner permission required';
  end if;

  insert into doorstep.platform_audit_events (
    actor_user_id,
    action,
    target_user_id,
    target_workspace_id,
    metadata
  )
  values (
    auth.uid(),
    p_action,
    p_target_user_id,
    p_target_workspace_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function doorstep.platform_dashboard_overview()
returns jsonb
language plpgsql
security definer
set search_path = doorstep, public
as $$
declare
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not doorstep.is_platform_owner() then
    raise exception 'Platform owner permission required';
  end if;

  insert into doorstep.platform_audit_events (actor_user_id, action, metadata)
  values (auth.uid(), 'platform.dashboard.view', jsonb_build_object('source', 'platform_dashboard_overview'));

  select jsonb_build_object(
    'generatedAt', now(),
    'totals', jsonb_build_object(
      'workspaces', (select count(*) from doorstep.workspaces),
      'activeWorkspaces', (select count(*) from doorstep.workspaces where deleted_at is null),
      'deletedWorkspaces', (select count(*) from doorstep.workspaces where deleted_at is not null),
      'profiles', (select count(*) from doorstep.profiles),
      'platformOwners', (select count(*) from doorstep.profiles where is_platform_owner),
      'activeMembers', (select count(*) from doorstep.workspace_members where status = 'active'),
      'addresses', (select count(*) from doorstep.addresses where deleted_at is null),
      'deletedAddresses', (select count(*) from doorstep.addresses where deleted_at is not null),
      'contacts', (select count(*) from doorstep.contacts where deleted_at is null),
      'activities', (select count(*) from doorstep.activities),
      'auditEvents', (select count(*) from doorstep.platform_audit_events)
    ),
    'workspaces', coalesce((
      select jsonb_agg(row_payload order by row_created_at desc)
      from (
        select
          w.created_at as row_created_at,
          jsonb_build_object(
            'id', w.id,
            'name', w.name,
            'slug', w.slug,
            'createdAt', w.created_at,
            'deletedAt', w.deleted_at,
            'memberCount', count(distinct wm.id),
            'activeMemberCount', count(distinct wm.id) filter (where wm.status = 'active'),
            'addressCount', count(distinct a.id) filter (where a.deleted_at is null),
            'contactCount', count(distinct c.id) filter (where c.deleted_at is null),
            'activityCount', count(distinct act.id),
            'lastActivityAt', max(act.created_at)
          ) as row_payload
        from doorstep.workspaces w
        left join doorstep.workspace_members wm on wm.workspace_id = w.id
        left join doorstep.addresses a on a.workspace_id = w.id
        left join doorstep.contacts c on c.workspace_id = w.id
        left join doorstep.activities act on act.workspace_id = w.id
        group by w.id
        order by w.created_at desc
        limit 50
      ) rows
    ), '[]'::jsonb),
    'recentUsers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'email', p.email,
          'fullName', p.full_name,
          'username', p.username,
          'isPlatformOwner', p.is_platform_owner,
          'createdAt', p.created_at,
          'workspaceCount', (
            select count(*)
            from doorstep.workspace_members wm
            where wm.user_id = p.id
              and wm.status = 'active'
          )
        )
        order by p.created_at desc
      )
      from (
        select *
        from doorstep.profiles
        order by created_at desc
        limit 50
      ) p
    ), '[]'::jsonb),
    'recentAuditEvents', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pae.id,
          'action', pae.action,
          'actorUserId', pae.actor_user_id,
          'targetUserId', pae.target_user_id,
          'targetWorkspaceId', pae.target_workspace_id,
          'metadata', pae.metadata,
          'createdAt', pae.created_at
        )
        order by pae.created_at desc
      )
      from (
        select *
        from doorstep.platform_audit_events
        order by created_at desc
        limit 50
      ) pae
    ), '[]'::jsonb)
  )
  into v_payload;

  return v_payload;
end;
$$;

revoke all on function doorstep.record_platform_audit_event(text, uuid, uuid, jsonb) from public, anon;
grant execute on function doorstep.record_platform_audit_event(text, uuid, uuid, jsonb) to authenticated;

revoke all on function doorstep.platform_dashboard_overview() from public, anon;
grant execute on function doorstep.platform_dashboard_overview() to authenticated;

grant select on doorstep.platform_audit_events to authenticated;
grant select, insert, update, delete on doorstep.api_registry to authenticated;

insert into doorstep.permissions (key, description) values
  ('platform.dashboard.read', 'Read platform-owner workspace, user, and usage dashboard'),
  ('platform.audit.read', 'Read platform audit events'),
  ('platform.impersonation.manage', 'Start and manage audited user impersonation sessions')
on conflict (key) do nothing;

insert into doorstep.entitlements (key, description, enabled_by_default) values
  ('platform.owner_dashboard', 'Platform-owner dashboard and usage reporting', true),
  ('platform.audit_log', 'Platform audit event logging and review', true),
  ('platform.impersonation', 'Audited platform-owner impersonation foundation', false)
on conflict (key) do nothing;

insert into doorstep.api_registry (
  api_key,
  api_type,
  display_name,
  exposure,
  auth_required,
  entitlement_key,
  permission_key,
  owner_notes
) values
  (
    '/config',
    'pages_function',
    'Runtime Config',
    'public',
    false,
    null,
    null,
    'Public non-secret runtime config. Must never include service-role or private secrets.'
  ),
  (
    'doorstep.record_platform_audit_event',
    'supabase_rpc',
    'Record Platform Audit Event',
    'internal',
    true,
    'platform.audit_log',
    null,
    'Authenticated users may record non-platform session events; platform.* actions require platform-owner status.'
  ),
  (
    'doorstep.platform_dashboard_overview',
    'supabase_rpc',
    'Platform Dashboard Overview',
    'internal',
    true,
    'platform.owner_dashboard',
    'platform.dashboard.read',
    'Security definer RPC with explicit platform-owner check. Returns aggregated workspace/user/usage data.'
  ),
  (
    'doorstep.soft_delete_address',
    'supabase_rpc',
    'Soft Delete Address',
    'internal',
    true,
    'crm.addresses',
    'addresses.write',
    'Visibility-changing mutation uses a scoped definer RPC with workspace permission checks.'
  )
on conflict (api_key, api_type) do update set
  display_name = excluded.display_name,
  exposure = excluded.exposure,
  auth_required = excluded.auth_required,
  entitlement_key = excluded.entitlement_key,
  permission_key = excluded.permission_key,
  owner_notes = excluded.owner_notes,
  updated_at = now();
