-- DB Migration: Custom Domain + Multi-Page + Space Membership + SMTP
-- Chạy các lệnh này nếu chưa tạo (bỏ qua nếu đã tạo)

-- 1. custom_domain trên spaces
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE;

-- 2. SMTP per-space
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255);
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 465;
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255);
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS smtp_pass VARCHAR(255);
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS smtp_from_name VARCHAR(255);

-- 3. space_pages
CREATE TABLE IF NOT EXISTS space_pages (
    id           SERIAL PRIMARY KEY,
    space_id     INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    slug         VARCHAR(100) NOT NULL,
    page_type    VARCHAR(20) DEFAULT 'custom' CHECK (page_type IN ('home','about','contact','custom')),
    html         TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (space_id, slug)
);

-- 4. space_page_assets
CREATE TABLE IF NOT EXISTS space_page_assets (
    id         SERIAL PRIMARY KEY,
    space_id   INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    file_type  VARCHAR(10) NOT NULL CHECK (file_type IN ('css','js','image','other')),
    filename   VARCHAR(255) NOT NULL,
    url        VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. space_members
CREATE TABLE IF NOT EXISTS space_members (
    id        SERIAL PRIMARY KEY,
    space_id  INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (space_id, user_id)
);
