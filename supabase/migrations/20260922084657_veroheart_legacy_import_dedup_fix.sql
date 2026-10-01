create or replace function public.import_legacy_veroheart(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_kind text := payload->>'kind';
  v_token text := payload->>'token';
  n int := 0;
begin
  if v_token is distinct from 'vh-2026-09-22-migrate' then
    raise exception 'bad token';
  end if;

  if v_kind = 'ingredients' then
    insert into public.ingredients (id,name_ko,name_en,risk_level,description,caution_conditions,allergy_triggers,created_at)
    select (r->>0)::uuid, r->>1, r->>2, (r->>3)::risk_level_enum, r->>4,
           coalesce((select array_agg(x) from jsonb_array_elements_text(r->5) x),'{}'::text[]),
           coalesce((select array_agg(x) from jsonb_array_elements_text(r->6) x),'{}'::text[]),
           (r->>7)::timestamptz
    from jsonb_array_elements(payload->'rows') r
    where not exists (select 1 from public.ingredients i where i.name_ko = r->>1)
      and not exists (select 1 from public.ingredients i2 where i2.id = (r->>0)::uuid);
    get diagnostics n = row_count;

  elsif v_kind = 'products' then
    insert into public.products (id,name,brand_name,product_type,target_pet_type,image_url,avg_rating,review_count,min_price,created_at,main_category,sub_category,target_life_stage,formulation,product_health_concerns,has_risk_factors,coupang_link,legacy_source)
    select (r->>0)::uuid, r->>1, r->>2, r->>3, r->>4, r->>5,
           (r->>6)::numeric, (r->>7)::int, nullif((r->>8)::int,0), (r->>9)::timestamptz, r->>10, r->>11,
           coalesce((select array_agg(x) from jsonb_array_elements_text(r->12) x),'{}'::text[]),
           r->>13,
           coalesce((select array_agg(x) from jsonb_array_elements_text(r->14) x),'{}'::text[]),
           coalesce((select array_agg(x) from jsonb_array_elements_text(r->15) x),'{}'::text[]),
           r->>16,
           coalesce(r->>17,'veroheart')
    from jsonb_array_elements(payload->'rows') r
    where not exists (select 1 from public.products p where p.id = (r->>0)::uuid)
      -- only guard against veroro's own pre-existing catalogue, not against
      -- legitimate same-name duplicates coming from veroheart itself
      and not exists (select 1 from public.products p2 where p2.legacy_source is null and p2.name = r->>1 and p2.brand_name = r->>2);
    get diagnostics n = row_count;

  elsif v_kind = 'product_ingredients' then
    insert into public.product_ingredients (product_id, ingredient_id, sort_order)
    select (r->>0)::uuid, i.id, (r->>2)::int
    from jsonb_array_elements(payload->'rows') r
    join public.ingredients i on i.name_ko = r->>1
    where exists (select 1 from public.products p where p.id = (r->>0)::uuid)
    on conflict (product_id, ingredient_id) do nothing;
    get diagnostics n = row_count;

  else
    raise exception 'unknown kind %', v_kind;
  end if;

  return jsonb_build_object('kind', v_kind, 'inserted', n);
end;
$fn$;;
