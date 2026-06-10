-- Contact move/merge, stage sub-status, and contact idempotency foundation.
--
-- This migration intentionally appends to the existing schema. Do not rewrite
-- earlier applied migrations.

do $$
begin
  create type doorstep.address_sub_status as enum ('not_interested', 'loss', 'scheduled');
exception when duplicate_object then null;
end $$;

alter table doorstep.addresses
  add column if not exists sub_status doorstep.address_sub_status,
  add column if not exists sub_status_set_by uuid references doorstep.profiles(id),
  add column if not exists sub_status_set_at timestamptz;

create table if not exists doorstep.stage_config (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  stage doorstep.address_stage not null,
  color text not null,
  description text not null default '',
  updated_by uuid references doorstep.profiles(id),
  updated_at timestamptz not null default now(),
  unique (workspace_id, stage),
  constraint stage_config_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists doorstep.sub_status_config (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  sub_status doorstep.address_sub_status not null,
  parent_stage doorstep.address_stage not null,
  label text not null,
  color text not null,
  description text not null default '',
  updated_by uuid references doorstep.profiles(id),
  updated_at timestamptz not null default now(),
  unique (workspace_id, sub_status, parent_stage),
  constraint sub_status_config_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists doorstep.contact_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  idempotency_key text not null,
  contact_id uuid references doorstep.contacts(id) on delete set null,
  address_id uuid references doorstep.addresses(id) on delete set null,
  created_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);

create table if not exists doorstep.displaced_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  original_address_id uuid references doorstep.addresses(id) on delete set null,
  destination_address_id uuid references doorstep.addresses(id) on delete set null,
  contact_id uuid references doorstep.contacts(id) on delete set null,
  contact_snapshot jsonb not null,
  displacement_reason text not null default 'address_move_merge',
  displaced_at timestamptz not null default now(),
  displaced_by uuid references doorstep.profiles(id),
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references doorstep.profiles(id)
);

create index if not exists displaced_contacts_workspace_unresolved_idx
  on doorstep.displaced_contacts (workspace_id, displaced_at desc)
  where resolved = false;

create table if not exists doorstep.contact_move_operations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  operation_key text not null,
  source_address_id uuid references doorstep.addresses(id) on delete set null,
  destination_address_id uuid references doorstep.addresses(id) on delete set null,
  status text not null default 'started',
  result jsonb not null default '{}'::jsonb,
  created_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (workspace_id, operation_key),
  constraint contact_move_operations_status_check check (status in ('started', 'completed', 'failed'))
);

alter table doorstep.stage_config enable row level security;
alter table doorstep.sub_status_config enable row level security;
alter table doorstep.contact_idempotency_keys enable row level security;
alter table doorstep.displaced_contacts enable row level security;
alter table doorstep.contact_move_operations enable row level security;

drop policy if exists "workspace members can read stage config" on doorstep.stage_config;
create policy "workspace members can read stage config"
on doorstep.stage_config for select
using (doorstep.is_workspace_member(workspace_id));

drop policy if exists "workspace managers can write stage config" on doorstep.stage_config;
create policy "workspace managers can write stage config"
on doorstep.stage_config for all
using (doorstep.has_workspace_permission(workspace_id, 'workspace.manage'))
with check (doorstep.has_workspace_permission(workspace_id, 'workspace.manage'));

drop policy if exists "workspace members can read sub status config" on doorstep.sub_status_config;
create policy "workspace members can read sub status config"
on doorstep.sub_status_config for select
using (doorstep.is_workspace_member(workspace_id));

drop policy if exists "workspace managers can write sub status config" on doorstep.sub_status_config;
create policy "workspace managers can write sub status config"
on doorstep.sub_status_config for all
using (doorstep.has_workspace_permission(workspace_id, 'workspace.manage'))
with check (doorstep.has_workspace_permission(workspace_id, 'workspace.manage'));

drop policy if exists "contact writers can manage idempotency keys" on doorstep.contact_idempotency_keys;
create policy "contact writers can manage idempotency keys"
on doorstep.contact_idempotency_keys for all
using (doorstep.has_workspace_permission(workspace_id, 'contacts.write'))
with check (doorstep.has_workspace_permission(workspace_id, 'contacts.write') and created_by = auth.uid());

drop policy if exists "admins can read displaced contacts" on doorstep.displaced_contacts;
create policy "admins can read displaced contacts"
on doorstep.displaced_contacts for select
using (
  doorstep.has_workspace_permission(workspace_id, 'workspace.manage')
  or doorstep.is_platform_owner()
);

drop policy if exists "admins can update displaced contacts" on doorstep.displaced_contacts;
create policy "admins can update displaced contacts"
on doorstep.displaced_contacts for update
using (
  doorstep.has_workspace_permission(workspace_id, 'workspace.manage')
  or doorstep.is_platform_owner()
)
with check (
  doorstep.has_workspace_permission(workspace_id, 'workspace.manage')
  or doorstep.is_platform_owner()
);

drop policy if exists "contact writers can read move operations" on doorstep.contact_move_operations;
create policy "contact writers can read move operations"
on doorstep.contact_move_operations for select
using (doorstep.has_workspace_permission(workspace_id, 'contacts.write'));

drop policy if exists "contact writers can create move operations" on doorstep.contact_move_operations;
create policy "contact writers can create move operations"
on doorstep.contact_move_operations for insert
with check (doorstep.has_workspace_permission(workspace_id, 'contacts.write') and created_by = auth.uid());

drop policy if exists "contact writers can update move operations" on doorstep.contact_move_operations;
create policy "contact writers can update move operations"
on doorstep.contact_move_operations for update
using (doorstep.has_workspace_permission(workspace_id, 'contacts.write'))
with check (doorstep.has_workspace_permission(workspace_id, 'contacts.write'));

create or replace function doorstep.move_address_contacts(
  p_workspace_id uuid,
  p_source_address_id uuid,
  p_destination_address_id uuid,
  p_operation_key text
)
returns jsonb
language plpgsql
security invoker
set search_path = doorstep, public
as $$
declare
  source_contact_ids uuid[];
  displaced_contact_ids uuid[];
  affected_invoice_ids uuid[];
  existing_result jsonb;
  result_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not doorstep.has_workspace_permission(p_workspace_id, 'contacts.write') then
    raise exception 'Missing contacts.write permission';
  end if;

  if p_source_address_id = p_destination_address_id then
    raise exception 'Source and destination address cannot be the same';
  end if;

  select result into existing_result
  from doorstep.contact_move_operations
  where workspace_id = p_workspace_id
    and operation_key = p_operation_key
    and status = 'completed';

  if existing_result is not null then
    return existing_result;
  end if;

  insert into doorstep.contact_move_operations (
    workspace_id,
    operation_key,
    source_address_id,
    destination_address_id,
    created_by
  )
  values (
    p_workspace_id,
    p_operation_key,
    p_source_address_id,
    p_destination_address_id,
    auth.uid()
  )
  on conflict (workspace_id, operation_key) do nothing;

  perform 1
  from doorstep.addresses
  where id in (p_source_address_id, p_destination_address_id)
    and workspace_id = p_workspace_id
  for update;

  select coalesce(array_agg(contact_id), '{}'::uuid[]) into source_contact_ids
  from doorstep.address_contacts
  where workspace_id = p_workspace_id
    and address_id = p_source_address_id;

  if coalesce(array_length(source_contact_ids, 1), 0) = 0 then
    raise exception 'Source address has no contacts to move';
  end if;

  select coalesce(array_agg(contact_id), '{}'::uuid[]) into displaced_contact_ids
  from doorstep.address_contacts
  where workspace_id = p_workspace_id
    and address_id = p_destination_address_id;

  insert into doorstep.displaced_contacts (
    workspace_id,
    original_address_id,
    destination_address_id,
    contact_id,
    contact_snapshot,
    displaced_by
  )
  select
    p_workspace_id,
    p_destination_address_id,
    p_destination_address_id,
    c.id,
    to_jsonb(c),
    auth.uid()
  from doorstep.contacts c
  where c.workspace_id = p_workspace_id
    and c.id = any(displaced_contact_ids);

  delete from doorstep.address_contacts
  where workspace_id = p_workspace_id
    and address_id = p_destination_address_id
    and contact_id = any(displaced_contact_ids);

  update doorstep.address_contacts
  set address_id = p_destination_address_id,
      is_primary = false
  where workspace_id = p_workspace_id
    and address_id = p_source_address_id
    and contact_id = any(source_contact_ids);

  update doorstep.address_contacts
  set is_primary = true
  where id = (
    select id
    from doorstep.address_contacts
    where workspace_id = p_workspace_id
      and address_id = p_destination_address_id
      and contact_id = any(source_contact_ids)
    order by created_at asc
    limit 1
  );

  select coalesce(array_agg(id), '{}'::uuid[]) into affected_invoice_ids
  from doorstep.invoices
  where workspace_id = p_workspace_id
    and contact_id = any(source_contact_ids);

  update doorstep.invoices
  set address_id = p_destination_address_id,
      updated_by = auth.uid(),
      updated_at = now()
  where workspace_id = p_workspace_id
    and contact_id = any(source_contact_ids);

  update doorstep.addresses
  set stage = 'prospect',
      status = 'not_visited',
      sub_status = null,
      sub_status_set_by = null,
      sub_status_set_at = null,
      custom_data = custom_data
        - 'firstName'
        - 'lastName'
        - 'phone'
        - 'email'
        - 'role'
        - 'isDecisionMaker'
        - 'contacts',
      updated_by = auth.uid(),
      updated_at = now()
  where workspace_id = p_workspace_id
    and id = p_source_address_id;

  result_payload := jsonb_build_object(
    'source_address_id', p_source_address_id,
    'destination_address_id', p_destination_address_id,
    'moved_contact_ids', to_jsonb(source_contact_ids),
    'displaced_contact_ids', to_jsonb(displaced_contact_ids),
    'affected_invoice_ids', to_jsonb(coalesce(affected_invoice_ids, '{}'::uuid[]))
  );

  insert into doorstep.activities (
    workspace_id,
    address_id,
    actor_user_id,
    type,
    title,
    body,
    metadata
  )
  values (
    p_workspace_id,
    p_destination_address_id,
    auth.uid(),
    'system',
    'Contacts moved to address',
    'All source address contacts were moved to this destination address.',
    result_payload
  );

  update doorstep.contact_move_operations
  set status = 'completed',
      result = result_payload,
      completed_at = now()
  where workspace_id = p_workspace_id
    and operation_key = p_operation_key;

  return result_payload;
exception
  when others then
    update doorstep.contact_move_operations
    set status = 'failed',
        result = jsonb_build_object('error', sqlerrm)
    where workspace_id = p_workspace_id
      and operation_key = p_operation_key;
    raise;
end;
$$;

revoke execute on function doorstep.move_address_contacts(uuid, uuid, uuid, text) from public;
grant execute on function doorstep.move_address_contacts(uuid, uuid, uuid, text) to authenticated;

grant select, insert, update on doorstep.stage_config to authenticated;
grant select, insert, update on doorstep.sub_status_config to authenticated;
grant select, insert, update on doorstep.contact_idempotency_keys to authenticated;
grant select, insert, update on doorstep.displaced_contacts to authenticated;
grant select, insert, update on doorstep.contact_move_operations to authenticated;
