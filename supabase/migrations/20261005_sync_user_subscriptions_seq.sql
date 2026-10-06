-- Migration: Synchronize user_subscriptions_id_seq with MAX(id)
-- 
-- IMPORTANT OPERATIONAL NOTE:
-- In PostgreSQL, setval() operations are non-transactional and take immediate global effect.
-- To prevent race conditions where a concurrent transaction acquires nextval() between the
-- evaluation of MAX(id) and setval(), this migration explicitly acquires an EXCLUSIVE lock
-- on user_subscriptions for the duration of the transaction.
-- 
-- RECOMMENDATION:
-- Run during a maintenance window or deployment window when write traffic to user_subscriptions
-- is paused, or allow the brief (millisecond) EXCLUSIVE lock below to serialize pending writes.

BEGIN;

-- Lock table to block concurrent INSERT/UPDATE operations while sequence is evaluated and set
LOCK TABLE user_subscriptions IN EXCLUSIVE MODE;

SELECT setval(
    pg_get_serial_sequence('user_subscriptions', 'id'),
    GREATEST(
        COALESCE((SELECT MAX(id) FROM user_subscriptions), 1),
        COALESCE((SELECT last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'user_subscriptions_id_seq'), 1)
    ),
    true
);

COMMIT;
