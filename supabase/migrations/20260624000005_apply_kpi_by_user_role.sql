-- Store the KPI weight used by each task
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS kpi_bobot INT;

-- Remove level-only constraints that are incompatible with per-role KPI rows
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_kpi_level_fkey;

ALTER TABLE public.kpi_config
  DROP CONSTRAINT IF EXISTS kpi_config_level_unique;

-- Backfill existing tasks using the owner's current role
UPDATE public.tasks AS task
SET kpi_bobot = config.bobot
FROM public.profiles AS profile
JOIN public.kpi_config AS config
  ON config.role = CASE
    WHEN profile.role = 'video_editor' THEN 'video_editor'
    ELSE 'designer'
  END
WHERE profile.id = task.user_id
  AND config.level = task.kpi_level
  AND task.kpi_bobot IS NULL;

UPDATE public.tasks
SET kpi_bobot = kpi_level
WHERE kpi_bobot IS NULL;

ALTER TABLE public.tasks
  ALTER COLUMN kpi_bobot SET DEFAULT 1,
  ALTER COLUMN kpi_bobot SET NOT NULL;

-- Always derive weight and estimate from the task owner's role
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

DROP TRIGGER IF EXISTS set_task_kpi_config ON public.tasks;

CREATE TRIGGER set_task_kpi_config
  BEFORE INSERT OR UPDATE OF user_id, kpi_level ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION apply_task_kpi_config();
