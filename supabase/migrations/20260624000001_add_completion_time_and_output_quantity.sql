ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS waktu_terselesaikan TIMESTAMPTZ;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS kuantitas_output INT NOT NULL DEFAULT 1;

UPDATE tasks
SET kuantitas_output = 1
WHERE kuantitas_output IS NULL;
