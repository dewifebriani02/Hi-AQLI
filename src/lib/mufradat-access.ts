import { format, parseISO, addDays, differenceInHours, addMonths } from "date-fns";
import { isProgramFree } from "./program-settings";

export type MufradatAccessStatus =
  | 'active'           // Full active access
  | 'trial'            // Legacy state
  | 'grace_period'     // Legacy state
  | 'blocked'          // Blacklisted / blocked
  | 'on_leave'         // Approved leave
  | 'inactive';        // Not signed in

export interface MufradatAccessSummary {
  status: MufradatAccessStatus;
  isBlocked: boolean;
  showSoftReminder: boolean;
  message: string;
  nextBillingMonth?: string;
  redirectTo?: string;
  buttonText?: string;
  isFree?: boolean;
  isVerified?: boolean;
  daysRemaining?: number;
  dueDate?: Date;
}

export interface GetMufradatStatusOptions {
  user: any;
  registrations?: any[];
  isStudent?: boolean;
  surahId?: string | number;
  verseId?: string | number;
  pageId?: string | number;
  redemptions?: any[];
}

/**
 * Evaluates Hi Mufradat access status for a user.
 * Because all Hi AQLI programs are 100% free, any signed-in non-blacklisted user
 * gets full active access across all surahs, pages, and juz.
 */
export function getMufradatStatus(options: GetMufradatStatusOptions): MufradatAccessSummary {
  const {
    user,
    registrations = [],
    surahId,
    pageId,
    redemptions = [],
  } = options;

  const fullSalutation = user?.salutation || "Ukhti";
  const sNum = surahId ? parseInt(surahId.toString()) : null;
  const pNum = pageId ? parseInt(pageId.toString()) : null;
  const today = new Date();

  const freeSurahs = [1, 112, 113, 114];
  if ((sNum !== null && freeSurahs.includes(sNum)) || (pNum !== null && (pNum === 1 || pNum === 604))) {
    return {
      status: 'active',
      isBlocked: false,
      isFree: true,
      isVerified: true,
      showSoftReminder: false,
      message: `Selamat Datang! ${fullSalutation} sedang menikmati akses gratis halaman Al-Qur'an.`,
    };
  }

  // FREE PROGRAM: all signed-in non-blacklisted users get immediate full active access.
  if (isProgramFree('mufradat')) {
    if (!user) {
      return {
        status: 'inactive',
        isBlocked: true,
        isVerified: false,
        showSoftReminder: false,
        message: "Silakan masuk atau daftar akun gratis untuk mengakses seluruh ayat Hi Mufradat.",
        redirectTo: '/register?program=hi_mufradat',
        buttonText: 'DAFTAR GRATIS SEKARANG',
      };
    }

    if (user.is_blacklisted) {
      return {
        status: 'blocked',
        isBlocked: true,
        isVerified: false,
        showSoftReminder: false,
        message: `Akun ${fullSalutation} sedang dinonaktifkan. Silakan hubungi Admin Hi AQLI.`,
        redirectTo: '/programs',
        buttonText: 'HUBUNGI ADMIN',
      };
    }

    return {
      status: 'active',
      isBlocked: false,
      isFree: true,
      isVerified: true,
      showSoftReminder: false,
      message: `Akses Aktif. Hi Mufradat 100% gratis untuk ${fullSalutation}. Selamat belajar!`,
    };
  }

  // Legacy fallback (unreachable when isProgramFree('mufradat') === true)
  const hasVoucher = redemptions?.some(
    (r) => r.vouchers?.program_id === 'mufradat' || r.vouchers?.program_id === 'all'
  );
  if (hasVoucher) {
    return {
      status: 'active',
      isBlocked: false,
      isVerified: true,
      showSoftReminder: false,
      message: "Akses Aktif. Selamat mempelajari mufradat Qur'an!",
    };
  }

  if (!user || user.mufradat_status === 'inactive') {
    return {
      status: 'inactive',
      isBlocked: true,
      isVerified: false,
      showSoftReminder: false,
      message: `${fullSalutation} belum terdaftar di Hi Mufradat. Silakan daftar gratis.`,
      redirectTo: '/study-circles/registration?program=hi_mufradat',
      buttonText: 'DAFTAR GRATIS SEKARANG',
    };
  }

  const verifiedRegs =
    registrations
      ?.filter((r) => r.status?.toLowerCase() === 'verified')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || [];

  const isVerified = verifiedRegs.length > 0;
  let dueDate: Date | null = null;
  if (isVerified) {
    const firstVer = verifiedRegs[0];
    dueDate = addMonths(parseISO(firstVer.verified_at || firstVer.created_at), verifiedRegs.length);
  } else if (user.mufradat_due_date) {
    dueDate = parseISO(user.mufradat_due_date);
  }

  if (!dueDate) {
    return {
      status: 'active',
      isBlocked: false,
      isFree: true,
      isVerified: true,
      showSoftReminder: false,
      message: `Akses Aktif. Ahlan wa Sahlan di Hi Mufradat!`,
    };
  }

  const graceDate = addDays(dueDate, 3);
  const diffTime = dueDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const pendingHours = differenceInHours(today, dueDate);

  if (today > graceDate && pendingHours > 72) {
    return {
      status: 'active',
      isBlocked: false,
      isFree: true,
      isVerified: true,
      showSoftReminder: false,
      daysRemaining,
      dueDate,
      nextBillingMonth: format(today, 'yyyy-MM'),
      message: `Akses Aktif. Ahlan wa Sahlan di Hi Mufradat!`,
    };
  }

  return {
    status: 'active',
    isBlocked: false,
    isFree: true,
    isVerified: true,
    showSoftReminder: false,
    daysRemaining,
    dueDate,
    nextBillingMonth: format(addMonths(dueDate, 1), 'yyyy-MM'),
    message: `Akses Aktif. Ahlan wa Sahlan di Hi Mufradat!`,
  };
}
