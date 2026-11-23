'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Layers,
  Loader2,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useUser } from '@/db';
import { authFetch } from '@/db/client';
import { useToast } from '@/hooks/use-toast';
import {
  QUIZ_PART1_COUNT,
  QUIZ_PART2_COUNT,
  QUIZ_PASS_PERCENT,
  QUIZ_QUESTION_COUNT,
} from '@/lib/tikrar-steps';
import { playTikrarDone, playTikrarTap } from '@/lib/tikrar-sound';
import type { QuizMode } from '@/components/mufradat/quiz-mode-selector';

interface QuizWord {
  id?: number;
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
  | 'ayat_dari_arti'
  | 'mufradat_mcq'
  | 'mufradat_tricky'
  | 'mufradat_reverse'
  | 'mufradat_scrambled';

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
  mufradat_mcq: 'Terjemah Per Kata',
  mufradat_tricky: 'Terjemah Kata (Pengecoh Mirip)',
  mufradat_reverse: 'Tebak Lafaz Arab',
  mufradat_scrambled: 'Susun Terjemahan Kata',
};

interface Question {
  part: 1 | 2;
  type: QuestionType;
  prompt: string;
  /** Teks Arab yang ditampilkan sebagai soal */
  arabic?: string;
  /** Teks Indonesia yang ditampilkan sebagai soal */
  latin?: string;
  /** Info ayat kecil (opsional) */
  verseKey?: string;
  answer: string;
  options: string[];
  optionsArabic: boolean;
  /** Untuk tipe mufradat_scrambled (Susun Terjemahan ala Hi Mufradat) */
  scrambledOptions?: string[];
}

interface WrongReviewItem {
  part: 1 | 2;
  typeLabel: string;
  arabic?: string;
  latin?: string;
  chosen: string;
  answer: string;
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

/** Part 1: Buat 30 soal hafalan & makna ayat dari satu halaman, bergiliran antar tipe soal */
export function generatePageQuiz(verses: QuizVerse[], count = QUIZ_PART1_COUNT): Question[] {
  if (verses.length === 0) return [];
  const heads = verses.map((v) => head(v)).filter(Boolean);
  const tails = verses.map((v) => tail(v)).filter(Boolean);
  const allWords = verses.flatMap((v) => verseWords(v).map((w) => w.text_uthmani!));
  const verseMeanings = verses.map((v) => cleanHtml(v.translations?.[0]?.text)).filter(Boolean);
  const verseNumbers = verses.map(verseNo);
  const numberFallback = verseNumbers.flatMap((n) => [
    String(Number(n) + 1),
    String(Math.max(1, Number(n) - 1)),
    String(Number(n) + 2),
  ]);

  type Part1Type = Exclude<
    QuestionType,
    'arti_kata' | 'mufradat_mcq' | 'mufradat_tricky' | 'mufradat_reverse' | 'mufradat_scrambled'
  >;

  const pools: Record<Part1Type, (() => Question | null)[]> = {
    sambung_ayat: [],
    ayat_sebelum: [],
    nomor_ayat: [],
    lengkapi_kata: [],
    kata_berikutnya: [],
    akhir_ayat: [],
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
        part: 1,
        type: 'sambung_ayat',
        prompt: 'Ayat berikutnya setelah ayat ini dimulai dengan…',
        arabic: v.text_uthmani,
        verseKey: v.verse_key,
        answer: head(next),
        options: buildOptions(head(next), heads, tails),
        optionsArabic: true,
      }));
    }
    if (prev && head(prev)) {
      pools.ayat_sebelum.push(() => ({
        part: 1,
        type: 'ayat_sebelum',
        prompt: 'Ayat SEBELUM ayat ini dimulai dengan…',
        arabic: v.text_uthmani,
        verseKey: v.verse_key,
        answer: head(prev),
        options: buildOptions(head(prev), heads, tails),
        optionsArabic: true,
      }));
    }
    pools.nomor_ayat.push(() => ({
      part: 1,
      type: 'nomor_ayat',
      prompt: 'Ayat ini adalah ayat nomor berapa?',
      arabic: v.text_uthmani,
      verseKey: v.verse_key,
      answer: verseNo(v),
      options: buildOptions(verseNo(v), verseNumbers, numberFallback),
      optionsArabic: false,
    }));
    if (words.length >= 3) {
      pools.akhir_ayat.push(() => ({
        part: 1,
        type: 'akhir_ayat',
        prompt: 'Ayat yang dimulai seperti ini diakhiri dengan…',
        arabic: `${head(v, Math.min(4, words.length - 1))} …`,
        verseKey: v.verse_key,
        answer: tail(v),
        options: buildOptions(tail(v), tails, heads),
        optionsArabic: true,
      }));
    }
    words.forEach((w, wi) => {
      if (words.length >= 3) {
        pools.lengkapi_kata.push(() => ({
          part: 1,
          type: 'lengkapi_kata',
          prompt: 'Lengkapi kata yang hilang pada ayat ini.',
          arabic: words.map((x, xi) => (xi === wi ? '▢▢▢' : x.text_uthmani)).join(' '),
          verseKey: v.verse_key,
          answer: w.text_uthmani!,
          options: buildOptions(w.text_uthmani!, allWords),
          optionsArabic: true,
        }));
      }
      if (wi > 0 && wi < words.length) {
        pools.kata_berikutnya.push(() => ({
          part: 1,
          type: 'kata_berikutnya',
          prompt: 'Kata berikutnya adalah…',
          arabic: `${words
            .slice(Math.max(0, wi - 4), wi)
            .map((x) => x.text_uthmani)
            .join(' ')} …`,
          verseKey: v.verse_key,
          answer: w.text_uthmani!,
          options: buildOptions(w.text_uthmani!, allWords),
          optionsArabic: true,
        }));
      }
    });
    const verseMeaning = cleanHtml(v.translations?.[0]?.text);
    if (verseMeaning) {
      pools.arti_ayat.push(() => ({
        part: 1,
        type: 'arti_ayat',
        prompt: 'Apa arti ayat ini?',
        arabic: v.text_uthmani,
        verseKey: v.verse_key,
        answer: verseMeaning,
        options: buildOptions(verseMeaning, verseMeanings),
        optionsArabic: false,
      }));
      if (head(v)) {
        pools.ayat_dari_arti.push(() => ({
          part: 1,
          type: 'ayat_dari_arti',
          prompt: 'Ayat dengan arti berikut dimulai dengan…',
          latin: verseMeaning,
          verseKey: v.verse_key,
          answer: head(v),
          options: buildOptions(head(v), heads, tails),
          optionsArabic: true,
        }));
      }
    }
  });

  const queues = (Object.keys(pools) as Part1Type[])
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

  // Fallback untuk halaman sangat pendek bila masih < count
  if (out.length < count) {
    const allMakers = (Object.keys(pools) as Part1Type[]).flatMap((t) => pools[t]);
    let fGuard = 0;
    while (out.length < count && allMakers.length > 0 && fGuard++ < 300) {
      const make = allMakers[Math.floor(Math.random() * allMakers.length)];
      const q = make();
      if (q && q.options.length >= 2) out.push(q);
    }
  }

  return shuffle(out).slice(0, count);
}

const STANDARD_INDO_DECOYS = [
  'Maha Pengasih',
  'Maha Penyayang',
  'Segala Puji',
  'Tuhan',
  'Manusia',
  'Raja',
  'Sembahan',
  'Petunjuk',
  'Jalan',
  'Lurus',
  'Beriman',
  'Kafir',
  'Surga',
  'Neraka',
  'Malaikat',
  'Kitab',
  'Rasul',
  'Hari Kiamat',
  'Sabar',
  'Syukur',
];

const STANDARD_ARABIC_DECOYS = ['لَا', 'نَعَمْ', 'فِي', 'مِنْ', 'إِلَى', 'عَلَى', 'وَمَا', 'الَّذِينَ'];

function categorizeIndo(text: string) {
  const lower = text.toLowerCase();
  if (lower.startsWith('maha') || lower.startsWith('paling') || lower.startsWith('sangat')) return 'attribute';
  if (/^(me|ber|di|ter)/.test(lower) || /(kan|i|lah)$/.test(lower)) return 'verb';
  if (lower.length < 5 && ['dan', 'maka', 'dari', 'ke', 'ya', 'ia', 'di', 'itu', 'ini'].includes(lower)) {
    return 'particle';
  }
  return 'noun';
}

function categorizeArabic(text: string) {
  if (text.startsWith('ال')) return 'noun_definite';
  if (text.endsWith('ون') || text.endsWith('ين')) return 'plural';
  if (text.length <= 2) return 'particle';
  return 'other';
}

/** Part 2: Buat 30 soal Terjemah Per Kata persis mekanisme kuis Hi Mufradat */
export function generateMufradatQuiz(
  verses: QuizVerse[],
  mode: QuizMode,
  count = QUIZ_PART2_COUNT
): Question[] {
  const pageWords = verses.flatMap((v) =>
    (v.words || [])
      .filter((w) => {
        if (w.char_type_name !== 'word' || !w.text_uthmani) return false;
        const t = cleanHtml(w.translation?.text);
        return t.length > 0 && t !== '???';
      })
      .map((w) => ({
        arabic: w.text_uthmani!,
        indonesian: cleanHtml(w.translation?.text),
        verseKey: v.verse_key,
      }))
  );

  if (pageWords.length === 0) return [];

  // Deduplikasi pool untuk smart decoys agar opsi tidak kembar
  const pool = pageWords;
  const uniqueIndo = Array.from(new Set(pool.map((w) => w.indonesian)));
  const uniqueArabic = Array.from(new Set(pool.map((w) => w.arabic)));

  const getSmartDecoys = (
    target: { arabic: string; indonesian: string },
    needed: number,
    targetType: 'arabic' | 'indonesian' = 'indonesian'
  ): string[] => {
    const targetIndoCat = categorizeIndo(target.indonesian);
    const targetArabCat = categorizeArabic(target.arabic);

    const ranked = pool
      .filter((w) => w.indonesian !== target.indonesian && w.arabic !== target.arabic)
      .map((w) => {
        let score = 0;
        if (categorizeIndo(w.indonesian) === targetIndoCat) score += 10;
        if (categorizeArabic(w.arabic) === targetArabCat) score += 10;
        if (Math.abs(w.indonesian.length - target.indonesian.length) <= 3) score += 5;
        score += Math.random() * 5;
        return { ...w, score };
      })
      .sort((a, b) => b.score - a.score);

    const picked: string[] = [];
    const seenVal = new Set<string>([
      targetType === 'indonesian' ? target.indonesian : target.arabic,
    ]);

    for (const item of ranked) {
      const val = targetType === 'indonesian' ? item.indonesian : item.arabic;
      if (!seenVal.has(val)) {
        seenVal.add(val);
        picked.push(val);
        if (picked.length >= needed) break;
      }
    }

    const fallbackList =
      targetType === 'indonesian'
        ? [...shuffle(uniqueIndo), ...shuffle(STANDARD_INDO_DECOYS)]
        : [...shuffle(uniqueArabic), ...shuffle(STANDARD_ARABIC_DECOYS)];

    for (const fb of fallbackList) {
      if (picked.length >= needed) break;
      if (fb && !seenVal.has(fb)) {
        seenVal.add(fb);
        picked.push(fb);
      }
    }
    return picked.slice(0, needed);
  };

  // Pilih tepat `count` (30) kata sesuai mode
  let selected: { arabic: string; indonesian: string; verseKey: string; repeated?: boolean }[] = [];
  if (mode === 'runut') {
    if (pageWords.length >= count) {
      // Ambil 30 kata merata secara berurutan dari awal hingga akhir halaman
      for (let i = 0; i < count; i++) {
        const idx = Math.floor((i * pageWords.length) / count);
        selected.push(pageWords[idx]);
      }
    } else {
      for (let i = 0; i < count; i++) {
        selected.push({ ...pageWords[i % pageWords.length], repeated: i >= pageWords.length });
      }
    }
  } else {
    const firstBatch = shuffle(pageWords);
    for (const w of firstBatch) {
      if (selected.length >= count) break;
      selected.push(w);
    }
    let loopIdx = 0;
    while (selected.length < count) {
      const extra = shuffle(pageWords);
      for (const w of extra) {
        if (selected.length >= count) break;
        selected.push({ ...w, repeated: true });
      }
      if (++loopIdx > 10) break;
    }
  }

  // Kumpulan token kata tunggal Indonesia untuk distractor mode Susun Terjemahan
  const singleIndoTokens = Array.from(
    new Set([
      ...pageWords.flatMap((w) => w.indonesian.split(/\s+/).filter(Boolean)),
      ...STANDARD_INDO_DECOYS.flatMap((d) => d.split(/\s+/).filter(Boolean)),
    ])
  );

  return selected.map((item) => {
    const tokens = item.indonesian.split(/\s+/).filter(Boolean);
    if (mode === 'variasi') {
      const rand = Math.random();
      const canScramble = tokens.length > 1;
      if (rand < 0.33 && canScramble) {
        const tokenSet = new Set(tokens.map((t) => t.toLowerCase()));
        const distractorCount = Math.max(4, Math.min(6, 9 - tokens.length));
        const distractors = shuffle(singleIndoTokens)
          .filter((t) => !tokenSet.has(t.toLowerCase()))
          .slice(0, distractorCount);
        const answer = tokens.join(' ');
        return {
          part: 2,
          type: 'mufradat_scrambled',
          prompt: 'Susun terjemahan kata berikut ini dengan tepat.',
          arabic: item.arabic,
          verseKey: item.verseKey,
          answer,
          options: [],
          optionsArabic: false,
          scrambledOptions: shuffle([...tokens, ...distractors]),
        };
      }
      if (rand >= 0.33 && rand < 0.66) {
        const arabicDecoys = getSmartDecoys(item, 3, 'arabic');
        return {
          part: 2,
          type: 'mufradat_reverse',
          prompt: 'Pilih lafaz bahasa Arab yang sesuai dengan terjemahan ini.',
          latin: item.indonesian,
          verseKey: item.verseKey,
          answer: item.arabic,
          options: shuffle([item.arabic, ...arabicDecoys]),
          optionsArabic: true,
        };
      }
      const smartDecoys = getSmartDecoys(item, 3, 'indonesian');
      return {
        part: 2,
        type: 'mufradat_tricky',
        prompt: 'Apa arti dari kata berikut?',
        arabic: item.arabic,
        verseKey: item.verseKey,
        answer: item.indonesian,
        options: shuffle([item.indonesian, ...smartDecoys]),
        optionsArabic: false,
      };
    }

    // Mode Runut / Acak: bila halaman sangat pendek & ada kata berulang, jadikan soal balik (Arti -> Arab)
    if (item.repeated) {
      const arabicDecoys = getSmartDecoys(item, 3, 'arabic');
      return {
        part: 2,
        type: 'mufradat_reverse',
        prompt: 'Pilih lafaz bahasa Arab yang sesuai dengan terjemahan ini.',
        latin: item.indonesian,
        verseKey: item.verseKey,
        answer: item.arabic,
        options: shuffle([item.arabic, ...arabicDecoys]),
        optionsArabic: true,
      };
    }

    const smartDecoys = getSmartDecoys(item, 3, 'indonesian');
    return {
      part: 2,
      type: 'mufradat_mcq',
      prompt: 'Apa arti dari kata berikut?',
      arabic: item.arabic,
      verseKey: item.verseKey,
      answer: item.indonesian,
      options: shuffle([item.indonesian, ...smartDecoys]),
      optionsArabic: false,
    };
  });
}

type QuizPhase = 'part1' | 'part2_select' | 'part2' | 'finished';

export function TikrarPageQuiz({ page }: { page: number }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [verses, setVerses] = useState<QuizVerse[]>([]);

  const [phase, setPhase] = useState<QuizPhase>('part1');
  const [part1Questions, setPart1Questions] = useState<Question[]>([]);
  const [part2Questions, setPart2Questions] = useState<Question[]>([]);
  const [mufradatMode, setMufradatMode] = useState<QuizMode>('variasi');

  const [idx1, setIdx1] = useState(0);
  const [idx2, setIdx2] = useState(0);
  const [part1Correct, setPart1Correct] = useState(0);
  const [part2Correct, setPart2Correct] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [scrambledIndices, setScrambledIndices] = useState<number[]>([]);
  const [wrongReview, setWrongReview] = useState<WrongReviewItem[]>([]);

  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    pointsAwarded: number;
    unlockedPage: number | null;
    isPriorPage?: boolean;
    inActiveTarget?: boolean;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setPart1Questions(generatePageQuiz(verses, QUIZ_PART1_COUNT));
    setPart2Questions([]);
    setPhase('part1');
    setIdx1(0);
    setIdx2(0);
    setPart1Correct(0);
    setPart2Correct(0);
    setSelected(null);
    setScrambledIndices([]);
    setWrongReview([]);
    setResult(null);
    setSubmitError(null);
  }, [verses]);

  useEffect(() => {
    if (verses.length > 0) start();
  }, [verses, start]);

  const startPart2 = useCallback(
    (mode: QuizMode) => {
      const generated = generateMufradatQuiz(verses, mode, QUIZ_PART2_COUNT);
      if (generated.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Gagal menyusun soal terjemah per kata',
          description: 'Silakan muat ulang halaman lalu coba lagi.',
        });
        return;
      }
      setMufradatMode(mode);
      setPart2Questions(generated);
      setIdx2(0);
      setPart2Correct(0);
      setSelected(null);
      setScrambledIndices([]);
      setPhase('part2');
    },
    [verses, toast]
  );

  const submit = useCallback(
    async (
      finalPart1Correct: number,
      finalPart2Correct: number,
      p2Questions: Question[],
      chosenMode: QuizMode
    ) => {
      if (!user) return;
      const totalQ = part1Questions.length + p2Questions.length;
      const totalCorrect = finalPart1Correct + finalPart2Correct;
      const typeCounts: Record<string, number | string> = {};
      [...part1Questions, ...p2Questions].forEach((q) => {
        typeCounts[q.type] = (Number(typeCounts[q.type]) || 0) + 1;
      });
      typeCounts.part1_correct = finalPart1Correct;
      typeCounts.part1_total = part1Questions.length;
      typeCounts.part2_correct = finalPart2Correct;
      typeCounts.part2_total = p2Questions.length;
      typeCounts.mufradat_mode = chosenMode;

      setIsSubmitting(true);
      try {
        const res = await authFetch('/api/tikrar/quiz', {
          method: 'POST',
          body: JSON.stringify({
            page_number: page,
            total_questions: totalQ,
            correct_answers: totalCorrect,
            question_types: typeCounts,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Gagal menyimpan hasil ujian.');
        setResult(json.data);
        if (json.data?.passed) playTikrarDone();
        if (json.data?.passed && json.data?.firstPass) {
          toast({
            title: 'Alhamdulillah, Lulus Ujian Halaman!',
            description: json.data.isPriorPage
              ? `Hafalan lama Hal. ${page} tercatat lulus ujian.`
              : json.data.inActiveTarget === false
              ? `Murajaah/latihan Hal. ${page} (di luar target) tercatat lulus ujian. Keaktifan & poin tetap hanya untuk target aktif.`
              : `+${json.data.pointsAwarded} Poin. Halaman berikutnya telah terbuka.`,
          });
        }
      } catch (e: any) {
        setSubmitError(e?.message || 'Gagal menyimpan hasil ujian.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, page, part1Questions, toast]
  );

  const choose = (opt: string) => {
    if (selected) return;
    const isPart1 = phase === 'part1';
    const currentList = isPart1 ? part1Questions : part2Questions;
    const currentIdx = isPart1 ? idx1 : idx2;
    const currentQ = currentList[currentIdx];
    if (!currentQ) return;

    setSelected(opt);
    const ok = opt === currentQ.answer;
    playTikrarTap();

    if (!ok) {
      setWrongReview((prev) => [
        ...prev,
        {
          part: currentQ.part,
          typeLabel: TYPE_LABELS[currentQ.type],
          arabic: currentQ.arabic,
          latin: currentQ.latin,
          chosen: opt,
          answer: currentQ.answer,
        },
      ]);
    }

    if (isPart1) {
      const nextP1 = part1Correct + (ok ? 1 : 0);
      if (ok) setPart1Correct(nextP1);
      setTimeout(() => {
        if (idx1 + 1 < part1Questions.length) {
          setIdx1(idx1 + 1);
          setSelected(null);
        } else {
          setSelected(null);
          setPhase('part2_select');
        }
      }, ok ? 650 : 1500);
    } else {
      const nextP2 = part2Correct + (ok ? 1 : 0);
      if (ok) setPart2Correct(nextP2);
      setTimeout(() => {
        setScrambledIndices([]);
        if (idx2 + 1 < part2Questions.length) {
          setIdx2(idx2 + 1);
          setSelected(null);
        } else {
          setPhase('finished');
          submit(part1Correct, nextP2, part2Questions, mufradatMode);
        }
      }, ok ? 700 : 1600);
    }
  };

  const handleScrambledClick = (chipIdx: number, remove: boolean) => {
    if (selected) return;
    if (remove) {
      setScrambledIndices((prev) => prev.filter((i) => i !== chipIdx));
    } else {
      setScrambledIndices((prev) => [...prev, chipIdx]);
    }
  };

  const checkScrambled = () => {
    const q = part2Questions[idx2];
    if (!q || !q.scrambledOptions) return;
    const assembled = scrambledIndices.map((i) => q.scrambledOptions![i]).join(' ');
    choose(assembled);
  };

  const totalAnsweredIndex = useMemo(() => {
    if (phase === 'part1') return idx1 + 1;
    if (phase === 'part2_select') return QUIZ_PART1_COUNT;
    if (phase === 'part2') return QUIZ_PART1_COUNT + idx2 + 1;
    return QUIZ_QUESTION_COUNT;
  }, [phase, idx1, idx2]);

  if (loading) {
    return (
      <div className="flex flex-col items-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Menyusun {QUIZ_QUESTION_COUNT} soal ujian (Part 1 Hafalan &amp; Part 2 Terjemah Per Kata)…
        </p>
      </div>
    );
  }

  if (part1Questions.length < QUIZ_PART1_COUNT) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Soal untuk halaman ini belum dapat disusun. Silakan muat ulang halaman.
        </CardContent>
      </Card>
    );
  }

  const PartStepper = () => (
    <div className="grid grid-cols-2 gap-2">
      <div
        className={cn(
          'rounded-xl border px-3 py-2 flex items-center justify-between gap-2 text-xs',
          phase === 'part1'
            ? 'bg-primary text-white border-primary'
            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
        )}
      >
        <span className="font-black truncate">Part 1 • Hafalan Ayat</span>
        <span className="font-black shrink-0">
          {phase === 'part1' ? `${idx1 + 1}/${QUIZ_PART1_COUNT}` : `✓ ${part1Correct}/${QUIZ_PART1_COUNT}`}
        </span>
      </div>
      <div
        className={cn(
          'rounded-xl border px-3 py-2 flex items-center justify-between gap-2 text-xs',
          phase === 'part2'
            ? 'bg-primary text-white border-primary'
            : phase === 'part2_select'
            ? 'bg-[#D4AF37]/20 text-primary border-[#D4AF37]'
            : phase === 'finished'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : 'bg-stone-100 text-stone-500 border-stone-200'
        )}
      >
        <span className="font-black truncate">Part 2 • Terjemah Per Kata</span>
        <span className="font-black shrink-0">
          {phase === 'part2'
            ? `${idx2 + 1}/${QUIZ_PART2_COUNT}`
            : phase === 'finished'
            ? `✓ ${part2Correct}/${QUIZ_PART2_COUNT}`
            : `0/${QUIZ_PART2_COUNT}`}
        </span>
      </div>
    </div>
  );

  if (phase === 'part2_select') {
    const part1Pct = Math.round((part1Correct / QUIZ_PART1_COUNT) * 100);
    return (
      <div className="space-y-4">
        <PartStepper />
        <Progress value={(QUIZ_PART1_COUNT / QUIZ_QUESTION_COUNT) * 100} className="h-2 [&>div]:bg-primary" />
        <Card className="border-2 border-[#D4AF37]/40 shadow-xl overflow-hidden rounded-3xl">
          <CardContent className="p-6 sm:p-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
              <CheckCircle2 className="w-4 h-4" />
              Part 1 Selesai • Skor Hafalan: {part1Correct}/{QUIZ_PART1_COUNT} ({part1Pct}%)
            </div>

            <div className="space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary text-[#D4AF37] flex items-center justify-center shadow-md">
                <BookOpenCheck className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-headline text-primary">
                Lanjut Part 2: Ujian Terjemah Per Kata ({QUIZ_PART2_COUNT} Soal)
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                Pilih mode soal terjemah per kata seperti di <strong>Hi Mufradat</strong> untuk menyelesaikan
                total <strong>{QUIZ_QUESTION_COUNT} soal</strong> ujian halaman ini.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <button
                type="button"
                onClick={() => startPart2('runut')}
                className="p-5 rounded-2xl border-2 border-stone-200 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center gap-2.5 group"
              >
                <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-stone-900">Mode Runut</p>
                  <p className="text-[11px] text-stone-500">Urutan ayat • Pemula</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => startPart2('acak')}
                className="p-5 rounded-2xl border-2 border-stone-200 hover:border-amber-500 hover:bg-amber-50 transition-all flex flex-col items-center gap-2.5 group"
              >
                <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 group-hover:bg-amber-500 group-hover:text-white transition-colors flex items-center justify-center">
                  <Shuffle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-stone-900">Mode Acak</p>
                  <p className="text-[11px] text-stone-500">Kata acak • Menengah</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => startPart2('variasi')}
                className="p-5 rounded-2xl border-2 border-[#D4AF37] bg-amber-50/40 hover:border-emerald-600 hover:bg-emerald-50 transition-all flex flex-col items-center gap-2.5 group relative"
              >
                <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-[#D4AF37] text-black text-[9px] font-black uppercase">
                  Rekomendasi
                </span>
                <div className="w-10 h-10 rounded-full bg-primary text-[#D4AF37] group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-stone-900">Mode Variasi</p>
                  <p className="text-[11px] text-stone-500">Arab↔Arti &amp; Susun • Mahir</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'finished') {
    const totalQ = part1Questions.length + part2Questions.length;
    const totalCorrect = part1Correct + part2Correct;
    const score = Math.round((totalCorrect / Math.max(1, totalQ)) * 100);
    const passed = score >= QUIZ_PASS_PERCENT;
    const p1Pct = Math.round((part1Correct / Math.max(1, part1Questions.length)) * 100);
    const p2Pct = Math.round((part2Correct / Math.max(1, part2Questions.length)) * 100);

    return (
      <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
        <CardContent className="p-6 sm:p-8 text-center space-y-6">
          <div
            className={cn(
              'w-20 h-20 mx-auto rounded-full flex items-center justify-center',
              passed ? 'bg-[#D4AF37]' : 'bg-stone-200'
            )}
          >
            <Trophy className={cn('w-10 h-10', passed ? 'text-black' : 'text-stone-500')} />
          </div>
          <div>
            <p className="text-5xl font-black text-primary">{score}%</p>
            <p className="text-sm font-bold text-stone-600 mt-1">
              {totalCorrect} dari {totalQ} soal benar • batas lulus {QUIZ_PASS_PERCENT}%
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-md mx-auto">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                Part 1 • Hafalan Ayat
              </p>
              <p className="text-lg font-black text-primary mt-0.5">
                {part1Correct}/{part1Questions.length}{' '}
                <span className="text-xs font-bold text-stone-500">({p1Pct}%)</span>
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                Part 2 • Terjemah Per Kata ({mufradatMode})
              </p>
              <p className="text-lg font-black text-primary mt-0.5">
                {part2Correct}/{part2Questions.length}{' '}
                <span className="text-xs font-bold text-stone-500">({p2Pct}%)</span>
              </p>
            </div>
          </div>

          <p className={cn('text-sm font-black', passed ? 'text-emerald-700' : 'text-amber-700')}>
            {passed
              ? result?.isPriorPage
                ? `Lulus! Hal. ${page} (hafalan lama) tercatat lulus ujian. Dengan lulus tasmi', halaman ini naik ke lapis mutqin.`
                : result?.inActiveTarget === false
                ? `Lulus! Hal. ${page} (latihan/murajaah di luar target) tercatat lulus ujian. Keaktifan & poin tetap hanya mencatat target aktif.`
                : `Lulus! ${
                    result?.unlockedPage && result.unlockedPage !== page
                      ? `Halaman ${result.unlockedPage} kini terbuka.`
                      : ''
                  }`
              : 'Belum lulus. Ulangi murajaah ayat & mufradat halaman ini lalu coba ujian lagi.'}
          </p>

          {isSubmitting && <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />}
          {submitError && <p className="text-xs font-bold text-red-600">{submitError}</p>}

          {wrongReview.length > 0 && (
            <div className="text-left space-y-2 pt-2 border-t border-stone-200">
              <p className="text-[11px] font-black uppercase tracking-wider text-rose-600">
                Perlu Review ({wrongReview.length} soal)
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {wrongReview.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-rose-50/70 border border-rose-200 p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] font-black border-rose-300 text-rose-800">
                        Part {item.part} • {item.typeLabel}
                      </Badge>
                    </div>
                    {item.arabic && (
                      <p dir="rtl" className="font-arabic text-xl text-right text-stone-900 leading-relaxed">
                        {item.arabic}
                      </p>
                    )}
                    {item.latin && <p className="font-semibold text-stone-800">{item.latin}</p>}
                    <p className="text-emerald-800 font-bold">Jawaban benar: {item.answer}</p>
                    <p className="text-rose-700">Pilihan Anda: {item.chosen}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              onClick={start}
              variant="outline"
              className="rounded-xl font-black border-primary/30 text-primary"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Ulangi Ujian ({QUIZ_QUESTION_COUNT} Soal)
            </Button>
            <Button asChild className="rounded-xl font-black bg-primary hover:bg-primary/90 text-white">
              <Link href="/tikrar">
                Kembali ke Mushaf <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPart1 = phase === 'part1';
  const currentList = isPart1 ? part1Questions : part2Questions;
  const currentIdx = isPart1 ? idx1 : idx2;
  const q = currentList[currentIdx];

  if (!q) return null;

  return (
    <div className="space-y-4">
      <PartStepper />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#D4AF37] text-black font-black">{TYPE_LABELS[q.type]}</Badge>
          {q.verseKey && (
            <Badge variant="outline" className="text-[10px] font-bold border-stone-300 text-stone-600">
              QS {q.verseKey}
            </Badge>
          )}
        </div>
        <span className="text-xs font-black text-primary">
          Part {q.part}: {currentIdx + 1}/{currentList.length} (Total {totalAnsweredIndex}/{QUIZ_QUESTION_COUNT}) •
          Benar {part1Correct + part2Correct}
        </span>
      </div>

      <Progress
        value={(totalAnsweredIndex / QUIZ_QUESTION_COUNT) * 100}
        className="h-2 [&>div]:bg-primary"
      />

      <Card className="border-2 border-primary/10 shadow-md rounded-2xl">
        <CardContent className="p-6 space-y-5">
          <p className="text-xs font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            {q.part === 2 && <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />}
            {q.prompt}
          </p>

          {q.type === 'mufradat_scrambled' ? (
            <div className="space-y-5">
              <div className="text-center py-2">
                <p dir="rtl" className="font-arabic text-5xl leading-[2] text-primary">
                  {q.arabic}
                </p>
              </div>

              <div
                className={cn(
                  'min-h-[64px] p-4 rounded-2xl border-2 border-dashed flex flex-wrap gap-2 items-center justify-center',
                  !selected
                    ? 'bg-stone-50 border-stone-300'
                    : selected === q.answer
                    ? 'bg-emerald-50 border-emerald-500'
                    : 'bg-red-50 border-red-400'
                )}
              >
                {scrambledIndices.length === 0 ? (
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                    Ketuk kata-kata di bawah untuk menyusun terjemahan…
                  </span>
                ) : (
                  scrambledIndices.map((chipIdx, pos) => (
                    <Badge
                      key={`${chipIdx}-${pos}`}
                      onClick={() => handleScrambledClick(chipIdx, true)}
                      className="bg-primary text-white hover:bg-primary/90 cursor-pointer py-1.5 px-3 rounded-lg text-sm font-bold"
                    >
                      {q.scrambledOptions![chipIdx]}
                    </Badge>
                  ))
                )}
              </div>

              {selected && selected !== q.answer && (
                <p className="text-xs font-bold text-emerald-700 text-center">
                  Terjemahan yang benar: <span className="underline">{q.answer}</span>
                </p>
              )}

              <div className="flex flex-wrap gap-2 justify-center">
                {(q.scrambledOptions || []).map((word, chipIdx) => {
                  const used = scrambledIndices.includes(chipIdx);
                  return (
                    <Button
                      key={chipIdx}
                      type="button"
                      variant="outline"
                      disabled={used || Boolean(selected)}
                      onClick={() => handleScrambledClick(chipIdx, false)}
                      className={cn(
                        'rounded-xl border-2 font-bold transition-all',
                        used
                          ? 'opacity-30 scale-95'
                          : 'hover:border-primary/40 hover:bg-primary/5 bg-white'
                      )}
                    >
                      {word}
                    </Button>
                  );
                })}
              </div>

              <Button
                type="button"
                disabled={scrambledIndices.length === 0 || Boolean(selected)}
                onClick={checkScrambled}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 rounded-xl shadow-md"
              >
                PERIKSA JAWABAN
              </Button>
            </div>
          ) : (
            <>
              {q.arabic && (
                <p
                  dir="rtl"
                  className={cn(
                    'font-arabic text-stone-900',
                    q.part === 2
                      ? 'text-5xl leading-[2.1] text-center py-2 text-primary'
                      : 'text-3xl leading-[2.2] text-right'
                  )}
                >
                  {q.arabic}
                </p>
              )}
              {q.latin && (
                <div
                  className={cn(
                    q.part === 2
                      ? 'text-xl sm:text-2xl font-black text-center text-stone-900 bg-stone-50 border border-stone-200 rounded-2xl p-5'
                      : 'text-base font-semibold text-stone-800 leading-relaxed'
                  )}
                >
                  {q.latin}
                </div>
              )}

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
                        q.optionsArabic
                          ? 'font-arabic text-2xl leading-loose'
                          : 'text-sm font-bold text-left',
                        !selected && 'border-stone-200 hover:border-primary/40 hover:bg-primary/5',
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
