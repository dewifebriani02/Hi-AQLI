-- ADD START DATE TO MUFRADAT GROUPS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='start_date') THEN 
        ALTER TABLE public.mufradat_groups ADD COLUMN start_date DATE; 
    END IF; 
END $$;
