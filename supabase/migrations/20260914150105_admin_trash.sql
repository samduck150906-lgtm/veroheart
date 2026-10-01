CREATE TABLE IF NOT EXISTS public.admin_trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'ingredient')),
  entity_id UUID NOT NULL,
  label TEXT NOT NULL,
  sub_label TEXT,
  snapshot JSONB NOT NULL,
  deleted_by TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  restored_by TEXT,
  restored_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_trash_pending
  ON public.admin_trash (deleted_at DESC)
  WHERE restored_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_trash_entity
  ON public.admin_trash (entity_type, entity_id);

COMMENT ON TABLE public.admin_trash IS
  '관리자 콘솔에서 삭제한 제품·성분의 복원용 스냅샷. service_role(admin-write)만 접근한다.';

ALTER TABLE public.admin_trash ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_trash FROM anon, authenticated;;
