ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill emails from auth.users for existing profiles
UPDATE profiles
SET email = au.email
FROM auth.users AS au
WHERE profiles.id = au.id AND profiles.email IS NULL;

-- Update the auto-profile trigger to include email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' = 'video_editor' THEN 'video_editor'
      ELSE 'designer'
    END,
    NEW.email
  );
  RETURN NEW;
END;
$$;
