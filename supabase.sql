create extension if not exists "pgcrypto";

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  weekday smallint not null check (weekday between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  task_date date not null default current_date,
  is_completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists routine_id uuid references public.routines(id) on delete set null;

alter table public.tasks
  add column if not exists is_hidden boolean not null default false;

create index if not exists tasks_user_date_idx
  on public.tasks (user_id, task_date, position);

create unique index if not exists tasks_routine_occurrence_idx
  on public.tasks (user_id, task_date, routine_id)
  where routine_id is not null;

alter table public.routines enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "Users can read their own routines" on public.routines;
create policy "Users can read their own routines"
  on public.routines for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own routines" on public.routines;
create policy "Users can create their own routines"
  on public.routines for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own routines" on public.routines;
create policy "Users can update their own routines"
  on public.routines for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own routines" on public.routines;
create policy "Users can delete their own routines"
  on public.routines for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own tasks" on public.tasks;
create policy "Users can read their own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists routines_set_updated_at on public.routines;
create trigger routines_set_updated_at
before update on public.routines
for each row execute function public.set_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.routines;
exception
  when duplicate_object then null;
end;
$$;
