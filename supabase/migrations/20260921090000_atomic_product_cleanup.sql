-- 제품명·브랜드 검토 적용을 한 DB 트랜잭션 안에서 처리한다.
-- 각 항목은 행 잠금 + 기존값 비교로 동시 수정을 감지하며, 감사 로그 실패 시
-- 해당 항목의 제품 변경도 함께 롤백된다. service_role 외에는 호출할 수 없다.

CREATE OR REPLACE FUNCTION public.admin_apply_product_cleanup(
  p_items JSONB,
  p_actor TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item JSONB;
  v_id UUID;
  v_current RECORD;
  v_expected_name TEXT;
  v_expected_brand TEXT;
  v_target_name TEXT;
  v_target_brand TEXT;
  v_has_name BOOLEAN;
  v_has_brand BOOLEAN;
  v_duplicate_id UUID;
  v_batch_id UUID := gen_random_uuid();
  v_results JSONB := '[]'::JSONB;
  v_status TEXT;
  v_applied INTEGER := 0;
  v_conflicts INTEGER := 0;
  v_failed INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION '정리할 제품이 없습니다.';
  END IF;
  IF jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION '한 번에 최대 100개까지 정리할 수 있습니다.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_id := (v_item->>'id')::UUID;
      v_expected_name := btrim(v_item->>'expected_name');
      v_expected_brand := btrim(v_item->>'expected_brand_name');
      v_has_name := v_item->'name' IS NOT NULL AND jsonb_typeof(v_item->'name') <> 'null';
      v_has_brand := v_item->'brand_name' IS NOT NULL AND jsonb_typeof(v_item->'brand_name') <> 'null';
      v_target_name := CASE WHEN v_has_name THEN btrim(v_item->>'name') ELSE NULL END;
      v_target_brand := CASE WHEN v_has_brand THEN btrim(v_item->>'brand_name') ELSE NULL END;

      SELECT id, name, brand_name
        INTO v_current
        FROM public.products
       WHERE id = v_id
       FOR UPDATE;

      IF NOT FOUND THEN
        v_status := 'not_found';
        v_failed := v_failed + 1;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'id', v_id, 'status', v_status, 'message', '제품을 찾을 수 없습니다.'
        ));
        CONTINUE;
      END IF;

      v_target_name := COALESCE(v_target_name, v_current.name);
      v_target_brand := COALESCE(v_target_brand, v_current.brand_name);

      -- 같은 요청 재전송: 이미 목표값이면 성공으로 간주하되 다시 쓰거나 감사 로그를 쌓지 않는다.
      IF v_current.name = v_target_name AND v_current.brand_name = v_target_brand THEN
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'id', v_id, 'status', 'already_applied', 'message', '이미 같은 값이 적용되어 있습니다.'
        ));
        CONTINUE;
      END IF;

      IF v_current.name <> v_expected_name OR v_current.brand_name <> v_expected_brand THEN
        v_conflicts := v_conflicts + 1;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'id', v_id,
          'status', 'conflict',
          'message', '다른 운영자가 제품명 또는 브랜드를 변경했습니다.',
          'current', jsonb_build_object('name', v_current.name, 'brand_name', v_current.brand_name)
        ));
        CONTINUE;
      END IF;

      IF v_target_name = '' OR v_target_brand = '' THEN
        RAISE EXCEPTION '제품명과 브랜드는 비워 둘 수 없습니다.';
      END IF;

      -- 공백·기호·대소문자만 다른 사실상 동일한 제품명+브랜드도 서버에서 최종 차단한다.
      SELECT id INTO v_duplicate_id
        FROM public.products
       WHERE id <> v_id
         AND regexp_replace(lower(name), '[[:space:][:punct:]]', '', 'g') =
             regexp_replace(lower(v_target_name), '[[:space:][:punct:]]', '', 'g')
         AND regexp_replace(lower(brand_name), '[[:space:][:punct:]]', '', 'g') =
             regexp_replace(lower(v_target_brand), '[[:space:][:punct:]]', '', 'g')
       LIMIT 1;
      IF v_duplicate_id IS NOT NULL THEN
        v_conflicts := v_conflicts + 1;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'id', v_id,
          'status', 'duplicate',
          'message', '적용 후 다른 제품과 제품명·브랜드가 같아집니다.',
          'duplicateProductId', v_duplicate_id
        ));
        CONTINUE;
      END IF;

      UPDATE public.products
         SET name = CASE WHEN v_has_name THEN v_target_name ELSE name END,
             brand_name = CASE WHEN v_has_brand THEN v_target_brand ELSE brand_name END
       WHERE id = v_id;

      INSERT INTO public.admin_audit_log (
        actor, action, target_table, target_id, detail
      ) VALUES (
        COALESCE(NULLIF(btrim(p_actor), ''), 'unknown'),
        'applyProductCleanup',
        'products',
        v_id::TEXT,
        jsonb_build_object(
          'batchId', v_batch_id,
          'before', jsonb_build_object('name', v_current.name, 'brand_name', v_current.brand_name),
          'after', jsonb_build_object('name', v_target_name, 'brand_name', v_target_brand),
          'changedFields', ARRAY_REMOVE(ARRAY[
            CASE WHEN v_has_name AND v_current.name <> v_target_name THEN 'name' END,
            CASE WHEN v_has_brand AND v_current.brand_name <> v_target_brand THEN 'brand_name' END
          ], NULL)
        )
      );

      v_applied := v_applied + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'id', v_id,
        'status', 'applied',
        'before', jsonb_build_object('name', v_current.name, 'brand_name', v_current.brand_name),
        'after', jsonb_build_object('name', v_target_name, 'brand_name', v_target_brand)
      ));
    EXCEPTION WHEN OTHERS THEN
      -- 이 BEGIN 블록은 하위 트랜잭션이므로 제품 UPDATE와 감사 로그 INSERT가 함께 롤백된다.
      v_failed := v_failed + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'id', COALESCE(v_item->>'id', ''),
        'status', 'failed',
        'message', SQLERRM
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'batchId', v_batch_id,
    'requested', jsonb_array_length(p_items),
    'applied', v_applied,
    'conflicts', v_conflicts,
    'failed', v_failed,
    'results', v_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_apply_product_cleanup(JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_apply_product_cleanup(JSONB, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_apply_product_cleanup(JSONB, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_product_cleanup(JSONB, TEXT) TO service_role;
