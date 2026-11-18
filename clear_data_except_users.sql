-- ============================================================================
-- SQL: Clear All Stored Data Except Users (profiles & auth.users)
-- Run this script in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

BEGIN;

-- TRUNCATE clears all records instantly and CASCADE cleanly clears child tables:
-- 1. transaction_items (line items for transactions)
-- 2. transactions (sales & checkout records)
-- 3. restock_history (stock adjustment/restock audit logs)
-- 4. stock_items (products & inventory list)
-- 5. expenses (operating expenses records)
--
-- Tables PRESERVED:
--  - public.profiles (user accounts, roles, profiles)
--  - auth.users (Supabase authentication credentials)

TRUNCATE TABLE 
  public.transaction_items,
  public.transactions,
  public.restock_history,
  public.stock_items,
  public.expenses
CASCADE;

COMMIT;
