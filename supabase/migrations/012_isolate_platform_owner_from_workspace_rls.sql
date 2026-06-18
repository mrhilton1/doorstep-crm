-- Platform Owner is a control-plane role, not implicit membership in every workspace.
-- Cross-workspace platform reads must use explicit platform RPCs/routes.

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
  );
$$;

create or replace function doorstep.has_workspace_permission(target_workspace_id uuid, target_permission text)
returns boolean
language sql
stable
security definer
set search_path = doorstep, public
as $$
  select exists (
    select 1
    from doorstep.workspace_members wm
    join doorstep.role_permissions rp on rp.role_id = wm.role_id
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and rp.permission_key = target_permission
  );
$$;
