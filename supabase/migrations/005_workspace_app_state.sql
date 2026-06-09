-- Persist MVP workspace-level app state in Supabase instead of browser storage.
-- This is a bridge table while catalog, settings, routes, goals, and team
-- receive fully normalized tables/UI flows.

create table if not exists doorstep.workspace_app_state (
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references doorstep.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, key)
);

drop trigger if exists workspace_app_state_set_updated_at on doorstep.workspace_app_state;
create trigger workspace_app_state_set_updated_at
before update on doorstep.workspace_app_state
for each row execute function doorstep.set_updated_at();

alter table doorstep.workspace_app_state enable row level security;

drop policy if exists "workspace members can read app state" on doorstep.workspace_app_state;
create policy "workspace members can read app state"
on doorstep.workspace_app_state for select
using (doorstep.is_workspace_member(workspace_id));

drop policy if exists "workspace members can manage app state" on doorstep.workspace_app_state;
create policy "workspace members can manage app state"
on doorstep.workspace_app_state for all
using (doorstep.is_workspace_member(workspace_id))
with check (doorstep.is_workspace_member(workspace_id));

grant select, insert, update, delete on doorstep.workspace_app_state to authenticated;
