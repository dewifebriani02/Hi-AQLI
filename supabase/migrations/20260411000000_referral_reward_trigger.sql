-- 1. Buat fungsi untuk menambahkan saldo referral
CREATE OR REPLACE FUNCTION handle_referral_reward()
RETURNS TRIGGER AS $$
BEGIN
  -- Cek apakah status berubah menjadi 'active' (telah diverifikasi admin/pembayaran berhasil)
  IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
    
    -- Pastikan user memiliki referred_by_id (mendaftar pakai link/kode orang lain)
    IF NEW.referred_by_id IS NOT NULL THEN
      
      -- Tambahkan Rp 5.000 ke saldo referral_balance milik referrer
      UPDATE users
      SET referral_balance = COALESCE(referral_balance, 0) + 5000
      WHERE id = NEW.referred_by_id;
      
      -- Opsional: Catat riwayat ke tabel referral_transactions jika Anda memilikinya
      -- INSERT INTO referral_transactions (referrer_id, referred_user_id, amount) 
      -- VALUES (NEW.referred_by_id, NEW.user_id, 5000);
      
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Pasang trigger pada tabel registrasi
CREATE TRIGGER on_registration_verified
AFTER UPDATE ON halaqah_registrations
FOR EACH ROW EXECUTE FUNCTION handle_referral_reward();