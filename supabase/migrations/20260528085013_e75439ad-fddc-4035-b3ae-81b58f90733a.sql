
-- generation_history
DROP POLICY IF EXISTS "Users can view their own history" ON public.generation_history;
DROP POLICY IF EXISTS "Users can insert their own history" ON public.generation_history;
DROP POLICY IF EXISTS "Users can delete their own history" ON public.generation_history;

CREATE POLICY "Users can view their own history" ON public.generation_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own history" ON public.generation_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own history" ON public.generation_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- saved_prompts
DROP POLICY IF EXISTS "Users can view own prompts" ON public.saved_prompts;
DROP POLICY IF EXISTS "Users can create own prompts" ON public.saved_prompts;
DROP POLICY IF EXISTS "Users can update own prompts" ON public.saved_prompts;
DROP POLICY IF EXISTS "Users can delete own prompts" ON public.saved_prompts;

CREATE POLICY "Users can view own prompts" ON public.saved_prompts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own prompts" ON public.saved_prompts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prompts" ON public.saved_prompts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prompts" ON public.saved_prompts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- usage_limits (SELECT only for users)
DROP POLICY IF EXISTS "Users can view their own limits" ON public.usage_limits;
CREATE POLICY "Users can view their own limits" ON public.usage_limits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- prompt_template_versions admin-only policy: scope role
DROP POLICY IF EXISTS "Admins manage versions" ON public.prompt_template_versions;
CREATE POLICY "Admins manage versions" ON public.prompt_template_versions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- prompt_templates admin policy: scope role
DROP POLICY IF EXISTS "Admins manage templates" ON public.prompt_templates;
CREATE POLICY "Admins manage templates" ON public.prompt_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
