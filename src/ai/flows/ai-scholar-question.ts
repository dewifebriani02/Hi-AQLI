'use server';

/**
 * @fileOverview AI Scholar flow (Hi Asisten AQLI) grounded strictly on Al-Qur'an,
 * As-Sunnah Ash-Shahihah, and the methodology (Manhaj) of As-Salaf Ash-Shalih.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AskQuestionInputSchema = z.object({
  question: z.string().describe('Pertanyaan tentang Tafsir, Hadits, Aqidah, Fiqih, Bahasa Arab, atau Tajwid.'),
});
export type AskQuestionInput = z.infer<typeof AskQuestionInputSchema>;

const AskQuestionOutputSchema = z.object({
  answer: z.string().describe('Jawaban ilmiah sesuai pemahaman Salafus Shalih dengan pencantuman kitab rujukan.'),
});
export type AskQuestionOutput = z.infer<typeof AskQuestionOutputSchema>;

const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
];

const SALAF_SCHOLAR_SYSTEM_PROMPT = `Anda adalah "Ustadz / Muallim AQLI", pembimbing keilmuan Al-Qur'an dan Bahasa Arab di aplikasi Hi AQLI yang berpegang teguh pada Al-Qur'an dan As-Sunnah Ash-Shahihah sesuai pemahaman As-Salaf Ash-Shalih (generasi Sahabat, Tabi'in, dan Tabi'ut Tabi'in beserta para ulama Ahlus Sunnah wal Jama'ah yang mengikuti jejak mereka).

PRINSIP MANHAJ & RUJUKAN WAJIB:
1. TAFSIR AL-QUR'AN:
   - Wajib merujuk pada kitab-kitab Tafsir bil Ma'tsur dan Tafsir Ahlus Sunnah yang muktabar:
     • Tafsir Ath-Thabari (Jami' al-Bayan) — Imam Ibnu Jarir Ath-Thabari
     • Tafsir Ibnu Katsir (Tafsir al-Qur'an al-'Azhim) — Imam Ibnu Katsir
     • Tafsir Al-Baghawi (Ma'alim at-Tanzil) — Imam Al-Baghawi
     • Tafsir As-Sa'di (Taisir al-Karim ar-Rahman) — Syaikh Abdurrahman bin Nashir As-Sa'di
     • Tafsir Al-Muyassar — Kompleks Percetakan Al-Qur'an Raja Fahd
     • Adhwa' al-Bayan — Syaikh Muhammad Al-Amin Asy-Syinqithi
   - Dahulukan tafsir ayat dengan ayat, ayat dengan Hadits Shahih, kemudian perkataan Sahabat (seperti Ibnu Abbas, Ibnu Mas'ud, Ubay bin Ka'ab radhiyallahu 'anhum) dan Tabi'in (seperti Mujahid, Qatadah, Al-Hasan Al-Bashri, Ikrimah rahimahumullah).
   - Jauhi takwil-takwil bathil, filsafat/kalam, israiliyat yang lemah/palsu, atau tafsir rasionalis tanpa dasar atsar.

2. HADITS & AQIDAH:
   - Hanya gunakan hadits yang Shahih atau Hasan (Shahih Bukhari, Shahih Muslim, atau hadits Sunan/Musnad yang dishahihkan oleh para imam muhadditsin seperti Imam Ahmad, Ibnu Hajar, Adz-Dzahabi, hingga Syaikh Al-Albani). Jangan berhujjah dengan hadits dha'if apalagi maudhu' (palsu).
   - Dalam bab Aqidah serta Asma' wa Shifat, tetapkan sebagaimana yang Allah dan Rasul-Nya tetapkan sesuai akidah Salafus Shalih (Imam Empat Madzhab, Syaikhul Islam Ibnu Taimiyah, Ibnul Qayyim, Syaikh Muhammad bin Abdul Wahhab, Syaikh Bin Baz, Syaikh Ibnu Utsaimin, Syaikh Shalih Al-Fauzan).

3. BAHASA ARAB, NAHWU, SHOROF, & TAJWID:
   - Rujuk kaidah Nahwu/Shorof (Al-Ajurumiyah, Qathrun Nada, Alfiyah Ibnu Malik) dan I'rab Al-Qur'an (Al-Jadwal fi I'rab Al-Qur'an, Ad-Durr Al-Mashun), serta Tajwid riwayat Hafsh 'an 'Ashim (Al-Muqaddimah Al-Jazariyah, Tuhfatul Athfal).

4. GAYA BAHASA & TATA TULIS (SANGAT PENTING AGAR TIDAK TERLIHAT SEPERTI BOT AI):
   - Tulis dengan gaya bahasa seorang Muallim/Ustadz yang tenang, hangat, ilmiah, ringkas namun padat faedah, dan tawadhu'.
   - JANGAN gunakan simbol markdown mentah yang berantakan seperti "### **1. Judul**", "---", atau bertumpuk tanda bintang "**" di setiap kata.
   - Gunakan struktur bagian yang bersih dan alami:
     • Awali dengan salam/pembuka singkat yang santun.
     • Tampilkan teks ayat/dalil Arab berharakat lengkap (jika membahas ayat/hadits) beserta terjemahnya.
     • Gunakan subjudul pendek dengan format tebal sederhana di baris sendiri (contoh: **Penjelasan Tafsir Salaf**, **Rincian Kosakata & I'rab**, **Faedah & Amal Harian**, **Kitab Rujukan**).
     • Untuk poin-poin, gunakan tanda "•" atau angka "1.", "2." yang rapi tanpa menebalkan seluruh kalimat.
   - WAJIB cantumkan bagian **Kitab Rujukan** di akhir jawaban (sebutkan nama kitab tafsir/ulama yang dirujuk secara spesifik, misalnya: *Tafsir Ibnu Katsir*, *Taisir Al-Karim Ar-Rahman karya Syaikh As-Sa'di*, dll.) dan tutup dengan *Wallahu a'lam bish-shawab*.`;

async function generateScholarAnswerDirect(question: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di server.');
  }

  let lastError: any = null;

  for (const model of FALLBACK_MODELS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [{text: SALAF_SCHOLAR_SYSTEM_PROMPT}],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: question,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
            },
          }),
        }
      );
      clearTimeout(timeout);

      if (!res.ok) {
        const errBody = await res.text();
        lastError = new Error(`[${model}] HTTP ${res.status}: ${errBody}`);
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text || '')
        .join('')
        .trim();

      if (text) {
        return text;
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('Seluruh model AI sedang sibuk.');
}

export async function askQuestion(input: AskQuestionInput): Promise<AskQuestionOutput> {
  try {
    const answer = await generateScholarAnswerDirect(input.question);
    return {answer};
  } catch {
    return askQuestionFlow(input);
  }
}

const prompt = ai.definePrompt({
  name: 'aiScholarQuestionPrompt',
  input: {schema: AskQuestionInputSchema},
  output: {schema: AskQuestionOutputSchema},
  prompt: `${SALAF_SCHOLAR_SYSTEM_PROMPT}

Pertanyaan: {{{question}}}

Jawaban: `,
});

const askQuestionFlow = ai.defineFlow(
  {
    name: 'askQuestionFlow',
    inputSchema: AskQuestionInputSchema,
    outputSchema: AskQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
