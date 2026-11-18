-- ============================================================================
-- SYSTEM RESET — Clear ALL Data but RETAIN User Accounts
-- Keeps: public.profiles + auth.users (all logins preserved)
-- Clears: stocks, transactions, transaction items, restock history, expenses
--
-- HOW TO RUN:
--   1. Go to: https://supabase.com/dashboard
--   2. Select your project
--   3. Click "SQL Editor" in the left menu
--   4. Click "New Query"
--   5. Paste this entire script and click "Run" (or Ctrl+Enter)
--
-- ⚠️  WARNING: This is IRREVERSIBLE. Business data will be permanently deleted.
-- ============================================================================

BEGIN;

-- Child tables first (respects foreign key constraints)
TRUNCATE TABLE public.transaction_items  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.transactions       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.restock_history    RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.stock_items        RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.expenses           RESTART IDENTITY CASCADE;

-- ✅ public.profiles and auth.users are NOT touched — all user accounts retained.

COMMIT;

-- ── DONE ─────────────────────────────────────────────────────────────────────
-- After running this SQL, also clear localStorage in your browser:
--
--   Open browser DevTools (F12) → Console tab → paste and run:
--
--   ['inv_stocks_data','inv_transactions','inv_expenses_data','inv_system_settings'].forEach(
--     k => localStorage.removeItem(k)
--   );
--   console.log('LocalStorage cleared ✓');
--
-- Then refresh the page — users stay logged in, all business data is gone.
-- ============================================================================
