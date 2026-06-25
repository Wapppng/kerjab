ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_date DATE;

UPDATE public.tasks
SET task_date = (created_at AT TIME ZONE 'Asia/Jakarta')::date
WHERE task_date IS NULL;

ALTER TABLE public.tasks
  ALTER COLUMN task_date SET DEFAULT ((NOW() AT TIME ZONE 'Asia/Jakarta')::date),
  ALTER COLUMN task_date SET NOT NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT;

UPDATE public.tasks
SET created_by = user_id
WHERE created_by IS NULL;

ALTER TABLE public.tasks
  ALTER COLUMN created_by SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON public.tasks(task_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_profile(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    profile_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.tasks
      WHERE (user_id = auth.uid() OR created_by = auth.uid())
        AND (user_id = profile_id OR created_by = profile_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.enforce_task_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(auth.uid(), NEW.created_by, NEW.user_id);
  ELSE
    NEW.created_by := OLD.created_by;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_task_creator_identity ON public.tasks;
CREATE TRIGGER enforce_task_creator_identity
  BEFORE INSERT OR UPDATE OF created_by ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_task_creator();

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (public.can_view_profile(id));

DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;
DROP POLICY IF EXISTS tasks_delete ON public.tasks;

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (user_id = auth.uid() OR public.is_admin())
  );

CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin()
  );
