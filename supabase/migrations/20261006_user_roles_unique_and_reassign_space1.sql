-- Migration: 20261006_user_roles_unique_and_reassign_space1.sql

-- 1. Deduplicate user_roles if any duplicate assignments exist
DELETE FROM user_roles a
USING user_roles b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.role_id = b.role_id;

-- 2. Add UNIQUE constraint on (user_id, role_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_roles_user_id_role_id_key'
          AND conrelid = 'user_roles'::regclass
    ) THEN
        ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);
    END IF;
END $$;

-- 3. Reassign Space 1 operators to Role 11 ("Owner AI" of Space 1)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, 11
FROM users u
WHERE u.id IN (5, 6, 97, 100, 101, 102, 103, 104, 105, 107, 108, 109, 111, 112, 241, 242, 243, 244, 286)
ON CONFLICT (user_id, role_id) DO NOTHING;
