# Analisis Logika Halaman Registrasi

Halaman registrasi (`/register`) menangani pembuatan akun baru dan inisialisasi profil pengguna. Berikut adalah rincian logikanya:

## 1. Keamanan & Perlindungan Bot
Pendaftaran dilengkapi dengan dua lapis perlindungan:
- **Honeypot**: Field tersembunyi `website_url`. Jika diisi (biasanya oleh bot otomatis), pendaftaran akan ditolak secara diam-diam.
- **Math Captcha**: Tantangan matematika sederhana (penjumlahan) yang harus diselesaikan untuk membuktikan bahwa pendaftar adalah manusia.

## 2. Metode Pendaftaran
- **Email & Password**: 
    - Menggunakan `initiateEmailSignUp`.
    - Meminta `username`, `email`, dan `password` (minimal 6 karakter).
- **Google OAuth**:
    - Menggunakan alur yang sama dengan login, namun sistem akan mendeteksi jika ini adalah user baru untuk membuat profil.

## 3. Sinkronisasi Profil & Referral (Logic Core)
Bagian terpenting adalah fungsi `syncProfile` di dalam `useEffect`:
- **Pengecekan Profil**: Setelah pendaftaran berhasil di sisi Auth, sistem mengecek apakah data sudah ada di tabel `users`.
- **Resolusi Referral**: 
    - Jika terdapat parameter `ref` di URL, sistem mencari `id` pemilik kode tersebut di database.
    - Jika ditemukan, `id` pembuat referral akan disimpan ke kolom `referred_by_id` pada profil user baru.
- **Inisialisasi Data**: Membuat baris baru di tabel `users` dengan peran default `learner` dan poin `0`.

## 4. Fitur User Experience (UX)
- **Banner Referral**: Menampilkan pesan konfirmasi jika kode referral berhasil terpasang, memberikan kepastian kepada user bahwa mereka akan mendapatkan potongan harga.
- **Pengalihan Dinamis**: Mendukung parameter `redirectTo` agar user bisa langsung kembali ke halaman yang mereka tuju sebelum mendaftar.
- **Suspense Guard**: Digunakan untuk penanganan parameter URL yang aman pada sisi klien.

---

**File Referensi:**
- [src/app/register/page.tsx](file:///d:/Hi-AQLI/src/app/register/page.tsx) - Logika utama Registrasi.
- [src/db/](file:///d:/Hi-AQLI/src/db/) - Schema tabel `users`.
