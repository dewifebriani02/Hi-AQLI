# Blueprint Project: Hi AQLI

**Tagline**: Berhijrah dengan Ilmu, Beramal dengan Itqan
**Manhaj**: Sunnah (Salafi)
**Platform Description**: A premium Islamic learning and charity platform designed to facilitate 'Thalabul Ilmi' (seeking knowledge) and 'Infaq' (charity) with a modern, high-tech approach.

## 1. Branding & Identity
- **App Name**: Hi AQLI
- **Terminology**:
    - **Infaq**: replaces "Donation"
    - **Thalibah**: replaces "Student/Santri" (focus on female seekers of knowledge)
    - **Mu'allimah**: female religious teacher
    - **Sahabat**: replaces "Squad/Group"
    - **Ukhti**: respectful term for 'You' (singular female)

### Color Palette
| Category | Hex Color | Visual | Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | `#800000` | ![#800000](https://placehold.co/15x15/800000/800000.png) | Deep Maroon - Pure #800000 |
| **Accent** | `#D4AF37` | ![#D4AF37](https://placehold.co/15x15/D4AF37/D4AF37.png) | Classic Gold - #D4AF37 |
| **Background** | `#FFFFFF` | ![#FFFFFF](https://placehold.co/15x15/FFFFFF/FFFFFF.png) | Pure White - #FFFFFF |
| **Secondary BG** | `#F9FAFB` | ![#F9FAFB](https://placehold.co/15x15/F9FAFB/F9FAFB.png) | Soft Gray - Subtle Contrast |
| **Highlight** | `#FFBF00` | ![#FFBF00](https://placehold.co/15x15/FFBF00/FFBF00.png) | Amber Gold - Hero Elements |

## 2. Technical Stack
- **Framework**: Next.js 15.3.8 (App Router, Turbopack)
- **Styling**: Tailwind CSS, Shadcn/UI
- **Backend/Infrastructure**: Hostinger VPS (PostgreSQL 16, Self-Hosted Auth & DB)
- **AI Core**: Google Gemini (Planned for Tilawah & I'rab analysis)
- **PWA**: Fully supported offline-capable Progressive Web App

## 3. Module Hierarchy

### Core Modules (Active)
- **Hi Ngaji**: Interactive Tajwid & Tahsin learning.
- **Hi Mufradat**: Mastery of Qur'anic vocabulary and translations.
- **Hi Tikrar**: Memorization management using the Tikrar method.
- **Hi Berbagi (Infaq Digital)**: Seamless Infaq flow via BSI with unique codes and proof submission.
- **Hi Mutaba'ah**: Daily target checklist for 'Adab' and 'Ibadah'.
- **Hi Muhasabah**: Self-evaluation and spiritual reflection tools.
- **Administration**: Comprehensive dashboard for Infaq verification, User management, and Halaqah assignment.

### Hidden / Future Modules (Developed but Hidden)
- **Hi Nabung**: Savings tracker for spiritual goals (Hajj/Umrah/Qurban).
- **Hi Umroh**: Travel and guidance assistant for Umrah.
- **Hi Masak**: Halal culinary and healthy recipe guide for Akhwat.
- **Hi Sehat**: Health and fitness tracker aligned with Tibbun Nabawi principles.
- **I'rab & Nahwu Quiz**: Advanced Arabic grammar quizzes.

## 4. Architecture Standards
- **Database**: Strictly snake_case for column names (e.g., `created_at`, `user_id`).
- **Assets**: Centralized in `/public` for PWA manifest and global accessibility.
- **Hydration**: Client-side components for dynamic visual elements using `next/dynamic` to prevent SSR mismatches.

## 5. Religious Compliance (Manhaj Sunnah)
- **Dzikir/Doa Standards**:
    - Use **Jazakumullah Khairan** (as per hadith), avoid adding "Katsiran".
    - Focus on authentic references from the Qur'an and Sunnah with the understanding of the Salafus Shalih.
- **Visuals**: Maintain 'Adab' in all imagery; avoid animate beings (taswir) in core UI icons where possible, using geometric or calligraphic alternatives.