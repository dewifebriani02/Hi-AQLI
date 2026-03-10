'use server';

/**
 * @fileOverview Flow untuk analisis konteks, pelajaran utama, dan tips menghafal ayat Al-Qur'an.
 *
 * - analyzeVerseContext - Fungsi untuk menganalisis konteks, hikmah, dan tips hafalan.
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
  context: z.string().describe('Konteks sejarah (Asbabun Nuzul), pelajaran praktis, dan tips khusus untuk menghafal ayat ini'),
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
  prompt: `Anda adalah seorang ahli pendidikan Islam dan pembimbing tahfidz Al-Qur'an. Berikan ulasan singkat mengenai pelajaran utama, konteks, dan tips menghafal untuk ayat berikut:
Surah: {{{surahName}}}
Ayat: {{{verseNumber}}}
Teks: {{{verseText}}}

Tugas Anda:
1. Jelaskan hikmah atau pelajaran praktis dari ayat ini.
2. Berikan konteks sejarah (Asbabun Nuzul) jika relevan.
3. Berikan satu tips praktis atau jembatan keledai untuk membantu menghafal ayat ini berdasarkan bunyi atau maknanya.

Pastikan respons dalam Bahasa Indonesia yang inspiratif, akurat secara keilmuan Islam, dan disusun dengan poin-poin yang mudah dibaca.`,
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
