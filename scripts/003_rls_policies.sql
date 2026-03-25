-- ============================================================
-- 003_rls_policies.sql
-- Enable RLS on all tables and create consistent policies
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- websites
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

-- Public can read published websites (anon + authenticated)
DROP POLICY IF EXISTS "Anyone can view published websites" ON public.websites;
CREATE POLICY "Anyone can view published websites"
  ON public.websites
  FOR SELECT
  USING (published = true);

-- Owners can read their own websites (including unpublished)
DROP POLICY IF EXISTS "Users can view their own websites" ON public.websites;
CREATE POLICY "Users can view their own websites"
  ON public.websites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Owners can insert
DROP POLICY IF EXISTS "Users can insert their own websites" ON public.websites;
CREATE POLICY "Users can insert their own websites"
  ON public.websites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owners can update
DROP POLICY IF EXISTS "Users can update their own websites" ON public.websites;
CREATE POLICY "Users can update their own websites"
  ON public.websites
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owners can delete
DROP POLICY IF EXISTS "Users can delete their own websites" ON public.websites;
CREATE POLICY "Users can delete their own websites"
  ON public.websites
  FOR DELETE
  USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- website_sections
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;

-- Public can read sections of published websites
DROP POLICY IF EXISTS "Anyone can view sections of published websites" ON public.website_sections;
CREATE POLICY "Anyone can view sections of published websites"
  ON public.website_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.published = true
    )
  );

-- Owners can read all sections of their own websites (including unpublished)
DROP POLICY IF EXISTS "Users can view their own website sections" ON public.website_sections;
CREATE POLICY "Users can view their own website sections"
  ON public.website_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.user_id = auth.uid()
    )
  );

-- Owners can insert sections
DROP POLICY IF EXISTS "Users can insert their own website sections" ON public.website_sections;
CREATE POLICY "Users can insert their own website sections"
  ON public.website_sections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.user_id = auth.uid()
    )
  );

-- Owners can update sections
DROP POLICY IF EXISTS "Users can update their own website sections" ON public.website_sections;
CREATE POLICY "Users can update their own website sections"
  ON public.website_sections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.user_id = auth.uid()
    )
  );

-- Owners can delete sections
DROP POLICY IF EXISTS "Users can delete their own website sections" ON public.website_sections;
CREATE POLICY "Users can delete their own website sections"
  ON public.website_sections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────
-- section_transitions
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.section_transitions ENABLE ROW LEVEL SECURITY;

-- Public can read transitions for published websites
DROP POLICY IF EXISTS "Anyone can view transitions of published websites" ON public.section_transitions;
CREATE POLICY "Anyone can view transitions of published websites"
  ON public.section_transitions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.published = true
    )
  );

-- Owners can read all transitions for their own websites
DROP POLICY IF EXISTS "Users can view their own website transitions" ON public.section_transitions;
CREATE POLICY "Users can view their own website transitions"
  ON public.section_transitions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.user_id = auth.uid()
    )
  );

-- Owners can insert transitions
DROP POLICY IF EXISTS "Users can insert their own website transitions" ON public.section_transitions;
CREATE POLICY "Users can insert their own website transitions"
  ON public.section_transitions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.user_id = auth.uid()
    )
  );

-- Owners can update transitions
DROP POLICY IF EXISTS "Users can update their own website transitions" ON public.section_transitions;
CREATE POLICY "Users can update their own website transitions"
  ON public.section_transitions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.user_id = auth.uid()
    )
  );

-- Owners can delete transitions
DROP POLICY IF EXISTS "Users can delete their own website transitions" ON public.section_transitions;
CREATE POLICY "Users can delete their own website transitions"
  ON public.section_transitions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = website_id
        AND w.user_id = auth.uid()
    )
  );
