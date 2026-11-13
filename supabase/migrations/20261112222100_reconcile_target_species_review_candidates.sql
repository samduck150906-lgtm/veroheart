BEGIN;
SET LOCAL lock_timeout='3s';
-- The candidate list is a warning, not evidence of species. Only EVOLVE was
-- source-confirmed. Other uncertain records lose the historic default; none is
-- approved or made public. Preserve full before/after records for guarded undo.
CREATE TABLE private.species_repair_20261113 (
 product_id uuid PRIMARY KEY, before_row jsonb NOT NULL, after_row jsonb,
 reason text NOT NULL, source_url text, repaired_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.species_repair_20261113 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.species_repair_20261113 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON private.species_repair_20261113 TO service_role;
WITH candidates(id,name,target) AS (VALUES ('492f2ebf-b6cc-44fa-a3e7-431757d6c245'::uuid,'EVOLVE 전연령용 캣 건식사료, 닭, 6.8kg, 1개','dog'),
('2c99d5d7-9af4-4917-9e4e-e47bff6edfaa'::uuid,'블루버팔로 어덜트 캣 인도어 건식사료, 닭, 4.9kg, 1개','dog'),
('e04e0c4f-1521-4148-ad8d-b99cb3f27bfb'::uuid,'닥터뉴토 강아지 고양이 고단백 통살 간식 (100% 국내산 순살), 30개, 20g, 북어','dog'),
('7cb74363-c194-4f42-a5f9-844939e832c3'::uuid,'팔공구 동결건조 야채 동결건조간식 강아지 고양이트릿','dog'),
('5b872dfd-158c-4b1f-b6e2-6a784e2ec003'::uuid,'맘스펫푸드 강아지 고양이 자연건조 국내산 무첨가 고단백 기호성 수제간식','dog'),
('5aa22ecd-1cb2-4c6e-b589-618959678748'::uuid,'펫프레시 칼슘장어 뼈튼튼 수제간식 강아지 고양이 슬개골 저알러지 눈물자국','dog'),
('2778486a-ca79-4e6c-be73-0373e7abd741'::uuid,'캐츠랑 고양이 저요저요 보양간식','dog'),
('f92263ea-41a9-4c0d-b52f-5ae090b7921d'::uuid,'펫리서치 짜먹는 고양이 간식 츄, 참치+연어+닭고기, 15g, 90개','dog'),
('1f5f981a-a67e-48eb-8ac2-74d3d13b2b56'::uuid,'맘스펫푸드 국내산 황태 강아지 고양이 저염 무첨가 고단백 기호성 수제간식, 200g, 2개, 쫄깃한 맛 황태뱃살','cat'),
('39f948a6-e632-4988-a7f5-3d90f1bdc134'::uuid,'자연애보틀 유산균 장&눈 강아지 고양이 영양간식, 오리_유산균샌드, 500g, 1개','dog'),
('7c2a765b-4476-45f3-a94b-483ffa12013f'::uuid,'강아지화식 고양이 원스 고기폭탄 습식, 80g, 8개, 연어','cat'),
('875207ea-3e92-4671-9f39-a4df1d9fdfb6'::uuid,'펫프레시 촉촉치킨25g 강아지 고양이 저알러지 눈물자국 신장 수제간식 원물간식','cat'),
('9942de90-5cc5-4a3f-b901-b93b30fa0ece'::uuid,'애니먼 강아지 고양이 애니캔 플러스 신장 습식사료, 24개, 30g, 가수분해 오리','cat'),
('c75bac4c-c91e-46ec-8907-b8b776b90bbe'::uuid,'퓨리나원 캣 기능성 사료','dog'),
('f8a6d467-ed11-492f-b1a7-e30122044110'::uuid,'펫츠아일랜드 강아지 고양이 동결대첩 동결건조 간식','dog'),
('c6139309-06e2-4305-a348-8b937c16d3b5'::uuid,'굿포펫 스틱 간식 짜개 강아지 고양이 간식 숟가락','dog'),
('15381f96-35cd-4f16-9c8f-93fc417adea5'::uuid,'마카롱 고양이 강아지 밥그릇 스테인레스 소형견 반려동물 물그릇 미끄럼방지 사료그릇 위생 펫 식기','dog'))
INSERT INTO private.species_repair_20261113(product_id,before_row,reason,source_url)
SELECT p.id,to_jsonb(p),CASE WHEN p.id='492f2ebf-b6cc-44fa-a3e7-431757d6c245' THEN 'Manufacturer dry cat food recipe page: species cat; no nutrition or formula copied.'
 ELSE 'Historic target lacks product source confirmation; preserve as unknown pending review. Product name alone is not species evidence.' END,
 CASE WHEN p.id='492f2ebf-b6cc-44fa-a3e7-431757d6c245' THEN 'https://evolvepetfood.com/dry-cat-food/evolve-classic-chicken-brown-rice-recipe-cat-food' END
FROM public.products p JOIN candidates c ON p.id=c.id AND p.name=c.name AND p.target_pet_type=c.target
WHERE p.verification_status='pending' AND p.catalog_source_url IS NULL;
UPDATE public.products p SET target_pet_type=CASE WHEN p.id='492f2ebf-b6cc-44fa-a3e7-431757d6c245' THEN 'cat' ELSE NULL END,
 catalog_source_url=coalesce(a.source_url,p.catalog_source_url),
 catalog_source_note=concat_ws(E'
',nullif(p.catalog_source_note,''),'QA-23 2026-11-13: '||a.reason),
 is_visible=CASE WHEN p.id IN('c6139309-06e2-4305-a348-8b937c16d3b5','15381f96-35cd-4f16-9c8f-93fc417adea5') THEN false ELSE p.is_visible END
FROM private.species_repair_20261113 a WHERE p.id=a.product_id;
UPDATE private.species_repair_20261113 a SET after_row=to_jsonb(p) FROM public.products p WHERE p.id=a.product_id;
COMMIT;
