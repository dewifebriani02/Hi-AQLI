"use server";

import { askQuestion } from "@/ai/flows/ai-scholar-question";
import { aiTilawahAssistant } from "@/ai/flows/ai-tilawah-assistant";
import { analyzeVerse, type AnalyzeVerseInput, type AnalyzeVerseOutput } from "@/ai/flows/verse-analysis";
import { z } from "zod";

const scholarSchema = z.object({
  question: z.string().min(10, "Please ask a more detailed question."),
});
export type ScholarState = {
  answer?: string;
  error?: string;
};
export async function askScholarQuestion(
  prevState: ScholarState,
  formData: FormData
): Promise<ScholarState> {
  const validatedFields = scholarSchema.safeParse({
    question: formData.get("question"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors.question?.[0],
    };
  }
  
  try {
    const result = await askQuestion({ question: validatedFields.data.question });
    return { answer: result.answer };
  } catch (e: any) {
    console.error("Scholar Question Error:", e);
    return { error: e.message?.includes('429') ? "Kuota AI sedang penuh. Silakan coba lagi beberapa saat lagi." : "Terjadi kesalahan saat mengajukan pertanyaan." };
  }
}


export async function submitRecitation(audioAsDataUri: string) {
    if (!audioAsDataUri) {
        throw new Error("Audio data is missing.");
    }
    try {
        const result = await aiTilawahAssistant({ audioDataUri: audioAsDataUri });
        return result;
    } catch (e: any) {
        console.error("Recitation Assistant Error:", e);
        if (e.message?.includes('429')) {
             throw new Error("Kuota harian AI telah habis atau terlalu banyak permintaan. Silakan coba lagi nanti.");
        }
        throw new Error("Terjadi kesalahan saat menganalisis tilawah.");
    }
}

export async function getVerseAnalysis(input: AnalyzeVerseInput): Promise<AnalyzeVerseOutput & { error?: string }> {
  try {
    const result = await analyzeVerse(input);
    return result;
  } catch (e: any) {
    console.error("Analysis Action Error Detail:", e);
    let message = "Gagal menganalisis konteks ayat. Silakan coba lagi.";
    if (e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED')) {
      message = "Kuota AI gratis sedang terbatas. Silakan tunggu sekitar 1 menit lalu tekan tombol 'Coba Lagi'.";
    }
    return { context: "", error: message };
  }
}
