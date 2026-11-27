'use server';

/**
 * @fileOverview AI Scholar flow to answer questions about Tajwid, Tafsir, and Islamic history.
 *
 * - askQuestion - A function that handles the question answering process with multi-model fallback.
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

const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
];

async function generateScholarAnswerDirect(question: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di server.');
  }

  const systemInstruction = `Anda adalah seorang cendekiawan AI (Hi Asisten AQLI) yang berspesialisasi dalam memberikan jawaban mendalam, santun, dan terstruktur tentang Tafsir Al-Qur'an, Tadabbur Ayat, Mufradat (Kosakata Arab), Nahwu & I'rab Al-Qur'an, Tajwid, dan Sejarah Islam berdasarkan rujukan ulama muktabar (seperti Tafsir Ibnu Katsir, As-Sa'di, Al-Muyassar, dan Ath-Thabari). Pastikan seluruh respons dalam Bahasa Indonesia yang jelas dan rapi.`;

  let lastError: any = null;

  for (const model of FALLBACK_MODELS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${systemInstruction}\n\nPertanyaan: ${question}\n\nJawaban:`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.4,
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
