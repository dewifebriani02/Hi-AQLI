-- 1. Bersihkan data ganda yang terlanjur masuk (sisakan yang ID-nya paling besar/terbaru)
DELETE FROM public.mutabaah_logs a 
USING public.mutabaah_logs b 
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.activity_id = b.activity_id 
  AND a.date = b.date;

-- 2. Pasang Unique Constraint (Polisi Data Ganda)
-- Jika ini gagal (Error 42710), berarti polinya sudah ada, Ukhti bisa abaikan.
ALTER TABLE public.mutabaah_logs 
ADD CONSTRAINT mutabaah_logs_user_activity_date_key 
UNIQUE (user_id, activity_id, date);
