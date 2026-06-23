-- ACS S1901 ZIP income demographics reference data.
--
-- This is platform reference data shared by all workspaces. It is not owned by
-- a workspace because the Census values are public ZIP-level facts.

create table if not exists doorstep.zip_income_demographics (
  id uuid primary key default gen_random_uuid(),
  zip_code text not null,
  geo_id text not null,
  geographic_name text not null,
  source_dataset text not null default 'ACSST5Y2024.S1901',
  survey_year integer not null default 2024,
  households_total integer,
  households_total_moe integer,
  household_median_income integer,
  household_median_income_moe integer,
  household_mean_income integer,
  household_mean_income_moe integer,
  families_total integer,
  families_total_moe integer,
  family_median_income integer,
  family_median_income_moe integer,
  family_mean_income integer,
  family_mean_income_moe integer,
  household_income_distribution jsonb not null default '{}'::jsonb,
  raw_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zip_income_demographics_zip_format check (zip_code ~ '^[0-9]{5}$'),
  constraint zip_income_demographics_distribution_object check (jsonb_typeof(household_income_distribution) = 'object'),
  constraint zip_income_demographics_raw_row_object check (jsonb_typeof(raw_row) = 'object'),
  unique (source_dataset, zip_code)
);

create index if not exists zip_income_demographics_zip_idx
  on doorstep.zip_income_demographics (zip_code);

create index if not exists zip_income_demographics_source_year_idx
  on doorstep.zip_income_demographics (source_dataset, survey_year);

drop trigger if exists zip_income_demographics_set_updated_at on doorstep.zip_income_demographics;
create trigger zip_income_demographics_set_updated_at
before update on doorstep.zip_income_demographics
for each row execute function doorstep.set_updated_at();

alter table doorstep.zip_income_demographics enable row level security;

drop policy if exists "authenticated users can read zip demographics" on doorstep.zip_income_demographics;
create policy "authenticated users can read zip demographics"
on doorstep.zip_income_demographics for select
to authenticated
using (true);

drop policy if exists "platform owners can insert zip demographics" on doorstep.zip_income_demographics;
create policy "platform owners can insert zip demographics"
on doorstep.zip_income_demographics for insert
to authenticated
with check (doorstep.is_platform_owner());

drop policy if exists "platform owners can update zip demographics" on doorstep.zip_income_demographics;
create policy "platform owners can update zip demographics"
on doorstep.zip_income_demographics for update
to authenticated
using (doorstep.is_platform_owner())
with check (doorstep.is_platform_owner());

drop policy if exists "platform owners can delete zip demographics" on doorstep.zip_income_demographics;
create policy "platform owners can delete zip demographics"
on doorstep.zip_income_demographics for delete
to authenticated
using (doorstep.is_platform_owner());

grant select, insert, update, delete on doorstep.zip_income_demographics to authenticated;

insert into doorstep.api_registry (
  api_key,
  api_type,
  display_name,
  exposure,
  auth_required,
  owner_notes
) values (
  'doorstep.zip_income_demographics',
  'supabase_table',
  'ZIP Income Demographics',
  'internal',
  true,
  'Platform reference table for ACS S1901 ZIP-level income demographics used by future property enrichment and bid recommendation logic.'
)
on conflict (api_key, api_type) do update set
  display_name = excluded.display_name,
  exposure = excluded.exposure,
  auth_required = excluded.auth_required,
  owner_notes = excluded.owner_notes,
  updated_at = now();
