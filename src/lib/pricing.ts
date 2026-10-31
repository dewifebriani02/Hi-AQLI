/**
 * Shared registration & subscription pricing rules used by both the server
 * (`/api/registrations`) and client UI previews. The server is always the
 * authoritative source of truth on submission.
 */

export const TIKRAR_LEVELS = [
  { id: '1', name: 'Intensif', price: 100000 },
  { id: '2', name: 'Reguler', price: 75000 },
  { id: '3', name: 'Santai', price: 50000 },
] as const;

export const MUFRADAT_MIN_INFAQ = 20000;
export const SELECTABLE_DEFAULT_MIN_INFAQ = 50000;
export const FIRST_REGISTRATION_FEE = 10000;
export const REFERRAL_DISCOUNT_AMOUNT = 5000;
export const MAX_INFAQ_AMOUNT = 100_000_000;
export const MAX_PAYMENT_DURATION_MONTHS = 12;

export interface HalaqahPricingRow {
  id?: string | null;
  title?: string | null;
  program_type?: string | null;
  programType?: string | null;
  is_premium?: boolean | null;
  base_price?: number | string | null;
  payment_type?: string | null;
}

export interface ProgramFlags {
  programType: string;
  isMufradat: boolean;
  isTikrar: boolean;
  isNgaji: boolean;
  isPremiumProgram: boolean;
}

export function detectProgramFlags(
  halaqah: HalaqahPricingRow | null | undefined,
  fallbackHint?: string | null
): ProgramFlags {
  const rawType = String(halaqah?.program_type || halaqah?.programType || '').trim();
  const hint = String(fallbackHint || '').trim().toLowerCase();
  const titleLower = String(halaqah?.title || '').toLowerCase();

  const isMufradat =
    rawType === 'hi_mufradat' ||
    hint === 'mufradat-premium' ||
    hint === 'hi_mufradat' ||
    (!rawType && titleLower.includes('mufradat'));

  const isTikrar =
    rawType === 'tikrar_daily' ||
    rawType === 'hi_tikrar' ||
    hint === 'tikrar-premium' ||
    hint === 'tikrar-j30-b1' ||
    hint === 'tikrar_daily' ||
    (!rawType && titleLower.includes('tikrar'));

  const isNgaji =
    rawType === 'hi_ngaji' ||
    hint === 'hi-ngaji' ||
    hint === 'hi_ngaji' ||
    (!rawType && titleLower.includes('ngaji'));

  const isPremiumProgram = Boolean(halaqah?.is_premium) || isMufradat || isTikrar;

  return {
    programType: rawType || (isMufradat ? 'hi_mufradat' : isTikrar ? 'tikrar_daily' : isNgaji ? 'hi_ngaji' : ''),
    isMufradat,
    isTikrar,
    isNgaji,
    isPremiumProgram,
  };
}

export function calculateMinInfaq(params: {
  halaqah?: HalaqahPricingRow | null;
  isMufradat: boolean;
  isTikrar: boolean;
  level?: string | number | null;
}): number {
  const adminBase = Math.max(0, Number(params.halaqah?.base_price) || 0);

  if (params.isMufradat) {
    return Math.max(MUFRADAT_MIN_INFAQ, adminBase);
  }

  if (params.isTikrar) {
    const levelStr = String(params.level ?? '3');
    const found = TIKRAR_LEVELS.find((l) => l.id === levelStr);
    return found ? found.price : 50000;
  }

  if (params.halaqah?.payment_type === 'selectable') {
    return adminBase || SELECTABLE_DEFAULT_MIN_INFAQ;
  }

  return adminBase || 0;
}

export function isVoucherApplicableToProgram(
  voucherProgramId: string | null | undefined,
  flags: ProgramFlags
): boolean {
  const vProg = String(voucherProgramId || '').trim().toLowerCase();
  if (!vProg) return false;
  if (vProg === 'all') return true;
  if (vProg === 'mufradat' || vProg === 'hi_mufradat') return flags.isMufradat;
  if (vProg === 'tikrar' || vProg === 'tikrar_daily' || vProg === 'hi_tikrar') return flags.isTikrar;
  if (vProg === 'ngaji' || vProg === 'hi_ngaji') return flags.isNgaji;
  return Boolean(flags.programType && flags.programType.toLowerCase().includes(vProg));
}

export interface RegistrationBreakdown {
  minInfaq: number;
  infaqAmount: number;
  paymentDuration: number;
  registrationFee: number;
  referralDiscount: number;
  uniqueCode: number;
  totalAmount: number;
  isPaid: boolean;
  paymentMethod: 'voucher' | 'transfer' | 'free';
}

export function calculateRegistrationBreakdown(params: {
  isPremiumProgram: boolean;
  hasVoucher: boolean;
  minInfaq: number;
  infaqAmount: number;
  paymentDuration: number;
  isFirstRegistration: boolean;
  hasEligibleReferral: boolean;
  uniqueCode: number;
}): RegistrationBreakdown {
  const duration = Math.min(MAX_PAYMENT_DURATION_MONTHS, Math.max(1, Math.floor(params.paymentDuration || 1)));
  const effectiveInfaq = Math.max(params.minInfaq, Math.floor(params.infaqAmount || 0));
  const registrationFee = params.isFirstRegistration ? FIRST_REGISTRATION_FEE : 0;

  if (params.hasVoucher) {
    return {
      minInfaq: params.minInfaq,
      infaqAmount: effectiveInfaq,
      paymentDuration: duration,
      registrationFee,
      referralDiscount: 0,
      uniqueCode: 0,
      totalAmount: 0,
      isPaid: true,
      paymentMethod: 'voucher',
    };
  }

  if (!params.isPremiumProgram) {
    return {
      minInfaq: params.minInfaq,
      infaqAmount: 0,
      paymentDuration: duration,
      registrationFee: 0,
      referralDiscount: 0,
      uniqueCode: 0,
      totalAmount: 0,
      isPaid: false,
      paymentMethod: 'free',
    };
  }

  const referralDiscount = params.hasEligibleReferral ? REFERRAL_DISCOUNT_AMOUNT : 0;
  const uniqueCode = Math.max(100, Math.min(999, Math.floor(params.uniqueCode || 100)));
  const totalAmount = Math.max(
    0,
    effectiveInfaq * duration + registrationFee - referralDiscount + uniqueCode
  );

  return {
    minInfaq: params.minInfaq,
    infaqAmount: effectiveInfaq,
    paymentDuration: duration,
    registrationFee,
    referralDiscount,
    uniqueCode,
    totalAmount,
    isPaid: true,
    paymentMethod: 'transfer',
  };
}
