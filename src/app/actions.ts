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
  } catch (e) {
    return { error: "An error occurred while asking the question. Please try again." };
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
        if (e.message?.includes('503')) {
             throw new Error("Layanan AI sedang tidak tersedia. Silakan coba lagi nanti.");
        }
        throw new Error("Terjadi kesalahan saat menganalisis tilawah.");
    }
}

export async function getVerseAnalysis(input: AnalyzeVerseInput): Promise<AnalyzeVerseOutput> {
  try {
    const result = await analyzeVerse(input);
    return result;
  } catch (e: any) {
    console.error("Analysis Error:", e);
    throw new Error("Gagal menganalisis ayat. Silakan coba lagi.");
  }
}
