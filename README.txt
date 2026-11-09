Speedora Phase 2

The frontend now uses Supabase Auth sessions across app pages and calls the Cloudflare Worker for account balances, ledger history, and server-validated mini-game rewards.

IMPORTANT SETUP:
1. Deploy backend/worker.js and configure D1 + Supabase variables as described in backend/README.md.
2. Copy the deployed Worker URL into SPEEDORA_API in app.js (replace the placeholder).
3. Apply the D1 migration.
4. Test signup/login, account sync, and game completion.

Games award internal gaming points only. Daily limit: 20 completed games per account. No cash value, offers, or withdrawals are enabled.
