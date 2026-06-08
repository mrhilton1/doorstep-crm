-- DoorStep CRM MVP foundation.
--
-- Run this in the Supabase SQL editor or through the Supabase CLI.
-- After applying it, expose the `doorstep` schema in:
-- Project Settings -> API -> Exposed schemas.

create schema if not exists doorstep;
create extension if not exists pgcrypto with schema extensions;

create type doorstep.workspace_member_status as enum ('invited', 'active', 'disabled');
create type doorstep.address_type as enum ('residential', 'commercial');
create type doorstep.address_stage as enum ('prospect', 'lead', 'opportunity', 'customer');
create type doorstep.address_status as enum ('not_visited', 'knocked', 'no_answer', 'interested', 'follow_up_needed');
create type doorstep.record_object_type as enum ('address', 'contact', 'quote', 'invoice', 'appointment');
create type doorstep.activity_type as enum (
  'note',
  'knock',
  'call',
  'text',
  'meeting',
  'status_change',
  'stage_change',
  'label_change',
  'contact_change',
  'quote_event',
  'appointment_event',
  'invoice_event',
  'payment_event',
  'system'
);

create table doorstep.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  email text,
  avatar_url text,
  is_platform_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table doorstep.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references doorstep.profiles(id)
);

create table doorstep.roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  system_key text not null,
  display_name text not null,
  description text,
  is_system_role boolean not null default false,
  cloned_from_role_id uuid references doorstep.roles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, system_key)
);

create table doorstep.permissions (
  key text primary key,
  description text not null
);

create table doorstep.role_permissions (
  role_id uuid not null references doorstep.roles(id) on delete cascade,
  permission_key text not null references doorstep.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table doorstep.entitlements (
  key text primary key,
  description text not null,
  enabled_by_default boolean not null default true
);

create table doorstep.workspace_entitlements (
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  entitlement_key text not null references doorstep.entitlements(key) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, entitlement_key)
);

create table doorstep.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  user_id uuid not null references doorstep.profiles(id) on delete cascade,
  role_id uuid references doorstep.roles(id),
  status doorstep.workspace_member_status not null default 'active',
  invited_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table doorstep.addresses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  display_address text not null,
  normalized_address text not null,
  lat double precision,
  lng double precision,
  type doorstep.address_type not null default 'residential',
  stage doorstep.address_stage not null default 'prospect',
  status doorstep.address_status not null default 'not_visited',
  business_name text,
  notes text not null default '',
  owner_user_id uuid references doorstep.profiles(id),
  assigned_user_id uuid references doorstep.profiles(id),
  source text,
  legacy_local_id text,
  custom_data jsonb not null default '{}'::jsonb,
  created_by uuid references doorstep.profiles(id),
  updated_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references doorstep.profiles(id),
  unique (workspace_id, normalized_address)
);

create index addresses_workspace_active_idx
  on doorstep.addresses (workspace_id, updated_at desc)
  where deleted_at is null;

create table doorstep.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  first_name text,
  last_name text,
  role_title text,
  email text,
  phone text,
  is_decision_maker boolean not null default false,
  preferred_channel text,
  do_not_contact boolean not null default false,
  custom_data jsonb not null default '{}'::jsonb,
  legacy_local_id text,
  created_by uuid references doorstep.profiles(id),
  updated_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references doorstep.profiles(id)
);

create index contacts_workspace_active_idx
  on doorstep.contacts (workspace_id, updated_at desc)
  where deleted_at is null;

create table doorstep.address_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  address_id uuid not null references doorstep.addresses(id) on delete cascade,
  contact_id uuid not null references doorstep.contacts(id) on delete cascade,
  is_primary boolean not null default false,
  relationship_label text,
  created_at timestamptz not null default now(),
  unique (address_id, contact_id)
);

create unique index address_contacts_one_primary_idx
  on doorstep.address_contacts (address_id)
  where is_primary;

create table doorstep.labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  object_type doorstep.record_object_type not null,
  name text not null,
  color text not null default '#64748b',
  description text,
  created_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references doorstep.profiles(id),
  unique (workspace_id, object_type, name)
);

create table doorstep.record_labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  label_id uuid not null references doorstep.labels(id) on delete cascade,
  record_type doorstep.record_object_type not null,
  record_id uuid not null,
  created_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  unique (label_id, record_type, record_id)
);

create table doorstep.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  address_id uuid references doorstep.addresses(id) on delete cascade,
  contact_id uuid references doorstep.contacts(id) on delete set null,
  actor_user_id uuid references doorstep.profiles(id),
  type doorstep.activity_type not null,
  title text,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activities_address_idx
  on doorstep.activities (address_id, created_at desc);

create or replace function doorstep.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on doorstep.profiles
for each row execute function doorstep.set_updated_at();

create trigger workspaces_set_updated_at
before update on doorstep.workspaces
for each row execute function doorstep.set_updated_at();

create trigger roles_set_updated_at
before update on doorstep.roles
for each row execute function doorstep.set_updated_at();

create trigger workspace_members_set_updated_at
before update on doorstep.workspace_members
for each row execute function doorstep.set_updated_at();

create trigger addresses_set_updated_at
before update on doorstep.addresses
for each row execute function doorstep.set_updated_at();

create trigger contacts_set_updated_at
before update on doorstep.contacts
for each row execute function doorstep.set_updated_at();

create trigger labels_set_updated_at
before update on doorstep.labels
for each row execute function doorstep.set_updated_at();

create or replace function doorstep.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = doorstep, public
as $$
begin
  insert into doorstep.profiles (id, email, username, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function doorstep.handle_new_user();

create or replace function doorstep.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = doorstep, public
as $$
  select exists (
    select 1
    from doorstep.profiles p
    where p.id = auth.uid()
      and p.is_platform_owner = true
  );
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
  ) or doorstep.is_platform_owner();
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
  ) or doorstep.is_platform_owner();
$$;

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

alter table doorstep.profiles enable row level security;
alter table doorstep.workspaces enable row level security;
alter table doorstep.roles enable row level security;
alter table doorstep.permissions enable row level security;
alter table doorstep.role_permissions enable row level security;
alter table doorstep.entitlements enable row level security;
alter table doorstep.workspace_entitlements enable row level security;
alter table doorstep.workspace_members enable row level security;
alter table doorstep.addresses enable row level security;
alter table doorstep.contacts enable row level security;
alter table doorstep.address_contacts enable row level security;
alter table doorstep.labels enable row level security;
alter table doorstep.record_labels enable row level security;
alter table doorstep.activities enable row level security;

create policy "profiles can read themselves and platform owners read all"
on doorstep.profiles for select
using (id = auth.uid() or doorstep.is_platform_owner());

create policy "profiles can update themselves"
on doorstep.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "workspace members can read workspaces"
on doorstep.workspaces for select
using (doorstep.is_workspace_member(id) and deleted_at is null);

create policy "authenticated users can create workspaces"
on doorstep.workspaces for insert
to authenticated
with check (created_by = auth.uid());

create policy "workspace admins can update workspaces"
on doorstep.workspaces for update
using (doorstep.has_workspace_permission(id, 'workspace.manage'))
with check (doorstep.has_workspace_permission(id, 'workspace.manage'));

create policy "workspace members can read roles"
on doorstep.roles for select
using (doorstep.is_workspace_member(workspace_id));

create policy "workspace admins can manage roles"
on doorstep.roles for all
using (doorstep.has_workspace_permission(workspace_id, 'roles.manage'))
with check (doorstep.has_workspace_permission(workspace_id, 'roles.manage'));

create policy "workspace members can read memberships"
on doorstep.workspace_members for select
using (doorstep.is_workspace_member(workspace_id));

create policy "workspace admins can manage memberships"
on doorstep.workspace_members for all
using (doorstep.has_workspace_permission(workspace_id, 'members.manage'))
with check (doorstep.has_workspace_permission(workspace_id, 'members.manage'));

create policy "authenticated users can read permissions"
on doorstep.permissions for select
to authenticated
using (true);

create policy "authenticated users can read role permissions"
on doorstep.role_permissions for select
to authenticated
using (true);

create policy "authenticated users can read entitlements"
on doorstep.entitlements for select
to authenticated
using (true);

create policy "workspace members can read workspace entitlements"
on doorstep.workspace_entitlements for select
using (doorstep.is_workspace_member(workspace_id));

create policy "platform owners can manage entitlements"
on doorstep.workspace_entitlements for all
using (doorstep.is_platform_owner())
with check (doorstep.is_platform_owner());

create policy "workspace members can read active addresses"
on doorstep.addresses for select
using (doorstep.is_workspace_member(workspace_id) and (deleted_at is null or doorstep.is_platform_owner()));

create policy "sales users can create addresses"
on doorstep.addresses for insert
with check (doorstep.has_workspace_permission(workspace_id, 'addresses.write') and created_by = auth.uid());

create policy "sales users can update addresses"
on doorstep.addresses for update
using (doorstep.has_workspace_permission(workspace_id, 'addresses.write'))
with check (doorstep.has_workspace_permission(workspace_id, 'addresses.write'));

create policy "workspace members can read active contacts"
on doorstep.contacts for select
using (doorstep.is_workspace_member(workspace_id) and (deleted_at is null or doorstep.is_platform_owner()));

create policy "sales users can create contacts"
on doorstep.contacts for insert
with check (doorstep.has_workspace_permission(workspace_id, 'contacts.write') and created_by = auth.uid());

create policy "sales users can update contacts"
on doorstep.contacts for update
using (doorstep.has_workspace_permission(workspace_id, 'contacts.write'))
with check (doorstep.has_workspace_permission(workspace_id, 'contacts.write'));

create policy "workspace members can read address contacts"
on doorstep.address_contacts for select
using (doorstep.is_workspace_member(workspace_id));

create policy "sales users can manage address contacts"
on doorstep.address_contacts for all
using (doorstep.has_workspace_permission(workspace_id, 'contacts.write'))
with check (doorstep.has_workspace_permission(workspace_id, 'contacts.write'));

create policy "workspace members can read active labels"
on doorstep.labels for select
using (doorstep.is_workspace_member(workspace_id) and (deleted_at is null or doorstep.is_platform_owner()));

create policy "workspace admins can manage labels"
on doorstep.labels for all
using (doorstep.has_workspace_permission(workspace_id, 'labels.manage'))
with check (doorstep.has_workspace_permission(workspace_id, 'labels.manage'));

create policy "workspace members can read record labels"
on doorstep.record_labels for select
using (doorstep.is_workspace_member(workspace_id));

create policy "sales users can manage record labels"
on doorstep.record_labels for all
using (doorstep.has_workspace_permission(workspace_id, 'labels.assign'))
with check (doorstep.has_workspace_permission(workspace_id, 'labels.assign'));

create policy "workspace members can read activities"
on doorstep.activities for select
using (doorstep.is_workspace_member(workspace_id));

create policy "workspace members can create activities"
on doorstep.activities for insert
with check (doorstep.is_workspace_member(workspace_id) and actor_user_id = auth.uid());

grant usage on schema doorstep to anon, authenticated;
grant select on all tables in schema doorstep to authenticated;
grant insert, update, delete on all tables in schema doorstep to authenticated;
grant usage on all sequences in schema doorstep to authenticated;
grant execute on function doorstep.create_workspace(text, text) to authenticated;
alter default privileges in schema doorstep grant select on tables to authenticated;
alter default privileges in schema doorstep grant insert, update, delete on tables to authenticated;
alter default privileges in schema doorstep grant usage on sequences to authenticated;

insert into doorstep.permissions (key, description) values
  ('workspace.manage', 'Manage workspace settings'),
  ('members.manage', 'Invite, disable, and update workspace members'),
  ('roles.manage', 'Manage roles and role permissions'),
  ('addresses.write', 'Create and update address records'),
  ('contacts.write', 'Create and update contact records'),
  ('labels.manage', 'Create and update workspace labels'),
  ('labels.assign', 'Assign labels to records'),
  ('quotes.write', 'Create and update quotes'),
  ('appointments.write', 'Create and update appointments'),
  ('routes.write', 'Create and update routes'),
  ('dashboard.read', 'Read dashboard metrics')
on conflict (key) do nothing;

insert into doorstep.entitlements (key, description, enabled_by_default) values
  ('crm.addresses', 'Address record CRM', true),
  ('crm.contacts', 'Contact records and address relationships', true),
  ('crm.labels', 'Workspace labels for records', true),
  ('crm.activity_feed', 'Activity feed and audit events', true),
  ('crm.quotes', 'Quote builder and hosted quote pages', true),
  ('crm.appointments', 'Appointment scheduling', true),
  ('crm.routes', 'Sales and technician routes', true),
  ('platform.api_registry', 'API registry scaffold', true),
  ('platform.entitlements', 'Entitlements checks', true)
on conflict (key) do nothing;
