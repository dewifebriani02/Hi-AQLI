// Shared Curriculum Data & Completion Helpers for Hi Matan (Matan Al-Ajurumiyah)

export interface MatanQuiz {
  question: string;
  options: string[];
  correct: string;
}

export interface MatanItem {
  id: string;
  bait_arabic: string;
  translation: string;
  syarah_text: string;
  audio_url?: string | null;
  audio_start?: number;
  audio_end?: number;
  example_verse?: {
    text: string;
    surah: number;
    ayat: number;
  };
  quizzes: MatanQuiz[];
}

export interface MatanChapterDef {
  id: string;
  chapter_number: number;
  title: string;
  description: string;
  items: MatanItem[];
}

export const AJURUMIYAH_CHAPTERS: MatanChapterDef[] = [
  {
    id: "initial",
    chapter_number: 1,
    title: "Bab Al-Kalam",
    description: "Definisi Kalam & 4 Syarat Utamanya dalam Ilmu Nahwu (Lafazh, Murakkab, Mufid, Bil-Wadh'i)",
    items: [
      {
        id: "initial-kalam-1",
        bait_arabic: "الكَلَامُ هُوَ اللَّفْظُ المُرَكَّبُ المُفِيدُ بِالوَضْعِ، وَأَقْسَامُهُ ثَلَاثَةٌ: اِسْمٌ، وَفِعْلٌ، وَحَرْفٌ جَاءَ لِمَعْنًى",
        translation:
          "Kalam adalah lafazh yang tersusun, memberikan faedah (makna sempurna), dan diucapkan dengan sengaja dalam bahasa Arab. Dan pembagian kata penyusunnya ada tiga: Isim, Fi'il, dan Harf yang memiliki makna.",
        syarah_text: `
          <p class="mb-4">Dalam ilmu Nahwu, suatu ucapan baru disebut <strong>Al-Kalam (الكلام)</strong> apabila memenuhi <strong>4 syarat utama</strong> secara bersamaan:</p>
          <ul class="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Al-Lafzhu (اللَّفْظُ):</strong> Suara yang mengandung sebagian huruf hijaiyah (bukan isyarat tangan atau tulisan semata).</li>
            <li><strong>Al-Murakkabu (المُرَكَّبُ):</strong> Tersusun dari minimal dua kata atau lebih (misalnya <em>Allahu Akbar</em> atau <em>Zaidun Qa'imun</em>).</li>
            <li><strong>Al-Mufidu (المُفِيدُ):</strong> Memberikan pengertian yang sempurna sehingga pendengar tidak lagi menunggu kelanjutan kalimat.</li>
            <li><strong>Bil-Wadh'i (بِالوَضْعِ):</strong> Diucapkan dengan sengaja (bukan ucapan orang mengigau) dan menggunakan bahasa Arab.</li>
          </ul>
          <p class="mb-3">Adapun setiap kata (<em>kalimah</em>) yang menyusun kalimat dalam bahasa Arab terbagi menjadi <strong>3 jenis</strong>:</p>
          <ul class="list-disc pl-6 space-y-1.5">
            <li><strong>Isim (اِسْمٌ):</strong> Kata benda, nama, atau sifat yang tidak terikat waktu, ditandai dengan bisa menerima <em>tanwin</em>, <em>Alif-Lam (ال)</em>, <em>khafadh/kasrah</em>, dan <em>huruf jar</em>.</li>
            <li><strong>Fi'il (فِعْلٌ):</strong> Kata kerja yang terikat waktu (lampau, sedang/akan, atau perintah), ditandai dengan bisa didahului <em>qad (قَدْ)</em>, <em>sin (سَـ)</em>, <em>saufa (سَوْفَ)</em>, dan <em>ta' ta'nits sakinah (تْ)</em>.</li>
            <li><strong>Harf (حَرْفٌ جَاءَ لِمَعْنًى):</strong> Kata tugas/partikel yang memiliki makna ketika bersambung dengan kata lain (seperti huruf jar <em>min, ila, fi</em>).</li>
          </ul>
        `,
        audio_url: null,
        example_verse: {
          text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ",
          surah: 1,
          ayat: 2,
        },
        quizzes: [
          {
            question: "Berapa syarat suatu ucapan disebut Al-Kalam menurut Ibnu Ajurrum?",
            options: ["2 Syarat", "3 Syarat", "4 Syarat", "5 Syarat"],
            correct: "4 Syarat",
          },
          {
            question: 'Apa makna syarat "Al-Murakkabu" (المُرَكَّبُ) pada definisi Kalam?',
            options: [
              "Tersusun dari dua kata atau lebih",
              "Berupa isyarat tangan",
              "Mengandung huruf hijaiyah saja",
              "Diucapkan tanpa sengaja",
            ],
            correct: "Tersusun dari dua kata atau lebih",
          },
          {
            question: 'Apa arti dari syarat "Al-Mufidu" (المُفِيدُ)?',
            options: [
              "Memberi faedah makna yang sempurna",
              "Bersuara keras",
              "Menggunakan huruf jar",
              "Berbentuk kata kerja lampau",
            ],
            correct: "Memberi faedah makna yang sempurna",
          },
          {
            question: "Ada berapa pembagian kata (kalimah) penyusun Kalam dalam bahasa Arab?",
            options: [
              "2 (Isim dan Fi'il)",
              "3 (Isim, Fi'il, dan Harf)",
              "4 (Isim, Fi'il, Harf, dan Dharaf)",
              "5 Bagian",
            ],
            correct: "3 (Isim, Fi'il, dan Harf)",
          },
        ],
      },
    ],
  },
  {
    id: "bab-irab",
    chapter_number: 2,
    title: "Bab Al-I'rab",
    description: "Perubahan Akhir Kata & Pembagian I'rab (Rafa', Nashab, Khafadh, Jazm)",
    items: [
      {
        id: "bab-irab-1",
        bait_arabic: "الإِعْرَابُ هُوَ تَغْيِيرُ أَوَاخِرِ الكَلِمِ لِاخْتِلَافِ العَوَامِلِ الدَّاخِلَةِ عَلَيْهَا لَفْظًا أَوْ تَقْدِيرًا، وَأَقْسَامُهُ أَرْبَعَةٌ: رَفْعٌ، وَنَصْبٌ، وَخَفْضٌ، وَجَزْمٌ",
        translation:
          "I'rab adalah perubahan akhir-akhir kata karena perbedaan amil-amil yang masuk padanya, baik secara lafazh (tampak jelas) maupun taqdir (diperkirakan). Dan pembagian I'rab ada empat: Rafa', Nashab, Khafadh (Jar), dan Jazm.",
        syarah_text: `
          <p class="mb-4"><strong>Al-I'rab (الإعراب)</strong> adalah inti dari ilmu Nahwu, yaitu berubahnya keadaan akhir suatu kata karena masuknya faktor pengubah (<em>'amil</em>) yang berbeda-beda di depannya.</p>
          <ul class="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Perubahan Lafazh (لَفْظًا):</strong> Harakat akhir tampak jelas terucap, seperti <em>Allāhu</em> (rafa'), <em>Allāha</em> (nashab), <em>Lillāhi</em> (khafadh/jar).</li>
            <li><strong>Perubahan Taqdir (تَقْدِيرًا):</strong> Harakat akhir tidak tampak karena terhalang huruf 'illah (seperti pada kata <em>Al-Fatā</em> atau <em>Al-Qādhī</em>), namun kedudukannya tetap dinilai rafa', nashab, atau jar.</li>
          </ul>
          <p class="mb-2"><strong>Distribusi 4 Jenis I'rab pada Isim dan Fi'il:</strong></p>
          <ul class="list-disc pl-6 space-y-1.5">
            <li><strong>Khusus pada Isim:</strong> Menerima <em>Rafa'</em>, <em>Nashab</em>, dan <em>Khafadh (Jar)</em>. Isim tidak pernah menerima <em>Jazm</em>.</li>
            <li><strong>Khusus pada Fi'il (Mudhari'):</strong> Menerima <em>Rafa'</em>, <em>Nashab</em>, dan <em>Jazm</em>. Fi'il tidak pernah menerima <em>Khafadh (Jar)</em>.</li>
          </ul>
        `,
        audio_url: null,
        example_verse: {
          text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
          surah: 1,
          ayat: 1,
        },
        quizzes: [
          {
            question: "Apa definisi Al-I'rab menurut Matan Al-Ajurumiyah?",
            options: [
              "Perubahan akhir kata karena perbedaan amil yang masuk padanya",
              "Perubahan awal kata karena tambahan huruf",
              "Susunan kata yang tidak memiliki makna",
              "Kata yang harakat akhirnya selalu tetap",
            ],
            correct: "Perubahan akhir kata karena perbedaan amil yang masuk padanya",
          },
          {
            question: "Ada berapa pembagian (jenis) I'rab dalam ilmu Nahwu?",
            options: [
              "2 (Rafa' dan Nashab)",
              "3 (Rafa', Nashab, dan Jar)",
              "4 (Rafa', Nashab, Khafadh/Jar, dan Jazm)",
              "5 Jenis",
            ],
            correct: "4 (Rafa', Nashab, Khafadh/Jar, dan Jazm)",
          },
          {
            question: "Jenis I'rab manakah yang KHUSUS masuk pada Isim dan tidak pernah masuk pada Fi'il?",
            options: ["Rafa'", "Nashab", "Khafadh (Jar)", "Jazm"],
            correct: "Khafadh (Jar)",
          },
          {
            question: "Jenis I'rab manakah yang KHUSUS masuk pada Fi'il dan tidak pernah masuk pada Isim?",
            options: ["Rafa'", "Nashab", "Khafadh (Jar)", "Jazm"],
            correct: "Jazm",
          },
        ],
      },
    ],
  },
  {
    id: "bab-alamat-irab",
    chapter_number: 3,
    title: "Bab Ma'rifat 'Alamatil I'rab",
    description: "Mengenal Tanda-Tanda I'rab Ashliyah (Dhammah, Fathah, Kasrah, Sukun) dan Far'iyah",
    items: [
      {
        id: "bab-alamat-irab-1",
        bait_arabic: "لِلرَّفْعِ أَرْبَعُ عَلَامَاتٍ: الضَّمَّةُ، وَالوَاوُ، وَالأَلِفُ، وَالنُّونُ. وَلِلنَّصْبِ خَمْسُ عَلَامَاتٍ: الفَتْحَةُ، وَالأَلِفُ، وَالكَسْرَةُ، وَاليَاءُ، وَحَذْفُ النُّونِ",
        translation:
          "Bagi I'rab Rafa' terdapat empat tanda: Dhammah, Wawu, Alif, dan Nun. Dan bagi I'rab Nashab terdapat lima tanda: Fathah, Alif, Kasrah, Ya', dan membuang Nun (Hadzfun Nun).",
        syarah_text: `
          <p class="mb-4">Setiap kedudukan I'rab memiliki <strong>tanda asli (عَلَامَةٌ أَصْلِيَّةٌ)</strong> dan <strong>tanda cabang/pengganti (عَلَامَةٌ فَرْعِيَّةٌ)</strong>:</p>
          <ul class="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Tanda Rafa' (4):</strong> Tanda aslinya adalah <strong>Dhammah</strong> (pada Isim Mufrad, Jamak Taksir, Jamak Mu'annats Salim, dan Fi'il Mudhari'). Tanda cabangnya adalah <em>Wawu</em> (Jamak Mudzakkar Salim & Asma'ul Khamsah), <em>Alif</em> (Isim Tatsniyah/Mutsanna), dan <em>Nun</em> (Af'alul Khamsah).</li>
            <li><strong>Tanda Nashab (5):</strong> Tanda aslinya adalah <strong>Fathah</strong>. Tanda cabangnya adalah <em>Alif</em> (Asma'ul Khamsah), <em>Kasrah</em> (Jamak Mu'annats Salim), <em>Ya'</em> (Tatsniyah & Jamak Mudzakkar Salim), serta <em>Hadzfun Nun</em> (Af'alul Khamsah).</li>
            <li><strong>Tanda Khafadh/Jar (3):</strong> Tanda aslinya adalah <strong>Kasrah</strong>. Tanda cabangnya adalah <em>Ya'</em> (Tatsniyah, Jamak Mudzakkar Salim, Asma'ul Khamsah) dan <em>Fathah</em> (Isim Ghairu Munsharif).</li>
            <li><strong>Tanda Jazm (2):</strong> Tanda aslinya adalah <strong>Sukun</strong>, dan tanda cabangnya adalah <em>Al-Hadzfu</em> (membuang huruf 'illah atau membuang nun).</li>
          </ul>
        `,
        audio_url: null,
        example_verse: {
          text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
          surah: 1,
          ayat: 5,
        },
        quizzes: [
          {
            question: "Berapa jumlah tanda bagi I'rab Rafa'?",
            options: ["2 Tanda", "3 Tanda", "4 Tanda (Dhammah, Wawu, Alif, Nun)", "5 Tanda"],
            correct: "4 Tanda (Dhammah, Wawu, Alif, Nun)",
          },
          {
            question: "Apakah tanda ASLI (ashliyah) bagi I'rab Rafa', Nashab, Khafadh, dan Jazm secara berurutan?",
            options: [
              "Dhammah, Fathah, Kasrah, Sukun",
              "Wawu, Alif, Ya', Nun",
              "Fathah, Dhammah, Sukun, Kasrah",
              "Kasrah, Fathah, Dhammah, Sukun",
            ],
            correct: "Dhammah, Fathah, Kasrah, Sukun",
          },
          {
            question: "Apa tanda Khafadh (Jar) pada kata 'Al-'Ālamīna' (ٱلْعَـٰلَمِينَ) yang merupakan mulhaq Jamak Mudzakkar Salim?",
            options: ["Kasrah", "Huruf Ya'", "Huruf Wawu", "Dhammah"],
            correct: "Huruf Ya'",
          },
          {
            question: "Apa dua tanda bagi I'rab Jazm?",
            options: [
              "Sukun dan Al-Hadzfu (membuang huruf 'illah / membuang nun)",
              "Kasrah dan Ya'",
              "Dhammah dan Wawu",
              "Fathah dan Alif",
            ],
            correct: "Sukun dan Al-Hadzfu (membuang huruf 'illah / membuang nun)",
          },
        ],
      },
    ],
  },
  {
    id: "bab-afal",
    chapter_number: 4,
    title: "Bab Al-Af'al",
    description: "Pembagian Fi'il (Madhi, Mudhari', Amr) & Hukum I'rabnya",
    items: [
      {
        id: "bab-afal-1",
        bait_arabic: "الأَفْعَالُ ثَلَاثَةٌ: مَاضٍ، وَمُضَارِعٌ، وَأَمْرٌ، نَحْوُ: ضَرَبَ، وَيَضْرِبُ، وَاضْرِبْ. فَالمَاضِي مَفْتُوحُ الآخِرِ أَبَدًا، وَالأَمْرُ مَجْزُومٌ أَبَدًا",
        translation:
          "Fi'il (kata kerja) itu ada tiga: Madhi (lampau), Mudhari' (sedang/akan datang), dan Amr (perintah), contohnya: Dharaba, Yadhribu, Idhrib. Fi'il Madhi difathahkan akhirnya selamanya, dan Fi'il Amr dijazmkan (mabni di atas tanda jazm) selamanya.",
        syarah_text: `
          <p class="mb-4">Dalam kaidah Nahwu, seluruh <strong>Fi'il (kata kerja)</strong> terbagi menjadi 3 berdasarkan waktunya:</p>
          <ul class="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Fi'il Madhi (فِعْلٌ مَاضٍ):</strong> Menunjukkan peristiwa yang telah lampau (contoh: <em>Khalaqa, An'amta</em>). Hukumnya selalu <strong>Mabni</strong> (tetap), asalnya mabni di atas fathah.</li>
            <li><strong>Fi'il Amr (فِعْلُ أَمْرٍ):</strong> Menunjukkan tuntutan/perintah (contoh: <em>Qul, Ihdinā</em>). Hukumnya selalu <strong>Mabni di atas tanda jazmnya</strong> (mabni sukun, membuang huruf 'illah, atau membuang nun).</li>
            <li><strong>Fi'il Mudhari' (فِعْلٌ مُضَارِعٌ):</strong> Diawali salah satu huruf <em>Anaytu (أ - ن - ي - ت)</em>. Hukum asalnya adalah <strong>Marfu'</strong> selama belum dimasuki amil <em>Penashab (النواصب)</em> atau amil <em>Penjazm (الجوازم)</em>.</li>
          </ul>
        `,
        audio_url: null,
        example_verse: {
          text: "لَمْ يَلِدْ وَلَمْ يُولَدْ",
          surah: 112,
          ayat: 3,
        },
        quizzes: [
          {
            question: "Ada berapa pembagian Fi'il dalam bahasa Arab?",
            options: [
              "2 (Madhi dan Mudhari')",
              "3 (Madhi, Mudhari', dan Amr)",
              "4 Bagian",
              "5 Bagian",
            ],
            correct: "3 (Madhi, Mudhari', dan Amr)",
          },
          {
            question: "Apa huruf-huruf tambahan yang wajib mengawali Fi'il Mudhari'?",
            options: [
              "Huruf Anaytu (Hamzah, Nun, Ya', Ta')",
              "Huruf Jar (Min, Ila, Fi)",
              "Alif dan Lam",
              "Huruf Wawu dan Fa'",
            ],
            correct: "Huruf Anaytu (Hamzah, Nun, Ya', Ta')",
          },
          {
            question: "Bagaimana hukum Fi'il Mudhari' apabila tidak didahului amil penashab maupun amil penjazm?",
            options: ["Marfu' selamanya", "Manshub", "Majzum", "Majrur"],
            correct: "Marfu' selamanya",
          },
          {
            question: "Pada ayat 'Lam Yalid' (لَمْ يَلِدْ), mengapa fi'il mudhari' 'Yalid' berharakat sukun (majzum)?",
            options: [
              "Karena didahului amil penjazm 'Lam' (لَمْ)",
              "Karena merupakan Fi'il Madhi",
              "Karena didahului huruf jar",
              "Karena berkedudukan sebagai Mubtada'",
            ],
            correct: "Karena didahului amil penjazm 'Lam' (لَمْ)",
          },
        ],
      },
    ],
  },
  {
    id: "bab-marfuat",
    chapter_number: 5,
    title: "Bab Marfu'atul Asma'",
    description: "Tujuh Isim yang Berkedudukan Rafa' (Fa'il, Na'ibul Fa'il, Mubtada', Khabar, Isim Kana, Khabar Inna, Tabi')",
    items: [
      {
        id: "bab-marfuat-1",
        bait_arabic: "المَرْفُوعَاتُ سَبْعَةٌ وَهِيَ: الفَاعِلُ، وَالمَفْعُولُ الَّذِي لَمْ يُسَمَّ فَاعِلُهُ، وَالمُبْتَدَأُ، وَخَبَرُهُ، وَاسْمُ كَانَ وَأَخَوَاتِهَا، وَخَبَرُ إِنَّ وَأَخَوَاتِهَا، وَالتَّابِعُ لِلمَرْفُوعِ",
        translation:
          "Isim-isim yang dirafa'kan itu ada tujuh: (1) Fa'il, (2) Maf'ul yang tidak disebutkan fa'ilnya (Na'ibul Fa'il), (3) Mubtada', (4) Khabar Mubtada', (5) Isim Kana dan saudara-saudaranya, (6) Khabar Inna dan saudara-saudaranya, serta (7) Pengikut (Tabi') bagi isim yang marfu'.",
        syarah_text: `
          <p class="mb-4">Kapan sebuah <strong>Isim</strong> wajib dibaca <strong>Rafa'</strong> (misalnya berharakat dhammah)? Ibnu Ajurrum merangkumnya dalam <strong>7 kedudukan</strong>:</p>
          <ol class="list-decimal pl-6 space-y-2 mb-4">
            <li><strong>Al-Fa'il (الفَاعِلُ):</strong> Pelaku yang terletak setelah fi'il aktif (ma'lum).</li>
            <li><strong>Na'ibul Fa'il (نَائِبُ الفَاعِلِ):</strong> Pengganti pelaku setelah fi'il pasif (majhul).</li>
            <li><strong>Al-Mubtada' (المُبْتَدَأُ):</strong> Isim marfu' di awal kalimat nominal (seperti <em>Al-Hamdu</em> atau <em>Allāhu Ash-Shamad</em>).</li>
            <li><strong>Al-Khabar (الخَبَرُ):</strong> Predikat yang menyempurnakan makna Mubtada' (seperti <em>Ash-Shamadu</em>).</li>
            <li><strong>Isim Kāna (اِسْمُ كَانَ):</strong> Mubtada' yang dimasuki <em>Kāna</em> dan saudara-saudaranya.</li>
            <li><strong>Khabar Inna (خَبَرُ إِنَّ):</strong> Khabar yang dimasuki <em>Inna</em> dan saudara-saudaranya.</li>
            <li><strong>At-Tābi' lil Marfū' (التَّابِعُ لِلمَرْفُوعِ):</strong> Empat pengikut i'rab: <em>Na'at (sifat)</em>, <em>'Athaf</em>, <em>Taukid</em>, dan <em>Badal</em>.</li>
          </ol>
        `,
        audio_url: null,
        example_verse: {
          text: "ٱللَّهُ ٱلصَّمَدُ",
          surah: 112,
          ayat: 2,
        },
        quizzes: [
          {
            question: "Berapa jumlah golongan Isim yang berkedudukan Rafa' (Marfu'atul Asma')?",
            options: ["4 Golongan", "5 Golongan", "7 Golongan", "10 Golongan"],
            correct: "7 Golongan",
          },
          {
            question: "Pada ayat 'Allāhu Ash-Shamadu' (ٱللَّهُ ٱلصَّمَدُ), apa kedudukan Lafzhul Jalalah 'Allāhu' dan kata 'Ash-Shamadu'?",
            options: [
              "Mubtada' dan Khabar (keduanya Marfu')",
              "Fi'il dan Fa'il",
              "Mudhaf dan Mudhaf Ilaih",
              "Harf Jar dan Isim Majrur",
            ],
            correct: "Mubtada' dan Khabar (keduanya Marfu')",
          },
          {
            question: "Apa sebutan bagi isim marfu' yang menggantikan pelaku setelah fi'il pasif (mabni lil majhul)?",
            options: ["Na'ibul Fa'il", "Maf'ul Bih", "Mubtada'", "Tamyiz"],
            correct: "Na'ibul Fa'il",
          },
          {
            question: "Apa saja 4 jenis Tabi' (pengikut i'rab) dalam ilmu Nahwu?",
            options: [
              "Na'at, 'Athaf, Taukid, dan Badal",
              "Mubtada', Khabar, Fa'il, dan Maf'ul",
              "Madhi, Mudhari', Amr, dan Nahyi",
              "Rafa', Nashab, Khafadh, dan Jazm",
            ],
            correct: "Na'at, 'Athaf, Taukid, dan Badal",
          },
        ],
      },
    ],
  },
  {
    id: "bab-manshubat",
    chapter_number: 6,
    title: "Bab Manshubatul Asma'",
    description: "Lima Belas Isim yang Berkedudukan Nashab (Maf'ul Bih, Mashdar, Zharaf, Hal, Tamyiz, dll.)",
    items: [
      {
        id: "bab-manshubat-1",
        bait_arabic: "المَنْصُوبَاتُ خَمْسَةَ عَشَرَ، وَهِيَ: المَفْعُولُ بِهِ، وَالمَصْدَرُ، وَظَرْفُ الزَّمَانِ، وَظَرْفُ المَكَانِ، وَالحَالُ، وَالتَّمْيِيزُ، وَالمُسْتَثْنَى، وَاسْمُ لَا، وَالمُنَادَى، وَالمَفْعُولُ مِنْ أَجْلِهِ، وَالمَفْعُولُ مَعَهُ، وَخَبَرُ كَانَ، وَاسْمُ إِنَّ، وَالتَّابِعُ لِلمَنْصُوبِ",
        translation:
          "Isim-isim yang dinashabkan ada lima belas: Maf'ul Bih (objek), Mashdar (Maf'ul Muthlaq), Zharaf Zaman, Zharaf Makan, Hal, Tamyiz, Mustatsna, Isim La, Munada, Maf'ul min Ajlih, Maf'ul Ma'ah, Khabar Kana, Isim Inna, dan Tabi' bagi yang manshub.",
        syarah_text: `
          <p class="mb-4">Isim-isim yang wajib dibaca <strong>Nashab</strong> (tanda aslinya <em>fathah</em>) berjumlah <strong>15 kedudukan</strong>. Di antara yang paling sering dijumpai dalam Al-Qur'an adalah:</p>
          <ul class="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Al-Maf'ul Bih (المَفْعُولُ بِهِ):</strong> Objek yang dikenai pekerjaan pelaku, contoh: <em>Ihdina <strong>Ash-Shirātha</strong></em> (Tunjukilah kami jalan).</li>
            <li><strong>Zharaf Zaman & Makan (الظَّرْفُ):</strong> Keterangan waktu atau tempat (contoh: <em>Idzā</em> pada Surah Al-Falaq).</li>
            <li><strong>Al-Hāl (الحَالُ):</strong> Keterangan keadaan saat perbuatan terjadi.</li>
            <li><strong>Khabar Kāna & Isim Inna:</strong> Contohnya pada Surah Al-Ikhlas ayat 4: <em>Wa lam yakun lahu <strong>kufuwan</strong> ahad</em> (kata <em>kufuwan</em> manshub sebagai Khabar Yakun).</li>
          </ul>
        `,
        audio_url: null,
        example_verse: {
          text: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ",
          surah: 1,
          ayat: 6,
        },
        quizzes: [
          {
            question: "Apa kedudukan kata 'Ash-Shirātha' (ٱلصِّرَٰطَ) yang berharakat fathah pada ayat 'Ihdina Ash-Shirātha Al-Mustaqīma'?",
            options: [
              "Maf'ul Bih (objek) yang Manshub dengan fathah",
              "Fa'il yang Marfu'",
              "Mudhaf Ilaih yang Majrur",
              "Mubtada'",
            ],
            correct: "Maf'ul Bih (objek) yang Manshub dengan fathah",
          },
          {
            question: "Mengapa kata 'Al-Mustaqīma' (ٱلْمُسْتَقِيمَ) ikut berharakat fathah (manshub)?",
            options: [
              "Karena menjadi Na'at (sifat) bagi Ash-Shirātha yang manshub",
              "Karena didahului huruf jar",
              "Karena merupakan Fi'il Madhi",
              "Karena menjadi Mubtada'",
            ],
            correct: "Karena menjadi Na'at (sifat) bagi Ash-Shirātha yang manshub",
          },
          {
            question: "Pada ayat 'Wa lam yakun lahu kufuwan ahad', apa kedudukan kata 'Kufuwan' (كُفُوًا)?",
            options: [
              "Khabar Yakun yang didahulukan (Manshub dengan fathah)",
              "Isim Yakun",
              "Mudhaf Ilaih",
              "Fa'il",
            ],
            correct: "Khabar Yakun yang didahulukan (Manshub dengan fathah)",
          },
          {
            question: "Apa amal dari 'Kāna' (كَانَ) dan saudara-saudaranya ketika masuk pada Mubtada' dan Khabar?",
            options: [
              "Merafa'kan Isim-nya dan menashabkan Khabar-nya",
              "Menashabkan Isim-nya dan merafa'kan Khabar-nya",
              "Menjarkan keduanya",
              "Menjazmkan keduanya",
            ],
            correct: "Merafa'kan Isim-nya dan menashabkan Khabar-nya",
          },
        ],
      },
    ],
  },
  {
    id: "bab-makhfudhat",
    chapter_number: 7,
    title: "Bab Makhfudhatul Asma'",
    description: "Tiga Sebab Isim Dikasrahkan/Dijarkan: Huruf Jar, Idhafah (Mudhaf Ilaih), dan Tabi'",
    items: [
      {
        id: "bab-makhfudhat-1",
        bait_arabic: "المَخْفُوضَاتُ ثَلَاثَةُ أَقْسَامٍ: مَخْفُوضٌ بِالحَرْفِ، وَمَخْفُوضٌ بِالإِضَافَةِ، وَتَابِعٌ لِلمَخْفُوضِ",
        translation:
          "Isim-isim yang dikhafadhkan (dijarkan/dikasrahkan) itu ada tiga bagian: (1) Dikhafadhkan dengan Huruf Jar, (2) Dikhafadhkan dengan Idhafah (Mudhaf Ilaih), dan (3) Tabi' (pengikut) bagi isim yang dikhafadhkan.",
        syarah_text: `
          <p class="mb-4">Bab penutup Matan Al-Ajurumiyah menjelaskan bahwa sebuah <strong>Isim</strong> hanya akan berstatus <strong>Majrur / Makhfudh</strong> karena salah satu dari <strong>3 sebab</strong>:</p>
          <ol class="list-decimal pl-6 space-y-2 mb-4">
            <li><strong>Majrur karena Huruf Jar (بِالحَرْفِ):</strong> Didahului huruf jar seperti <em>Min, Ilā, 'An, 'Alā, Fī, Rubba, Al-Bā', Al-Kāf, Al-Lām</em>. Contoh: <em><strong>Bismi</strong></em> (majrur dengan huruf Ba') atau <em><strong>Fī shudūri</strong></em> (majrur dengan huruf Fi).</li>
            <li><strong>Majrur karena Idhafah / Mudhaf Ilaih (بِالإِضَافَةِ):</strong> Kata kedua dalam penyandaran dua isim, contoh: <em>Bismi <strong>Allāhi</strong></em>, <em>Rabbi <strong>Al-'Ālamīna</strong></em>, <em>Rabbi <strong>An-Nāsi</strong></em>.</li>
            <li><strong>Tabi' lil Makhfudh (تَابِعٌ لِلمَخْفُوضِ):</strong> Mengikuti isim majrur sebelumnya sebagai <em>Na'at</em> (contoh: <em><strong>Ar-Rahmāni Ar-Rahīmi</strong></em>), <em>Badal</em> (contoh: <em><strong>Maliki</strong> An-Nāsi</em>), atau <em>'Athaf</em> (contoh: <em>Minal jinnati <strong>wan-nāsi</strong></em>).</li>
          </ol>
          <p>Ketiga sebab jar ini seluruhnya terkumpul indah hanya dalam satu ayat Basmalah: <strong>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</strong>.</p>
        `,
        audio_url: null,
        example_verse: {
          text: "مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ",
          surah: 114,
          ayat: 6,
        },
        quizzes: [
          {
            question: "Ada berapa sebab sebuah Isim menjadi Makhfudh (Majrur) dalam bahasa Arab?",
            options: [
              "2 Sebab",
              "3 Sebab (Huruf Jar, Idhafah, dan Tabi')",
              "4 Sebab",
              "5 Sebab",
            ],
            correct: "3 Sebab (Huruf Jar, Idhafah, dan Tabi')",
          },
          {
            question: "Pada Basmalah (بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ), mengapa kata 'Ismi', 'Allāhi', dan 'Ar-Rahmāni' semuanya berharakat kasrah (majrur)?",
            options: [
              "'Ismi' karena Huruf Jar, 'Allāhi' karena Mudhaf Ilaih, dan 'Ar-Rahmāni' karena Na'at (Tabi')",
              "Semuanya karena Huruf Jar",
              "Semuanya karena Mubtada' dan Khabar",
              "Semuanya karena Maf'ul Bih",
            ],
            correct: "'Ismi' karena Huruf Jar, 'Allāhi' karena Mudhaf Ilaih, dan 'Ar-Rahmāni' karena Na'at (Tabi')",
          },
          {
            question: "Pada ayat 'Fī shudūri an-nāsi' (فِي صُدُورِ النَّاسِ), apa kedudukan kata 'An-Nāsi'?",
            options: [
              "Mudhaf Ilaih yang majrur dengan kasrah",
              "Fa'il yang marfu'",
              "Maf'ul Bih yang manshub",
              "Mubtada'",
            ],
            correct: "Mudhaf Ilaih yang majrur dengan kasrah",
          },
          {
            question: "Pada ayat 'Minal jinnati wan-nāsi' (مِنَ الْجِنَّةِ وَالنَّاسِ), mengapa kata 'An-Nāsi' ikut dibaca kasrah (majrur)?",
            options: [
              "Karena Ma'thuf (di-'athaf-kan dengan huruf Wawu) kepada 'Al-Jinnati' yang majrur",
              "Karena menjadi Mubtada'",
              "Karena menjadi Khabar",
              "Karena menjadi Fi'il Amr",
            ],
            correct: "Karena Ma'thuf (di-'athaf-kan dengan huruf Wawu) kepada 'Al-Jinnati' yang majrur",
          },
        ],
      },
    ],
  },
];

export function getMatanChapterById(chapterId: string): MatanChapterDef | undefined {
  return AJURUMIYAH_CHAPTERS.find((c) => c.id === chapterId);
}

export function getMatanChapterNavigation(chapterId: string) {
  const idx = AJURUMIYAH_CHAPTERS.findIndex((c) => c.id === chapterId);
  const current = idx >= 0 ? AJURUMIYAH_CHAPTERS[idx] : AJURUMIYAH_CHAPTERS[0];
  const prev = idx > 0 ? AJURUMIYAH_CHAPTERS[idx - 1] : null;
  const next =
    idx >= 0 && idx < AJURUMIYAH_CHAPTERS.length - 1
      ? AJURUMIYAH_CHAPTERS[idx + 1]
      : null;

  return {
    current,
    prev,
    next,
    totalChapters: AJURUMIYAH_CHAPTERS.length,
  };
}

/**
 * Checks if a given Matan chapter is completed by checking both:
 * 1. `quiz_attempts` rows (`is_passed` or `score / total_questions >= 0.8`) matching the chapter or its items
 * 2. `matan_user_progress` rows (`memorized` or `status_paham`)
 */
export function isMatanChapterCompleted(
  chapter: { id: string; items?: { id: string }[] },
  slug: string,
  progressRows?: any[] | null,
  quizAttemptRows?: any[] | null
): boolean {
  const itemIds = new Set<string>([
    chapter.id,
    ...(chapter.items?.map((i) => i.id) || []),
    ...(getMatanChapterById(chapter.id)?.items.map((i) => i.id) || []),
  ]);

  if (progressRows && progressRows.length > 0) {
    const foundInProgress = progressRows.some(
      (p) =>
        (p.memorized || p.status_paham) &&
        (itemIds.has(String(p.chapter_id)) || itemIds.has(String(p.item_id)))
    );
    if (foundInProgress) return true;
  }

  if (quizAttemptRows && quizAttemptRows.length > 0) {
    const validQuizIds = new Set<string>();
    itemIds.forEach((id) => {
      validQuizIds.add(`matan_${slug}_${id}`);
      validQuizIds.add(`matan_ajurumiyah_${id}`);
    });

    const foundInQuiz = quizAttemptRows.some((q) => {
      if (!q.quiz_id || !validQuizIds.has(String(q.quiz_id))) return false;
      const total = Number(q.total_questions) || 0;
      const sc = Number(q.score) || 0;
      return Boolean(q.is_passed) || (total > 0 && sc / total >= 0.8);
    });
    if (foundInQuiz) return true;
  }

  return false;
}
