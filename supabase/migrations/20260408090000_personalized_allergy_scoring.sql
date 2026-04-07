-- Personalized allergy scoring foundation (v1)
-- Adds normalized allergen tables without breaking existing text[] fields.

CREATE TABLE IF NOT EXISTS public.allergens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  display_name_ko TEXT NOT NULL,
  parent_id UUID REFERENCES public.allergens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF to_regclass('public.ingredients') IS NOT NULL THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS public.ingredient_allergen_map (
        ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
        allergen_id UUID NOT NULL REFERENCES public.allergens(id) ON DELETE CASCADE,
        confidence TEXT NOT NULL DEFAULT ''exact'' CHECK (confidence IN (''exact'', ''derived'')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (ingredient_id, allergen_id)
      );
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.pets') IS NOT NULL THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS public.pet_allergy_profile (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
        allergen_id UUID NOT NULL REFERENCES public.allergens(id) ON DELETE CASCADE,
        profile_type TEXT NOT NULL CHECK (profile_type IN (''allergy'', ''avoidance'')),
        severity TEXT CHECK (severity IN (''confirmed'', ''suspected'')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT pet_allergy_profile_unique UNIQUE (pet_id, allergen_id, profile_type)
      );
    ';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_allergens_parent_id ON public.allergens(parent_id);
DO $$
BEGIN
  IF to_regclass('public.ingredient_allergen_map') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ingredient_allergen_map_allergen_id ON public.ingredient_allergen_map(allergen_id)';
  END IF;
  IF to_regclass('public.pet_allergy_profile') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_pet_allergy_profile_pet_id ON public.pet_allergy_profile(pet_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_pet_allergy_profile_allergen_id ON public.pet_allergy_profile(allergen_id)';
  END IF;
END $$;

ALTER TABLE public.allergens ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF to_regclass('public.ingredient_allergen_map') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.ingredient_allergen_map ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.pet_allergy_profile') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.pet_allergy_profile ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

DROP POLICY IF EXISTS "Anyone can view allergens" ON public.allergens;
CREATE POLICY "Anyone can view allergens"
  ON public.allergens FOR SELECT
  USING (true);

DO $$
BEGIN
  IF to_regclass('public.ingredient_allergen_map') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view ingredient_allergen_map" ON public.ingredient_allergen_map';
    EXECUTE '
      CREATE POLICY "Anyone can view ingredient_allergen_map"
      ON public.ingredient_allergen_map FOR SELECT
      USING (true)
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.pet_allergy_profile') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage own pet allergy profile" ON public.pet_allergy_profile';
    EXECUTE '
      CREATE POLICY "Users can manage own pet allergy profile"
      ON public.pet_allergy_profile FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.pets p
          WHERE p.id = pet_allergy_profile.pet_id
          AND p.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.pets p
          WHERE p.id = pet_allergy_profile.pet_id
          AND p.user_id = auth.uid()
        )
      )
    ';
  END IF;
END $$;

-- Trigger for updated_at management
DO $$
BEGIN
  IF to_regclass('public.pet_allergy_profile') IS NOT NULL THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.set_pet_allergy_profile_updated_at()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $fn$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $fn$
    ';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_pet_allergy_profile_updated_at ON public.pet_allergy_profile';
    EXECUTE '
      CREATE TRIGGER trg_pet_allergy_profile_updated_at
      BEFORE UPDATE ON public.pet_allergy_profile
      FOR EACH ROW
      EXECUTE FUNCTION public.set_pet_allergy_profile_updated_at()
    ';
  END IF;
END $$;
