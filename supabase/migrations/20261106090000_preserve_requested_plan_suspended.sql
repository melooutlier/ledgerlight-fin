-- Preserve the plan selected during signup, but never activate it automatically.
-- Every new account remains suspended until an administrator approves payment/access.
create or replace function public.create_default_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_plan text;
begin
  requested_plan := new.raw_user_meta_data ->> 'requested_plan';

  if requested_plan not in ('pessoal', 'avancado') then
    requested_plan := 'pessoal';
  end if;

  insert into public.subscriptions (user_id, plan, status, expires_at)
  values (new.id, requested_plan, 'suspended', null)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
