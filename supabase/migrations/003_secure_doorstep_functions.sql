create or replace function doorstep.set_updated_at()
returns trigger
language plpgsql
set search_path = doorstep, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function doorstep.create_workspace(text, text) from anon;
revoke execute on function doorstep.handle_new_user() from anon, authenticated;
revoke execute on function doorstep.has_workspace_permission(uuid, text) from anon;
revoke execute on function doorstep.is_platform_owner() from anon;
revoke execute on function doorstep.is_workspace_member(uuid) from anon;

grant execute on function doorstep.create_workspace(text, text) to authenticated;
grant execute on function doorstep.has_workspace_permission(uuid, text) to authenticated;
grant execute on function doorstep.is_platform_owner() to authenticated;
grant execute on function doorstep.is_workspace_member(uuid) to authenticated;
