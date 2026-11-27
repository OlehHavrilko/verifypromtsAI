
-- 1. profiles: restrict to authenticated
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 2. template_ratings: restrict to authenticated
DROP POLICY IF EXISTS "Users can view all ratings" ON public.template_ratings;
DROP POLICY IF EXISTS "Users can insert own rating" ON public.template_ratings;
DROP POLICY IF EXISTS "Users can update own rating" ON public.template_ratings;
DROP POLICY IF EXISTS "Users can delete own rating" ON public.template_ratings;

CREATE POLICY "Users can view all ratings" ON public.template_ratings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own rating" ON public.template_ratings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rating" ON public.template_ratings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rating" ON public.template_ratings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. user_templates: restrict to authenticated
DROP POLICY IF EXISTS "Users can view own templates" ON public.user_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON public.user_templates;
DROP POLICY IF EXISTS "Users can create own templates" ON public.user_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.user_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.user_templates;

CREATE POLICY "Users can view own templates" ON public.user_templates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view public templates" ON public.user_templates
  FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "Users can create own templates" ON public.user_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.user_templates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.user_templates
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. prompt_template_versions: only admins can SELECT (edge functions use service_role and bypass RLS)
DROP POLICY IF EXISTS "Authenticated read versions" ON public.prompt_template_versions;

-- 5. usage_limits: drop client INSERT/UPDATE, expose safe RPCs
DROP POLICY IF EXISTS "Users can insert their own limits" ON public.usage_limits;
DROP POLICY IF EXISTS "Users can update their own limits" ON public.usage_limits;

-- ensure_usage_limits: create a free-tier row if missing; returns the row
CREATE OR REPLACE FUNCTION public.ensure_usage_limits()
RETURNS public.usage_limits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.usage_limits;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.usage_limits WHERE user_id = v_uid;

  IF NOT FOUND THEN
    INSERT INTO public.usage_limits (user_id, tier, daily_limit, monthly_limit)
    VALUES (v_uid, 'free', 10, 100)
    RETURNING * INTO v_row;
  ELSIF v_row.last_daily_reset < CURRENT_DATE THEN
    UPDATE public.usage_limits
       SET daily_generations_used = 0,
           last_daily_reset = now()
     WHERE user_id = v_uid
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

-- increment_usage: atomic increment + limit check; tier/limits cannot be changed by client
CREATE OR REPLACE FUNCTION public.increment_usage()
RETURNS public.usage_limits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.usage_limits;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ensure row exists / daily reset applied
  v_row := public.ensure_usage_limits();

  IF v_row.daily_generations_used >= v_row.daily_limit THEN
    RAISE EXCEPTION 'daily_limit_reached';
  END IF;
  IF v_row.monthly_generations_used >= v_row.monthly_limit THEN
    RAISE EXCEPTION 'monthly_limit_reached';
  END IF;

  UPDATE public.usage_limits
     SET daily_generations_used = daily_generations_used + 1,
         monthly_generations_used = monthly_generations_used + 1,
         updated_at = now()
   WHERE user_id = v_uid
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_usage_limits() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_usage_limits() TO authenticated;
REVOKE ALL ON FUNCTION public.increment_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_usage() TO authenticated;

-- 6. Revoke execute on trigger helpers (called only by triggers, no need for caller exec)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_daily_limits() FROM PUBLIC, anon, authenticated;
