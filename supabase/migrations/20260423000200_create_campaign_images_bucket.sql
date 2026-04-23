-- Ensure 'gambar' bucket exists with public access
INSERT INTO storage.buckets (id, name, public)
VALUES ('gambar', 'gambar', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

-- 1. Allow anyone to VIEW
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'gambar');

-- 2. Allow anyone to UPLOAD
CREATE POLICY "Admin Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'gambar');

-- 3. Allow anyone to UPDATE
CREATE POLICY "Admin Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'gambar');

-- 4. Allow anyone to DELETE
CREATE POLICY "Admin Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'gambar');
