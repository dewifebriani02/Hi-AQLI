'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  Trophy,
  ChevronLeft,
  ChevronRight,
  Lock,
  CheckCircle2,
  BookOpen,
  Loader2,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUser, useCollection } from '@/db';
import {
  AJURUMIYAH_CHAPTERS,
  isMatanChapterCompleted,
} from '@/lib/matan-data';

export default function MatanChapterMap() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useUser();

  const matanOptions = useMemo(() => ({
    filters: [{ column: 'slug', operator: '==', value: slug }],
    limit: 1,
  }), [slug]);

  const { data: matans, isLoading: isMatanLoading } = useCollection("matans", matanOptions);
  const currentMatan = matans?.[0];

  const chapterOptions = useMemo(() => ({
    filters: [{ column: 'matan_id', operator: '==', value: currentMatan?.id }],
    orderBy: [{ column: 'chapter_number', direction: 'asc' as const }],
  }), [currentMatan?.id]);

  const { data: chapters, isLoading: isChaptersLoading } = useCollection(
    currentMatan?.id ? "matan_chapters" : null,
    chapterOptions
  );

  const progressOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
  }), [user?.id]);

  const { data: progress } = useCollection(user ? "matan_user_progress" : null, progressOptions);
  const { data: quizAttempts } = useCollection(user ? "quiz_attempts" : null, progressOptions);

  const matanTitle = currentMatan?.title || (slug === 'ajurumiyah' ? 'Matan Al-Ajurumiyah' : slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Matan');
  const displayChapters = chapters?.length ? chapters : AJURUMIYAH_CHAPTERS;

  const completedFlags = useMemo(() => {
    return displayChapters.map((c: any) =>
      isMatanChapterCompleted(c, slug || 'ajurumiyah', progress, quizAttempts)
    );
  }, [displayChapters, slug, progress, quizAttempts]);

  const completedCount = completedFlags.filter(Boolean).length;

  if (isMatanLoading || (currentMatan?.id && isChaptersLoading)) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-32">
      {/* Header — Selaras dengan Halaman Hi Tikrar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 px-1">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Hi Matan • Kurikulum Kitab
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 px-2.5 rounded-xl text-xs font-bold">
              <Link href="/matan">
                <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight">
              {matanTitle}
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Pilih bab untuk membaca matan berharakat, menelaah syarah, dan menguji pemahaman lewat kuis.
          </p>
        </div>

        <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white shrink-0">
          <CardContent className="p-3.5 px-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Capaian Bab
              </p>
              <p className="text-base font-black text-slate-900">
                {completedCount} / {displayChapters.length} Bab
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daftar Bab — Gaya Kartu Bersih ala Hi Tikrar */}
      <Card className="border-slate-200/80 rounded-2xl bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                Urutan Bab &amp; Evaluasi Pemahaman
              </h2>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary">
              Minimal Skor Lulus 80%
            </Badge>
          </div>

          <div className="space-y-2.5">
            {displayChapters.map((chapter: any, idx: number) => {
              const isCompleted = completedFlags[idx];
              const isPrevCompleted = idx > 0 ? completedFlags[idx - 1] : true;
              const isUnlocked = idx === 0 || isCompleted || isPrevCompleted;

              return (
                <div
                  key={chapter.id || idx}
                  className={cn(
                    "p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all",
                    isCompleted
                      ? "border-emerald-200 bg-emerald-50/40"
                      : isUnlocked
                        ? "border-slate-200 bg-white hover:border-primary/30"
                        : "border-slate-100 bg-slate-50/70 opacity-65"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5",
                        isCompleted
                          ? "bg-emerald-600 text-white"
                          : isUnlocked
                            ? "bg-primary text-white"
                            : "bg-slate-200 text-slate-500"
                      )}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : chapter.chapter_number || idx + 1}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                          Bab {chapter.chapter_number || idx + 1}
                        </span>
                        {isCompleted && (
                          <Badge className="bg-emerald-600 text-white text-[9px] px-2 py-0">
                            Tuntas
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{chapter.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{chapter.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end shrink-0">
                    {isUnlocked ? (
                      <Button
                        asChild
                        size="sm"
                        variant={isCompleted ? "outline" : "default"}
                        className={cn(
                          "rounded-xl text-xs font-bold h-9 px-4",
                          isCompleted
                            ? "border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                            : "bg-primary hover:bg-primary/90 text-white"
                        )}
                      >
                        <Link href={`/matan/${slug}/${chapter.id}`}>
                          {isCompleted ? "Muraja'ah & Kuis" : 'Buka Materi & Kuis'}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 px-3">
                        <Lock className="w-3.5 h-3.5" /> Terkunci
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
