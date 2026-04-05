-- HI MUFRADAT: ADD BANK DETAILS TO USERS
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bank_name') THEN 
    ALTER TABLE public.users ADD COLUMN bank_name TEXT; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bank_account_number') THEN 
    ALTER TABLE public.users ADD COLUMN bank_account_number TEXT; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bank_account_holder') THEN 
    ALTER TABLE public.users ADD COLUMN bank_account_holder TEXT; 
  END IF;
END $$;

-- SUCCESS MARKER
SELECT 'Hi Mufradat bank details added to users table!' as result;
