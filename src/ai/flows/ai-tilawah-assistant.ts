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
  feedback: z.string().describe('Feedback on the recitation, including accuracy and fluency.'),
  suggestions: z.string().describe('Suggestions for improvement.'),
});
export type AiTilawahAssistantOutput = z.infer<typeof AiTilawahAssistantOutputSchema>;

export async function aiTilawahAssistant(input: AiTilawahAssistantInput): Promise<AiTilawahAssistantOutput> {
  return aiTilawahAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTilawahAssistantPrompt',
  input: {schema: AiTilawahAssistantInputSchema},
  output: {schema: AiTilawahAssistantOutputSchema},
  prompt: `You are an expert Quran recitation assistant. Analyze the provided audio recording of the user's recitation and provide feedback on their accuracy and fluency. Provide specific suggestions for improvement.

Audio: {{media url=audioDataUri}}

Respond in the following format:
Feedback: <feedback on accuracy and fluency>
Suggestions: <suggestions for improvement>`,
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
