-- Melfy access control: new accounts start suspended; only admins can grant or extend access.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'pessoal',
  status text not null default 'suspended',
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_user_id_unique on public.subscriptions(user_id);
alter table public.subscriptions enable row level security;
grant select, insert, update on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "admin read subscriptions" on public.subscriptions;
create policy "admin read subscriptions" on public.subscriptions
  for select to authenticated using (public.has_role('admin'::public.app_role, auth.uid()));
drop policy if exists "admin insert subscriptions" on public.subscriptions;
create policy "admin insert subscriptions" on public.subscriptions
  for insert to authenticated with check (public.has_role('admin'::public.app_role, auth.uid()));
drop policy if exists "admin update subscriptions" on public.subscriptions;
create policy "admin update subscriptions" on public.subscriptions
  for update to authenticated
  using (public.has_role('admin'::public.app_role, auth.uid()))
  with check (public.has_role('admin'::public.app_role, auth.uid()));
drop policy if exists "admin delete subscriptions" on public.subscriptions;
create policy "admin delete subscriptions" on public.subscriptions
  for delete to authenticated using (public.has_role('admin'::public.app_role, auth.uid()));

-- Ensure every newly registered user gets a subscription row that is not active.
create or replace function public.create_default_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, plan, status, expires_at)
  values (new.id, 'pessoal', 'suspended', null)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_subscription_created on auth.users;
create trigger on_auth_user_subscription_created
after insert on auth.users
for each row execute function public.create_default_subscription();

-- Keep old accounts without a subscription locked until the administrator reviews them.
insert into public.subscriptions (user_id, plan, status, expires_at)
select u.id, 'pessoal', 'suspended', null
from auth.users u
where not exists (select 1 from public.subscriptions s where s.user_id = u.id)
on conflict (user_id) do nothing;

-- Admins must be able to see all profiles in the admin panel.
drop policy if exists "admin read profiles" on public.profiles;
create policy "admin read profiles" on public.profiles
  for select to authenticated using (public.has_role('admin'::public.app_role, auth.uid()));

-- Central check used by RLS policies. Expiry is evaluated on the database date.
create or replace function public.has_active_subscription(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = _user_id
      and s.status = 'active'
      and (s.expires_at is null or s.expires_at::date >= current_date)
  );
$$;

-- Restrictive policies ensure an ordinary user's existing table policies cannot bypass suspension.
drop policy if exists "active subscription required" on public.categories;
create policy "active subscription required" on public.categories
  as restrictive for all to authenticated
  using (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))
  with check (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()));

drop policy if exists "active subscription required" on public.personal_advances;
create policy "active subscription required" on public.personal_advances
  as restrictive for all to authenticated
  using (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))
  with check (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()));

drop policy if exists "active subscription required" on public.transactions;
create policy "active subscription required" on public.transactions
  as restrictive for all to authenticated
  using (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))
  with check (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()));

drop policy if exists "active subscription required" on public.loans;
create policy "active subscription required" on public.loans
  as restrictive for all to authenticated
  using (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))
  with check (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()));

drop policy if exists "active subscription required" on public.loan_payments;
create policy "active subscription required" on public.loan_payments
  as restrictive for all to authenticated
  using (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))
  with check (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()));

drop policy if exists "active subscription required" on public.budgets;
create policy "active subscription required" on public.budgets
  as restrictive for all to authenticated
  using (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))
  with check (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()));

drop policy if exists "active subscription required" on public.budget_categories;
create policy "active subscription required" on public.budget_categories
  as restrictive for all to authenticated
  using (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))
  with check (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()));

drop policy if exists "active subscription required" on public.accounts;
create policy "active subscription required" on public.accounts
  as restrictive for all to authenticated
  using (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))
  with check (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()));

drop policy if exists "active subscription required" on public.savings_goals;
create policy "active subscription required" on public.savings_goals
  as restrictive for all to authenticated
  using (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))
  with check (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()));

drop policy if exists "active subscription required" on public.household_bills;
create policy "active subscription required" on public.household_bills
  as restrictive for all to authenticated
  using (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))
  with check (public.has_active_subscription(auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()));
