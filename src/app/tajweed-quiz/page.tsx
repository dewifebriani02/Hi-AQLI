import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizClient } from "@/components/quiz-client";

export default function TajweedQuizPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Kuis Tajwid</h1>
        <p className="text-muted-foreground">
          Uji pemahaman Anda tentang aturan Tajwid.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pertanyaan Kuis</CardTitle>
          <CardDescription>Pilih jawaban yang paling tepat untuk setiap pertanyaan.</CardDescription>
        </CardHeader>
        <CardContent>
          <QuizClient />
        </CardContent>
      </Card>
    </div>
  );
}
