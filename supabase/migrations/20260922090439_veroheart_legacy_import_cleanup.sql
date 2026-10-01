-- one-off veroheart -> veroro migration finished; remove the import entry point
revoke all on function public.import_legacy_veroheart(jsonb) from anon, authenticated;
drop function if exists public.import_legacy_veroheart(jsonb);
comment on column public.products.legacy_source is 'veroheart(구 프로젝트)에서 이관된 행 표시. 값은 veroheart의 products.source (internal / coupang_partners). NULL이면 veroro 자체 데이터.';;
