import { IRAB_AYAT_DATA, IRAB_ORDERED_KEYS, IrabWordItem } from '@/lib/irab-data';
import type { QuizMode } from '@/components/mufradat/quiz-mode-selector';

export type IrabQuestionType = 'mcq' | 'tricky' | 'reverse' | 'shorof';

export interface IrabRichQuestion {
  id: number;
  word: string;
  wordArab: string;
  trans: string;
  meaning: string;
  functionName: string;
  shorof: string;
  irabIndo: string;
  type: IrabQuestionType;
  promptLabel: string;
  question: string;
  correct: string;
  options: string[];
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface WordPoolItem {
  surahId: string;
  wordArab: string;
  functionName: string;
  shorof: string;
}

function getGlobalPools() {
  const functions = new Set<string>();
  const shorofs = new Set<string>();
  const words: WordPoolItem[] = [];

  IRAB_ORDERED_KEYS.forEach((key) => {
    const ayatItem = IRAB_AYAT_DATA[key];
    if (!ayatItem) return;
    ayatItem.words.forEach((w) => {
      if (w.function) functions.add(w.function);
      if (w.shorof) shorofs.add(w.shorof);
      words.push({
        surahId: ayatItem.surahId,
        wordArab: w.wordArab || w.word,
        functionName: w.function,
        shorof: w.shorof,
      });
    });
  });

  return {
    allFunctions: Array.from(functions),
    allShorofs: Array.from(shorofs),
    allWords: words,
  };
}

function pickDistinctStrings(correct: string, pool: string[], count: number): string[] {
  const candidates = shuffleArray(
    Array.from(new Set(pool)).filter((item) => item && item.trim() !== correct.trim())
  );
  return candidates.slice(0, count);
}

function pickArabicDecoys(
  target: IrabWordItem,
  surahId: string,
  verseWords: IrabWordItem[],
  allWords: WordPoolItem[],
  count: number
): string[] {
  const targetArab = target.wordArab || target.word;
  const seen = new Set<string>([targetArab]);
  const result: string[] = [];

  const tryAdd = (items: Array<{ wordArab: string; functionName: string }>) => {
    for (const item of shuffleArray(items)) {
      if (result.length >= count) break;
      if (seen.has(item.wordArab)) continue;
      // Hindari kata Arab lain yang kedudukannya persis sama agar tidak ambigu
      if (item.functionName === target.function) continue;
      seen.add(item.wordArab);
      result.push(item.wordArab);
    }
  };

  // 1. Prioritas kata dari ayat yang sama
  tryAdd(
    verseWords.map((w) => ({
      wordArab: w.wordArab || w.word,
      functionName: w.function,
    }))
  );

  // 2. Jika ayat hanya punya 2-3 kata, ambil dari surah yang sama
  if (result.length < count) {
    tryAdd(allWords.filter((w) => w.surahId === surahId));
  }

  // 3. Jika masih kurang, ambil dari seluruh pool
  if (result.length < count) {
    tryAdd(allWords);
  }

  return result;
}

export function generateIrabQuestions(
  surahId: string,
  ayat: string | number,
  mode: QuizMode
): IrabRichQuestion[] {
  const key = `${surahId}:${ayat}`;
  const ayatData = IRAB_AYAT_DATA[key];
  if (!ayatData || ayatData.words.length === 0) return [];

  const { allFunctions, allShorofs, allWords } = getGlobalPools();

  const indexedWords = ayatData.words.map((w, idx) => ({
    wordItem: w,
    id: idx + 1,
  }));

  const orderedWords = mode === 'runut' ? indexedWords : shuffleArray(indexedWords);

  return orderedWords.map(({ wordItem: w, id }, qIdx) => {
    const wordArab = w.wordArab || w.word;

    if (mode === 'variasi') {
      // Rotasi + variasi tipe soal: kedudukan (tricky), reverse (tebak Arab), dan shorof
      const mod = qIdx % 3;
      const chosenType: IrabQuestionType =
        mod === 1 ? 'reverse' : mod === 2 ? 'shorof' : 'tricky';

      if (chosenType === 'reverse') {
        const arabicDecoys = pickArabicDecoys(
          w,
          String(surahId),
          ayatData.words,
          allWords,
          3
        );
        const options = shuffleArray([wordArab, ...arabicDecoys]);
        return {
          id,
          word: w.word,
          wordArab,
          trans: w.trans,
          meaning: w.meaning,
          functionName: w.function,
          shorof: w.shorof,
          irabIndo: w.irabIndo,
          type: 'reverse',
          promptLabel: 'Pilih Kata Arab yang Sesuai:',
          question: `${w.function} — "${w.meaning}"`,
          correct: wordArab,
          options: options.includes(wordArab) ? options : [wordArab, ...arabicDecoys],
        };
      }

      if (chosenType === 'shorof') {
        const shorofDecoys = pickDistinctStrings(w.shorof, allShorofs, 3);
        const options = shuffleArray([w.shorof, ...shorofDecoys]);
        return {
          id,
          word: w.word,
          wordArab,
          trans: w.trans,
          meaning: w.meaning,
          functionName: w.function,
          shorof: w.shorof,
          irabIndo: w.irabIndo,
          type: 'shorof',
          promptLabel: 'Pilih Akar / Bentuk Shorof yang Tepat:',
          question: `Apa bentuk shorof/akar kata « ${w.word} » (${w.trans} — "${w.meaning}")?`,
          correct: w.shorof,
          options: options.includes(w.shorof) ? options : [w.shorof, ...shorofDecoys],
        };
      }
    }

    // Standard MCQ ('runut', 'acak', atau 'tricky' pada 'variasi')
    const fnDecoys = pickDistinctStrings(w.function, allFunctions, 3);
    const options = shuffleArray([w.function, ...fnDecoys]);

    return {
      id,
      word: w.word,
      wordArab,
      trans: w.trans,
      meaning: w.meaning,
      functionName: w.function,
      shorof: w.shorof,
      irabIndo: w.irabIndo,
      type: mode === 'variasi' ? 'tricky' : 'mcq',
      promptLabel: "Apa kedudukan I'rab dari kata berikut?",
      question: `Apa kedudukan I'rab dari kata « ${w.word} » (${w.trans} — "${w.meaning}")?`,
      correct: w.function,
      options: options.includes(w.function) ? options : [w.function, ...fnDecoys],
    };
  });
}
