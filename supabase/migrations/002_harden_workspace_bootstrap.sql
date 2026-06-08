create or replace function doorstep.create_workspace(workspace_name text, workspace_slug text default null)
returns uuid
language plpgsql
security definer
set search_path = doorstep, public
as $$
declare
  new_workspace_id uuid;
  owner_role_id uuid;
  admin_role_id uuid;
  sales_rep_role_id uuid;
  scheduler_role_id uuid;
  technician_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to create a workspace.';
  end if;

  insert into doorstep.profiles (id, email, username)
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    coalesce(auth.jwt() ->> 'email', auth.uid()::text)
  )
  on conflict (id) do nothing;

  insert into doorstep.workspaces (name, slug, created_by)
  values (workspace_name, workspace_slug, auth.uid())
  returning id into new_workspace_id;

  insert into doorstep.roles (workspace_id, system_key, display_name, description, is_system_role)
  values
    (new_workspace_id, 'owner', 'Owner', 'Full workspace control', true),
    (new_workspace_id, 'admin', 'Admin', 'Workspace administration', true),
    (new_workspace_id, 'sales_rep', 'Sales Rep', 'Field sales access', true),
    (new_workspace_id, 'scheduler', 'Scheduler', 'Scheduling and dispatch access', true),
    (new_workspace_id, 'technician', 'Technician', 'Appointment and route execution access', true);

  select id into owner_role_id from doorstep.roles where workspace_id = new_workspace_id and system_key = 'owner';
  select id into admin_role_id from doorstep.roles where workspace_id = new_workspace_id and system_key = 'admin';
  select id into sales_rep_role_id from doorstep.roles where workspace_id = new_workspace_id and system_key = 'sales_rep';
  select id into scheduler_role_id from doorstep.roles where workspace_id = new_workspace_id and system_key = 'scheduler';
  select id into technician_role_id from doorstep.roles where workspace_id = new_workspace_id and system_key = 'technician';

  insert into doorstep.role_permissions (role_id, permission_key)
  select owner_role_id, key from doorstep.permissions;

  insert into doorstep.role_permissions (role_id, permission_key) values
    (admin_role_id, 'workspace.manage'),
    (admin_role_id, 'members.manage'),
    (admin_role_id, 'roles.manage'),
    (admin_role_id, 'addresses.write'),
    (admin_role_id, 'contacts.write'),
    (admin_role_id, 'labels.manage'),
    (admin_role_id, 'labels.assign'),
    (admin_role_id, 'quotes.write'),
    (admin_role_id, 'appointments.write'),
    (admin_role_id, 'routes.write'),
    (admin_role_id, 'dashboard.read'),
    (sales_rep_role_id, 'addresses.write'),
    (sales_rep_role_id, 'contacts.write'),
    (sales_rep_role_id, 'labels.assign'),
    (sales_rep_role_id, 'quotes.write'),
    (sales_rep_role_id, 'appointments.write'),
    (sales_rep_role_id, 'routes.write'),
    (sales_rep_role_id, 'dashboard.read'),
    (scheduler_role_id, 'appointments.write'),
    (scheduler_role_id, 'routes.write'),
    (scheduler_role_id, 'dashboard.read'),
    (technician_role_id, 'addresses.write'),
    (technician_role_id, 'contacts.write'),
    (technician_role_id, 'dashboard.read');

  insert into doorstep.workspace_entitlements (workspace_id, entitlement_key, enabled)
  select new_workspace_id, key, enabled_by_default from doorstep.entitlements;

  insert into doorstep.workspace_members (workspace_id, user_id, role_id, status)
  values (new_workspace_id, auth.uid(), owner_role_id, 'active');

  return new_workspace_id;
end;
$$;

grant execute on function doorstep.create_workspace(text, text) to authenticated;
