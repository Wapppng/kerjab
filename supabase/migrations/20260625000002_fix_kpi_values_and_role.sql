-- ===== 1. Fix kpi_config values to match schema.sql (designer) =====
UPDATE public.kpi_config
SET estimasi_waktu_menit = 30
WHERE role = 'designer' AND level = 1 AND estimasi_waktu_menit != 30;

UPDATE public.kpi_config
SET estimasi_waktu_menit = 60
WHERE role = 'designer' AND level = 2 AND estimasi_waktu_menit != 60;

UPDATE public.kpi_config
SET estimasi_waktu_menit = 120
WHERE role = 'designer' AND level = 3 AND estimasi_waktu_menit != 120;

UPDATE public.kpi_config
SET estimasi_waktu_menit = 240
WHERE role = 'designer' AND level = 4 AND estimasi_waktu_menit != 240;

UPDATE public.kpi_config
SET estimasi_waktu_menit = 480
WHERE role = 'designer' AND level = 5 AND estimasi_waktu_menit != 480;

-- ===== 2. Add video_editor KPI config rows =====
INSERT INTO public.kpi_config (level, role, label, bobot, estimasi_waktu_menit)
SELECT * FROM (VALUES
  (1, 'video_editor', 'Sangat Mudah', 1, 30),
  (2, 'video_editor', 'Mudah', 2, 60),
  (3, 'video_editor', 'Sedang', 3, 120),
  (4, 'video_editor', 'Sulit', 4, 240),
  (5, 'video_editor', 'Sangat Sulit', 5, 480)
) AS v
WHERE NOT EXISTS (
  SELECT 1 FROM public.kpi_config WHERE role = 'video_editor' AND level = v.column1
);

-- ===== 3. Fix profile role constraint & values =====
-- Drop old constraint that only allowed 'admin'/'karyawan'
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add correct constraint matching schema.sql
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'designer', 'video_editor'));

-- Update roles from old 'karyawan' to 'designer'
UPDATE public.profiles
SET role = 'designer'
WHERE role = 'karyawan';

-- ===== 4. Recalculate existing tasks with correct KPI values =====
UPDATE public.tasks AS t
SET
  estimasi_waktu_menit = k.estimasi_waktu_menit,
  kpi_bobot = k.bobot
FROM public.kpi_config AS k
  JOIN public.profiles AS p ON p.id = t.user_id
WHERE k.role = CASE
    WHEN p.role = 'video_editor' THEN 'video_editor'
    ELSE 'designer'
  END
  AND k.level = t.kpi_level
  AND (t.estimasi_waktu_menit != k.estimasi_waktu_menit OR t.kpi_bobot != k.bobot);
