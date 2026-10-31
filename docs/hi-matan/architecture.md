# Hi Matan: Technical Architecture

Arsitektur modul Hi Matan dirancang agar sangat skalabel (multi-matan) dan sepenuhnya dikendalikan oleh database.

## 1. Database Schema

Materi dikelola melalui tabel-tabel berikut di PostgreSQL (Hostinger VPS):

### A. Konten (`public`)
- `matans`: Metadata kitab (id, title, category, level, slug).
- `matan_chapters`: Struktur bab per kitab (id, matan_id, title, order).
- `matan_items`: Isi per bait (id, chapter_id, bait_arabic, translation, syarah_text, example_verse_id).
- `matan_examples`: Referensi ayat Al-Qur'an (link ke Surah/Ayat).

### B. Progres Pengguna (`public`)
- `matan_user_progress`: Tracking pemahaman per bait (user_id, item_id, status_paham, points_awarded).

## 2. Dynamic Learning Engine

- **Routing Dst**: `/matan/[slug]/[chapter_id]`
- **State Management**: Progress tersinkronisasi secara real-time ke database.
- **Component Reusability**: Satu set komponen UI (Reader, Map, Quiz) yang merender data secara dinamis berdasarkan `matan_id`.

## 3. Integrasi Modul Lain

- **Hi I'rab**: Link langsung dari materi Matan ke Lab I'rab Al-Qur'an untuk melihat kaidah di dalam ayat secara interaktif.
- **Badge System**: Terhubung dengan sistem penghargaan global Hi AQLI.
