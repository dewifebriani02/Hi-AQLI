
'use server';

/**
 * @fileOverview Flow untuk analisis mendalam ayat Al-Qur'an.
 *
 * - analyzeVerse - Fungsi untuk menganalisis ayat (akar kata, tafsir, konteks).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeVerseInputSchema = z.object({
  surahName: z.string(),
  verseNumber: z.number(),
  verseText: z.string(),
});
export type AnalyzeVerseInput = z.infer<typeof AnalyzeVerseInputSchema>;

const AnalyzeVerseOutputSchema = z.object({
  wordBreakdown: z.array(z.object({
    word: z.string(),
    root: z.string().describe('Akar kata (root word) dalam bahasa Arab'),
    meaning: z.string().describe('Arti kata secara mendalam dalam Bahasa Indonesia'),
  })),
  tafsir: z.string().describe('Tafsir ringkas dan padat untuk ayat ini'),
  context: z.string().describe('Konteks atau pelajaran utama dari ayat ini'),
});
export type AnalyzeVerseOutput = z.infer<typeof AnalyzeVerseOutputSchema>;

export async function analyzeVerse(input: AnalyzeVerseInput): Promise<AnalyzeVerseOutput> {
  return analyzeVerseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeVersePrompt',
  input: {schema: AnalyzeVerseInputSchema},
  output: {schema: AnalyzeVerseOutputSchema},
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
  prompt: `Anda adalah seorang ahli tafsir dan bahasa Arab Al-Qur'an terkemuka.
Berikan analisis mendalam untuk ayat berikut:
Surah: {{{surahName}}}
Ayat: {{{verseNumber}}}
Teks: {{{verseText}}}

Tugas Anda:
1. Bedah kata demi kata: Identifikasi setiap kata dalam ayat tersebut. Sebutkan kata Arabnya, akar katanya (Root word), dan maknanya secara akurat dalam Bahasa Indonesia.
2. Berikan tafsir ringkas: Jelaskan makna ayat tersebut secara padat namun mendalam agar mudah dipahami masyarakat Indonesia.
3. Jelaskan pelajaran utama: Sebutkan hikmah, pelajaran praktis, atau konteks sejarah (Asbabun Nuzul) jika ada.

Pastikan semua respons dalam Bahasa Indonesia yang santun, formal, dan akurat secara keilmuan Islam.`,
});

const analyzeVerseFlow = ai.defineFlow(
  {
    name: 'analyzeVerseFlow',
    inputSchema: AnalyzeVerseInputSchema,
    outputSchema: AnalyzeVerseOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output) throw new Error("AI tidak mengembalikan output yang valid.");
      return output;
    } catch (error: any) {
      console.error("AI Flow Error:", error);
      throw error;
    }
  }
);
