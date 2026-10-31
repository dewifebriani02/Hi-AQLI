# Analisis Logika Halaman Login

Halaman login (`/login`) berfungsi sebagai gerbang utama otentikasi. Berikut adalah rincian logikanya:

## 1. Parameter URL & Konteks
- **`redirectTo`**: Menangkap tujuan pengalihan setelah masuk sukses (default: `/`).
- **`ref`**: Menangkap kode referral untuk ditampilkan sebagai informasi tambahan dan diteruskan jika user pindah ke halaman registrasi.

## 2. Metode Otentikasi
- **Email & Password**: 
    - Menggunakan fungsi `initiateEmailSignIn`.
    - Dilengkapi fitur *toggle visibility* untuk kata sandi.
    - Menampilkan pesan error spesifik jika kredensial salah.
- **Google OAuth**:
    - Menggunakan fungsi `initiateGoogleSignIn(redirectTo)`.
    - Alur ini melibatkan pengalihan ke provider Google dan kembali ke `auth/callback`.

## 3. Logika Pengalihan Otomatis (Session Guard)
- Menggunakan `useEffect` untuk memantau status `user`.
- Jika `user` sudah terdeteksi masuk (hasil dari `useUser`), sistem akan melakukan pengalihan paksa (*hard redirect*) menggunakan `window.location.href` ke tujuan `redirectTo`. Hal ini memastikan user tidak terjebak di halaman login jika sesi sudah aktif.

## 4. Integrasi Referral
- Jika terdapat kode referral di URL, sistem menampilkan banner khusus berwarna hijau yang memberitahu bahwa kode tersebut aktif. Ini bertujuan meningkatkan tingkat konversi (*Conversion Rate*).

## 5. Keamanan & UX
- **Suspense**: Seluruh konten login dibungkus dalam `Suspense` untuk menangani pembacaan parameter URL secara aman di sisi klien (Next.js client-side rendering).
- **Toast Feedback**: Memberikan notifikasi visual "Selamat Datang" saat login berhasil.
- **Loading States**: Tombol akan dinonaktifkan dan menampilkan spinner saat proses otentikasi sedang berlangsung untuk mencegah pengiriman ganda (*double submission*).

---

**File Referensi:**
- [src/app/login/page.tsx](file:///d:/Hi-AQLI/src/app/login/page.tsx) - Logika utama Login.
- [src/db/index.ts](file:///d:/Hi-AQLI/src/db/index.ts) - Definisi fungsi otentikasi.
