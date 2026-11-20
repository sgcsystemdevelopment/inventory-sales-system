-- ============================================================================
-- ALLOW EDIT & DELETE ON TRANSACTIONS & TRANSACTION_ITEMS
-- Run this query in Supabase -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Allow DELETE on transactions
drop policy if exists "transactions: allow delete" on public.transactions;
create policy "transactions: allow delete"
  on public.transactions for delete
  using (true);

-- 2. Allow UPDATE on transaction_items
drop policy if exists "transaction_items: allow update" on public.transaction_items;
create policy "transaction_items: allow update"
  on public.transaction_items for update
  using (true);

-- 3. Allow DELETE on transaction_items
drop policy if exists "transaction_items: allow delete" on public.transaction_items;
create policy "transaction_items: allow delete"
  on public.transaction_items for delete
  using (true);
