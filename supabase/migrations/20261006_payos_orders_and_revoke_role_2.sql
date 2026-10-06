-- Migration: 20261006_payos_orders_and_revoke_role_2.sql
-- 1. Ensure payos_orders has amount and message columns (legacy tables created before 20260927 were missing these)
ALTER TABLE payos_orders ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2);
ALTER TABLE payos_orders ADD COLUMN IF NOT EXISTS message TEXT;

-- 2. Revoke Role 2 ('Owner AI' system role) from non-global admins.
-- Space owners already have full authority over their own spaces via spaces.user_id = users.id.
-- Granting them role 2 inadvertently granted cross-space administrative privileges.
DELETE FROM user_roles
WHERE role_id = 2
  AND user_id NOT IN (SELECT id FROM users WHERE is_global_admin = true);

-- 3. Clean up sample accounts from older seed data
DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%@example.com');
DELETE FROM space_members WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%@example.com');
DELETE FROM user_subscriptions WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%@example.com');
DELETE FROM comments WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%@example.com');
DELETE FROM ai_user_access WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%@example.com');
DELETE FROM user_owned_ais WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%@example.com');
DELETE FROM users WHERE email ILIKE '%@example.com';
