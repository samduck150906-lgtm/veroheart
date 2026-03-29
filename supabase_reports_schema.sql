-- NEW TABLE: analysis_reports
-- Stores user's previous ingredient analysis results for later review in Mypage

CREATE TABLE IF NOT EXISTS public.analysis_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  raw_text text,
  analysis_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own reports" ON public.analysis_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports" ON public.analysis_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" ON public.analysis_reports
  FOR DELETE USING (auth.uid() = user_id);

-- GUEST ACCESS (for demo purposes)
-- Allows anon users to insert into this table if we allow them
-- However, we'll focus on logged-in users first as per V2 roadmap.
