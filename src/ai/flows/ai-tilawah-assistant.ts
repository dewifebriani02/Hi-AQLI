// Implemented the aiTilawahAssistant flow that takes audio input and provides feedback on Quran recitation.

'use server';

/**
 * @fileOverview Provides real-time feedback on the user's Quran recitation.
 *
 * - aiTilawahAssistant - A function that handles the recitation analysis process.
 * - AiTilawahAssistantInput - The input type for the aiTilawahAssistant function.
 * - AiTilawahAssistantOutput - The return type for the aiTilawahAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiTilawahAssistantInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      'An audio recording of the user reciting Quran, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'    ),
});
export type AiTilawahAssistantInput = z.infer<typeof AiTilawahAssistantInputSchema>;

const AiTilawahAssistantOutputSchema = z.object({
  feedback: z.string().describe('Umpan balik tentang tilawah, termasuk akurasi dan kelancaran.'),
  suggestions: z.string().describe('Saran untuk perbaikan.'),
});
export type AiTilawahAssistantOutput = z.infer<typeof AiTilawahAssistantOutputSchema>;

export async function aiTilawahAssistant(input: AiTilawahAssistantInput): Promise<AiTilawahAssistantOutput> {
  return aiTilawahAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTilawahAssistantPrompt',
  input: {schema: AiTilawahAssistantInputSchema},
  output: {schema: AiTilawahAssistantOutputSchema},
  prompt: `Anda adalah seorang ahli asisten tilawah Al-Qur'an. Analisis rekaman audio tilawah pengguna dan berikan umpan balik mengenai akurasi dan kelancaran mereka. Berikan saran-saran spesifik untuk perbaikan.

Pastikan semua respons dalam Bahasa Indonesia.

Audio: {{media url=audioDataUri}}

Gunakan format berikut untuk respons Anda:
Umpan Balik: <umpan balik mengenai akurasi dan kelancaran>
Saran: <saran untuk perbaikan>`,
});

const aiTilawahAssistantFlow = ai.defineFlow(
  {
    name: 'aiTilawahAssistantFlow',
    inputSchema: AiTilawahAssistantInputSchema,
    outputSchema: AiTilawahAssistantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
