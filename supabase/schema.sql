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
  estimasi_waktu_menit INT NOT NULL,
  realisasi_waktu_menit INT,
  link_hasil TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'progress', 'review', 'selesai')) DEFAULT 'pending',
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
    'designer'
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

-- Profiles: users can read their own, admins can read all
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Tasks: karyawan CRUD own tasks, admin CRUD all
CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY tasks_delete ON tasks
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
