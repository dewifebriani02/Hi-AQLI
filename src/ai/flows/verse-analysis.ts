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
  hikmah: z.string().describe('Pelajaran praktis dan konteks sejarah ayat ini.'),
  tipsHafalan: z.string().describe('Tips khusus atau jembatan keledai untuk membantu menghafal kata-kata dalam ayat ini.'),
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
1. Pada bagian 'hikmah', jelaskan pelajaran praktis atau Asbabun Nuzul (jika ada).
2. Pada bagian 'tipsHafalan', berikan satu tips praktis atau jembatan keledai khusus untuk membantu menghafal kata-kata atau bunyi unik dalam ayat ini agar mudah diingat.

Pastikan respons dalam Bahasa Indonesia yang inspiratif dan disusun dengan poin-poin yang mudah dibaca.`,
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
