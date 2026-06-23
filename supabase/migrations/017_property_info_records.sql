-- Property info enrichment records.
--
-- Stores user-pasted public property details parsed from source sites such as
-- FamilyTreeNow. Rows are append-friendly so later enrichment passes can keep
-- historical snapshots while showing the newest row on the address record.

insert into doorstep.permissions (key, description) values
  ('property_info.write', 'Create and update property enrichment records')
on conflict (key) do nothing;

insert into doorstep.role_permissions (role_id, permission_key)
select r.id, 'property_info.write'
from doorstep.roles r
where r.system_key in ('owner', 'admin', 'sales_rep')
on conflict do nothing;

create table if not exists doorstep.property_info_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  address_id uuid not null references doorstep.addresses(id) on delete cascade,
  normalized_address text not null,
  display_address text not null,
  city text not null default 'N/A',
  state text not null default 'N/A',
  county text not null default 'N/A',
  postal_code text,
  source text not null default 'familytreenow',
  source_url text,
  raw_text text not null,
  parsed_data jsonb not null default '{}'::jsonb,
  demographics jsonb not null default '{}'::jsonb,
  created_by uuid references doorstep.profiles(id),
  updated_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references doorstep.profiles(id),
  constraint property_info_raw_text_not_blank check (length(trim(raw_text)) > 0),
  constraint property_info_parsed_data_object check (jsonb_typeof(parsed_data) = 'object'),
  constraint property_info_demographics_object check (jsonb_typeof(demographics) = 'object')
);

create index if not exists property_info_workspace_address_created_idx
  on doorstep.property_info_records (workspace_id, address_id, created_at desc)
  where deleted_at is null;

create index if not exists property_info_workspace_normalized_address_idx
  on doorstep.property_info_records (workspace_id, normalized_address, created_at desc)
  where deleted_at is null;

drop trigger if exists property_info_records_set_updated_at on doorstep.property_info_records;
create trigger property_info_records_set_updated_at
before update on doorstep.property_info_records
for each row execute function doorstep.set_updated_at();

alter table doorstep.property_info_records enable row level security;

drop policy if exists "workspace members can read active property info" on doorstep.property_info_records;
create policy "workspace members can read active property info"
on doorstep.property_info_records for select
to authenticated
using (doorstep.is_workspace_member(workspace_id) and (deleted_at is null or doorstep.is_platform_owner()));

drop policy if exists "workspace users can create property info" on doorstep.property_info_records;
create policy "workspace users can create property info"
on doorstep.property_info_records for insert
to authenticated
with check (
  doorstep.has_workspace_permission(workspace_id, 'property_info.write')
  and created_by = auth.uid()
);

drop policy if exists "workspace users can update property info" on doorstep.property_info_records;
create policy "workspace users can update property info"
on doorstep.property_info_records for update
to authenticated
using (doorstep.has_workspace_permission(workspace_id, 'property_info.write'))
with check (doorstep.has_workspace_permission(workspace_id, 'property_info.write'));

grant select, insert, update on doorstep.property_info_records to authenticated;

insert into doorstep.api_registry (
  api_key,
  api_type,
  display_name,
  exposure,
  auth_required,
  permission_key,
  owner_notes
) values (
  'doorstep.property_info_records',
  'supabase_table',
  'Property Info Records',
  'internal',
  true,
  'property_info.write',
  'Workspace-scoped property enrichment rows parsed from user-pasted public property details.'
)
on conflict (api_key, api_type) do update set
  display_name = excluded.display_name,
  exposure = excluded.exposure,
  auth_required = excluded.auth_required,
  permission_key = excluded.permission_key,
  owner_notes = excluded.owner_notes,
  updated_at = now();
