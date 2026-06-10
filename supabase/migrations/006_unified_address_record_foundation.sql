-- Unified Address Record foundation.
--
-- Adds normalized tables for notes, quotes, invoices, and transactions while
-- keeping existing MVP address/contact behavior intact.

insert into doorstep.permissions (key, description) values
  ('notes.write', 'Create and update address/contact notes'),
  ('invoices.write', 'Create and update invoices'),
  ('transactions.write', 'Record payments, adjustments, and manual transactions')
on conflict (key) do nothing;

insert into doorstep.role_permissions (role_id, permission_key)
select r.id, p.key
from doorstep.roles r
cross join doorstep.permissions p
where r.system_key in ('owner', 'admin')
  and p.key in ('notes.write', 'invoices.write', 'transactions.write')
on conflict do nothing;

insert into doorstep.role_permissions (role_id, permission_key)
select r.id, p.key
from doorstep.roles r
cross join doorstep.permissions p
where r.system_key in ('sales_rep', 'technician')
  and p.key in ('notes.write', 'transactions.write')
on conflict do nothing;

create table if not exists doorstep.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  address_id uuid references doorstep.addresses(id) on delete cascade,
  contact_id uuid references doorstep.contacts(id) on delete set null,
  body text not null,
  note_type text not null default 'general',
  source_activity_id uuid references doorstep.activities(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references doorstep.profiles(id),
  updated_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references doorstep.profiles(id),
  constraint notes_body_not_blank check (length(trim(body)) > 0),
  constraint notes_attached_to_record check (address_id is not null or contact_id is not null)
);

create index if not exists notes_workspace_address_active_idx
  on doorstep.notes (workspace_id, address_id, created_at desc)
  where archived_at is null;

create index if not exists notes_workspace_contact_active_idx
  on doorstep.notes (workspace_id, contact_id, created_at desc)
  where archived_at is null;

drop trigger if exists notes_set_updated_at on doorstep.notes;
create trigger notes_set_updated_at
before update on doorstep.notes
for each row execute function doorstep.set_updated_at();

create table if not exists doorstep.quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  address_id uuid not null references doorstep.addresses(id) on delete cascade,
  contact_id uuid references doorstep.contacts(id) on delete set null,
  quote_number text not null,
  status text not null default 'draft',
  total_amount numeric(12,2) not null default 0,
  line_items jsonb not null default '[]'::jsonb,
  discounts jsonb not null default '[]'::jsonb,
  notes text not null default '',
  hosted_token text not null default encode(gen_random_bytes(18), 'hex'),
  created_by uuid references doorstep.profiles(id),
  updated_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  accepted_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references doorstep.profiles(id),
  constraint quotes_status_check check (status in ('draft', 'sent', 'accepted', 'not_accepted')),
  constraint quotes_total_non_negative check (total_amount >= 0),
  unique (workspace_id, quote_number),
  unique (hosted_token)
);

create index if not exists quotes_workspace_address_active_idx
  on doorstep.quotes (workspace_id, address_id, created_at desc)
  where deleted_at is null;

drop trigger if exists quotes_set_updated_at on doorstep.quotes;
create trigger quotes_set_updated_at
before update on doorstep.quotes
for each row execute function doorstep.set_updated_at();

create table if not exists doorstep.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  address_id uuid not null references doorstep.addresses(id) on delete cascade,
  contact_id uuid references doorstep.contacts(id) on delete set null,
  quote_id uuid references doorstep.quotes(id) on delete set null,
  invoice_number text not null,
  status text not null default 'draft',
  subtotal_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  line_items jsonb not null default '[]'::jsonb,
  adjustments jsonb not null default '[]'::jsonb,
  stripe_payment_stub jsonb not null default '{}'::jsonb,
  customer_message text not null default '',
  created_by uuid references doorstep.profiles(id),
  updated_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references doorstep.profiles(id),
  constraint invoices_status_check check (status in ('draft', 'sent', 'paid', 'unpaid', 'outstanding', 'overdue', 'void')),
  constraint invoices_subtotal_non_negative check (subtotal_amount >= 0),
  constraint invoices_total_non_negative check (total_amount >= 0),
  unique (workspace_id, invoice_number)
);

create index if not exists invoices_workspace_address_active_idx
  on doorstep.invoices (workspace_id, address_id, created_at desc)
  where deleted_at is null;

create index if not exists invoices_workspace_status_idx
  on doorstep.invoices (workspace_id, status, due_at)
  where deleted_at is null;

drop trigger if exists invoices_set_updated_at on doorstep.invoices;
create trigger invoices_set_updated_at
before update on doorstep.invoices
for each row execute function doorstep.set_updated_at();

create table if not exists doorstep.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references doorstep.workspaces(id) on delete cascade,
  address_id uuid not null references doorstep.addresses(id) on delete cascade,
  invoice_id uuid references doorstep.invoices(id) on delete set null,
  quote_id uuid references doorstep.quotes(id) on delete set null,
  type text not null default 'payment',
  amount numeric(12,2) not null default 0,
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  recorded_by uuid references doorstep.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references doorstep.profiles(id),
  constraint transactions_type_check check (type in ('payment', 'refund', 'adjustment', 'manual')),
  constraint transactions_amount_non_negative check (amount >= 0)
);

create index if not exists transactions_workspace_address_active_idx
  on doorstep.transactions (workspace_id, address_id, created_at desc)
  where deleted_at is null;

create index if not exists transactions_workspace_invoice_active_idx
  on doorstep.transactions (workspace_id, invoice_id, created_at desc)
  where deleted_at is null;

alter table doorstep.notes enable row level security;
alter table doorstep.quotes enable row level security;
alter table doorstep.invoices enable row level security;
alter table doorstep.transactions enable row level security;

drop policy if exists "workspace members can read active notes" on doorstep.notes;
create policy "workspace members can read active notes"
on doorstep.notes for select
using (doorstep.is_workspace_member(workspace_id) and (archived_at is null or doorstep.is_platform_owner()));

drop policy if exists "workspace users can create notes" on doorstep.notes;
create policy "workspace users can create notes"
on doorstep.notes for insert
with check (
  doorstep.has_workspace_permission(workspace_id, 'notes.write')
  and created_by = auth.uid()
);

drop policy if exists "workspace users can update notes" on doorstep.notes;
create policy "workspace users can update notes"
on doorstep.notes for update
using (doorstep.has_workspace_permission(workspace_id, 'notes.write'))
with check (doorstep.has_workspace_permission(workspace_id, 'notes.write'));

drop policy if exists "workspace members can read active quotes" on doorstep.quotes;
create policy "workspace members can read active quotes"
on doorstep.quotes for select
using (doorstep.is_workspace_member(workspace_id) and (deleted_at is null or doorstep.is_platform_owner()));

drop policy if exists "sales users can create quotes" on doorstep.quotes;
create policy "sales users can create quotes"
on doorstep.quotes for insert
with check (
  doorstep.has_workspace_permission(workspace_id, 'quotes.write')
  and created_by = auth.uid()
);

drop policy if exists "sales users can update quotes" on doorstep.quotes;
create policy "sales users can update quotes"
on doorstep.quotes for update
using (doorstep.has_workspace_permission(workspace_id, 'quotes.write'))
with check (doorstep.has_workspace_permission(workspace_id, 'quotes.write'));

drop policy if exists "workspace members can read active invoices" on doorstep.invoices;
create policy "workspace members can read active invoices"
on doorstep.invoices for select
using (doorstep.is_workspace_member(workspace_id) and (deleted_at is null or doorstep.is_platform_owner()));

drop policy if exists "workspace users can create invoices" on doorstep.invoices;
create policy "workspace users can create invoices"
on doorstep.invoices for insert
with check (
  doorstep.has_workspace_permission(workspace_id, 'invoices.write')
  and created_by = auth.uid()
);

drop policy if exists "workspace users can update invoices" on doorstep.invoices;
create policy "workspace users can update invoices"
on doorstep.invoices for update
using (doorstep.has_workspace_permission(workspace_id, 'invoices.write'))
with check (doorstep.has_workspace_permission(workspace_id, 'invoices.write'));

drop policy if exists "workspace members can read active transactions" on doorstep.transactions;
create policy "workspace members can read active transactions"
on doorstep.transactions for select
using (doorstep.is_workspace_member(workspace_id) and (deleted_at is null or doorstep.is_platform_owner()));

drop policy if exists "workspace users can create transactions" on doorstep.transactions;
create policy "workspace users can create transactions"
on doorstep.transactions for insert
with check (
  doorstep.has_workspace_permission(workspace_id, 'transactions.write')
  and recorded_by = auth.uid()
);

drop policy if exists "workspace users can update transactions" on doorstep.transactions;
create policy "workspace users can update transactions"
on doorstep.transactions for update
using (doorstep.has_workspace_permission(workspace_id, 'transactions.write'))
with check (doorstep.has_workspace_permission(workspace_id, 'transactions.write'));

grant select, insert, update, delete on doorstep.notes to authenticated;
grant select, insert, update, delete on doorstep.quotes to authenticated;
grant select, insert, update, delete on doorstep.invoices to authenticated;
grant select, insert, update, delete on doorstep.transactions to authenticated;
