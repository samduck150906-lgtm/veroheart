BEGIN;

-- Read-time grouping only: never rewrite stored manufacturer/brand evidence.
CREATE OR REPLACE FUNCTION private.admin_catalog_brand_label(value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE regexp_replace(lower(btrim(COALESCE(value,''))),'[^a-z0-9가-힣]','','g')
  WHEN 'royalcanin' THEN '로얄캐닌' WHEN '로얄캐닌' THEN '로얄캐닌'
  WHEN 'hills' THEN '힐스' WHEN 'hillspet' THEN '힐스' WHEN '힐스' THEN '힐스'
  WHEN 'naturalcore' THEN '네츄럴코어' WHEN '네츄럴코어' THEN '네츄럴코어' WHEN '내추럴코어' THEN '네츄럴코어'
  WHEN 'harimpetfood' THEN '하림펫푸드' WHEN '하림펫푸드' THEN '하림펫푸드'
  WHEN 'inaba' THEN '이나바' WHEN '이나바' THEN '이나바'
  WHEN 'orijen' THEN '오리젠' WHEN '오리젠' THEN '오리젠'
  WHEN 'acana' THEN '아카나' WHEN '아카나' THEN '아카나'
  ELSE NULLIF(btrim(value),'') END;
$$;
REVOKE ALL ON FUNCTION private.admin_catalog_brand_label(text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.admin_catalog_products_page(
 p_filters jsonb DEFAULT '{}'::jsonb,p_page integer DEFAULT 1,p_page_size integer DEFAULT 20,
 p_sort text DEFAULT 'created_at',p_direction text DEFAULT 'desc')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
 v_search text:=NULLIF(btrim(p_filters->>'search'),'');
 v_brand text:=private.admin_catalog_brand_label(p_filters->>'brand');
 v_missing boolean:=COALESCE((p_filters->>'brandMissing')::boolean,false);
 v_category text:=NULLIF(NULLIF(btrim(p_filters->>'category'),''),'전체');
 v_pet text:=NULLIF(NULLIF(btrim(p_filters->>'petType'),''),'전체');
 v_status text:=NULLIF(NULLIF(btrim(p_filters->>'verificationStatus'),''),'전체');
 v_visibility text:=NULLIF(NULLIF(btrim(p_filters->>'visibility'),''),'전체');
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501'; END IF;
 IF p_page IS NULL OR p_page_size IS NULL OR p_sort IS NULL OR p_direction IS NULL
   OR p_page NOT BETWEEN 1 AND 1000000 OR p_page_size NOT BETWEEN 1 AND 100
   OR p_sort NOT IN('created_at','category','target','ingredients','completeness','verification')
   OR p_direction NOT IN('asc','desc') OR length(v_search)>100 OR length(v_brand)>200
 THEN RAISE EXCEPTION 'invalid_catalog_query' USING ERRCODE='22023'; END IF;
 WITH labels AS (
  SELECT l.product_id,count(i.id) FILTER(WHERE i.match_status<>'ignored')::integer AS n
  FROM public.product_ingredient_label_sets l LEFT JOIN public.product_ingredient_label_items i ON i.label_set_id=l.id
  WHERE l.is_current GROUP BY l.product_id
 ),legacy AS (
  SELECT product_id,count(*)::integer AS n FROM public.product_ingredients GROUP BY product_id
 ),nutrition AS (
  SELECT product_id,count(*)::integer AS n FROM public.nutritional_profiles GROUP BY product_id
 ),base AS MATERIALIZED (
  SELECT p.id,p.name,p.brand_name,p.main_category,p.sub_category,p.target_pet_type,p.target_life_stage,
   p.image_url,p.min_price,p.barcode,p.verification_status,p.created_at,p.is_visible,p.is_pinned,p.pinned_order,
   private.admin_catalog_brand_label(p.brand_name) AS brand_group,
   COALESCE(l.n,old.n,0) AS ingredient_count,COALESCE(n.n,0) AS nutrition_count
  FROM public.products p LEFT JOIN labels l ON l.product_id=p.id LEFT JOIN legacy old ON old.product_id=p.id
  LEFT JOIN nutrition n ON n.product_id=p.id WHERE p.catalog_archived_at IS NULL
 ),scored AS (
  SELECT b.*,round(100.0 * (
   (NULLIF(btrim(name),'') IS NOT NULL)::int+(NULLIF(btrim(brand_name),'') IS NOT NULL)::int+
   (COALESCE(target_pet_type,'')<>'')::int+(COALESCE(main_category,'')<>'')::int+
   (ingredient_count>0)::int+(nutrition_count>0)::int+
   (NULLIF(btrim(barcode),'') IS NOT NULL)::int+(NULLIF(btrim(image_url),'') IS NOT NULL)::int
  )/8)::integer AS completeness,
  CASE verification_status WHEN 'pending' THEN 0 WHEN 'reviewed' THEN 1 WHEN 'verified' THEN 2 END AS review_order
  FROM base b
 ),filtered AS MATERIALIZED (
  SELECT * FROM scored WHERE
   (v_search IS NULL OR strpos(lower(concat_ws(' ',name,brand_name,brand_group,barcode)),lower(v_search))>0)
   AND (NOT v_missing OR brand_group IS NULL)
   AND (v_brand IS NULL OR brand_group=v_brand)
   AND (v_category IS NULL OR main_category=v_category)
   AND (v_pet IS NULL OR target_pet_type=v_pet)
   AND (v_status IS NULL OR verification_status=v_status)
   AND (v_visibility IS NULL OR is_visible=(v_visibility='visible'))
   AND (COALESCE(p_filters->>'missingBarcode','false')<>'true' OR barcode IS NULL)
   AND (COALESCE(p_filters->>'missingPrice','false')<>'true' OR min_price IS NULL)
   AND (COALESCE(p_filters->>'missingImage','false')<>'true' OR image_url IS NULL)
 ),ordered AS (
  SELECT f.*,row_number() OVER(ORDER BY
   CASE WHEN p_sort='created_at' THEN is_pinned END DESC NULLS LAST,
   CASE WHEN p_sort='created_at' THEN pinned_order END ASC NULLS LAST,
   CASE WHEN p_sort='created_at' AND p_direction='asc' THEN created_at END ASC NULLS LAST,
   CASE WHEN p_sort='created_at' AND p_direction='desc' THEN created_at END DESC NULLS LAST,
   CASE WHEN p_sort='category' AND p_direction='asc' THEN NULLIF(btrim(main_category),'') END ASC NULLS LAST,
   CASE WHEN p_sort='category' AND p_direction='desc' THEN NULLIF(btrim(main_category),'') END DESC NULLS LAST,
   CASE WHEN p_sort='category' AND p_direction='asc' THEN NULLIF(btrim(sub_category),'') END ASC NULLS LAST,
   CASE WHEN p_sort='category' AND p_direction='desc' THEN NULLIF(btrim(sub_category),'') END DESC NULLS LAST,
   CASE WHEN p_sort='target' AND p_direction='asc' THEN NULLIF(btrim(target_pet_type),'') END ASC NULLS LAST,
   CASE WHEN p_sort='target' AND p_direction='desc' THEN NULLIF(btrim(target_pet_type),'') END DESC NULLS LAST,
   CASE WHEN p_sort='ingredients' AND p_direction='asc' THEN ingredient_count END ASC NULLS LAST,
   CASE WHEN p_sort='ingredients' AND p_direction='desc' THEN ingredient_count END DESC NULLS LAST,
   CASE WHEN p_sort='completeness' AND p_direction='asc' THEN completeness END ASC NULLS LAST,
   CASE WHEN p_sort='completeness' AND p_direction='desc' THEN completeness END DESC NULLS LAST,
   CASE WHEN p_sort='verification' AND p_direction='asc' THEN review_order END ASC NULLS LAST,
   CASE WHEN p_sort='verification' AND p_direction='desc' THEN review_order END DESC NULLS LAST,
   id ASC) AS position
  FROM filtered f
 ),page AS (
  SELECT position,jsonb_build_object('id',id,'name',name,'brand_name',brand_name,'main_category',main_category,
   'sub_category',sub_category,'target_pet_type',target_pet_type,'target_life_stage',target_life_stage,
   'image_url',image_url,'min_price',min_price,'barcode',barcode,'verification_status',verification_status,
   'created_at',created_at,'is_visible',is_visible,'is_pinned',is_pinned,'pinned_order',pinned_order,
   'ingredientCount',ingredient_count,'nutritionCount',nutrition_count,'completeness',completeness) AS row
  FROM ordered ORDER BY position LIMIT p_page_size OFFSET (p_page-1)*p_page_size
 ),brand_counts AS (
  SELECT brand_group,count(*) AS n,array_agg(DISTINCT brand_name ORDER BY brand_name) FILTER(WHERE NULLIF(btrim(brand_name),'') IS NOT NULL) AS aliases
  FROM base GROUP BY brand_group
 )
 SELECT jsonb_build_object('rows',COALESCE((SELECT jsonb_agg(row ORDER BY position)FROM page),'[]'::jsonb),
  'total',(SELECT count(*)FROM filtered),'brands',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',brand_group,'count',n,'aliases',COALESCE(to_jsonb(aliases),'[]'::jsonb))ORDER BY brand_group NULLS LAST)FROM brand_counts),'[]'::jsonb)) INTO result;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_catalog_products_page(jsonb,integer,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_catalog_products_page(jsonb,integer,integer,text,text) TO service_role;
COMMIT;
