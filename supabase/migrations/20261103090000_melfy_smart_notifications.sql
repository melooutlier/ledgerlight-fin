-- Melfy smart notifications and personalized reminders
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  device_type text not null check (device_type in ('mobile','desktop')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);
alter table public.push_subscriptions enable row level security;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
drop policy if exists "users manage own push subscriptions" on public.push_subscriptions;
create policy "users manage own push subscriptions" on public.push_subscriptions
 for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_reminders_enabled boolean not null default true,
  daily_times text[] not null default array['12:30','20:00']::text[],
  fixed_bills_reminders boolean not null default true,
  loans_reminders boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint notification_daily_times_valid check (
    cardinality(daily_times) between 1 and 3 and
    daily_times <@ array(select to_char(t::time, 'HH24:MI') from unnest(daily_times) t)
  )
);
alter table public.notification_preferences enable row level security;
grant select, insert, update on public.notification_preferences to authenticated;
drop policy if exists "users manage own notification preferences" on public.notification_preferences;
create policy "users manage own notification preferences" on public.notification_preferences
 for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.notification_preferences(user_id)
select id from auth.users on conflict (user_id) do nothing;
create or replace function public.create_default_notification_preferences()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.notification_preferences(user_id) values(new.id) on conflict(user_id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_notification_preferences on auth.users;
create trigger on_auth_user_notification_preferences after insert on auth.users
 for each row execute function public.create_default_notification_preferences();

alter table public.household_bills add column if not exists active boolean not null default true;
create index if not exists household_bills_active_due_day_idx on public.household_bills(active,due_day);
create index if not exists loans_due_date_idx on public.loans(due_date) where due_date is not null;

-- Prevent duplicate deliveries when the scheduled processor retries.
create table if not exists public.notification_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 notification_key text not null,
 sent_at timestamptz not null default now(),
 unique(user_id, notification_key)
);
alter table public.notification_deliveries enable row level security;
revoke all on public.notification_deliveries from anon, authenticated;
grant all on public.notification_deliveries to service_role;
