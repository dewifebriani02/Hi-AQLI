"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizClient } from "@/components/quiz-client";
import { Loader2 } from "lucide-react";

export default function TajweedQuizPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Memeriksa Akses...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Kuis Tajwid</h1>
        <p className="text-muted-foreground">
          Uji pemahaman Ukhti tentang aturan Tajwid.
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
