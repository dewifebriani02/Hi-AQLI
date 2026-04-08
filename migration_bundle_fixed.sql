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
  followed_halaqahs TEXT[] DEFAULT '{}',
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
  mutabaah_goals TEXT[] DEFAULT '{}',
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
-- Generated via API Export
SET session_replication_role = 'replica';

DELETE FROM "users";
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('c3f98594-e045-4e54-9839-d69f6b0ebbd2', 'Atiek', 'wahyuningsupriyanthi@gmail.com', 'learner', false, NULL, 3, NULL, 50, '2026-04-05T10:30:21.358739+00:00', '2026-04-06T02:50:33.583+00:00', '["c78ba233-ded9-4c4a-bad6-8824ca455b80"]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', '2026-05-09T17:00:00+00:00', NULL, 3, NULL, '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]', NULL, '[]', 5, 'AQLI-ATIEK01', 0, NULL, NULL, NULL, NULL, 1, '2026-04-07T14:51:52.021+00:00', 50, 'Perunggu', '2026-04-07T02:20:10.266+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('65217dcb-f558-42a1-831f-457d88b5035a', 'Ummu Habibie', 'ennyiqbal22@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-04-05T22:03:04.034949+00:00', '2026-04-05T22:03:04.034949+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', NULL, '[]', 5, 'AQLI-UMMU02', 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', '2026-04-06T15:16:00.315+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('267dd493-e34f-4a58-aadd-42673f8b2726', 'Tri_Wuryanti', 'twy39982@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-04-05T15:20:55.362249+00:00', '2026-04-05T15:20:55.362249+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]', NULL, '[]', 5, 'AQLI-TRIWURYANTI02', 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', '2026-04-07T03:25:24.959+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('be3d7a6e-b9f3-41a8-b840-93c6d104c1fb', 'Zakiyah yamani', 'zakiyahahmad9@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-04-06T12:17:07.758863+00:00', '2026-04-06T12:33:50.745+00:00', '["c78ba233-ded9-4c4a-bad6-8824ca455b80"]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', '2026-05-09T17:00:00+00:00', NULL, 3, NULL, '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]', NULL, '[]', 5, 'AQLI-ZAKIYAH02', 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('c83ece1c-28d2-422b-b453-f8ed5ac33bda', 'Amas Masturoh', 'amasmasturoh22@gmail.com', 'learner', false, NULL, 3, NULL, 530, '2026-04-01T06:35:52.852911+00:00', '2026-04-05T08:28:20.12+00:00', '["c78ba233-ded9-4c4a-bad6-8824ca455b80"]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', '2026-05-09T17:00:00+00:00', NULL, 3, NULL, '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]', '08989049493', '[]', 5, 'AQLI-AMAS01', 0, NULL, NULL, NULL, NULL, 1, '2026-04-07T14:06:38.687+00:00', 390, 'Emas', '2026-04-07T03:18:24.981+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('7adc9a7d-66df-4d40-825c-f7e6e255793d', 'Dede', 'dedefamily84@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-04-05T07:03:20.207805+00:00', '2026-04-05T09:48:25.502+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', NULL, '[]', 5, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('0a83813a-ce82-46ca-b9a0-052b0d5955a4', 'Dewi Febriani', 'dewiwan02@gmail.com', 'learner', false, NULL, 3, NULL, 10, '2026-04-05T00:33:57.224146+00:00', '2026-04-05T10:34:11.76+00:00', '["c78ba233-ded9-4c4a-bad6-8824ca455b80",null]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'on_leave', '2026-05-09T17:00:00+00:00', '2026-04-29T17:00:00+00:00', 2, NULL, '[1,30]', '08126741885', '[]', 5, 'AQLI-IWAN01', 5000, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('f66c4cb9-836b-4959-afcd-ce02bb04959d', 'Desti Rozi', 'destiarifandi@gmail.com', 'learner', false, NULL, 3, NULL, 130, '2026-04-01T14:34:33.081521+00:00', '2026-04-05T10:34:55.23+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', '', '[]', 5, 'AQLI-DESTIROZI02', 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('d27b797a-9175-4a26-8e0e-c889f8598c3b', 'Dwi Febi ', 'dfafebi23@gmail.com', 'learner', false, NULL, 3, NULL, 590, '2026-04-01T09:01:01.967335+00:00', '2026-04-05T08:16:03.889+00:00', '["c78ba233-ded9-4c4a-bad6-8824ca455b80"]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', '2026-05-09T17:00:00+00:00', NULL, 3, NULL, '[1,30]', '081317635560', '[]', 5, 'AQLI-DWI02', 0, NULL, NULL, NULL, NULL, 2, '2026-04-07T14:04:52.022+00:00', 460, 'Emas', '2026-04-06T13:43:26.838+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('a7c84b23-9666-4ed5-94d5-979b1652bae5', 'Antonina Zahrah', 'azahrah21c@gmail.com', 'learner', false, NULL, 3, NULL, 370, '2026-04-03T04:55:38.847639+00:00', '2026-04-05T07:56:24.035+00:00', '["c78ba233-ded9-4c4a-bad6-8824ca455b80"]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', '2026-05-09T17:00:00+00:00', NULL, 3, NULL, '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]', '081316551954', '[]', 5, NULL, 0, NULL, NULL, NULL, NULL, 1, '2026-04-07T13:00:03.203+00:00', 170, 'Perak', '2026-04-06T23:14:30.962+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('59342526-1988-43c2-81eb-e1d16cc1cc17', 'Ummu_Ishaq', 'ummulfadhli9@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-04-06T21:46:43.423222+00:00', '2026-04-06T21:46:43.423222+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', NULL, '[]', 5, 'AQLI-UMMUISHAQ02', 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', '2026-04-06T21:47:01.303+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('cce4aeb7-bd82-4a02-a872-05993a322102', 'Naila Hayfa Shakira', 'nailahayfashakira2004@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-04-02T03:17:10.919912+00:00', '2026-04-05T10:34:22.68+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', '', '[]', 5, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('b4dd304b-716a-4395-af29-4275501898cc', 'Santi Mulyani', 'sandobes2207@gmail.com', 'learner', false, NULL, 3, NULL, 10, '2026-04-05T03:46:31.881139+00:00', '2026-04-05T09:48:25.359+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', NULL, '[]', 5, 'AQLI-SANTI02', 0, NULL, NULL, NULL, NULL, 1, '2026-04-07T16:58:17.915+00:00', 10, 'Perunggu', '2026-04-07T16:56:17.658+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('2959f897-f82a-4414-80ec-2bf2eeb773d6', 'Siti Nurhikmah', 'stnrhkmh@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-04-01T16:13:12.17956+00:00', '2026-04-05T09:48:27.676+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', NULL, '[]', 5, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('502cc755-0198-4985-b003-f93c30a1ad3f', 'Dewi Febriani', 'dewifebriani@gmail.com', 'admin', false, NULL, 3, NULL, 725, '2026-03-18T06:06:23.193797+00:00', '2026-04-06T04:36:10.961+00:00', '[null,"c78ba233-ded9-4c4a-bad6-8824ca455b80"]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', '2026-05-09T17:00:00+00:00', NULL, 3, NULL, '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]', NULL, '["bangun","siwak","tahajjud","qabliyah_subuh","subuh","dzikir_pagi","dhuha","kajian","qabliyah_zhuhur","zhuhur","badiyah_zhuhur","qabliyah_ashar","ashar","dzikir_petang","maghrib","badiyah_maghrib","isya","badiyah_isya","witir","wudhu_tidur","al_mulk","ayat_kursi","doa_tidur","evaluasi","quran","doa_harian","tasbih_100","istighfar"]', 5, 'AQLI-DEWI03', 0, NULL, NULL, NULL, NULL, 2, '2026-04-07T11:32:22.088+00:00', 20, 'Perunggu', '2026-04-06T13:03:42.438+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('5faacc8c-dddc-4526-b821-522ecf362614', 'Dewi Febriani', 'dewifebriani.unpad@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-04-05T13:59:50.386331+00:00', '2026-04-05T13:59:50.386331+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', NULL, '[]', 5, 'AQLI-DEWI01', 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('a3a2d8d4-8f56-4d58-ade8-7cd4a1a79300', 'Dewi Febriani', 'dewi21019@mail.unpad.ac.id', 'learner', false, NULL, 3, NULL, 0, '2026-04-05T14:29:43.895746+00:00', '2026-04-06T02:50:33.946+00:00', '["c78ba233-ded9-4c4a-bad6-8824ca455b80"]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', '2026-05-09T17:00:00+00:00', NULL, 3, NULL, '[1,30]', NULL, '[]', 5, 'AQLI-DEWI02', 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('ebaad93e-d0ca-4b6d-b64e-df5c20a4358e', 'Rifa Utari', 'rifautari05@gmail.com', 'learner', false, NULL, 3, NULL, 230, '2026-04-05T08:59:56.101145+00:00', '2026-04-05T09:12:40.432+00:00', '["c78ba233-ded9-4c4a-bad6-8824ca455b80"]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', '2026-05-09T17:00:00+00:00', NULL, 3, NULL, '[1,30]', '081311409519', '[]', 5, 'AQLI-RIFA01', 0, NULL, NULL, NULL, NULL, 2, '2026-04-07T12:46:44.684+00:00', 160, 'Perak', '2026-04-06T13:32:38.061+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('fb3d5a11-e1f6-422b-b0f9-6f3130b6bd79', 'Dian Suryaningsih', 'dianhp.com@gmail.com', 'learner', false, NULL, 3, NULL, 120, '2026-04-02T23:15:56.932841+00:00', '2026-04-05T09:48:27.793+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', NULL, '[]', 5, 'AQLI-DIAN02', 0, NULL, NULL, NULL, NULL, 1, '2026-04-06T13:32:38.872+00:00', 120, 'Perak', '2026-04-06T13:19:03.895+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('88628e79-2427-43fd-9006-8cfdb909090d', 'Heni ', 'ummuazzam751@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-04-01T08:31:35.69704+00:00', '2026-04-05T09:48:27.465+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', NULL, '[]', 5, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('15352627-b489-47f1-a400-de8391e10c15', 'Iin Mansur', 'krampon1969@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-03-27T04:27:21.518626+00:00', '2026-04-05T10:30:04.888+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', NULL, NULL, 3, NULL, '[1,30]', '', '[]', 5, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('6d3aee11-13ba-409f-87b4-04f0aaae173c', 'Desvi Yetty', 'desvi.yetty@gmail.com', 'learner', false, NULL, 3, NULL, 500, '2026-03-27T04:27:20.263617+00:00', '2026-04-05T09:48:27.339+00:00', '[null]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', '2026-05-09T17:00:00+00:00', NULL, 3, NULL, '[1,30]', NULL, '[]', 5, 'AQLI-DESVI02', 0, NULL, NULL, NULL, NULL, 1, '2026-04-07T13:42:22.655+00:00', 110, 'Perak', '2026-04-06T17:29:59.361+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('6ca0ab8a-073e-4166-9407-bdab63845e2c', 'Iwan Setiawan', 'iwansetiawan02@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-04-05T15:57:44.199276+00:00', '2026-04-05T15:57:44.199276+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', NULL, '[]', 5, 'AQLI-IWAN02', 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('458698c0-5e8c-4216-b12b-a850cd613ac7', 'Mona Yuniarsa ', 'monayuniarsa@gmail.com', 'learner', false, NULL, 3, NULL, 110, '2026-04-05T15:24:08.848642+00:00', '2026-04-06T02:50:33.751+00:00', '["c78ba233-ded9-4c4a-bad6-8824ca455b80"]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', '2026-05-09T17:00:00+00:00', NULL, 3, NULL, '[1,30]', NULL, '[]', 5, 'AQLI-MONA01', 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('559558c1-35c3-485e-98e5-c91ad455b3ef', 'Apriliana', 'aprilianati@gmail.com', 'learner', false, NULL, 3, NULL, 80, '2026-04-05T06:13:56.063582+00:00', '2026-04-05T09:48:26.995+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,30]', NULL, '[]', 5, 'AQLI-APRILIANA02', 0, NULL, NULL, NULL, NULL, 1, '2026-04-07T00:06:18.477+00:00', 40, 'Perunggu', '2026-04-06T23:58:04.267+00:00');
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('ad296514-546b-461c-89b7-f306888d247e', 'Rani Kharismaya', 'kharismayarani8@gmail.com', 'learner', false, NULL, 3, NULL, 70, '2026-04-05T00:10:19.900168+00:00', '2026-04-05T10:34:38.787+00:00', '["c78ba233-ded9-4c4a-bad6-8824ca455b80"]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'active', '2026-05-09T17:00:00+00:00', NULL, 3, NULL, '[1,30]', '085221276179', '[]', 5, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);
INSERT INTO "users" ("id", "username", "email", "roleId", "is_tikrar_paid", "paidJuz", "tikrar_level", "tikrar_start_date", "points", "created_at", "updated_at", "followed_halaqahs", "role_id", "mufradat_group_id", "is_blacklisted", "mufradat_status", "mufradat_due_date", "mufradat_leave_until", "mufradat_leave_balance", "mufradat_leave_from", "mufradat_accessible_juz", "phone", "mutabaah_goals", "mufradat_target_verses", "referral_code", "referral_balance", "referred_by_id", "bank_name", "bank_account_number", "bank_account_holder", "mufradat_streak_count", "last_mufradat_quiz_at", "mufradat_weekly_points", "mufradat_league", "last_league_reset_at") VALUES ('0dd3cf7d-b920-4f7c-8439-71007dca21de', 'Agustinaeliyanti', 'agustinaeliyanti22@gmail.com', 'learner', false, NULL, 3, NULL, 0, '2026-04-01T12:36:15.578742+00:00', '2026-04-05T09:48:27.571+00:00', '[]', 'learner', '2fb29ea9-1660-4004-aa04-de1cfe478916', false, 'inactive', NULL, NULL, 3, NULL, '[1,3,30]', NULL, '[]', 5, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 'Perunggu', NULL);

DELETE FROM "halaqahs";
INSERT INTO "halaqahs" ("id", "title", "description", "program_type", "schedule", "start_date", "end_date", "duration_weeks", "juz", "level", "is_premium", "base_price", "quota", "tag", "has_exam", "has_certificate", "muallimah", "created_at", "musyrifah") VALUES ('c78ba233-ded9-4c4a-bad6-8824ca455b80', 'Hi Mufradat', '', 'hi_mufradat', 'Senin - Jumat (Toleransi sd Ahad)', '2026-04-05', '2026-08-23', 20, 1, 'Semua Level', true, 20000, 50, '', true, true, 'Dewi Febriani', '2026-04-05T07:25:12.647+00:00', 'Desvy Yetty');

DELETE FROM "vouchers";
INSERT INTO "vouchers" ("id", "code", "description", "type", "program_id", "expiry_date", "usage_limit", "is_active", "created_at") VALUES ('7c8f1353-37ac-4d19-813d-bcf1f605e162', 'HIAPRIL2026', 'Promo Berkah Ramadan', 'free_access', 'mufradat', '2026-05-01T00:00:00+00:00', NULL, true, '2026-04-01T12:10:04.496213+00:00');

SET session_replication_role = 'origin';
