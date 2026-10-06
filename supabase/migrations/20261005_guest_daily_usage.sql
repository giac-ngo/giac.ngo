-- Migration: guest_daily_usage table for distributed guest rate limiting
CREATE TABLE IF NOT EXISTS guest_daily_usage (
    ip VARCHAR(64) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    count INT NOT NULL DEFAULT 1,
    PRIMARY KEY (ip, date)
);

-- PRIMARY KEY (ip, date) already indexes lookups by (ip, date) and (ip).
-- idx_guest_daily_usage_date specifically optimizes date-only filtering and background cleanup (e.g. purging records older than N days).
CREATE INDEX IF NOT EXISTS idx_guest_daily_usage_date ON guest_daily_usage(date);
