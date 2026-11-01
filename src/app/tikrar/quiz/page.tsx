'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowRight,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useUser, useDoc, db } from '@/db';
import { useToast } from '@/hooks/use-toast';

interface TajweedQuestion {
  id: number;
  category: string;
  arabicExample: string;
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

const TAJWEED_QUESTIONS: TajweedQuestion[] = [
  {
    id: 1,
    category: 'Nun Sakinah & Tanwin',
    arabicExample: 'مِنْ خَوْفٍ',
    question: 'Nun sukun bertemu huruf Kha (خ) dibaca dengan hukum...',
    options: ['Izhar Halqi', 'Idgham Bighunnah', 'Ikhfa Haqiqi', 'Iqlab'],
    correct: 'Izhar Halqi',
    explanation: 'Huruf Kha (خ) termasuk 6 huruf tenggorokan (halqi), sehingga nun sukun dibaca jelas tanpa dengung.',
  },
  {
    id: 2,
    category: 'Nun Sakinah & Tanwin',
    arabicExample: 'مِنْ بَعْدِ',
    question: 'Apabila nun sukun bertemu dengan huruf Ba (ب), maka hukum bacaannya adalah...',
    options: ['Iqlab', 'Izhar Syafawi', 'Idgham Bilaghunnah', 'Ikhfa Syafawi'],
    correct: 'Iqlab',
    explanation: 'Nun sukun atau tanwin yang bertemu huruf Ba (ب) berubah bunyinya menjadi mim disertai dengung (Iqlab).',
  },
  {
    id: 3,
    category: 'Nun Sakinah & Tanwin',
    arabicExample: 'مِنْ رَبِّهِمْ',
    question: 'Nun sukun bertemu huruf Ra (ر) termasuk hukum bacaan...',
    options: ['Idgham Bilaghunnah', 'Idgham Bighunnah', 'Izhar Halqi', 'Qalqalah Sugra'],
    correct: 'Idgham Bilaghunnah',
    explanation: 'Huruf Lam (ل) dan Ra (ر) adalah huruf Idgham Bilaghunnah: melebur penuh tanpa dengung.',
  },
  {
    id: 4,
    category: 'Mim Sakinah',
    arabicExample: 'تَرْمِيهِمْ بِحِجَارَةٍ',
    question: 'Mim sukun bertemu huruf Ba (ب) pada lafazh di atas dibaca secara...',
    options: ['Ikhfa Syafawi', 'Idgham Mimi', 'Izhar Syafawi', 'Iqlab'],
    correct: 'Ikhfa Syafawi',
    explanation: 'Mim sukun bertemu Ba (ب) dibaca samar di bibir disertai dengung (Ikhfa Syafawi).',
  },
  {
    id: 5,
    category: 'Mim Sakinah',
    arabicExample: 'لَهُمْ مَا يَشَاءُونَ',
    question: 'Mim sukun bertemu huruf Mim (م) disebut hukum bacaan...',
    options: ['Idgham Mimi (Mutamatsilain)', 'Izhar Syafawi', 'Ikhfa Haqiqi', 'Mad Lazim'],
    correct: 'Idgham Mimi (Mutamatsilain)',
    explanation: 'Mim sukun bertemu Mim berharakat melebur menjadi satu mim bertasydid disertai ghunnah.',
  },
  {
    id: 6,
    category: 'Qalqalah',
    arabicExample: 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
    question: 'Huruf Dal sukun (دْ) di tengah kalimat dibaca memantul ringan yang disebut...',
    options: ['Qalqalah Sugra', 'Qalqalah Kubra', 'Izhar Qamariyah', 'Idgham Syamsiyah'],
    correct: 'Qalqalah Sugra',
    explanation: 'Huruf Qalqalah (ق ط ب ج د) yang sukun asli di tengah kalimat dibaca pantulan ringan (Sugra).',
  },
  {
    id: 7,
    category: 'Ghunnah',
    arabicExample: 'إِنَّ اللَّهَ غَفُورٌ رَحِيمٌ',
    question: 'Huruf Nun bertasydid (نّ) wajib dibaca mendengung selama 2 harakat. Hukum ini disebut...',
    options: ['Ghunnah Musyaddadah', 'Izhar Mutlaq', 'Mad Thabi’i', 'Idgham Mutajanisain'],
    correct: 'Ghunnah Musyaddadah',
    explanation: 'Setiap Nun bertasydid (نّ) dan Mim bertasydid (مّ) wajib ditahan dengungnya (Ghunnah Musyaddadah).',
  },
  {
    id: 8,
    category: 'Hukum Mad',
    arabicExample: 'جَاءَ نَصْرُ اللَّهِ',
    question: 'Mad Thabi’i bertemu hamzah (ء) dalam satu kata pada "جَاءَ" adalah hukum...',
    options: ['Mad Wajib Muttashil', 'Mad Jaiz Munfashil', 'Mad Aridh Lissukun', 'Mad Badal'],
    correct: 'Mad Wajib Muttashil',
    explanation: 'Huruf mad bertemu hamzah dalam satu kata wajib dipanjangkan 4–5 harakat (Mad Wajib Muttashil).',
  },
  {
    id: 9,
    category: 'Alif Lam',
    arabicExample: 'وَالشَّمْسِ وَضُحَاهَا',
    question: 'Alif Lam bertemu huruf Syin (ش) pada kata "وَالشَّمْسِ" dibaca...',
    options: ['Alif Lam Syamsiyah', 'Alif Lam Qamariyah', 'Izhar Halqi', 'Ikhfa Syafawi'],
    correct: 'Alif Lam Syamsiyah',
    explanation: 'Huruf Lam melebur ke dalam huruf Syin (ش) sehingga huruf Syin bertasydid (Idgham Syamsiyah).',
  },
  {
    id: 10,
    category: 'Hukum Mad',
    arabicExample: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    question: 'Ketika waqaf (berhenti) pada akhir ayat "الْعَالَمِينَ", bacaan mad sebelum huruf nun menjadi...',
    options: ['Mad Aridh Lissukun', 'Mad Iwadh', 'Mad Shilah Qashirah', 'Mad Lin'],
    correct: 'Mad Aridh Lissukun',
    explanation: 'Mad Thabi’i yang diikuti huruf hidup lalu disukunkan karena waqaf disebut Mad Aridh Lissukun (2/4/6 harakat).',
  },
];

export default function TikrarTajweedQuizPage() {
  const { user } = useUser();
  const { data: userData } = useDoc(user ? 'users' : null, user?.id);
  const { toast } = useToast();
  const salutation = userData?.salutation || 'Ukhti';

  const [stage, setStage] = useState<'intro' | 'playing' | 'result'>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [answersLog, setAnswersLog] = useState<
    { question: TajweedQuestion; chosen: string; isCorrect: boolean }[]
  >([]);
  const hasSavedRef = useRef(false);

  useEffect(() => {
    if (stage !== 'playing') return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'result' || hasSavedRef.current || !user) return;
    hasSavedRef.current = true;

    const saveAttempt = async () => {
      try {
        const isPassed = score >= 8;
        await db.from('quiz_attempts').insert({
          user_id: user.id,
          quiz_id: 'tikrar_tajwid_theory',
          score,
          total_questions: TAJWEED_QUESTIONS.length,
          duration_seconds: elapsed,
          is_passed: isPassed,
          created_at: new Date().toISOString(),
        });

        if (isPassed) {
          const currentPoints = Number(userData?.points) || 0;
          await db
            .from('users')
            .update({ points: currentPoints + 20 })
            .eq('id', user.id);
          toast({
            title: 'MasyaAllah, Lulus Kuis Tajwid!',
            description: `+20 HI Poin berhasil ditambahkan untuk ${salutation}.`,
          });
        }
      } catch (e) {
        console.error('Failed saving tajweed quiz attempt:', e);
      }
    };

    saveAttempt();
  }, [stage, user, score, elapsed, userData?.points, salutation, toast]);

  const startQuiz = () => {
    hasSavedRef.current = false;
    setCurrentIdx(0);
    setSelected(null);
    setScore(0);
    setElapsed(0);
    setAnswersLog([]);
    setStage('playing');
  };

  const handleSelect = (option: string) => {
    if (selected) return;
    const currentQ = TAJWEED_QUESTIONS[currentIdx];
    const correct = option === currentQ.correct;
    setSelected(option);
    if (correct) setScore((s) => s + 1);
    setAnswersLog((prev) => [...prev, { question: currentQ, chosen: option, isCorrect: correct }]);
  };

  const handleNext = () => {
    if (currentIdx + 1 < TAJWEED_QUESTIONS.length) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
    } else {
      setStage('result');
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = TAJWEED_QUESTIONS[currentIdx];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 pb-32">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl text-[#800000] hover:bg-[#800000]/5">
            <Link href="/tikrar">
              <ChevronLeft className="w-6 h-6" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#800000]">
              <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
              Hi Tikrar • Evaluasi Tajwid
            </div>
            <h1 className="text-2xl font-black font-headline tracking-tight">Kuis Teori Tajwid</h1>
          </div>
        </div>
        {stage === 'playing' && (
          <Badge variant="outline" className="border-[#800000]/20 text-[#800000] font-black gap-1.5 px-3 py-1">
            <Timer className="w-3.5 h-3.5" />
            {formatTime(elapsed)}
          </Badge>
        )}
      </div>

      {stage === 'intro' && (
        <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] bg-white">
          <div className="bg-gradient-to-br from-[#800000] to-[#4d0000] p-8 sm:p-10 text-white space-y-4 border-b-4 border-[#D4AF37]">
            <Badge className="bg-[#D4AF37] text-black border-none font-black text-[10px] uppercase tracking-widest">
              10 Soal Pilihan Ganda
            </Badge>
            <h2 className="text-3xl font-black font-headline leading-tight">
              Uji Kesiapan Teori Tajwid {salutation}
            </h2>
            <p className="text-sm text-white/80 leading-relaxed max-w-xl">
              Sebelum mengikuti ujian lisan Itqan, pastikan {salutation} menguasai kaidah Nun Sakinah, Mim Sakinah, Qalqalah, Ghunnah, dan Hukum Mad dasar. Raih minimal skor 8/10 untuk lulus (+20 Poin).
            </p>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Jumlah Soal</p>
                <p className="text-xl font-black text-[#800000] mt-1">10 Soal</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syarat Lulus</p>
                <p className="text-xl font-black text-emerald-700 mt-1">Minimal 80%</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Apresiasi</p>
                <p className="text-xl font-black text-[#D4AF37] mt-1">+20 HI Poin</p>
              </div>
            </div>

            <Button
              onClick={startQuiz}
              className="w-full h-14 rounded-2xl bg-[#800000] hover:bg-[#660000] text-white font-black uppercase tracking-widest shadow-xl"
            >
              Mulai Kuis Sekarang <ArrowRight className="w-5 h-5 ml-2 text-[#D4AF37]" />
            </Button>
          </CardContent>
        </Card>
      )}

      {stage === 'playing' && currentQ && (
        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <div className="p-6 bg-slate-50 border-b space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-[#800000] text-white font-black text-[10px] uppercase tracking-widest">
                {currentQ.category}
              </Badge>
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                Soal {currentIdx + 1} / {TAJWEED_QUESTIONS.length}
              </span>
            </div>
            <Progress
              value={((currentIdx + 1) / TAJWEED_QUESTIONS.length) * 100}
              className="h-2 bg-[#800000]/10 [&>div]:bg-[#D4AF37]"
            />
          </div>

          <CardContent className="p-6 sm:p-10 space-y-8">
            <div className="p-6 rounded-3xl bg-[#800000]/5 border border-[#800000]/10 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#800000]/60 mb-3">
                Contoh Lafazh
              </p>
              <p className="text-4xl sm:text-5xl font-arabic text-[#800000] leading-relaxed" dir="rtl">
                {currentQ.arabicExample}
              </p>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
              {currentQ.question}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.options.map((opt) => {
                const isChosen = selected === opt;
                const isRightOption = opt === currentQ.correct;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={Boolean(selected)}
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      'p-4 rounded-2xl border-2 text-left font-bold text-sm flex items-center justify-between gap-3 transition-all',
                      !selected && 'border-slate-200 hover:border-[#800000] hover:bg-[#800000]/5 text-slate-800',
                      selected && isRightOption && 'border-emerald-500 bg-emerald-50 text-emerald-800',
                      selected && isChosen && !isRightOption && 'border-rose-500 bg-rose-50 text-rose-800',
                      selected && !isChosen && !isRightOption && 'border-slate-100 bg-slate-50/60 text-slate-400'
                    )}
                  >
                    <span>{opt}</span>
                    {selected && isRightOption && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                    {selected && isChosen && !isRightOption && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed">
                  <span className="font-black uppercase tracking-wider block mb-1 text-[#800000]">
                    Penjelasan Kaidah:
                  </span>
                  {currentQ.explanation}
                </div>
                <Button
                  onClick={handleNext}
                  className="w-full h-12 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-black uppercase tracking-widest"
                >
                  {currentIdx + 1 < TAJWEED_QUESTIONS.length ? 'Soal Berikutnya' : 'Lihat Hasil Kuis'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {stage === 'result' && (
        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <div
            className={cn(
              'p-10 text-center text-white space-y-3 border-b-4 border-[#D4AF37]',
              score >= 8 ? 'bg-gradient-to-br from-[#800000] to-[#4d0000]' : 'bg-slate-800'
            )}
          >
            <Trophy className="w-20 h-20 mx-auto text-[#D4AF37]" />
            <Badge className="bg-[#D4AF37] text-black border-none font-black text-[10px] uppercase tracking-widest">
              {score >= 8 ? 'LULUS EVALUASI TEORI' : 'PERLU MUROJAAH TEORI'}
            </Badge>
            <h2 className="text-3xl font-black font-headline">
              Skor {score} / {TAJWEED_QUESTIONS.length} ({Math.round((score / TAJWEED_QUESTIONS.length) * 100)}%)
            </h2>
            <p className="text-xs text-white/80 font-medium">
              Waktu Pengerjaan: {formatTime(elapsed)} • {user ? 'Riwayat tersimpan' : 'Login untuk menyimpan poin'}
            </p>
          </div>

          <CardContent className="p-8 space-y-6">
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#800000] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Ringkasan Jawaban
              </h4>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {answersLog.map((entry, idx) => (
                  <div
                    key={entry.question.id}
                    className={cn(
                      'p-4 rounded-2xl border text-xs space-y-1',
                      entry.isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 font-black">
                      <span>
                        {idx + 1}. {entry.question.question}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] shrink-0',
                          entry.isCorrect ? 'border-emerald-500 text-emerald-700' : 'border-rose-500 text-rose-700'
                        )}
                      >
                        {entry.isCorrect ? 'BENAR' : 'KURANG TEPAT'}
                      </Badge>
                    </div>
                    {!entry.isCorrect && (
                      <p className="text-[11px] font-bold text-slate-600">
                        Pilihan: <span className="text-rose-600">{entry.chosen}</span> • Kunci:{' '}
                        <span className="text-emerald-700">{entry.question.correct}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button
                onClick={startQuiz}
                variant="outline"
                className="h-12 rounded-xl border-2 border-[#800000] text-[#800000] font-black uppercase tracking-widest"
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Ulangi Kuis
              </Button>
              <Button
                asChild
                className="h-12 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-black uppercase tracking-widest"
              >
                <Link href="/tikrar">Kembali ke Hi Tikrar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
