-- Create new profiles using the work role selected during signup
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
