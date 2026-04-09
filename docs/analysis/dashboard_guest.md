# Analisis Logika Dashboard (Non-Login User)

Halaman utama (`/`) dirancang untuk memberikan nilai instan kepada pengunjung publik sebelum mereka memutuskan untuk mendaftar. Berikut adalah rincian logikanya:

## 1. Komponen Identitas & Sambutan
- **Nama Pengguna**: Menggunakan fallback "Sahabat" jika sesi `user` tidak ditemukan (`user?.metadata... || 'Sahabat'`).
- **Waktu & Kalender**: Menampilkan tanggal Masehi dan Hijriah secara dinamis menggunakan API eksternal (Aladhan API). Data ini bersifat publik dan tidak memerlukan login.

## 2. Fitur Publik (Fungsional & Terlihat)
- **Waktu Shalat**:
    - **Logika**: Menggunakan `navigator.geolocation` browser.
    - **Fallback**: Jika lokasi tidak diizinkan, otomatis menggunakan koordinat Jakarta (-6.2088, 106.8456).
    - **Caching**: Hasil jadwal shalat disimpan di `localStorage` selama 1 hari untuk menghemat kuota API.
- **Layanan Utama (7 Ikon)**:
    - Semua ikon layanan (Tilawah, Mufradat, dll.) tetap terlihat untuk menarik minat user.
    - Sebagian besar ikon ini akan mengarahkan user ke `/login` jika diklik, kecuali ada fitur "Guest Preview" di halaman tujuan.

## 3. Fitur yang Disembunyikan (Restricted)
Fitur-fitur berikut dikunci menggunakan pengecekan `if (user)`:
- **Badge Poin & Peringkat**: Tidak muncul untuk tamu.
- **Statistik Streak & Target**: Muncul angka 0 karena tidak ada data `quiz_attempts` yang bisa ditarik.
- **Riwayat Terkini**: Section ini sepenuhnya disembunyikan jika user belum login karena datanya bersifat pribadi.
- **Panel Referral & Saldo**: Disembunyikan untuk menjaga privasi sistem afiliasi.

## 4. Strategi Konversi (Call to Action)
- **Promosi Hi Mufradat**: Jika sistem mendeteksi user belum terdaftar di program premium (atau belum login), sebuah banner besar "PROMO TERBATAS" akan muncul di bagian tengah.
- **Tautan**: Ikon ini mengarahkan tamu langsung ke halaman `/register`.

## 5. Komunitas & Footer
- **Grup WhatsApp & Telegram**: Terbuka untuk umum sebagai langkah awal "Onboarding" komunitas.

---

**File Referensi:**
- [src/app/page.tsx](file:///d:/Hi-AQLI/src/app/page.tsx) - Logika utama Dashboard.
