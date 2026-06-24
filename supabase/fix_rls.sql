-- Benerin RLS: admin check pake security definer biar gak recursion

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Drop & recreate profiles policies
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR is_admin()
  );

CREATE POLICY profiles_update ON profiles
  FOR UPDATE
  USING (
    id = auth.uid()
    AND role IN ('designer', 'video_editor')
  )
  WITH CHECK (
    id = auth.uid()
    AND role IN ('designer', 'video_editor')
  );

-- Drop & recreate tasks policies
DROP POLICY IF EXISTS tasks_select ON tasks;
DROP POLICY IF EXISTS tasks_insert ON tasks;
DROP POLICY IF EXISTS tasks_update ON tasks;
DROP POLICY IF EXISTS tasks_delete ON tasks;

CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (
    user_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY tasks_delete ON tasks
  FOR DELETE USING (
    user_id = auth.uid()
    OR is_admin()
  );

-- RLS untuk kpi_config: semua user authenticated bisa baca, cuma admin bisa tulis
ALTER TABLE kpi_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kpi_config_select ON kpi_config;
DROP POLICY IF EXISTS kpi_config_insert ON kpi_config;
DROP POLICY IF EXISTS kpi_config_update ON kpi_config;

CREATE POLICY kpi_config_select ON kpi_config
  FOR SELECT USING (true);

CREATE POLICY kpi_config_insert ON kpi_config
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY kpi_config_update ON kpi_config
  FOR UPDATE USING (is_admin());
