// Normalisasi nomor WhatsApp ke format Fonnte (62XXXXXXXXXX, hanya digit).
// Menerima input umum: "0812...", "+62812...", "62812...", "812...", dengan spasi/dash.
export function normalizeWhatsapp(input: string): string {
  if (!input) return "";
  let n = input.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.substring(1);
  else if (n.startsWith("8")) n = "62" + n;
  return n;
}

// Validasi nomor WA Indonesia setelah dinormalisasi.
// Aturan: diawali "628", panjang total 11–15 digit (mis. 6281234567 sampai 628123456789012).
export function isValidWhatsapp(input: string): boolean {
  const n = normalizeWhatsapp(input);
  if (!/^628\d{8,12}$/.test(n)) return false;
  return true;
}

// Pesan error yang user-friendly.
export function whatsappErrorMessage(input: string): string | null {
  if (!input || !input.trim()) return "Nomor WhatsApp wajib diisi.";
  const n = normalizeWhatsapp(input);
  if (!n.startsWith("628")) return "Nomor harus nomor Indonesia (diawali 0, +62, atau 62).";
  if (n.length < 11) return "Nomor terlalu pendek.";
  if (n.length > 15) return "Nomor terlalu panjang.";
  if (!/^628\d{8,12}$/.test(n)) return "Format nomor tidak valid.";
  return null;
}
