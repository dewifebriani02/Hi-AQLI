import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const motivations = [
  "Barangsiapa yang menempuh jalan untuk mencari ilmu, maka Allah akan mudahkan baginya jalan menuju surga. (HR. Muslim) 🌸",
  "Sebaik-baik kalian adalah yang mempelajari Al-Qur'an dan mengajarkannya. (HR. Bukhari) 📖",
  "Amalan yang paling dicintai Allah adalah yang paling istiqomah meskipun sedikit. (HR. Bukhari & Muslim) ✨",
  "Niatkan setiap kuis dan hafalan untuk mengharap wajah Allah semata. Semoga Allah memberkahi langkah kita. 🌷",
  "Sesungguhnya bersama kesulitan ada kemudahan. Tetap semangat murajaah hari ini ya Ukhti! (QS. Al-Insyirah: 6) 💖",
  "Barangsiapa yang membaca satu huruf dari Kitab Allah, maka baginya satu kebaikan. (HR. Tirmidzi) ✨ Semangat kuis hari ini!",
  "Ya Allah, berilah aku manfaat atas apa yang Engkau ajarkan kepadaku, dan ajarkanlah kepadaku apa yang bermanfaat bagiku. 🤲",
  "Menghafal Qur'an adalah perjalanan cinta. Nikmati setiap prosesnya, karena setiap detik adalah pahala. 🌸",
  "Al-Qur'an akan datang pada hari kiamat sebagai pemberi syafaat bagi pembacanya. (HR. Muslim) 🌟",
  "Istiqomah itu berat, namun balasannya adalah Jannah. Semangat menjaga hafalan Mufradat hari ini! ✨",
  "Bismillah, mari awali pagi dengan penuh syukur dan semangat menuntut ilmu. Semoga Allah mudahkan segalanya. 🌿",
  "Dunia ini hanyalah titipan, mari penuhi tabungan akhirat kita dengan menjaga interaksi bersama Al-Qur'an. 📖✨",
  "Semangat ya Ukhti! Tidak ada kata terlambat untuk belajar. Allah melihat usaha kita, bukan sekadar hasilnya. 🌷",
  "Barangsiapa yang menjaga batas-batas Allah, maka Allah akan menjaganya. Jagalah hafalanmu, Allah akan menjagamu. ✨",
  "Semoga Allah menjadikan kita termasuk ahli Al-Qur'an yang merupakan keluarga Allah di bumi. Aamiin. 🤲🌺"
];

async function seedMotivations() {
  console.log('Seeding motivations...');
  
  const payload = motivations.map(content => ({ content }));
  
  const { error } = await supabase
    .from('mufradat_motivations')
    .insert(payload);

  if (error) {
    console.error('Error seeding motivations:', error);
  } else {
    console.log(`Successfully added ${motivations.length} syar'i motivations!`);
  }
}

seedMotivations();
