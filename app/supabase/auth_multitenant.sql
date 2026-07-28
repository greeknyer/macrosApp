-- ── Auth + multi-tenant migration ──
-- Run ONCE in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- After this, foods and fixed meals are private per signed-in user. The app
-- seeds each new account with its own copy of the starter foods on first login.
--
-- NOTE: this removes the old shared/public foods and public access policies.
-- Each user gets a fresh copy from the app, so no personal data is lost.

-- 1. Attribute columns (idempotent — safe if food_attributes.sql already ran).
alter table foods
  add column if not exists form_role text,
  add column if not exists form text,
  add column if not exists temp text,
  add column if not exists seafood boolean,
  add column if not exists fat_type text;

-- 2. Per-user ownership. Default to the caller so inserts need no user_id.
alter table foods add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table foods alter column user_id set default auth.uid();

-- 3. Drop the old shared foods (replaced by per-user copies seeded from the app).
delete from foods where user_id is null;

-- 4. Replace ALL existing foods policies with user-scoped ones (drops any old
--    public read/write policy regardless of its name, so data is truly private).
alter table foods enable row level security;
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'foods' loop
    execute format('drop policy %I on foods', pol.policyname);
  end loop;
end $$;
create policy "foods_select_own" on foods for select using (auth.uid() = user_id);
create policy "foods_insert_own" on foods for insert with check (auth.uid() = user_id);
create policy "foods_update_own" on foods for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "foods_delete_own" on foods for delete using (auth.uid() = user_id);

-- 5. Per-user fixed meals (breakfast / snacks / pre-workout config as JSON).
create table if not exists fixed_meals (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table fixed_meals enable row level security;
drop policy if exists "fixed_meals_select_own" on fixed_meals;
drop policy if exists "fixed_meals_insert_own" on fixed_meals;
drop policy if exists "fixed_meals_update_own" on fixed_meals;
create policy "fixed_meals_select_own" on fixed_meals for select using (auth.uid() = user_id);
create policy "fixed_meals_insert_own" on fixed_meals for insert with check (auth.uid() = user_id);
create policy "fixed_meals_update_own" on fixed_meals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
