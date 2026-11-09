'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TikrarPageQuiz } from '@/components/tikrar/tikrar-page-quiz';
import { QUIZ_PASS_PERCENT, QUIZ_QUESTION_COUNT } from '@/lib/tikrar-steps';

function UjianContent() {
  const searchParams = useSearchParams();
  const rawPage = Number(searchParams.get('page'));
  const page = Number.isFinite(rawPage) ? Math.min(604, Math.max(1, Math.floor(rawPage))) : 1;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6 pb-32">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-xl text-[#800000] hover:bg-[#800000]/5">
          <Link href="/tikrar">
            <ChevronLeft className="w-6 h-6" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#800000]">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Hi Tikrar • Ujian Itqan Halaman
          </div>
          <h1 className="text-2xl font-black font-headline tracking-tight">Ujian Halaman {page}</h1>
          <p className="text-xs text-muted-foreground">
            {QUIZ_QUESTION_COUNT} soal acak • lulus minimal {QUIZ_PASS_PERCENT}% untuk membuka halaman berikutnya
          </p>
        </div>
      </div>
      <TikrarPageQuiz page={page} />
    </div>
  );
}

export default function TikrarUjianPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        </div>
      }
    >
      <UjianContent />
    </Suspense>
  );
}
