-- ADD MUSYRIFAH COLUMNS TO MUFRADAT GROUPS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='musyrifah_name') THEN 
        ALTER TABLE public.mufradat_groups ADD COLUMN musyrifah_name TEXT; 
    END IF; 
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='musyrifah_phone') THEN 
        ALTER TABLE public.mufradat_groups ADD COLUMN musyrifah_phone TEXT; 
    END IF;
END $$;
