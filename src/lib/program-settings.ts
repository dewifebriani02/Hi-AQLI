/**
 * Program pricing switch.
 *
 * Semua program Hi AQLI gratis secara default (pendaftaran langsung aktif,
 * tanpa infaq wajib, voucher, biaya pendaftaran, maupun tagihan bulanan, dan semua juz terbuka).
 *
 * Khusus Hi Ngaji (`hi_ngaji`), status gratis/berbayar ditentukan per kelas oleh Admin
 * di halaman `/admin/classes` melalui kolom `is_premium` dan `base_price` pada tabel `halaqahs`.
 */
export type ProgramKey = 'mufradat' | 'tikrar' | 'ngaji' | 'halaqah';

const FREE_PROGRAMS: Record<ProgramKey, boolean> = {
  mufradat: true,
  tikrar: true,
  ngaji: true,
  halaqah: true,
};

export function isProgramFree(
  program: ProgramKey,
  halaqah?: { is_premium?: boolean | null; isPremium?: boolean | null; base_price?: number | null; basePrice?: number | null } | null
): boolean {
  if (program === 'ngaji' && halaqah) {
    const isPaidClass = Boolean(halaqah.is_premium ?? halaqah.isPremium);
    return !isPaidClass;
  }
  return FREE_PROGRAMS[program];
}

export function programKeyFromType(programType?: string | null): ProgramKey {
  if (programType === 'hi_mufradat') return 'mufradat';
  if (programType === 'tikrar_daily' || programType === 'hi_tikrar') return 'tikrar';
  if (programType === 'hi_ngaji') return 'ngaji';
  return 'halaqah';
}
