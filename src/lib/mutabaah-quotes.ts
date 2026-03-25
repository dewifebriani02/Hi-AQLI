export interface Quote {
  text: string;
  source: string;
  category: 'consistency' | 'action' | 'intention';
}

export const mutabaahQuotes: Quote[] = [
  {
    text: "Amalan yang paling dicintai Allah adalah yang berkelanjutan meskipun sedikit.",
    source: "HR. Bukhari & Muslim",
    category: 'consistency'
  },
  {
    text: "Maka berlomba-lombalah kamu dalam kebaikan.",
    source: "QS. Al-Baqarah: 148",
    category: 'action'
  },
  {
    text: "Sesungguhnya setiap amalan tergantung pada niatnya.",
    source: "HR. Bukhari & Muslim",
    category: 'intention'
  },
  {
    text: "Barangsiapa yang menempuh jalan untuk mencari ilmu, maka Allah akan mudahkan jalannya menuju surga.",
    source: "HR. Muslim",
    category: 'action'
  },
  {
    text: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia.",
    source: "HR. Thabrani",
    category: 'action'
  },
  {
    text: "Janganlah kamu meremehkan kebaikan sekecil apa pun.",
    source: "HR. Muslim",
    category: 'consistency'
  },
  {
    text: "Dunia adalah ladang untuk akhirat.",
    source: "Nasihat Ulama",
    category: 'intention'
  },
  {
    text: "Amal yang paling utama adalah shalat pada waktunya.",
    source: "HR. Bukhari",
    category: 'action'
  }
];

export function getRandomQuote(): Quote {
  return mutabaahQuotes[Math.floor(Math.random() * mutabaahQuotes.length)];
}
