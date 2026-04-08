export interface Quote {
  text: string;
  source: string;
  type: 'hadits' | 'ayat';
  category: 'consistency' | 'action' | 'intention';
}

export const mutabaahQuotes: Quote[] = [
  {
    text: "Amalan yang paling dicintai Allah adalah yang berkelanjutan meskipun sedikit.",
    source: "HR. Bukhari no. 6464 & Muslim no. 783",
    type: 'hadits',
    category: 'consistency'
  },
  {
    text: "Barangsiapa mengerjakan kebaikan seberat dzarrah, niscaya dia akan melihat (balasan)nya.",
    source: "QS. Az-Zalzalah: 7",
    type: 'ayat',
    category: 'action'
  },
  {
    text: "Sesungguhnya setiap amalan itu tergantung pada niatnya.",
    source: "HR. Bukhari no. 1",
    type: 'hadits',
    category: 'intention'
  },
  {
    text: "Barangsiapa yang menempuh jalan untuk mencari ilmu, maka Allah akan mudahkan jalannya menuju surga.",
    source: "HR. Muslim no. 2699",
    type: 'hadits',
    category: 'action'
  },
  {
    text: "Janganlah kamu meremehkan kebaikan sekecil apa pun, sekalipun hanya dengan bermuka manis saat bertemu saudaramu.",
    source: "HR. Muslim no. 2626",
    type: 'hadits',
    category: 'consistency'
  },
  {
    text: "Berlomba-lombalah kamu dalam kebaikan.",
    source: "QS. Al-Baqarah: 148",
    type: 'ayat',
    category: 'action'
  },
  {
    text: "Seorang wanita yang menjaga shalat lima waktu, berpuasa di bulan Ramadhan, menjaga kemaluannya, dan taat pada suaminya, maka dikatakan kepadanya: Masuklah ke surga dari pintu mana saja yang kamu sukai.",
    source: "HR. Ahmad no. 1661 (Hasan Lighairihi)",
    type: 'hadits',
    category: 'action'
  },
  {
    text: "Ingatlahlah kepada-Ku, niscaya Aku ingat (pula) kepadamu.",
    source: "QS. Al-Baqarah: 152",
    type: 'ayat',
    category: 'intention'
  }
];

export function getRandomQuote(): Quote {
  return mutabaahQuotes[Math.floor(Math.random() * mutabaahQuotes.length)];
}
