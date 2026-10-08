-- migrations/20261008_space_admins.sql
-- Description: Bảng lưu danh sách Admin Space phụ cho từng Space (nhiều Admin Space cho 1 Space)

CREATE TABLE IF NOT EXISTS space_admins (
  space_id   INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  added_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_admins_user ON space_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_space_admins_space ON space_admins(space_id);
