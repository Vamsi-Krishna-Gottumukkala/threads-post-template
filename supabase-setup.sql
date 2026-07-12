-- Run this once in the Supabase SQL Editor before deploying the app.
create table if not exists public.thread_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.thread_profiles enable row level security;

create policy "Members can read their own thread data"
  on public.thread_profiles for select
  using (auth.uid() = id);

create policy "Members can create their own thread data"
  on public.thread_profiles for insert
  with check (auth.uid() = id);

create policy "Members can update their own thread data"
  on public.thread_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
