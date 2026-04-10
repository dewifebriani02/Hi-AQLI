-- HI AQLI: BASE SCHEMA INITIALIZATION
-- This script creates the core table structure to ensure that migrations don't fail due to missing relations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 0. SCHEMA PATCH (Ensure camelCase columns exist if table was already created)
DO $$ 
BEGIN 
  -- Fix Users Table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='roleId') THEN 
      ALTER TABLE public.users ADD COLUMN "roleId" TEXT DEFAULT 'learner'; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='paidJuz') THEN 
      ALTER TABLE public.users ADD COLUMN "paidJuz" INTEGER; 
    END IF;
  END IF;

  -- Fix Donations Table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'donations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='uniqueCode') THEN 
      ALTER TABLE public.donations ADD COLUMN "uniqueCode" INTEGER; 
    END IF;
  END IF;
END $$;

-- 1. USERS
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  username text,
  email text UNIQUE,
  "roleId" text DEFAULT 'learner',
  is_tikrar_paid boolean DEFAULT false,
  "paidJuz" integer,
  tikrar_level integer DEFAULT 3,
  tikrar_start_date timestamp with time zone,
  points integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  followed_halaqahs JSONB DEFAULT '[]',
  role_id text DEFAULT 'learner',
  mufradat_group_id uuid,
  is_blacklisted boolean DEFAULT false,
  mufradat_status text DEFAULT 'inactive',
  mufradat_due_date timestamp with time zone,
  mufradat_leave_until timestamp with time zone,
  mufradat_leave_balance integer DEFAULT 3,
  mufradat_leave_from timestamp with time zone,
  mufradat_accessible_juz jsonb DEFAULT '[]',
  phone text,
  mutabaah_goals JSONB DEFAULT '[]',
  mufradat_target_verses integer DEFAULT 5,
  referral_code text UNIQUE,
  referral_balance numeric DEFAULT 0,
  referred_by_id uuid,
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  mufradat_streak_count integer DEFAULT 0,
  last_mufradat_quiz_at timestamp with time zone,
  mufradat_weekly_points integer DEFAULT 0,
  mufradat_league text DEFAULT 'Perunggu',
  last_league_reset_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- 2. MUFRADAT GROUPS
CREATE TABLE IF NOT EXISTS public.mufradat_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp_link text,
  member_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  start_date date,
  musyrifah_name text,
  musyrifah_phone text,
  muallimah_name text,
  muallimah_phone text,
  CONSTRAINT mufradat_groups_pkey PRIMARY KEY (id)
);

-- 3. HALAQAHS
CREATE TABLE IF NOT EXISTS public.halaqahs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  program_type text NOT NULL,
  schedule text,
  start_date date,
  end_date date,
  duration_weeks integer DEFAULT 4,
  juz integer,
  level text DEFAULT 'Semua Level',
  is_premium boolean DEFAULT false,
  base_price numeric DEFAULT 0,
  quota integer DEFAULT 20,
  tag text,
  has_exam boolean DEFAULT true,
  has_certificate boolean DEFAULT true,
  muallimah text DEFAULT 'Admin',
  created_at timestamp with time zone DEFAULT now(),
  musyrifah text,
  CONSTRAINT halaqahs_pkey PRIMARY KEY (id)
);

-- 4. HALAQAH_REGISTRATIONS
CREATE TABLE IF NOT EXISTS public.halaqah_registrations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  user_name text,
  user_email text,
  whatsapp text,
  halaqah_id uuid,
  halaqah_title text,
  status text DEFAULT 'pending_verification',
  is_paid boolean DEFAULT false,
  amount numeric DEFAULT 0,
  payment_method text,
  sender_name text,
  proof_file_name text,
  level integer,
  target_juz integer,
  created_at timestamp with time zone DEFAULT now(),
  payment_type text DEFAULT 'initial',
  billing_month text,
  metadata jsonb DEFAULT '{}',
  start_date timestamp with time zone,
  verified_at timestamp with time zone,
  referral_code_used text,
  referral_discount_amount numeric DEFAULT 0,
  registration_fee numeric DEFAULT 0,
  is_first_registration boolean DEFAULT false,
  unique_code integer DEFAULT 0,
  CONSTRAINT halaqah_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT halaqah_registrations_userId_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT halaqah_registrations_halaqahId_fkey FOREIGN KEY (halaqah_id) REFERENCES public.halaqahs(id)
);

-- 5. OTHER TABLES
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text DEFAULT 'INFAQ',
  goal numeric DEFAULT 0,
  current numeric DEFAULT 0,
  donors integer DEFAULT 0,
  days_left integer DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  beneficiaries_count integer DEFAULT 0,
  CONSTRAINT campaigns_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.donations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  sender_name text,
  campaign_title text,
  amount numeric NOT NULL,
  "uniqueCode" integer,
  payment_method text,
  status text DEFAULT 'pending_verification',
  proof_file_name text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT donations_pkey PRIMARY KEY (id),
  CONSTRAINT donations_userId_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.mufradat_mabar_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  juz_id integer NOT NULL,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 60,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mufradat_mabar_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.mufradat_mabar_participants (
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  points_earned integer DEFAULT 0,
  last_activity_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mufradat_mabar_participants_pkey PRIMARY KEY (session_id, user_id),
  CONSTRAINT mufradat_mabar_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.mufradat_mabar_sessions(id),
  CONSTRAINT mufradat_mabar_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.mufradat_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  billing_month text NOT NULL UNIQUE,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_unique_code numeric NOT NULL DEFAULT 0,
  payout_breakdown jsonb NOT NULL,
  status text NOT NULL DEFAULT 'sudah_cair',
  disbursed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mufradat_payouts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.mufradat_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_user_id uuid,
  to_user_id uuid,
  reaction_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  group_id uuid,
  CONSTRAINT mufradat_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT mufradat_reactions_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id),
  CONSTRAINT mufradat_reactions_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id),
  CONSTRAINT mufradat_reactions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.mufradat_groups(id)
);

CREATE TABLE IF NOT EXISTS public.mutabaah_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  activity_id text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  completed boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mutabaah_logs_pkey PRIMARY KEY (id)
  -- Foreign key to auth.users handled during execution
);

CREATE TABLE IF NOT EXISTS public.page_exams (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  user_name text,
  page integer,
  juz integer,
  status text DEFAULT 'requested',
  requested_at timestamp with time zone DEFAULT now(),
  verified_at timestamp with time zone,
  CONSTRAINT page_exams_pkey PRIMARY KEY (id),
  CONSTRAINT page_exams_userid_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  quiz_id text,
  surah_id text,
  verse_id text,
  score integer,
  total_questions integer,
  is_passed boolean,
  duration_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  wrong_words jsonb DEFAULT '[]',
  page_id integer,
  group_id uuid,
  CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.roles_admin (
  id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_admin_pkey PRIMARY KEY (id),
  CONSTRAINT roles_admin_id_fkey FOREIGN KEY (id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.roles_superadmin (
  id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_superadmin_pkey PRIMARY KEY (id)
  -- Foreign key to auth.users handled during execution
);

CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  type text NOT NULL DEFAULT 'free_access',
  program_id text DEFAULT 'mufradat',
  expiry_date timestamp with time zone,
  usage_limit integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vouchers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.voucher_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  voucher_id uuid,
  user_id uuid,
  redeemed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT voucher_redemptions_pkey PRIMARY KEY (id),
  CONSTRAINT voucher_redemptions_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id),
  CONSTRAINT voucher_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
