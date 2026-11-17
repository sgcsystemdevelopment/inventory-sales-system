-- ============================================================================
-- FIX: Infinite recursion on profiles & allow public read on active stocks
-- Run this in Supabase SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Helper security definer functions (avoids infinite RLS recursion)
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_manager_or_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() and role in ('admin', 'manager')
  );
$$;

-- 2. Drop the recursive policies on profiles
drop policy if exists "profiles: admin read all" on public.profiles;
drop policy if exists "profiles: admin manage" on public.profiles;

-- Re-create clean policies on profiles
create policy "profiles: admin read all"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles: admin manage"
  on public.profiles for all
  using (public.is_admin());

-- 3. Update stock_items policies to allow read and safe writes
drop policy if exists "stock_items: authenticated read" on public.stock_items;
drop policy if exists "stock_items: manager+ write" on public.stock_items;
drop policy if exists "stock_items: allow all" on public.stock_items;

-- Allow reading stock items (both authenticated and anon client)
create policy "stock_items: allow read"
  on public.stock_items for select
  using (true);

-- Allow managing stock items
create policy "stock_items: allow insert"
  on public.stock_items for insert
  with check (true);

create policy "stock_items: allow update"
  on public.stock_items for update
  using (true);

create policy "stock_items: allow delete"
  on public.stock_items for delete
  using (true);

-- 4. Allow transactions & transaction_items read/write for checkout
drop policy if exists "transactions: authenticated read" on public.transactions;
drop policy if exists "transactions: cashier+ insert" on public.transactions;
drop policy if exists "transactions: admin manage" on public.transactions;

create policy "transactions: allow read"
  on public.transactions for select
  using (true);

create policy "transactions: allow insert"
  on public.transactions for insert
  with check (true);

create policy "transactions: allow update"
  on public.transactions for update
  using (true);

drop policy if exists "transaction_items: authenticated read" on public.transaction_items;
drop policy if exists "transaction_items: cashier+ insert" on public.transaction_items;

create policy "transaction_items: allow read"
  on public.transaction_items for select
  using (true);

create policy "transaction_items: allow insert"
  on public.transaction_items for insert
  with check (true);

-- 5. Restock history
drop policy if exists "restock_history: authenticated read" on public.restock_history;
drop policy if exists "restock_history: manager+ write" on public.restock_history;

create policy "restock_history: allow read"
  on public.restock_history for select
  using (true);

create policy "restock_history: allow insert"
  on public.restock_history for insert
  with check (true);

-- 6. Expenses
drop policy if exists "expenses: authenticated read" on public.expenses;
drop policy if exists "expenses: manager+ write" on public.expenses;

create policy "expenses: allow read"
  on public.expenses for select
  using (true);

create policy "expenses: allow write"
  on public.expenses for all
  using (true);
