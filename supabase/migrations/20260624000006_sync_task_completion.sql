-- Keep task completion state and timestamps consistent.
UPDATE public.tasks
SET
  waktu_terselesaikan = CASE
    WHEN status = 'selesai' THEN COALESCE(waktu_terselesaikan, selesai_at, created_at)
    ELSE NULL
  END,
  selesai_at = CASE
    WHEN status = 'selesai' THEN COALESCE(waktu_terselesaikan, selesai_at, created_at)
    ELSE NULL
  END;

CREATE OR REPLACE FUNCTION public.sync_task_completion()
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

DROP TRIGGER IF EXISTS sync_task_completion_state ON public.tasks;

CREATE TRIGGER sync_task_completion_state
  BEFORE INSERT OR UPDATE OF status, waktu_terselesaikan, selesai_at ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_task_completion();

CREATE INDEX IF NOT EXISTS idx_tasks_completion_time
  ON public.tasks(waktu_terselesaikan)
  WHERE status = 'selesai';
