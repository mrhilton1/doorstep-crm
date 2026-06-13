create or replace function doorstep.soft_delete_address(
  p_workspace_id uuid,
  p_address_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = doorstep, public
as $$
declare
  v_deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not doorstep.has_workspace_permission(p_workspace_id, 'addresses.write') then
    raise exception 'Missing permission to delete addresses';
  end if;

  update doorstep.addresses
  set deleted_at = now(),
      deleted_by = auth.uid(),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_address_id
    and workspace_id = p_workspace_id
    and deleted_at is null;

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count <> 1 then
    raise exception 'Address not found or already deleted';
  end if;

  return true;
end;
$$;

revoke all on function doorstep.soft_delete_address(uuid, uuid) from public, anon;
grant execute on function doorstep.soft_delete_address(uuid, uuid) to authenticated;
