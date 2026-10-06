CREATE TABLE IF NOT EXISTS payos_orders (
    order_code BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id BIGINT,
    space_id BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'paid', 'cancelled', 'failed')),
    amount NUMERIC(12, 2),
    amount_vnd BIGINT,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payos_orders_user_status_idx
    ON payos_orders (user_id, status);

ALTER TABLE payos_orders
    ADD COLUMN IF NOT EXISTS amount_vnd BIGINT;
