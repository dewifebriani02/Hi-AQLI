/**
 * Program pricing switch.
 *
 * Seluruh program dan kelas di Hi AQLI (Hi Mufradat, Hi Tikrar, Hi Ngaji, Halaqah)
 * dapat diakses 100% gratis tanpa infaq wajib, voucher, biaya pendaftaran, maupun
 * tagihan bulanan, dan seluruh Juz terbuka penuh.
 */
export type ProgramKey = 'mufradat' | 'tikrar' | 'ngaji' | 'halaqah';

export function isProgramFree(
  _program: ProgramKey,
  _halaqah?: { is_premium?: boolean | null; isPremium?: boolean | null; base_price?: number | null; basePrice?: number | null } | null
): boolean {
  return true;
}

export function programKeyFromType(programType?: string | null): ProgramKey {
  if (programType === 'hi_mufradat') return 'mufradat';
  if (programType === 'tikrar_daily' || programType === 'hi_tikrar') return 'tikrar';
  if (programType === 'hi_ngaji') return 'ngaji';
  return 'halaqah';
}
