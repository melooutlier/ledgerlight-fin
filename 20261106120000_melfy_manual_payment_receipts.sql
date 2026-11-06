-- Melfy: confirmação manual de pagamento (M-Pesa / e-Mola / Millennium BIM).
-- Adaptado ao esquema existente: a tabela subscriptions usa expires_at (date), não current_period_end.

-- A. Contactos no perfil
alter table public.profiles add column if not exists payment_phone text;
alter table public.profiles add column if not exists whatsapp_phone text;

-- B. Pedidos de ativação / comprovativos
create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('pessoal', 'avancado')),
  billing_cycle text not null check (billing_cycle in ('mensal', 'anual')),
  amount numeric(10,2) not null,
  payment_method text not null check (payment_method in ('mpesa', 'emola', 'millennium_bim')),
  payment_phone text not null check (payment_phone ~ '^8[4-7][0-9]{7}$'),
  whatsapp_phone text not null check (whatsapp_phone ~ '^[0-9]{9,15}$'),
  receipt_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  -- O valor tem de corresponder ao plano/ciclo (o cliente não pode escolher o preço).
  constraint payment_receipts_amount_matches_plan check (
    (plan = 'pessoal' and billing_cycle = 'mensal' and amount = 150) or
    (plan = 'pessoal' and billing_cycle = 'anual' and amount = 1500) or
    (plan = 'avancado' and billing_cycle = 'mensal' and amount = 350) or
    (plan = 'avancado' and billing_cycle = 'anual' and amount = 3500)
  ),
  -- O comprovativo só pode apontar para a pasta do próprio utilizador.
  constraint payment_receipts_path_own_folder check (
    receipt_path is null or receipt_path like 'subscriptions/' || user_id::text || '/%'
  )
);

create index if not exists payment_receipts_status_created_idx on public.payment_receipts(status, created_at);
create index if not exists payment_receipts_user_idx on public.payment_receipts(user_id, created_at desc);
-- Um único pedido pendente por utilizador (evita spam; o admin recusa um pedido errado e o cliente reenvia).
create unique index if not exists payment_receipts_one_pending_per_user
  on public.payment_receipts(user_id) where status = 'pending';

grant select, insert, update on public.payment_receipts to authenticated;
grant all on public.payment_receipts to service_role;
alter table public.payment_receipts enable row level security;

-- C. RLS
drop policy if exists "read own or admin receipts" on public.payment_receipts;
create policy "read own or admin receipts" on public.payment_receipts
  for select to authenticated
  using (auth.uid() = user_id or public.has_role(_user_id => auth.uid(), _role => 'admin'::public.app_role));

drop policy if exists "insert own pending receipt" on public.payment_receipts;
create policy "insert own pending receipt" on public.payment_receipts
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and admin_notes is null
  );

drop policy if exists "admin update receipts" on public.payment_receipts;
create policy "admin update receipts" on public.payment_receipts
  for update to authenticated
  using (public.has_role(_user_id => auth.uid(), _role => 'admin'::public.app_role))
  with check (public.has_role(_user_id => auth.uid(), _role => 'admin'::public.app_role));

-- Aprovação atómica: marca o pedido e ativa/estende a subscrição numa só transação.
create or replace function public.approve_payment_receipt(_receipt_id uuid)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.payment_receipts;
  s public.subscriptions;
  base_date date;
  new_end date;
begin
  if auth.uid() is null or not public.has_role(_user_id => auth.uid(), _role => 'admin'::public.app_role) then
    raise exception 'Apenas administradores podem aprovar pagamentos.' using errcode = '42501';
  end if;

  select * into r from public.payment_receipts where id = _receipt_id for update;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
  if r.status <> 'pending' then
    raise exception 'Este pedido já foi tratado (%).', r.status;
  end if;

  select * into s from public.subscriptions where user_id = r.user_id;

  -- greatest(hoje, expiração atual): só conta o tempo restante se a subscrição estiver realmente ativa.
  if found and s.status = 'active' and s.expires_at is not null and s.expires_at >= current_date then
    base_date := s.expires_at;
  else
    base_date := current_date;
  end if;

  new_end := (base_date + case when r.billing_cycle = 'anual' then interval '1 year' else interval '1 month' end)::date;

  insert into public.subscriptions (user_id, plan, status, expires_at)
  values (r.user_id, r.plan, 'active', new_end)
  on conflict (user_id) do update
    set plan = excluded.plan,
        status = 'active',
        expires_at = excluded.expires_at,
        updated_at = now();

  update public.payment_receipts
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = r.id;

  return new_end;
end;
$$;

create or replace function public.reject_payment_receipt(_receipt_id uuid, _reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(_user_id => auth.uid(), _role => 'admin'::public.app_role) then
    raise exception 'Apenas administradores podem recusar pagamentos.' using errcode = '42501';
  end if;
  if coalesce(btrim(_reason), '') = '' then
    raise exception 'Indique o motivo da recusa.';
  end if;

  update public.payment_receipts
    set status = 'rejected', admin_notes = btrim(_reason), reviewed_by = auth.uid(), reviewed_at = now()
    where id = _receipt_id and status = 'pending';
  if not found then
    raise exception 'Pedido não encontrado ou já tratado.';
  end if;
end;
$$;

revoke execute on function public.approve_payment_receipt(uuid) from public, anon;
revoke execute on function public.reject_payment_receipt(uuid, text) from public, anon;
grant execute on function public.approve_payment_receipt(uuid) to authenticated;
grant execute on function public.reject_payment_receipt(uuid, text) to authenticated;

-- D. Storage: bucket privado "receipts", pasta subscriptions/<user_id>/
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "subscription receipts insert own folder" on storage.objects;
create policy "subscription receipts insert own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'subscriptions'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "subscription receipts read own folder" on storage.objects;
create policy "subscription receipts read own folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'subscriptions'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "subscription receipts admin read" on storage.objects;
create policy "subscription receipts admin read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'subscriptions'
    and public.has_role(_user_id => auth.uid(), _role => 'admin'::public.app_role)
  );
