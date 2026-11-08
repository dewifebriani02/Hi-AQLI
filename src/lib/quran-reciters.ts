export interface Reciter {
  id: number;
  name: string;
  style?: string | null;
}

export const RECITERS: Reciter[] = [
  { id: 7, name: "Mishary Rashid Alafasy" },
  { id: 3, name: "Abdur-Rahman as-Sudais" },
  { id: 6, name: "Mahmoud Khalil Al-Husary" },
  { id: 12, name: "Mahmoud Khalil Al-Husary (Muallim)" },
  { id: 2, name: "AbdulBaset AbdulSamad (Murattal)" },
  { id: 1, name: "AbdulBaset AbdulSamad (Mujawwad)" },
  { id: 10, name: "Sa'ud ash-Shuraym" },
  { id: 4, name: "Abu Bakr al-Shatri" },
  { id: 5, name: "Hani ar-Rifai" },
  { id: 9, name: "Mohamed Siddiq al-Minshawi (Murattal)" },
  { id: 8, name: "Mohamed Siddiq al-Minshawi (Mujawwad)" },
  { id: 11, name: "Mohamed al-Tablawi" },
  { id: 13, name: "Ali Jaber" },
  { id: 54, name: "Khalil al-Husary" },
  { id: 128, name: "Ayman Sowaid" },
  { id: 119, name: "Al-Afasy (Radio)" },
  { id: 130, name: "Yasser ad-Dussary" },
  { id: 156, name: "Raad al-Kurdi" },
  { id: 162, name: "Idrees Abkar" },
  { id: 171, name: "Nasser Al Qatami" },
  { id: 172, name: "Maher Al-Muaiqly" },
  { id: 173, name: "Ahmed Al-Ajmi" },
  { id: 174, name: "Bandar Baleela" },
  { id: 175, name: "Abdullah Juhany" },
  { id: 176, name: "Fares Abbad" }
];

export async function getAyahAudioUrl(reciterId: number, verseKey: string): Promise<string | null> {
  if (reciterId === 128) {
    const [surahStr, ayahStr] = verseKey.split(":");
    return `https://everyayah.com/data/Ayman_Sowaid_64kbps/${surahStr.padStart(3, "0")}${ayahStr.padStart(3, "0")}.mp3`;
  }

  try {
    const res = await fetch(`https://api.quran.com/api/v4/recitations/${reciterId}/by_ayah/${verseKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    const audioUrl = data.audio_files?.[0]?.url;
    if (!audioUrl) return null;
    return audioUrl.startsWith("//")
      ? `https:${audioUrl}`
      : audioUrl.startsWith("http")
      ? audioUrl
      : `https://audio.qurancdn.com/${audioUrl}`;
  } catch {
    return null;
  }
}
