/**
 * Program pricing switch.
 *
 * Saat ini SEMUA program Hi AQLI gratis: pendaftaran langsung aktif, tanpa infaq wajib,
 * voucher, biaya pendaftaran, maupun tagihan bulanan, dan semua juz terbuka.
 *
 * TODO: ganti dengan pengaturan per program dari halaman admin "Pengaturan Program"
 * (tabel program_settings). Alur berbayar yang sudah divalidasi di server ada di
 * branch `wip/payment-validation`.
 */
export type ProgramKey = 'mufradat' | 'tikrar' | 'ngaji' | 'halaqah';

const FREE_PROGRAMS: Record<ProgramKey, boolean> = {
  mufradat: true,
  tikrar: true,
  ngaji: true,
  halaqah: true,
};

export function isProgramFree(program: ProgramKey): boolean {
  return FREE_PROGRAMS[program];
}

export function programKeyFromType(programType?: string | null): ProgramKey {
  if (programType === 'hi_mufradat') return 'mufradat';
  if (programType === 'tikrar_daily') return 'tikrar';
  if (programType === 'hi_ngaji') return 'ngaji';
  return 'halaqah';
}
