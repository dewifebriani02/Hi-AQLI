'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageExamSimulation } from '@/components/exam/page-exam-simulation';

function SimulationContent() {
  const searchParams = useSearchParams();
  const rawPage = Number(searchParams.get('page'));
  const page = Number.isFinite(rawPage) ? Math.min(604, Math.max(1, Math.floor(rawPage))) : 1;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6 pb-32">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl text-[#800000] hover:bg-[#800000]/5">
            <Link href="/tikrar">
              <ChevronLeft className="w-6 h-6" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#800000]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Hi Tikrar • Simulasi Mandiri
            </div>
            <h1 className="text-2xl font-black font-headline tracking-tight">
              Uji Pemahaman Halaman {page}
            </h1>
          </div>
        </div>
      </div>

      <PageExamSimulation page={page} />
    </div>
  );
}

export default function TajweedSimulationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Menyiapkan Simulasi Ujian...
          </p>
        </div>
      }
    >
      <SimulationContent />
    </Suspense>
  );
}
