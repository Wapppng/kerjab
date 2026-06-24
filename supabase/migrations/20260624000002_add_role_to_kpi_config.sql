-- Add role column to kpi_config if it doesn't exist
-- This migration fixes the kpi_config table to include role column

-- 1. First, drop the foreign key constraint from tasks table
ALTER TABLE IF EXISTS tasks DROP CONSTRAINT IF EXISTS tasks_kpi_level_fkey CASCADE;

-- 2. Add role column if missing
ALTER TABLE IF EXISTS kpi_config ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'designer';

-- 3. Update existing rows to have role = 'designer' if null
UPDATE kpi_config SET role = 'designer' WHERE role IS NULL;

-- 4. Make role NOT NULL after data is set
ALTER TABLE IF EXISTS kpi_config ALTER COLUMN role SET NOT NULL;

-- 5. Add check constraint for role (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kpi_config_role_check'
  ) THEN
    ALTER TABLE kpi_config ADD CONSTRAINT kpi_config_role_check CHECK (role IN ('designer', 'video_editor'));
  END IF;
END $$;

-- 6. Drop old primary key constraint (only level)
ALTER TABLE IF EXISTS kpi_config DROP CONSTRAINT IF EXISTS kpi_config_pkey;

-- 7. Create new composite primary key (level, role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kpi_config_pkey' AND conrelid = 'kpi_config'::regclass
  ) THEN
    ALTER TABLE kpi_config ADD CONSTRAINT kpi_config_pkey PRIMARY KEY (level, role);
  END IF;
END $$;

-- 8. Create unique constraint on level alone for tasks to reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kpi_config_level_unique'
  ) THEN
    ALTER TABLE kpi_config ADD CONSTRAINT kpi_config_level_unique UNIQUE (level);
  END IF;
END $$;

-- 9. Recreate foreign key constraint on tasks table (references level only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_kpi_level_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_kpi_level_fkey FOREIGN KEY (kpi_level) REFERENCES kpi_config(level);
  END IF;
END $$;
