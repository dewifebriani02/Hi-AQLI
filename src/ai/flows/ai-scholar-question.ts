'use server';

/**
 * @fileOverview AI Scholar flow to answer questions about Tajwid, Tafsir, and Islamic history.
 *
 * - askQuestion - A function that handles the question answering process.
 * - AskQuestionInput - The input type for the askQuestion function.
 * - AskQuestionOutput - The return type for the askQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AskQuestionInputSchema = z.object({
  question: z.string().describe('Pertanyaan tentang Tajwid, Tafsir, atau sejarah Islam.'),
});
export type AskQuestionInput = z.infer<typeof AskQuestionInputSchema>;

const AskQuestionOutputSchema = z.object({
  answer: z.string().describe('Jawaban atas pertanyaan, berdasarkan kumpulan data terverifikasi yang dikurasi.'),
});
export type AskQuestionOutput = z.infer<typeof AskQuestionOutputSchema>;

export async function askQuestion(input: AskQuestionInput): Promise<AskQuestionOutput> {
  return askQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiScholarQuestionPrompt',
  input: {schema: AskQuestionInputSchema},
  output: {schema: AskQuestionOutputSchema},
  prompt: `Anda adalah seorang cendekiawan AI yang berspesialisasi dalam memberikan jawaban tentang Tajwid, Tafsir, dan sejarah Islam.

Anda akan menggunakan kumpulan data terverifikasi yang dikurasi untuk menjawab pertanyaan. Pastikan semua respons dalam Bahasa Indonesia.

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
