/**
 * Pembagian 4 Blok Warna (Maqra') dan 8 Sub-Blok (Maqta') Al-Qur'an Tikrar (Syaamil Quran).
 * 
 * Standar Syaamil Quran Tikrar:
 * - 1 halaman = 4 Blok Warna:
 *     Blok 1 (A / TM1): Warna Hijau
 *     Blok 2 (B / TM2): Warna Kuning
 *     Blok 3 (C / TM3): Warna Biru
 *     Blok 4 (D / TM4): Warna Merah
 * - Setiap Blok Warna dibagi menjadi 2 Maqta' (Sub-blok -1 dan -2):
 *     Total 8 Maqta' per halaman (TM1-1, TM1-2, TM2-1, TM2-2, TM3-1, TM3-2, TM4-1, TM4-2).
 * - Mendukung pemotongan level ayat maupun potongan ayat panjang (level kata / word index).
 */

export interface VerseWordLike {
  id?: number;
  position?: number;
  char_type_name?: string;
  text_uthmani?: string;
  line_number?: number;
  page_number?: number;
  translation?: { text?: string };
  [key: string]: any;
}

export interface TikrarVerseLike {
  id?: number | any;
  verse_number?: number;
  verse_key: string;
  text_uthmani?: string;
  words?: VerseWordLike[] | any[];
  translations?: { text: string }[];
  [key: string]: any;
}

export interface SubBlockConfig {
  sub_id: string; // e.g. "TM1-1", "TM1-2"
  label_alt?: string; // e.g. "Blok A-1", "Blok A-2"
  start_verse_key: string; // e.g. "2:282"
  start_word_index: number; // 1-indexed position in verse.words
  end_verse_key: string; // e.g. "2:282"
  end_word_index: number; // 1-indexed position in verse.words
  preview_text?: string;
  notes?: string;
}

export interface BlockConfig {
  block_id: 1 | 2 | 3 | 4;
  label_primary?: string; // "TM1", "TM2", "TM3", "TM4"
  label_alt?: string; // "Blok A", "Blok B", "Blok C", "Blok D"
  color_name?: string; // "Hijau", "Kuning", "Biru", "Merah"
  sub_1: SubBlockConfig;
  sub_2: SubBlockConfig;
  custom_label?: string;
}

export type PageBlockConfig = Record<1 | 2 | 3 | 4, BlockConfig>;

export interface TikrarPageBlockRecord {
  page_number: number;
  blocks: PageBlockConfig;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface SyaamilBlockConfig {
  verseKeys: string[];
  subAVerseKeys: string[];
  subBVerseKeys: string[];
}

/**
 * Pemetaan eksplisit bawaan Syaamil Quran Tikrar untuk halaman-halaman tertentu.
 */
export const SYAAMIL_PAGE_BLOCKS: Record<number, Record<1 | 2 | 3 | 4, SyaamilBlockConfig>> = {
  // Halaman 511 (Surah Al-Fath 48:1–9)
  511: {
    1: {
      verseKeys: ['48:1', '48:2', '48:3'],
      subAVerseKeys: ['48:1'],
      subBVerseKeys: ['48:2', '48:3'],
    },
    2: {
      verseKeys: ['48:4', '48:5'],
      subAVerseKeys: ['48:4'],
      subBVerseKeys: ['48:5'],
    },
    3: {
      verseKeys: ['48:6', '48:7'],
      subAVerseKeys: ['48:6'],
      subBVerseKeys: ['48:7'],
    },
    4: {
      verseKeys: ['48:8', '48:9'],
      subAVerseKeys: ['48:8'],
      subBVerseKeys: ['48:9'],
    },
  },
};

/**
 * Warna dan tema 4 Blok Quran Syamil Tikrar
 */
export const SYAAMIL_BLOCK_THEME = {
  1: {
    letter: 'A',
    tmLabel: 'TM 1',
    colorName: 'Hijau',
    badgeText: 'TM 1 (BLOK A)',
    badgeClass: 'bg-emerald-700 text-white',
    cardBorder: 'border-emerald-300',
    headerBg: 'bg-emerald-800',
    softHeaderBg: 'bg-emerald-100/70 text-emerald-950 border-emerald-200',
    verseBg: 'bg-emerald-100/80 border-emerald-300',
    accentText: 'text-emerald-800',
  },
  2: {
    letter: 'B',
    tmLabel: 'TM 2',
    colorName: 'Kuning',
    badgeText: 'TM 2 (BLOK B)',
    badgeClass: 'bg-amber-500 text-black',
    cardBorder: 'border-amber-300',
    headerBg: 'bg-[#996515]',
    softHeaderBg: 'bg-amber-100/75 text-amber-950 border-amber-200',
    verseBg: 'bg-amber-100/80 border-amber-300',
    accentText: 'text-amber-900',
  },
  3: {
    letter: 'C',
    tmLabel: 'TM 3',
    colorName: 'Biru',
    badgeText: 'TM 3 (BLOK C)',
    badgeClass: 'bg-blue-700 text-white',
    cardBorder: 'border-sky-300',
    headerBg: 'bg-[#0f4c81]',
    softHeaderBg: 'bg-sky-100/75 text-sky-950 border-sky-200',
    verseBg: 'bg-sky-100/80 border-sky-300',
    accentText: 'text-sky-900',
  },
  4: {
    letter: 'D',
    tmLabel: 'TM 4',
    colorName: 'Merah',
    badgeText: 'TM 4 (BLOK D)',
    badgeClass: 'bg-rose-700 text-white',
    cardBorder: 'border-rose-300',
    headerBg: 'bg-primary',
    softHeaderBg: 'bg-rose-100/75 text-rose-950 border-rose-200',
    verseBg: 'bg-rose-100/80 border-rose-300',
    accentText: 'text-rose-950',
  },
} as const;

export function formatVerseRange<T extends { verse_key: string }>(verses: T[]): string {
  if (!verses || verses.length === 0) return '';
  const first = verses[0].verse_key;
  const last = verses[verses.length - 1].verse_key;
  const [s1, a1] = first.split(':');
  const [s2, a2] = last.split(':');
  if (s1 === s2) {
    return a1 === a2 ? `Ayat ${a1}` : `Ayat ${a1}–${a2}`;
  }
  return `QS ${s1}:${a1} – ${s2}:${a2}`;
}

/**
 * Filter kata-kata di dalam suatu ayat berdasarkan rentang start_word_index dan end_word_index (1-based)
 */
export function sliceVerseWords<T extends TikrarVerseLike>(
  verse: T,
  startWordIdx?: number,
  endWordIdx?: number
): T {
  if (!verse.words || verse.words.length === 0) return verse;

  const start = startWordIdx && startWordIdx > 1 ? startWordIdx : 1;
  const end = endWordIdx && endWordIdx > 0 ? endWordIdx : verse.words.length;

  const slicedWords = verse.words.filter((w: VerseWordLike, idx: number) => {
    const pos = w.position ?? (idx + 1);
    return pos >= start && pos <= end;
  });

  const slicedText = slicedWords
    .map((w: VerseWordLike) => w.text_uthmani || '')
    .filter(Boolean)
    .join(' ');

  return {
    ...verse,
    words: slicedWords,
    text_uthmani: slicedText || verse.text_uthmani,
  };
}

/**
 * Ambil ayat-ayat dan potongan kata untuk suatu SubBlockConfig
 */
export function getVersesForSubBlock<T extends TikrarVerseLike>(
  pageVerses: T[],
  subConfig: SubBlockConfig
): T[] {
  if (!pageVerses || pageVerses.length === 0 || !subConfig) return [];

  const startV = subConfig.start_verse_key;
  const endV = subConfig.end_verse_key;

  const startIdx = pageVerses.findIndex((v) => v.verse_key === startV);
  const endIdx = pageVerses.findIndex((v) => v.verse_key === endV);

  if (startIdx === -1 && endIdx === -1) return [];

  const actualStart = startIdx !== -1 ? startIdx : 0;
  const actualEnd = endIdx !== -1 ? endIdx : pageVerses.length - 1;

  if (actualStart > actualEnd) return [];

  const selectedVerses = pageVerses.slice(actualStart, actualEnd + 1);

  return selectedVerses.map((v, i) => {
    const isStart = i === 0;
    const isEnd = i === selectedVerses.length - 1;

    const startWord = isStart ? subConfig.start_word_index : 1;
    const endWord = isEnd ? subConfig.end_word_index : (v.words?.length || 9999);

    return sliceVerseWords(v, startWord, endWord);
  });
}

/**
 * Mengambil ayat-ayat untuk 1 Blok utuh (Sub 1 + Sub 2)
 */
export function getVersesForBlockConfig<T extends TikrarVerseLike>(
  pageVerses: T[],
  blockConfig: BlockConfig
): T[] {
  if (!blockConfig || !blockConfig.sub_1 || !blockConfig.sub_2) return [];

  const startV = blockConfig.sub_1.start_verse_key;
  const endV = blockConfig.sub_2.end_verse_key;

  const startIdx = pageVerses.findIndex((v) => v.verse_key === startV);
  const endIdx = pageVerses.findIndex((v) => v.verse_key === endV);

  const actualStart = startIdx !== -1 ? startIdx : 0;
  const actualEnd = endIdx !== -1 ? endIdx : pageVerses.length - 1;

  if (actualStart > actualEnd) return [];

  const selected = pageVerses.slice(actualStart, actualEnd + 1);

  return selected.map((v, i) => {
    const isStart = i === 0;
    const isEnd = i === selected.length - 1;

    const startWord = isStart ? blockConfig.sub_1.start_word_index : 1;
    const endWord = isEnd ? blockConfig.sub_2.end_word_index : (v.words?.length || 9999);

    return sliceVerseWords(v, startWord, endWord);
  });
}

/**
 * Membagi seluruh ayat dalam 1 halaman menjadi 4 Blok (A/TM1, B/TM2, C/TM3, D/TM4)
 */
export function splitPageInto4Blocks<T extends TikrarVerseLike>(
  pageNumber: number,
  verses: T[],
  customConfig?: PageBlockConfig | null
): Record<1 | 2 | 3 | 4, T[]> {
  if (!verses || verses.length === 0) {
    return { 1: [], 2: [], 3: [], 4: [] };
  }

  // 1. Cek konfigurasi kustom dari database
  if (customConfig && customConfig[1] && customConfig[2] && customConfig[3] && customConfig[4]) {
    return {
      1: getVersesForBlockConfig(verses, customConfig[1]),
      2: getVersesForBlockConfig(verses, customConfig[2]),
      3: getVersesForBlockConfig(verses, customConfig[3]),
      4: getVersesForBlockConfig(verses, customConfig[4]),
    };
  }

  // 2. Cek pemetaan eksplisit Syaamil bawaan
  const override = SYAAMIL_PAGE_BLOCKS[pageNumber];
  if (override) {
    return {
      1: verses.filter((v) => override[1].verseKeys.includes(v.verse_key)),
      2: verses.filter((v) => override[2].verseKeys.includes(v.verse_key)),
      3: verses.filter((v) => override[3].verseKeys.includes(v.verse_key)),
      4: verses.filter((v) => override[4].verseKeys.includes(v.verse_key)),
    };
  }

  const n = verses.length;
  // Halaman dengan sedikit ayat (< 4)
  if (n === 1) return { 1: [verses[0]], 2: [verses[0]], 3: [verses[0]], 4: [verses[0]] };
  if (n === 2) return { 1: [verses[0]], 2: [verses[0]], 3: [verses[1]], 4: [verses[1]] };
  if (n === 3) return { 1: [verses[0]], 2: [verses[1]], 3: [verses[2]], 4: [verses[2]] };

  // n >= 4: Partisi dinamis seimbang berdasarkan bobot kata/baris
  const weights = verses.map((v) => Math.max(1, (v.words || []).length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const targetW = totalWeight / 4;

  let bestScore = Infinity;
  let bestCuts = [1, 2, 3];

  for (let c1 = 1; c1 <= n - 3; c1++) {
    for (let c2 = c1 + 1; c2 <= n - 2; c2++) {
      for (let c3 = c2 + 1; c3 <= n - 1; c3++) {
        const w1 = weights.slice(0, c1).reduce((a, b) => a + b, 0);
        const w2 = weights.slice(c1, c2).reduce((a, b) => a + b, 0);
        const w3 = weights.slice(c2, c3).reduce((a, b) => a + b, 0);
        const w4 = weights.slice(c3).reduce((a, b) => a + b, 0);

        const score =
          Math.pow(w1 - targetW, 2) +
          Math.pow(w2 - targetW, 2) +
          Math.pow(w3 - targetW, 2) +
          Math.pow(w4 - targetW, 2);

        if (score < bestScore) {
          bestScore = score;
          bestCuts = [c1, c2, c3];
        }
      }
    }
  }

  return {
    1: verses.slice(0, bestCuts[0]),
    2: verses.slice(bestCuts[0], bestCuts[1]),
    3: verses.slice(bestCuts[1], bestCuts[2]),
    4: verses.slice(bestCuts[2]),
  };
}

export interface SubBlockSplit<T> {
  subAVerses: T[];
  subBVerses: T[];
  subALabel: string;
  subBLabel: string;
  isSingleVerseSplit: boolean;
}

/**
 * Membagi ayat-ayat di dalam 1 blok menjadi Sub-blok 1 (-1 / A / Maroon) dan Sub-blok 2 (-2 / B / Hitam)
 */
export function splitBlockIntoSubBlocks<T extends TikrarVerseLike>(
  blockNumber: 1 | 2 | 3 | 4,
  pageNumber: number,
  blockVerses: T[],
  customConfig?: PageBlockConfig | null,
  rawPageVerses?: T[]
): SubBlockSplit<T> {
  if (!blockVerses || blockVerses.length === 0) {
    return {
      subAVerses: [],
      subBVerses: [],
      subALabel: '',
      subBLabel: '',
      isSingleVerseSplit: false,
    };
  }

  // 1. Cek konfigurasi kustom
  const blockCfg = customConfig?.[blockNumber];
  if (blockCfg && blockCfg.sub_1 && blockCfg.sub_2) {
    const sourceVerses = rawPageVerses && rawPageVerses.length > 0 ? rawPageVerses : blockVerses;
    const subAVerses = getVersesForSubBlock(sourceVerses, blockCfg.sub_1);
    const subBVerses = getVersesForSubBlock(sourceVerses, blockCfg.sub_2);

    const isSingle =
      blockCfg.sub_1.start_verse_key === blockCfg.sub_2.end_verse_key &&
      subAVerses.length <= 1 &&
      subBVerses.length <= 1;

    return {
      subAVerses,
      subBVerses,
      subALabel: blockCfg.sub_1.label_alt || blockCfg.sub_1.sub_id,
      subBLabel: blockCfg.sub_2.label_alt || blockCfg.sub_2.sub_id,
      isSingleVerseSplit: isSingle,
    };
  }

  // 2. Cek pemetaan eksplisit bawaan
  const override = SYAAMIL_PAGE_BLOCKS[pageNumber]?.[blockNumber];
  if (override && override.subAVerseKeys?.length && override.subBVerseKeys?.length) {
    const subAVerses = blockVerses.filter((v) => override.subAVerseKeys.includes(v.verse_key));
    const subBVerses = blockVerses.filter((v) => override.subBVerseKeys.includes(v.verse_key));
    return {
      subAVerses,
      subBVerses,
      subALabel: formatVerseRange(subAVerses),
      subBLabel: formatVerseRange(subBVerses),
      isSingleVerseSplit: false,
    };
  }

  // 3. Jika blok hanya terdiri dari 1 ayat, dipenggal berdasarkan kata
  if (blockVerses.length === 1) {
    const v = blockVerses[0];
    const aNum = v.verse_key.split(':')[1] || '';
    return {
      subAVerses: blockVerses,
      subBVerses: [],
      subALabel: `Ayat ${aNum} (Bag. 1)`,
      subBLabel: `Ayat ${aNum} (Bag. 2)`,
      isSingleVerseSplit: true,
    };
  }

  // 4. Jika blok terdiri dari 2 ayat: ayat 1 = sub A, ayat 2 = sub B
  if (blockVerses.length === 2) {
    const subA = [blockVerses[0]];
    const subB = [blockVerses[1]];
    return {
      subAVerses: subA,
      subBVerses: subB,
      subALabel: formatVerseRange(subA),
      subBLabel: formatVerseRange(subB),
      isSingleVerseSplit: false,
    };
  }

  // 5. Jika blok terdiri dari >= 3 ayat: partisi seimbang antar ayat
  const weights = blockVerses.map((v) => Math.max(1, (v.words || []).length));
  const total = weights.reduce((a, b) => a + b, 0);
  const target = total / 2;

  let bestIdx = 1;
  let bestDiff = Infinity;
  let running = 0;
  for (let i = 0; i < blockVerses.length - 1; i++) {
    running += weights[i];
    const diff = Math.abs(running - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i + 1;
    }
  }

  const subA = blockVerses.slice(0, bestIdx);
  const subB = blockVerses.slice(bestIdx);
  return {
    subAVerses: subA,
    subBVerses: subB,
    subALabel: formatVerseRange(subA),
    subBLabel: formatVerseRange(subB),
    isSingleVerseSplit: false,
  };
}

/**
 * Otomatis menghasilkan draft konfigurasi 4 Blok x 2 Sub-Blok seimbang (TM1..TM4 & TM1-1..TM4-2)
 * untuk digunakan pada fitur "Bagi Rata Otomatis" di Panel Admin.
 * Hanya menghitung token kata sebenarnya (char_type_name !== 'end').
 */
export function generateDefaultPageBlockConfig<T extends TikrarVerseLike>(
  pageNumber: number,
  verses: T[]
): PageBlockConfig {
  if (!verses || verses.length === 0) {
    throw new Error('Verses tidak boleh kosong untuk generate config.');
  }

  // Kumpulkan seluruh token kata dalam 1 halaman beserta verse_key dan posisi kata (exclude char_type_name === 'end')
  interface TokenMeta {
    verse_key: string;
    word_index: number;
    text: string;
  }
  const allTokens: TokenMeta[] = [];

  verses.forEach((v) => {
    if (v.words && v.words.length > 0) {
      v.words.forEach((w: VerseWordLike, idx: number) => {
        if (w.char_type_name === 'end') return;
        allTokens.push({
          verse_key: v.verse_key,
          word_index: w.position ?? (idx + 1),
          text: w.text_uthmani || '',
        });
      });
    } else {
      // Fallback jika kata per ayat belum diurai
      allTokens.push({
        verse_key: v.verse_key,
        word_index: 1,
        text: v.text_uthmani || '',
      });
    }
  });

  const totalTokens = allTokens.length;
  // 8 potongan (TM1-1, TM1-2, TM2-1, TM2-2, TM3-1, TM3-2, TM4-1, TM4-2)
  const cuts: { start: number; end: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const start = Math.floor((i * totalTokens) / 8);
    const end = i === 7 ? totalTokens - 1 : Math.floor(((i + 1) * totalTokens) / 8) - 1;
    cuts.push({ start, end: Math.max(start, end) });
  }

  const blockNames: Array<{
    id: 1 | 2 | 3 | 4;
    tm: string;
    letter: string;
    color: string;
  }> = [
    { id: 1, tm: 'TM1', letter: 'Blok A', color: 'Hijau' },
    { id: 2, tm: 'TM2', letter: 'Blok B', color: 'Kuning' },
    { id: 3, tm: 'TM3', letter: 'Blok C', color: 'Biru' },
    { id: 4, tm: 'TM4', letter: 'Blok D', color: 'Merah' },
  ];

  const result: Partial<PageBlockConfig> = {};

  blockNames.forEach((b, bIdx) => {
    const cut1 = cuts[bIdx * 2];
    const cut2 = cuts[bIdx * 2 + 1];

    const t1Start = allTokens[cut1.start] || allTokens[0];
    const t1End = allTokens[cut1.end] || t1Start;
    const t2Start = allTokens[cut2.start] || t1End;
    const t2End = allTokens[cut2.end] || t2Start;

    result[b.id] = {
      block_id: b.id,
      label_primary: b.tm,
      label_alt: b.letter,
      color_name: b.color,
      sub_1: {
        sub_id: `${b.tm}-1`,
        label_alt: `${b.letter}-1`,
        start_verse_key: t1Start.verse_key,
        start_word_index: t1Start.word_index,
        end_verse_key: t1End.verse_key,
        end_word_index: t1End.word_index,
        preview_text: `${t1Start.text} ... ${t1End.text}`,
      },
      sub_2: {
        sub_id: `${b.tm}-2`,
        label_alt: `${b.letter}-2`,
        start_verse_key: t2Start.verse_key,
        start_word_index: t2Start.word_index,
        end_verse_key: t2End.verse_key,
        end_word_index: t2End.word_index,
        preview_text: `${t2Start.text} ... ${t2End.text}`,
      },
    };
  });

  return result as PageBlockConfig;
}
