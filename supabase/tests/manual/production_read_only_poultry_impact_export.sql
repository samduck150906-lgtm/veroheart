-- Veroheart production read-only poultry impact export
-- Purpose: export product + ingredient source rows for offline/harness analysis.
-- Safety: one SELECT statement only. This file must never contain DML, DDL, RPC, or transaction-changing statements.

SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.main_category,
  p.target_pet_type,
  pi.ingredient_id,
  pi.sort_order,
  i.name_ko AS ingredient_name_ko,
  i.name_en AS ingredient_name_en,
  i.risk_level::text AS ingredient_risk_level
FROM public.products AS p
LEFT JOIN public.product_ingredients AS pi
  ON pi.product_id = p.id
LEFT JOIN public.ingredients AS i
  ON i.id = pi.ingredient_id
ORDER BY
  p.id,
  pi.sort_order NULLS LAST,
  pi.ingredient_id;
