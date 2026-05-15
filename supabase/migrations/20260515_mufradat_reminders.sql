-- Create table for reminder configurations (schedules)
CREATE TABLE IF NOT EXISTS mufradat_reminder_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text UNIQUE NOT NULL, -- harian, weekend, pekanan, monday_spirit
  schedule_cron text NOT NULL,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Create table for reminder templates (message variants)
CREATE TABLE IF NOT EXISTS mufradat_reminder_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL, -- harian, weekend, pekanan, monday_spirit, manual
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mufradat_reminder_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mufradat_reminder_templates ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (Allow service role and admin access)
CREATE POLICY "Allow all to service role" ON mufradat_reminder_configs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow all to service role" ON mufradat_reminder_templates FOR ALL USING (auth.role() = 'service_role');

-- Seed initial configs
INSERT INTO mufradat_reminder_configs (category, schedule_cron) VALUES
('harian', '0 14 * * 1-5'),
('weekend', '0 15 * * 0'),
('pekanan', '0 16 * * 0'),
('monday_spirit', '0 7 * * 1')
ON CONFLICT (category) DO NOTHING;

-- Seed initial templates
INSERT INTO mufradat_reminder_templates (category, content) VALUES
('manual', 'Assalamualaikum {salutation} {name}, sekadar mengingatkan target Mufradat pekan ini ({targetStr}). Progres saat ini baru {weeklyCount} ayat. Semoga Allah mudahkan dalam menjaga hafalan. Semangat, bismillah! ✨'),

('harian', 'Assalamu''alaikum {salutation} {name} 🌸\n\nBeli santan di pasar Senin,\nDisimpan rapi dalam botol kaca,\nYuk {salutation}, semangat rutin,\nSetor Mufradat hari ini, bismillah saja! ✨'),
('harian', 'Assalamu''alaikum {salutation} {name} 🌷\n\n"Amalan yang paling dicintai Allah adalah yang paling istiqomah, walau sedikit." (HR. Bukhari)\n\nHari ini belum ada setoran nih. Yuk luangkan 5 menit untuk kuis Mufradat sebelum maghrib 💛'),
('harian', 'Assalamu''alaikum {salutation} {name} 🌸\n\nMenanam bunga di dalam taman,\nBunga mekar indah berseri,\nMari kumpulkan amal di tangan,\nSetor Mufradat hari ini. ✨\n\nSemangat ya {salutation}, bismillah! 📖'),

('weekend', 'Assalamu''alaikum {salutation} {name} 🌺\n\nKapal layar berlayar ke utara,\nSinggah sebentar di pelabuhan,\nAkhir pekan ini ayo segera,\nTutup target dengan kemenangan! 🎯'),
('weekend', 'Assalamu''alaikum {salutation} {name} 🌷\n\nSudah Ahad sore nih, target weekend {salutation} belum tercapai. Tinggal sedikit lagi sebelum Senin datang.\n\n"Sebaik-baik amal adalah yang istiqomah." Yuk selesaikan, {salutation} pasti bisa! 💪'),
('weekend', 'Assalamu''alaikum {salutation} {name} 🌺\n\nKe bukit tinggi mencari bekal,\nBekal dibawa untuk di jalan,\nJangan biarkan target terbengkal,\nYuk tuntaskan hafalan pekanan! ✨\n\nin syaa Allah jadi pemberat timbangan kebaikan. 🤲'),

('pekanan', 'Assalamu''alaikum {salutation} {name} 🌷\n\nDaun pandan harum baunya,\nDipotong kecil masuk ke nasi,\nPekan ini progress {salutation} tertera,\nBaru {progress} ayat, yuk lanjutkan lagi! ✨'),
('pekanan', 'Assalamu''alaikum {salutation} {name} 🌸\n\nMengingatkan target pekanan ya. Baru tercapai {progress} ayat nih.\n\n"Sesungguhnya bersama kesulitan ada kemudahan." (QS. Al-Insyirah: 6)\n\nSemangat menuntaskan, {salutation}! 💛'),
('pekanan', 'Assalamu''alaikum {salutation} {name} 🌷\n\nBurung merpati hinggap di dahan,\nHinggap sebentar mencari makan,\nIngat janji kepada Tuhan,\nHafalan Quran jangan lupakan. ✨\n\nPekan ini baru {progress} ayat nih, yuk semangat genapkan targetnya! 📖'),

('monday_spirit', 'Assalamu''alaikum {salutation} {name} 🌅\n\nSenin pagi mentari bersinar,\nEmbun pagi menetes di daun,\nPekan baru semangat berbinar,\nMufradat lancar selama bertahun! ✨\n\nSelamat memulai pekan, semangat menjaga hafalan! 💛'),
('monday_spirit', 'Assalamu''alaikum {salutation} {name} 🌷\n\nSelamat Senin pagi! 🌟\n\n"Sebaik-baik kalian adalah yang mempelajari Al-Qur''an dan mengajarkannya." (HR. Bukhari)\n\nSemoga Allah bukakan pintu kemudahan untuk {salutation} menjaga hafalan di pekan ini. Bismillah! ✨'),
('monday_spirit', 'Assalamu''alaikum {salutation} {name} 🌅\n\nPohon jati tumbuh berjajar,\nTumbuh subur di tanah hulu,\nSenin pagi semangat belajar,\nMufradat jadi teman selalu. 📖✨\n\nSelamat beraktivitas kembali di pekan yang berkah ini! 🌸');
