create index if not exists platform_audit_events_target_user_idx
  on doorstep.platform_audit_events (target_user_id, created_at desc)
  where target_user_id is not null;

create index if not exists api_registry_entitlement_key_idx
  on doorstep.api_registry (entitlement_key)
  where entitlement_key is not null;

create index if not exists api_registry_permission_key_idx
  on doorstep.api_registry (permission_key)
  where permission_key is not null;
