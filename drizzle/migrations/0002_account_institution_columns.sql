alter table public.accounts
  add column if not exists institution text not null default 'other',
  add column if not exists account_number text,
  add column if not exists account_color text not null default '#166534',
  add column if not exists account_icon text not null default 'wallet';
create index if not exists accounts_user_institution_idx on public.accounts (user_id, institution);