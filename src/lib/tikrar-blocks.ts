/**
 * Pembagian 4 Blok Warna (Maqra') dan 8 Sub-Blok (Maqta') Al-Qur'an Tikrar (Syaamil Quran).
 * 
 * Standar Syaamil Quran Tikrar:
 * - 1 halaman = 4 Blok Warna:
 *     Blok 1 (A): Warna Hijau
 *     Blok 2 (B): Warna Kuning
 *     Blok 3 (C): Warna Biru
 *     Blok 4 (D): Warna Merah
 * - Setiap Blok Warna dibagi menjadi 2 Maqta' (Sub-blok -1 dan -2):
 *     Total 8 Maqta' per halaman (A-1, A-2, B-1, B-2, C-1, C-2, D-1, D-2).
 * - Pembagian selalu memprioritaskan batas ayat (wakaf / akhir ayat).
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

export interface SyaamilBlockConfig {
  verseKeys: string[];
  subAVerseKeys: string[];
  subBVerseKeys: string[];
}

/**
 * Pemetaan eksplisit Syaamil Quran Tikrar untuk halaman-halaman tertentu.
 */
export const SYAAMIL_PAGE_BLOCKS: Record<number, Record<1 | 2 | 3 | 4, SyaamilBlockConfig>> = {
  // Halaman 511 (Surah Al-Fath 48:1–9)
  // Blok A: ayat 1–3 (A-1: ayat 1, A-2: ayat 2–3)
  // Blok B: ayat 4–5 (B-1: ayat 4, B-2: ayat 5)
  // Blok C: ayat 6–7 (C-1: ayat 6, C-2: ayat 7)
  // Blok D: ayat 8–9 (D-1: ayat 8, D-2: ayat 9)
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
    colorName: 'Hijau',
    badgeText: 'BLOK A • HIJAU',
    badgeClass: 'bg-emerald-700 text-white',
    cardBorder: 'border-emerald-600/30',
    headerBg: 'bg-emerald-800',
    accentText: 'text-emerald-700',
  },
  2: {
    letter: 'B',
    colorName: 'Kuning',
    badgeText: 'BLOK B • KUNING',
    badgeClass: 'bg-amber-500 text-black',
    cardBorder: 'border-amber-500/30',
    headerBg: 'bg-[#996515]',
    accentText: 'text-amber-800',
  },
  3: {
    letter: 'C',
    colorName: 'Biru',
    badgeText: 'BLOK C • BIRU',
    badgeClass: 'bg-blue-600 text-white',
    cardBorder: 'border-blue-600/30',
    headerBg: 'bg-[#0f4c81]',
    accentText: 'text-blue-800',
  },
  4: {
    letter: 'D',
    colorName: 'Merah',
    badgeText: 'BLOK D • MERAH',
    badgeClass: 'bg-rose-700 text-white',
    cardBorder: 'border-rose-600/30',
    headerBg: 'bg-[#800000]',
    accentText: 'text-rose-800',
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
 * Membagi seluruh ayat dalam 1 halaman menjadi 4 Blok (A, B, C, D)
 */
export function splitPageInto4Blocks<T extends TikrarVerseLike>(
  pageNumber: number,
  verses: T[]
): Record<1 | 2 | 3 | 4, T[]> {
  if (!verses || verses.length === 0) {
    return { 1: [], 2: [], 3: [], 4: [] };
  }

  // 1. Cek pemetaan eksplisit Syaamil jika tersedia
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
  // Memastikan SETIAP blok (1, 2, 3, 4) minimal mendapat 1 ayat utuh
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
 * Membagi ayat-ayat di dalam 1 blok menjadi Sub-blok 1 (-1 / A) dan Sub-blok 2 (-2 / B)
 */
export function splitBlockIntoSubBlocks<T extends TikrarVerseLike>(
  blockNumber: 1 | 2 | 3 | 4,
  pageNumber: number,
  blockVerses: T[]
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

  // 1. Cek pemetaan eksplisit
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

  // 2. Jika blok hanya terdiri dari 1 ayat, dipenggal berdasarkan kata
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

  // 3. Jika blok terdiri dari 2 ayat: ayat 1 = sub A, ayat 2 = sub B
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

  // 4. Jika blok terdiri dari >= 3 ayat: partisi seimbang antar ayat
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
