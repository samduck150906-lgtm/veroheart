-- 관리자 삭제 안전망(휴지통).
--
-- 제품·성분 삭제는 되돌릴 수 없어서 오조작 한 번이 곧 데이터 손실이었다.
-- soft delete 로 바꾸면 앱의 모든 조회 경로에 `deleted_at is null` 을 붙여야 하고
-- 한 곳만 빠져도 삭제한 제품이 사용자에게 다시 보인다. 그래서 삭제는 그대로
-- 두되, 삭제 직전 행과 자식 행을 스냅샷으로 남겨 복원할 수 있게 한다.
--
-- 보존 기간은 운영 정책상 30일이며, 그 전이라도 관리자가 영구 삭제할 수 있다.

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'ingredient')),
  entity_id UUID NOT NULL,
  /** 목록에서 무엇을 지웠는지 알아볼 수 있는 이름(제품명 / 성분명). */
  label TEXT NOT NULL,
  sub_label TEXT,
  /** 삭제 직전의 행과 자식 행 전체. 복원은 이 값만으로 이뤄진다. */
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
-- 의도적으로 정책 없음: service_role 만 읽고 쓴다.
REVOKE ALL ON TABLE public.admin_trash FROM anon, authenticated;

COMMIT;
