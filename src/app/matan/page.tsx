'use client';

import { useMemo, useState } from 'react';
import {
  Trophy,
  ChevronRight,
  Sparkles,
  Lock,
  BookOpen,
  CheckCircle2,
  Award,
  BarChart3,
  Layers,
  Play,
  Loader2,
  ScrollText,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useUser, useCollection, useDoc } from '@/db';

const DEFAULT_AJURUMIYAH_CHAPTERS = [
  { id: 'initial', chapter_number: 1, title: 'Bab Al-Kalam', description: 'Definisi Kalam & 4 Syarat Utamanya (Lafazh, Murakkab, Mufid, Bil-Wadh\'i)' },
  { id: 'bab-irab', chapter_number: 2, title: 'Bab Al-I\'rab', description: 'Perubahan Akhir Kata & Pembagian I\'rab (Rafa\', Nashab, Khafadh, Jazm)' },
  { id: 'bab-alamat-irab', chapter_number: 3, title: 'Bab Ma\'rifat \'Alamatil I\'rab', description: 'Mengenal Tanda-Tanda I\'rab Ashliyah dan Far\'iyah' },
  { id: 'bab-afal', chapter_number: 4, title: 'Bab Al-Af\'al', description: 'Pembagian Fi\'il (Madhi, Mudhari\', Amr) & Hukum I\'rabnya' },
  { id: 'bab-marfuat', chapter_number: 5, title: 'Bab Marfu\'atul Asma\'', description: 'Tujuh Isim yang Berkedudukan Rafa\' (Fa\'il, Mubtada\', Khabar, dll.)' },
  { id: 'bab-manshubat', chapter_number: 6, title: 'Bab Manshubatul Asma\'', description: 'Lima Belas Isim yang Berkedudukan Nashab (Maf\'ul Bih, Hal, Tamyiz, dll.)' },
  { id: 'bab-makhfudhat', chapter_number: 7, title: 'Bab Makhfudhatul Asma\'', description: 'Isim-Isim yang Dikasrahkan/Dijarkan dengan Huruf Jar atau Idhafah' },
];

export default function MatanDashboard() {
  const { user } = useUser();
  const { data: userData } = useDoc(user?.id ? 'users' : null, user?.id);
  const fullSalutation = userData?.salutation || 'Ukhti';

  const [activeTab, setActiveTab] = useState('kitab');

  const { data: matans, isLoading: isMatansLoading } = useCollection("matans");
  const { data: allChapters } = useCollection("matan_chapters");

  const progressOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
  }), [user?.id]);

  const { data: progress } = useCollection(user ? "matan_user_progress" : null, progressOptions);

  const totalXp = progress?.reduce(
    (acc, p) => acc + (p.points_awarded ?? ((p.memorized || p.status_paham) ? 40 : 0)),
    0
  ) || 0;

  const completedBabCount = progress?.filter(p => p.memorized || p.status_paham)?.length || 0;
  const currentRank = totalXp > 5000 ? 'Ustadz Nahwu' : totalXp > 1000 ? 'An-Nahwi' : 'Thalibul Ilmi';

  const displayMatans = useMemo(() => {
    if (matans?.length) return matans;
    return [
      {
        id: 'ajurumiyah',
        title: 'Matan Al-Ajurumiyah',
        author: 'Al-Imam Ibnu Ajurrum Ash-Shinhaji',
        level: "Mubtadi' (Dasar)",
        category: 'Nahwu',
        total_chapters: 26,
        slug: 'ajurumiyah',
        is_active: true,
        description: 'Kitab rujukan dasar ilmu Nahwu untuk memahami kaidah i\'rab, kedudukan kalimat Arab, dan struktur ayat Al-Qur\'an.'
      },
      {
        id: 'tuhfatul-athfal',
        title: 'Matan Tuhfatul Athfal',
        author: 'Syaikh Sulaiman Al-Jamzuri',
        level: "Mubtadi' (Dasar)",
        category: 'Tajwid',
        total_chapters: 10,
        slug: 'tuhfatul-athfal',
        is_active: false,
        description: 'Manzhumah bait syair kaidah dasar ilmu Tajwid (Hukum Nun Sukun, Tanwin, Mim Sukun, dan Mad).'
      },
      {
        id: 'jazariyah',
        title: 'Matan Al-Jazariyah',
        author: 'Al-Imam Ibnul Jazari',
        level: 'Mutawassith (Menengah)',
        category: 'Tajwid',
        total_chapters: 17,
        slug: 'jazariyah',
        is_active: false,
        description: 'Manzhumah kaidah Makharijul Huruf, Shifatul Huruf, Waqaf, Ibtida\', dan penyempurna tilawah mutqin.'
      }
    ];
  }, [matans]);

  const primaryMatan = displayMatans[0];
  const primarySlug = primaryMatan?.slug || 'ajurumiyah';

  const chaptersList = useMemo(() => {
    if (allChapters?.length) {
      return [...allChapters].sort((a: any, b: any) => (a.chapter_number || 0) - (b.chapter_number || 0));
    }
    return DEFAULT_AJURUMIYAH_CHAPTERS;
  }, [allChapters]);

  if (isMatansLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-32">
      {/* Header — Selaras dengan Halaman Hi Tikrar */}
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-primary mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Hi Matan • Pusat Mutun Ilmiyah HI AQLI
          </span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Metode Matan &amp; Syarah</h1>
        <p className="text-muted-foreground text-sm">
          Pelajari dan kuasai matan-matan ilmiah {fullSalutation} secara bertahap mulai dari bacaan bait berharakat,
          penjelasan syarah ulama Salaf, contoh i&apos;rab ayat Al-Qur&apos;an, hingga evaluasi pemahaman per bab.
        </p>
      </div>

      {/* Ringkasan Capaian — Gaya Kartu Bersih ala Hi Tikrar */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 px-1">
        <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                Gelar Thalibah
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 truncate">
                {currentRank}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                Bab Tuntas
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 truncate">
                {completedBabCount} / {primaryMatan?.total_chapters || 26} Bab
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                Poin Evaluasi
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 truncate">
                {totalXp} XP
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigasi Tab — Selaras dengan TabsList Hi Tikrar */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 h-auto sm:h-12 bg-muted/50 p-1 rounded-xl gap-1">
          <TabsTrigger
            value="kitab"
            className="font-bold gap-1.5 py-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg text-xs transition-all"
          >
            <BookOpen className="w-4 h-4 shrink-0" /> Kitab &amp; Syarah
          </TabsTrigger>
          <TabsTrigger
            value="bab"
            className="font-bold gap-1.5 py-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg text-xs transition-all"
          >
            <Layers className="w-4 h-4 shrink-0" /> Kurikulum Bab
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            className="font-bold gap-1.5 py-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg text-xs transition-all"
          >
            <BarChart3 className="w-4 h-4 shrink-0" /> Rekap &amp; Evaluasi
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Kitab & Syarah */}
        <TabsContent value="kitab" className="space-y-4 outline-none">
          {/* Banner Target Belajar Aktif — Selaras gaya kartu utama Tikrar */}
          <Card className="border-primary/20 bg-gradient-to-br from-[#800000] to-[#5a0000] text-white rounded-2xl shadow-md overflow-hidden">
            <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-amber-200 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Kitab Aktif • Ilmu Nahwu Dasar
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-headline tracking-tight">
                  {primaryMatan?.title || 'Matan Al-Ajurumiyah'}
                </h2>
                <p className="text-xs text-white/85 leading-relaxed">
                  Lanjutkan pembelajaran bab demi bab lengkap dengan teks matan Arab berharakat, penjelasan syarah, contoh ayat Al-Qur&apos;an, dan latihan kuis pemahaman.
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <Button
                  asChild
                  className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs h-11 px-5 rounded-xl shadow-md"
                >
                  <Link href={`/matan/${primarySlug}/initial`}>
                    <Play className="w-4 h-4 mr-1.5 fill-current" /> Mulai Belajar &amp; Kuis
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-white/85 hover:text-white hover:bg-white/10 text-[11px] font-bold h-8"
                >
                  <Link href={`/matan/${primarySlug}`}>
                    Lihat Peta 26 Bab <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Daftar Kitab Matan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayMatans.map((matan: any) => {
              const isUnlocked = matan.is_active || matan.slug === 'ajurumiyah';
              return (
                <Card
                  key={matan.id}
                  className={cn(
                    "rounded-2xl border transition-all overflow-hidden flex flex-col justify-between",
                    isUnlocked
                      ? "border-slate-200 hover:border-primary/40 shadow-sm hover:shadow-md bg-white"
                      : "border-slate-100 bg-slate-50/70 opacity-75"
                  )}
                >
                  <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-0.5",
                            isUnlocked
                              ? "bg-primary/10 text-primary hover:bg-primary/15"
                              : "bg-slate-200 text-slate-600"
                          )}
                        >
                          {matan.category || 'Nahwu'} • {matan.level}
                        </Badge>
                        {!isUnlocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <Lock className="w-3.5 h-3.5" /> Segera
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">
                          {matan.title}
                        </h3>
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          Karya: {matan.author}
                        </p>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {matan.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <ScrollText className="w-4 h-4 text-primary" />
                        <span>{matan.total_chapters || 26} Bab</span>
                      </div>

                      {isUnlocked ? (
                        <Button
                          asChild
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-4 rounded-xl"
                        >
                          <Link href={`/matan/${matan.slug}`}>
                            Buka Kitab <ChevronRight className="w-4 h-4 ml-1" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          disabled
                          size="sm"
                          variant="outline"
                          className="text-xs h-9 px-3 rounded-xl"
                        >
                          Segera Hadir
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 2: Kurikulum Bab */}
        <TabsContent value="bab" className="space-y-3 outline-none">
          <Card className="border-slate-200/80 rounded-2xl bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Daftar Bab • {primaryMatan?.title || 'Matan Al-Ajurumiyah'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Klik salah satu bab untuk membaca matan, membuka syarah, dan mengerjakan kuis pemahaman.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-[10px] font-bold border-primary/20 text-primary">
                  {completedBabCount} dari {primaryMatan?.total_chapters || 26} Bab Selesai
                </Badge>
              </div>

              <div className="space-y-2.5">
                {chaptersList.map((chapter: any, idx: number) => {
                  const isCompleted = progress?.some(
                    (p) => (p.memorized || p.status_paham) && (p.chapter_id === chapter.id || p.item_id === chapter.id)
                  );
                  const isUnlocked = idx === 0 || Boolean(chapter.id && allChapters?.length) || (progress?.length ?? 0) > 0;
                  const targetHref = isUnlocked ? `/matan/${primarySlug}/${chapter.id}` : '#';

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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                              Bab {chapter.chapter_number || idx + 1}
                            </span>
                            {isCompleted && (
                              <Badge className="bg-emerald-600 text-white text-[9px] px-2 py-0">
                                Tuntas
                              </Badge>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">{chapter.title}</h4>
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
                            <Link href={targetHref}>
                              {isCompleted ? 'Muraja\'ah & Kuis' : 'Mulai Bab'}
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
        </TabsContent>

        {/* Tab 3: Rekap & Evaluasi */}
        <TabsContent value="progress" className="space-y-4 outline-none">
          <Card className="border-slate-200/80 rounded-2xl bg-white shadow-sm">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Progres Penguasaan Matan &amp; Kuis
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Setiap bab dianggap tuntas setelah membaca syarah dan lulus evaluasi kuis pemahaman minimal 80%.
                  </p>
                </div>
                <span className="text-xs font-black text-primary">{totalXp} XP</span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      Math.round((completedBabCount / (primaryMatan?.total_chapters || 26)) * 100),
                      100
                    )}%`,
                  }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-600">
                  Status saat ini: <strong>{completedBabCount} Bab selesai</strong> • Peringkat{' '}
                  <strong className="text-primary">{currentRank}</strong>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold h-9"
                  >
                    <Link href="/irab">Buka Lab I&apos;rab Al-Qur&apos;an</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold h-9"
                  >
                    <Link href={`/matan/${primarySlug}/initial`}>
                      Uji Kuis Bab 1 <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
