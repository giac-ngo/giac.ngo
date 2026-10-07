-- Migration: Remove global-only permissions from space roles
-- Description: Gỡ các quyền manual-billing, finetune khỏi mọi role gắn với Space (roles.space_id IS NOT NULL)
-- Lưu ý: 'pricing' được giữ lại cho Space roles để từng Space tự cấu hình gói cước của mình.

UPDATE roles
SET permissions = array_remove(array_remove(permissions, 'manual-billing'), 'finetune')
WHERE space_id IS NOT NULL
  AND permissions && ARRAY['manual-billing','finetune']::text[];
