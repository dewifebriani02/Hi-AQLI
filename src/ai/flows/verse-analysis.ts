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
    meaning: z.string().describe('Arti kata secara mendalam'),
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
  prompt: `Anda adalah seorang ahli tafsir dan bahasa Arab Al-Qur'an.
Berikan analisis mendalam untuk ayat berikut:
Surah: {{{surahName}}}
Ayat: {{{verseNumber}}}
Teks: {{{verseText}}}

Tugas Anda:
1. Bedah kata demi kata: Sebutkan kata Arabnya, akar katanya (Root), dan maknanya.
2. Berikan tafsir ringkas yang mudah dipahami dalam Bahasa Indonesia.
3. Jelaskan pelajaran utama atau konteks (Asbabun Nuzul jika ada) dari ayat ini.

Pastikan semua respons dalam Bahasa Indonesia yang santun dan akurat.`,
});

const analyzeVerseFlow = ai.defineFlow(
  {
    name: 'analyzeVerseFlow',
    inputSchema: AnalyzeVerseInputSchema,
    outputSchema: AnalyzeVerseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
