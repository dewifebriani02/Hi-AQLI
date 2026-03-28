/**
 * Utility for mapping Quran Juz to Mushaf Madinah pages.
 */

// Mapping of Juz to its start and end page (Mushaf Madinah)
export const JUZ_PAGE_MAPPING: Record<number, { startPage: number, endPage: number }> = {
  1: { startPage: 1, endPage: 21 },
  2: { startPage: 22, endPage: 41 },
  3: { startPage: 42, endPage: 61 },
  4: { startPage: 62, endPage: 81 },
  5: { startPage: 82, endPage: 101 },
  6: { startPage: 102, endPage: 121 },
  7: { startPage: 122, endPage: 141 },
  8: { startPage: 142, endPage: 161 },
  9: { startPage: 162, endPage: 181 },
  10: { startPage: 182, endPage: 201 },
  11: { startPage: 202, endPage: 221 },
  12: { startPage: 222, endPage: 241 },
  13: { startPage: 242, endPage: 261 },
  14: { startPage: 262, endPage: 281 },
  15: { startPage: 282, endPage: 301 },
  16: { startPage: 302, endPage: 321 },
  17: { startPage: 322, endPage: 341 },
  18: { startPage: 342, endPage: 361 },
  19: { startPage: 362, endPage: 381 },
  20: { startPage: 382, endPage: 401 },
  21: { startPage: 402, endPage: 421 },
  22: { startPage: 422, endPage: 441 },
  23: { startPage: 442, endPage: 461 },
  24: { startPage: 462, endPage: 481 },
  25: { startPage: 482, endPage: 501 },
  26: { startPage: 502, endPage: 521 },
  27: { startPage: 522, endPage: 541 },
  28: { startPage: 542, endPage: 561 },
  29: { startPage: 562, endPage: 581 },
  30: { startPage: 582, endPage: 604 },
};

// Mapping of Surah to its starting page (Mushaf Madinah)
// Only first few and Juz 30 for brevity, or a way to get it
export const SURAH_START_PAGES: Record<number, number> = {
  1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187, 10: 208,
  11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282, 18: 293, 19: 305, 20: 312,
  21: 322, 22: 332, 23: 342, 24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396, 30: 404,
  31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446, 38: 453, 39: 458, 40: 467,
  41: 477, 42: 483, 43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515, 50: 518,
  51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542, 59: 545, 60: 549,
  61: 551, 62: 553, 63: 554, 64: 556, 65: 558, 66: 560, 67: 562, 68: 564, 69: 567, 70: 568,
  71: 570, 72: 572, 73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583, 80: 585,
  81: 586, 82: 587, 83: 587, 84: 589, 85: 590, 86: 591, 87: 591, 88: 592, 89: 593, 90: 594,
  91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599, 100: 599,
  101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602, 107: 602, 108: 602, 109: 603,
  110: 603, 111: 603, 112: 604, 113: 604, 114: 604
};

export function getPagesForJuz(juzId: number): number[] {
  const mapping = JUZ_PAGE_MAPPING[juzId];
  if (!mapping) return [];
  const pages = [];
  for (let i = mapping.startPage; i <= mapping.endPage; i++) {
    pages.push(i);
  }
  return pages;
}

export function getJuzForPage(pageId: number): number | null {
  for (const [juzId, mapping] of Object.entries(JUZ_PAGE_MAPPING)) {
    if (pageId >= mapping.startPage && pageId <= mapping.endPage) {
      return parseInt(juzId);
    }
  }
  return null;
}
