# Hi Ngaji: Technical Architecture

Arsitektur modul Hi Ngaji dirancang untuk menangani data audio dan analisis AI secara efisien, serta mengintegrasikan pembelajaran tajwid dengan database Qur'an yang sudah ada.

## 1. Database Schema (Planned)

### A. Konten Tajwid (`public`)
- `tajwid_modules`: Konten teori (id, title, category, order, description).
- `tajwid_items`: Materi spesifik per modul (id, module_id, rule_name, arabic_example, audio_example_url, phonetic_guide).

### B. Progres & Analisis AI (`public`)
- `tajwid_user_progress`: Tracking level penguasaan (user_id, item_id, status_completed, score_ai).
- `ai_tilawah_logs`: Log rekaman suara dan feedback AI (user_id, verse_key, audio_storage_path, ai_feedback_json, accuracy_rate).

## 2. AI Audio Processing Pipeline

- **Frontend**: Menggunakan `MediaRecorder` API untuk menangkap suara Thalibah dalam format Ogg/WebM.
- **Processing**: Audio diproses melalui Server Action (Vercel/Next.js) dan dikirim ke **Gemini 2.0 Flash API** untuk analisis.
- **Feedback Loop**: AI mengembalikan data JSON yang berisi segmentasi makhroj, kesalahan tajwid, dan saran perbaikan yang kemudian ditampilkan secara interaktif di UI.

## 3. Integration & Extensibility

- **Qur'an.com API**: Digunakan sebagai sumber utama teks ayat dan metadata tajwid (untuk fitur Tajwid Lens).
- **Mushaf Component**: Komponen Mushaf yang ada di `/tilawah` akan di-upgrade untuk mendukung props `showTajwidRules` (Lensa Tajwid).
- **Global Badge System**: Capaian di Hi Ngaji akan memicu *achievement* yang tersimpan di tabel `user_badges`.

## 4. UI/UX Components
- **AudioVisualizer**: Komponen berbasis Canvas/Web Audio API untuk memberikan feedback visual saat merekam.
- **TajwidMap**: Navigasi visual progres belajar yang reuseable dari pola Hi Matan.
