# Arsitektur Sistem Hi-AQLI

Dokumen ini menjelaskan struktur tingkat tinggi dan keputusan arsitektural yang digunakan dalam pengembangan Hi-AQLI.

## Stack Teknologi Utama

- **Frontend**: Next.js 15 (App Router)
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS & Lucide React (Icons)
- **Komponen UI**: Radix UI (dikelola melalui pola Shadcn/ui)
- **Backend/Database**: Hostinger VPS (PostgreSQL 16, Self-Hosted Auth & DB)
- **AI Engine**: Google Genkit (dengan integrasi Google Generative AI)
- **Validasi Tata Bahasa**: Zod
- **Form Handling**: React Hook Form

## Struktur Folder (`src/`)

Sistem mengikuti pola standar Next.js App Router dengan beberapa penyesuaian:

- `src/app/`: Berisi route, page, dan layout. Menggunakan pola folder grouping dan dynamic routes (misalnya `[id]`).
- `src/components/`: Komponen UI yang dapat digunakan kembali. Terbagi menjadi sub-folder jika diperlukan.
- `src/ai/`: Konfigurasi Genkit, definisi tools AI, dan flow kecerdasan buatan.
- `src/lib/`: Utilitas logika, klien database lokal, dan fungsi pembantu (helpers).
- `src/hooks/`: Custom React hooks untuk logika stateful yang dapat digunakan kembali.
- `src/data/`: Data statis atau file definisi konstanta.
- `src/db/`: Konfigurasi atau tipe data khusus terkait database.

## Pola Alur Data

### 1. Data Fetching
- Menggunakan Server Components secara default untuk pengambilan data awal (SEO friendly).
- Penggunaan Client Components untuk bagian interaktif yang memerlukan integrasi langsung dengan Database Client.

### 2. Autentikasi
- Menggunakan Self-Hosted JWT Auth.
- Session dikelola oleh Self-Hosted JWT Auth.
- Proteksi route dilakukan melalui Middleware atau pengecekan di tingkat Page/Layout menggunakan `db.auth.getUser()`.

### 3. Integrasi AI (Genkit)
- Logika AI dipisahkan dalam folder `src/ai/`.
- Genkit digunakan untuk fitur-fitur cerdas seperti simulasi ujian, penjelasan ayat, dan analisis tajwid.
- Developer dapat menggunakan Genkit Developer UI untuk testing flow AI secara lokal.

## Keamanan

- **Database**: Menggunakan Row Level Security (RLS) di PostgreSQL. Setiap tabel harus memiliki policy yang membatasi akses baca/tulis hanya untuk user yang berhak atau admin.
- **Environment Variables**: Data sensitif (API Keys, DB Secret) disimpan di `.env.local` dan tidak boleh di-commit ke repositori.

## Prinsip Desain

- **Mobile First**: Desain harus responsif dan diutamakan untuk perangkat mobile/tablet.
- **Aesthetic Premium**: Menggunakan palet warna institusi (Maroon & Gold) dengan nuansa modern (glassmorphism, subtle animations).
- **Accessibility**: Memastikan teks bahasa Arab (Harakat) terbaca dengan jelas menggunakan font yang sesuai dan dukungan RTL (Right-to-Left).
