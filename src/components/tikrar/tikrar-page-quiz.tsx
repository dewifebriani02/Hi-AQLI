'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useUser } from '@/db';
import { authFetch } from '@/db/client';
import { useToast } from '@/hooks/use-toast';
import { QUIZ_PASS_PERCENT, QUIZ_QUESTION_COUNT } from '@/lib/tikrar-steps';

interface QuizWord {
  text_uthmani?: string;
  char_type_name?: string;
  translation?: { text?: string };
}

interface QuizVerse {
  verse_key: string;
  verse_number?: number;
  text_uthmani: string;
  words?: QuizWord[];
  translations?: { text: string }[];
}

type QuestionType =
  | 'sambung_ayat'
  | 'ayat_sebelum'
  | 'nomor_ayat'
  | 'lengkapi_kata'
  | 'kata_berikutnya'
  | 'akhir_ayat'
  | 'arti_kata'
  | 'arti_ayat'
  | 'ayat_dari_arti';

const TYPE_LABELS: Record<QuestionType, string> = {
  sambung_ayat: 'Sambung Ayat',
  ayat_sebelum: 'Ayat Sebelumnya',
  nomor_ayat: 'Tebak Nomor Ayat',
  lengkapi_kata: 'Lengkapi Potongan Kata',
  kata_berikutnya: 'Kata Berikutnya',
  akhir_ayat: 'Akhir Ayat',
  arti_kata: 'Arti Kata',
  arti_ayat: 'Arti Ayat',
  ayat_dari_arti: 'Tebak Ayat dari Arti',
};

interface Question {
  type: QuestionType;
  prompt: string;
  /** Teks Arab yang ditampilkan sebagai soal */
  arabic?: string;
  /** Teks Indonesia yang ditampilkan sebagai soal */
  latin?: string;
  answer: string;
  options: string[];
  optionsArabic: boolean;
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const cleanHtml = (t?: string) => (t || '').replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

function buildOptions(answer: string, pool: string[], fallback: string[] = []): string[] {
  const opts = new Set<string>([answer]);
  for (const c of shuffle(pool)) {
    if (opts.size >= 4) break;
    if (c && c !== answer) opts.add(c);
  }
  for (const c of fallback) {
    if (opts.size >= 4) break;
    if (c && c !== answer) opts.add(c);
  }
  return shuffle(Array.from(opts));
}

function verseWords(v: QuizVerse): QuizWord[] {
  return (v.words || []).filter((w) => w.char_type_name !== 'end' && w.text_uthmani);
}

const head = (v: QuizVerse, n = 4) => verseWords(v).slice(0, n).map((w) => w.text_uthmani).join(' ');
const tail = (v: QuizVerse, n = 3) => verseWords(v).slice(-n).map((w) => w.text_uthmani).join(' ');
const verseNo = (v: QuizVerse) => v.verse_key.split(':')[1] || String(v.verse_number || '');

/** Buat 30 soal bervariasi dari ayat-ayat satu halaman, bergiliran antar tipe soal */
export function generatePageQuiz(verses: QuizVerse[], count = QUIZ_QUESTION_COUNT): Question[] {
  if (verses.length === 0) return [];
  const heads = verses.map((v) => head(v)).filter(Boolean);
  const tails = verses.map((v) => tail(v)).filter(Boolean);
  const allWords = verses.flatMap((v) => verseWords(v).map((w) => w.text_uthmani!));
  const wordMeanings = verses.flatMap((v) => verseWords(v).map((w) => cleanHtml(w.translation?.text))).filter(Boolean);
  const verseMeanings = verses.map((v) => cleanHtml(v.translations?.[0]?.text)).filter(Boolean);
  const verseNumbers = verses.map(verseNo);
  const numberFallback = verseNumbers.flatMap((n) => [String(Number(n) + 1), String(Math.max(1, Number(n) - 1)), String(Number(n) + 2)]);

  const pools: Record<QuestionType, (() => Question | null)[]> = {
    sambung_ayat: [],
    ayat_sebelum: [],
    nomor_ayat: [],
    lengkapi_kata: [],
    kata_berikutnya: [],
    akhir_ayat: [],
    arti_kata: [],
    arti_ayat: [],
    ayat_dari_arti: [],
  };

  verses.forEach((v, i) => {
    const words = verseWords(v);
    const surahOf = (x?: QuizVerse) => x?.verse_key.split(':')[0];
    const next = surahOf(verses[i + 1]) === surahOf(v) ? verses[i + 1] : undefined;
    const prev = surahOf(verses[i - 1]) === surahOf(v) ? verses[i - 1] : undefined;
    if (next && head(next)) {
      pools.sambung_ayat.push(() => ({
        type: 'sambung_ayat',
        prompt: 'Ayat berikutnya setelah ayat ini dimulai dengan…',
        arabic: v.text_uthmani,
        answer: head(next),
        options: buildOptions(head(next), heads, tails),
        optionsArabic: true,
      }));
    }
    if (prev && head(prev)) {
      pools.ayat_sebelum.push(() => ({
        type: 'ayat_sebelum',
        prompt: 'Ayat SEBELUM ayat ini dimulai dengan…',
        arabic: v.text_uthmani,
        answer: head(prev),
        options: buildOptions(head(prev), heads, tails),
        optionsArabic: true,
      }));
    }
    pools.nomor_ayat.push(() => ({
      type: 'nomor_ayat',
      prompt: 'Ayat ini adalah ayat nomor berapa?',
      arabic: v.text_uthmani,
      answer: verseNo(v),
      options: buildOptions(verseNo(v), verseNumbers, numberFallback),
      optionsArabic: false,
    }));
    if (words.length >= 3) {
      pools.akhir_ayat.push(() => ({
        type: 'akhir_ayat',
        prompt: 'Ayat yang dimulai seperti ini diakhiri dengan…',
        arabic: `${head(v, Math.min(4, words.length - 1))} …`,
        answer: tail(v),
        options: buildOptions(tail(v), tails, heads),
        optionsArabic: true,
      }));
    }
    words.forEach((w, wi) => {
      if (words.length >= 3) {
        pools.lengkapi_kata.push(() => ({
          type: 'lengkapi_kata',
          prompt: 'Lengkapi kata yang hilang pada ayat ini.',
          arabic: words.map((x, xi) => (xi === wi ? '▢▢▢' : x.text_uthmani)).join(' '),
          answer: w.text_uthmani!,
          options: buildOptions(w.text_uthmani!, allWords),
          optionsArabic: true,
        }));
      }
      if (wi > 0 && wi < words.length) {
        pools.kata_berikutnya.push(() => ({
          type: 'kata_berikutnya',
          prompt: 'Kata berikutnya adalah…',
          arabic: `${words.slice(Math.max(0, wi - 4), wi).map((x) => x.text_uthmani).join(' ')} …`,
          answer: w.text_uthmani!,
          options: buildOptions(w.text_uthmani!, allWords),
          optionsArabic: true,
        }));
      }
      const meaning = cleanHtml(w.translation?.text);
      if (meaning) {
        pools.arti_kata.push(() => ({
          type: 'arti_kata',
          prompt: 'Apa arti kata ini?',
          arabic: w.text_uthmani,
          answer: meaning,
          options: buildOptions(meaning, wordMeanings, ['Sesungguhnya', 'Dan Kami', 'Petunjuk', 'Milik-Nya']),
          optionsArabic: false,
        }));
      }
    });
    const verseMeaning = cleanHtml(v.translations?.[0]?.text);
    if (verseMeaning) {
      pools.arti_ayat.push(() => ({
        type: 'arti_ayat',
        prompt: 'Apa arti ayat ini?',
        arabic: v.text_uthmani,
        answer: verseMeaning,
        options: buildOptions(verseMeaning, verseMeanings),
        optionsArabic: false,
      }));
      if (head(v)) {
        pools.ayat_dari_arti.push(() => ({
          type: 'ayat_dari_arti',
          prompt: 'Ayat dengan arti berikut dimulai dengan…',
          latin: verseMeaning,
          answer: head(v),
          options: buildOptions(head(v), heads, tails),
          optionsArabic: true,
        }));
      }
    }
  });

  const queues = (Object.keys(pools) as QuestionType[])
    .map((t) => shuffle(pools[t]))
    .filter((q) => q.length > 0);
  const out: Question[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && queues.some((q) => q.length > 0) && guard++ < 2000) {
    for (const q of shuffle(queues)) {
      if (out.length >= count) break;
      const make = q.shift();
      if (!make) continue;
      const question = make();
      const key = `${question?.type}|${question?.arabic || question?.latin}|${question?.answer}`;
      if (!question || question.options.length < 2 || seen.has(key)) continue;
      seen.add(key);
      out.push(question);
    }
  }
  return shuffle(out);
}

export function TikrarPageQuiz({ page }: { page: number }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    pointsAwarded: number;
    unlockedPage: number | null;
    isPriorPage?: boolean;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verses, setVerses] = useState<QuizVerse[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${page}?language=id&fields=text_uthmani&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33`
        );
        const data = await res.json();
        if (!cancelled) setVerses(Array.isArray(data?.verses) ? data.verses : []);
      } catch {
        if (!cancelled) toast({ variant: 'destructive', title: 'Gagal memuat ayat halaman ini' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, toast]);

  const start = useCallback(() => {
    setQuestions(generatePageQuiz(verses));
    setIdx(0);
    setCorrect(0);
    setSelected(null);
    setFinished(false);
    setResult(null);
    setSubmitError(null);
  }, [verses]);

  useEffect(() => {
    if (verses.length > 0) start();
  }, [verses, start]);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    questions.forEach((q) => (m[q.type] = (m[q.type] || 0) + 1));
    return m;
  }, [questions]);

  const submit = useCallback(
    async (finalCorrect: number) => {
      if (!user) return;
      setIsSubmitting(true);
      try {
        const res = await authFetch('/api/tikrar/quiz', {
          method: 'POST',
          body: JSON.stringify({
            page_number: page,
            total_questions: questions.length,
            correct_answers: finalCorrect,
            question_types: typeCounts,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Gagal menyimpan hasil ujian.');
        setResult(json.data);
        if (json.data?.passed && json.data?.firstPass) {
          toast({
            title: 'Alhamdulillah, Lulus Ujian Halaman!',
            description: json.data.isPriorPage
              ? `+${json.data.pointsAwarded} Poin. Hafalan lama Hal. ${page} tercatat lulus ujian.`
              : `+${json.data.pointsAwarded} Poin. Halaman berikutnya telah terbuka.`,
          });
        }
      } catch (e: any) {
        setSubmitError(e?.message || 'Gagal menyimpan hasil ujian.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, page, questions.length, typeCounts, toast]
  );

  const choose = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const ok = opt === questions[idx].answer;
    const nextCorrect = correct + (ok ? 1 : 0);
    if (ok) setCorrect(nextCorrect);
    setTimeout(() => {
      if (idx + 1 < questions.length) {
        setIdx(idx + 1);
        setSelected(null);
      } else {
        setFinished(true);
        submit(nextCorrect);
      }
    }, ok ? 700 : 1600);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Menyusun 30 soal…</p>
      </div>
    );
  }

  if (questions.length < QUIZ_QUESTION_COUNT) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Soal untuk halaman ini belum dapat disusun. Silakan muat ulang halaman.
        </CardContent>
      </Card>
    );
  }

  if (finished) {
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= QUIZ_PASS_PERCENT;
    return (
      <Card className="border-none shadow-xl overflow-hidden">
        <CardContent className="p-8 text-center space-y-5">
          <div
            className={cn(
              'w-20 h-20 mx-auto rounded-full flex items-center justify-center',
              passed ? 'bg-[#D4AF37]' : 'bg-stone-200'
            )}
          >
            <Trophy className={cn('w-10 h-10', passed ? 'text-black' : 'text-stone-500')} />
          </div>
          <div>
            <p className="text-5xl font-black text-[#800000]">{score}%</p>
            <p className="text-sm font-bold text-stone-600 mt-1">
              {correct} dari {questions.length} soal benar • batas lulus {QUIZ_PASS_PERCENT}%
            </p>
          </div>
          <p className={cn('text-sm font-black', passed ? 'text-emerald-700' : 'text-amber-700')}>
            {passed
              ? result?.isPriorPage
                ? `Lulus! Hal. ${page} (hafalan lama) tercatat lulus ujian. Dengan lulus tasmi', halaman ini naik ke lapis mutqin.`
                : `Lulus! ${result?.unlockedPage && result.unlockedPage !== page ? `Halaman ${result.unlockedPage} kini terbuka.` : ''}`
              : 'Belum lulus. Ulangi murajaah halaman ini lalu coba ujian lagi.'}
          </p>
          {isSubmitting && <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#800000]" />}
          {submitError && <p className="text-xs font-bold text-red-600">{submitError}</p>}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={start} variant="outline" className="rounded-xl font-black border-[#800000]/30 text-[#800000]">
              <RotateCcw className="w-4 h-4 mr-2" /> Ulangi Ujian
            </Button>
            <Button asChild className="rounded-xl font-black bg-[#800000] hover:bg-[#800000]/90 text-white">
              <Link href="/tikrar">
                Kembali ke Mushaf <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const q = questions[idx];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Badge className="bg-[#D4AF37] text-black font-black">{TYPE_LABELS[q.type]}</Badge>
        <span className="text-xs font-black text-[#800000]">
          Soal {idx + 1}/{questions.length} • Benar {correct}
        </span>
      </div>
      <Progress value={((idx + 1) / questions.length) * 100} className="h-2 [&>div]:bg-[#800000]" />
      <Card className="border-2 border-[#800000]/10 shadow-md">
        <CardContent className="p-6 space-y-5">
          <p className="text-xs font-black uppercase tracking-wider text-stone-500">{q.prompt}</p>
          {q.arabic && (
            <p dir="rtl" className="font-arabic text-3xl leading-[2.2] text-right text-stone-900">
              {q.arabic}
            </p>
          )}
          {q.latin && <p className="text-base font-semibold text-stone-800 leading-relaxed">{q.latin}</p>}
          <div className="grid gap-2.5">
            {q.options.map((opt) => {
              const isAnswer = opt === q.answer;
              const isChosen = opt === selected;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={Boolean(selected)}
                  onClick={() => choose(opt)}
                  className={cn(
                    'w-full rounded-xl border-2 px-4 py-3 transition-all flex items-center justify-between gap-3',
                    q.optionsArabic ? 'font-arabic text-2xl leading-loose' : 'text-sm font-bold text-left',
                    !selected && 'border-stone-200 hover:border-[#800000]/40 hover:bg-[#800000]/5',
                    selected && isAnswer && 'border-emerald-500 bg-emerald-50',
                    selected && isChosen && !isAnswer && 'border-red-400 bg-red-50',
                    selected && !isAnswer && !isChosen && 'border-stone-100 opacity-60'
                  )}
                  dir={q.optionsArabic ? 'rtl' : 'ltr'}
                >
                  <span className="flex-1">{opt}</span>
                  {selected && isAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                  {selected && isChosen && !isAnswer && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
