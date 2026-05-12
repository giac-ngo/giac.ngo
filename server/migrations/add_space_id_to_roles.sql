-- Migration: Add space_id to roles table for Space-scoped Role Management
-- Roles with space_id = NULL are system roles (created by Global Admin)
-- Roles with space_id = X are space-specific roles (created by Space Owners)

ALTER TABLE roles ADD COLUMN IF NOT EXISTS space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE;

-- Drop the old unique constraint on name only
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key;

-- Add new unique constraint: name must be unique within the same space (or within system roles)
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name_space_unique ON roles (name, COALESCE(space_id, 0));

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_roles_space_id ON roles(space_id);
