-- Jalankan seluruh SQL ini di Supabase Dashboard > SQL Editor.
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null check (module in ('phone','ip','email','domain','username','image','apk')),
  query_value text not null,
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scans_user_created_idx
  on public.scans(user_id, created_at desc);

alter table public.scans enable row level security;

drop policy if exists "Users can read own scans" on public.scans;
create policy "Users can read own scans"
  on public.scans for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own scans" on public.scans;
create policy "Users can insert own scans"
  on public.scans for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own scans" on public.scans;
create policy "Users can delete own scans"
  on public.scans for delete
  using (auth.uid() = user_id);

-- Tidak ada policy UPDATE: hasil scan bersifat immutable dari sisi user.
