-- Fix platform overview member role label. The roles table stores role labels
-- in `display_name`, not `name`.

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
            'businessName', nullif(trim(settings_state.value #>> '{businessInfo,name}'), ''),
            'slug', w.slug,
            'createdAt', w.created_at,
            'deletedAt', w.deleted_at,
            'memberCount', count(distinct wm.id),
            'activeMemberCount', count(distinct wm.id) filter (where wm.status = 'active'),
            'addressCount', count(distinct a.id) filter (where a.deleted_at is null),
            'contactCount', count(distinct c.id) filter (where c.deleted_at is null),
            'activityCount', count(distinct act.id),
            'lastActivityAt', max(act.created_at),
            'members', (
              select coalesce(jsonb_agg(
                jsonb_build_object(
                  'userId', member_wm.user_id,
                  'email', member_profile.email,
                  'fullName', member_profile.full_name,
                  'username', member_profile.username,
                  'roleName', member_role.display_name
                )
                order by member_profile.email nulls last, member_profile.full_name nulls last
              ), '[]'::jsonb)
              from doorstep.workspace_members member_wm
              join doorstep.profiles member_profile on member_profile.id = member_wm.user_id
              left join doorstep.roles member_role on member_role.id = member_wm.role_id
              where member_wm.workspace_id = w.id
                and member_wm.status = 'active'
            )
          ) as row_payload
        from doorstep.workspaces w
        left join doorstep.workspace_app_state settings_state
          on settings_state.workspace_id = w.id
          and settings_state.key = 'settings'
        left join doorstep.workspace_members wm on wm.workspace_id = w.id
        left join doorstep.addresses a on a.workspace_id = w.id
        left join doorstep.contacts c on c.workspace_id = w.id
        left join doorstep.activities act on act.workspace_id = w.id
        group by w.id, settings_state.value
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

revoke all on function doorstep.platform_dashboard_overview() from public, anon;
grant execute on function doorstep.platform_dashboard_overview() to authenticated;
