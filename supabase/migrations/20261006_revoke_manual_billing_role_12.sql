-- Migration: 20261006_revoke_manual_billing_role_12.sql
-- Gỡ bỏ quyền manual-billing bị gán nhầm cho role 12 ('User' của Space 1)
UPDATE roles
SET permissions = array_remove(permissions, 'manual-billing')
WHERE id = 12;
