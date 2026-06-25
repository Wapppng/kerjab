-- KPI Configuration
CREATE TABLE IF NOT EXISTS kpi_config (
  level INT CHECK (level BETWEEN 1 AND 5),
  role TEXT NOT NULL CHECK (role IN ('designer', 'video_editor')) DEFAULT 'designer',
  label TEXT NOT NULL,
  bobot INT NOT NULL,
  estimasi_waktu_menit INT NOT NULL,
  PRIMARY KEY (level, role)
);

INSERT INTO kpi_config (level, role, label, bobot, estimasi_waktu_menit) VALUES
  (1, 'designer', 'Sangat Mudah', 1, 30),
  (2, 'designer', 'Mudah', 2, 60),
  (3, 'designer', 'Sedang', 3, 120),
  (4, 'designer', 'Sulit', 4, 240),
  (5, 'designer', 'Sangat Sulit', 5, 480),
  (1, 'video_editor', 'Sangat Mudah', 1, 30),
  (2, 'video_editor', 'Mudah', 2, 60),
  (3, 'video_editor', 'Sedang', 3, 120),
  (4, 'video_editor', 'Sulit', 4, 240),
  (5, 'video_editor', 'Sangat Sulit', 5, 480)
ON CONFLICT (level, role) DO NOTHING;

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'designer', 'video_editor')) DEFAULT 'designer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  kategori TEXT NOT NULL CHECK (kategori IN ('artikel', 'feed_instagram', 'thumbnail', 'video', 'lain_lain')),
  kpi_level INT NOT NULL CHECK (kpi_level BETWEEN 1 AND 5),
  kpi_bobot INT NOT NULL DEFAULT 1,
  estimasi_waktu_menit INT NOT NULL,
  realisasi_waktu_menit INT,
  link_hasil TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'progress', 'review', 'selesai')) DEFAULT 'pending',
  task_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Asia/Jakarta')::date),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  waktu_terselesaikan TIMESTAMPTZ,
  kuantitas_output INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  selesai_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_kategori ON tasks(kategori);
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON tasks(task_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_completion_time ON tasks(waktu_terselesaikan) WHERE status = 'selesai';

-- Apply role-specific KPI values whenever a task is created or its KPI changes
CREATE OR REPLACE FUNCTION apply_task_kpi_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  SELECT config.bobot, config.estimasi_waktu_menit
  INTO NEW.kpi_bobot, NEW.estimasi_waktu_menit
  FROM public.profiles AS profile
  JOIN public.kpi_config AS config
    ON config.role = CASE
      WHEN profile.role = 'video_editor' THEN 'video_editor'
      ELSE 'designer'
    END
    AND config.level = NEW.kpi_level
  WHERE profile.id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KPI configuration not found for task owner and level';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_task_kpi_config
  BEFORE INSERT OR UPDATE OF user_id, kpi_level ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION apply_task_kpi_config();

-- Keep completion timestamps aligned with the task status
CREATE OR REPLACE FUNCTION sync_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'selesai' THEN
    NEW.waktu_terselesaikan := COALESCE(NEW.waktu_terselesaikan, NEW.selesai_at, NOW());
    NEW.selesai_at := NEW.waktu_terselesaikan;
  ELSE
    NEW.waktu_terselesaikan := NULL;
    NEW.selesai_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER sync_task_completion_state
  BEFORE INSERT OR UPDATE OF status, waktu_terselesaikan, selesai_at ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_completion();

-- Creator is derived from the authenticated user and cannot be reassigned
CREATE OR REPLACE FUNCTION enforce_task_creator()
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

CREATE OR REPLACE TRIGGER enforce_task_creator_identity
  BEFORE INSERT OR UPDATE OF created_by ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_task_creator();

-- Function: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' = 'video_editor' THEN 'video_editor'
      ELSE 'designer'
    END
  );
  RETURN NEW;
END;
$$;

-- Trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
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

CREATE OR REPLACE FUNCTION can_view_profile(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    profile_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.tasks
      WHERE (user_id = auth.uid() OR created_by = auth.uid())
        AND (user_id = profile_id OR created_by = profile_id)
    );
$$;

-- Profiles: users can read themselves, admins can read all, task participants can read each other
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (can_view_profile(id));

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

-- Tasks: karyawan CRUD own tasks, admin CRUD all
CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR is_admin()
  );

CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (
      user_id = auth.uid()
      OR is_admin()
    )
  );

CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR is_admin()
  ) WITH CHECK (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR is_admin()
  );

CREATE POLICY tasks_delete ON tasks
  FOR DELETE USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR is_admin()
  );
