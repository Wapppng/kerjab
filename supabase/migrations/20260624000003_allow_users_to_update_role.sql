-- Allow non-admin users to update their own work role without allowing admin escalation
DROP POLICY IF EXISTS profiles_update ON profiles;

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
