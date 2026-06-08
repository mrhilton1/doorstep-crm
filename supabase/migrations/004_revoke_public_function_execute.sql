revoke execute on function doorstep.create_workspace(text, text) from public;
revoke execute on function doorstep.handle_new_user() from public;
revoke execute on function doorstep.has_workspace_permission(uuid, text) from public;
revoke execute on function doorstep.is_platform_owner() from public;
revoke execute on function doorstep.is_workspace_member(uuid) from public;
revoke execute on function doorstep.set_updated_at() from public;

grant execute on function doorstep.create_workspace(text, text) to authenticated;
grant execute on function doorstep.has_workspace_permission(uuid, text) to authenticated;
grant execute on function doorstep.is_platform_owner() to authenticated;
grant execute on function doorstep.is_workspace_member(uuid) to authenticated;
