'use server';

/**
 * @fileOverview Flow untuk analisis mendalam ayat Al-Qur'an (Tafsir dan Konteks).
 *
 * - analyzeVerse - Fungsi untuk menganalisis ayat (tafsir, konteks).
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
  prompt: `Anda adalah seorang ahli tafsir Al-Qur'an terkemuka.
Berikan analisis mendalam untuk ayat berikut:
Surah: {{{surahName}}}
Ayat: {{{verseNumber}}}
Teks: {{{verseText}}}

Tugas Anda:
1. Berikan tafsir ringkas: Jelaskan makna ayat tersebut secara padat namun mendalam agar mudah dipahami masyarakat Indonesia.
2. Jelaskan pelajaran utama: Sebutkan hikmah, pelajaran praktis, atau konteks sejarah (Asbabun Nuzul) jika ada.

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
