create or replace function doorstep.create_address_contact_idempotent(
  p_workspace_id uuid,
  p_address_id uuid,
  p_idempotency_key text,
  p_contact jsonb default '{}'::jsonb,
  p_is_primary boolean default false,
  p_relationship_label text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = doorstep, public
as $$
declare
  idempotency_record doorstep.contact_idempotency_keys%rowtype;
  contact_record doorstep.contacts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'Idempotency key is required';
  end if;

  if not doorstep.has_workspace_permission(p_workspace_id, 'contacts.write') then
    raise exception 'Missing contacts.write permission';
  end if;

  perform 1
  from doorstep.addresses
  where id = p_address_id
    and workspace_id = p_workspace_id
    and deleted_at is null;

  if not found then
    raise exception 'Address was not found';
  end if;

  insert into doorstep.contact_idempotency_keys (
    workspace_id,
    idempotency_key,
    address_id,
    created_by
  )
  values (
    p_workspace_id,
    p_idempotency_key,
    p_address_id,
    auth.uid()
  )
  on conflict (workspace_id, idempotency_key) do nothing;

  select * into idempotency_record
  from doorstep.contact_idempotency_keys
  where workspace_id = p_workspace_id
    and idempotency_key = p_idempotency_key
  for update;

  if idempotency_record.contact_id is not null then
    select * into contact_record
    from doorstep.contacts
    where id = idempotency_record.contact_id
      and workspace_id = p_workspace_id;

    return to_jsonb(contact_record);
  end if;

  insert into doorstep.contacts (
    workspace_id,
    first_name,
    last_name,
    role_title,
    email,
    phone,
    is_decision_maker,
    custom_data,
    created_by,
    updated_by
  )
  values (
    p_workspace_id,
    nullif(p_contact->>'first_name', ''),
    nullif(p_contact->>'last_name', ''),
    nullif(p_contact->>'role_title', ''),
    nullif(p_contact->>'email', ''),
    nullif(p_contact->>'phone', ''),
    coalesce((p_contact->>'is_decision_maker')::boolean, false),
    coalesce(p_contact->'custom_data', '{}'::jsonb),
    auth.uid(),
    auth.uid()
  )
  returning * into contact_record;

  if p_is_primary then
    update doorstep.address_contacts
    set is_primary = false
    where workspace_id = p_workspace_id
      and address_id = p_address_id
      and is_primary = true;
  end if;

  insert into doorstep.address_contacts (
    workspace_id,
    address_id,
    contact_id,
    is_primary,
    relationship_label
  )
  values (
    p_workspace_id,
    p_address_id,
    contact_record.id,
    p_is_primary,
    p_relationship_label
  )
  on conflict (address_id, contact_id) do update
  set is_primary = excluded.is_primary,
      relationship_label = excluded.relationship_label;

  update doorstep.contact_idempotency_keys
  set contact_id = contact_record.id
  where id = idempotency_record.id;

  return to_jsonb(contact_record);
end;
$$;

revoke execute on function doorstep.create_address_contact_idempotent(uuid, uuid, text, jsonb, boolean, text) from public;
grant execute on function doorstep.create_address_contact_idempotent(uuid, uuid, text, jsonb, boolean, text) to authenticated;
