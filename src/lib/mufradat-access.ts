import { subMonths, format, getDate, isAfter, parseISO, startOfMonth, addDays, differenceInHours, addMonths } from "date-fns";
import { SURAH_START_PAGES, getJuzForPage } from "./quran-mapping";

export type MufradatAccessStatus = 
  | 'active'           // Fully paid and in good standing
  | 'trial'            // New user, 24h grace access while pending
  | 'grace_period'     // 28th to 10th, bill issued but not yet blocked
  | 'blocked'          // After 10th, unpaid
  | 'on_leave'         // Currently on approved leave (Cuti)
  | 'inactive';        // Not enrolled or stopped paying

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
 * Evaluates the Hi Mufradat subscription status for a user.
 * 
 * Rules:
 * 1. Billing issued on the 28th for the NEXT month.
 * 2. Grace period until the 10th of THAT month.
 * 3. Blocking starts after the 11th if unpaid.
 * 4. Leave (Cuti) exempts from billing but blocks verse access.
 * 5. Surah 1 (Al-Fatihah) and last 3 surahs are always FREE for everyone.
 */
export function getMufradatStatus(options: GetMufradatStatusOptions): MufradatAccessSummary {
  const { 
    user, 
    registrations = [], 
    isStudent = false, 
    surahId, 
    verseId, 
    pageId, 
    redemptions = [] 
  } = options;

  const sNum = surahId ? parseInt(surahId.toString()) : null;
  const vNum = verseId ? parseInt(verseId.toString()) : null;
  const pNum = pageId ? parseInt(pageId.toString()) : null;
  
  const today = new Date();

  const freeSurahs = [1, 112, 113, 114];
  if ((sNum !== null && freeSurahs.includes(sNum)) || (pNum !== null && (pNum === 1 || pNum === 604))) {
    return {
      status: 'active',
      isBlocked: false,
      isFree: true,
      isVerified: true, // Free contents are effectively verified
      showSoftReminder: false,
      message: "Selamat Datang! Ukhti sedang menikmati akses gratis halaman pertama/terakhir Al-Quran."
    };
  }

  // Handle Vouchers - CRITICAL: PRIORITIZE VOUCHERS FIRST FOR INSTANT ACTIVATION
  const hasVoucher = redemptions?.some(r => 
    r.vouchers?.program_id === 'mufradat' || r.vouchers?.program_id === 'all'
  );

  if (hasVoucher) {
    return {
      status: 'active',
      isBlocked: false,
      isVerified: true,
      showSoftReminder: false,
      message: "Akses Aktif (Promo/Voucher). Selamat mempelajari mufradat Qur'an!"
    };
  }

  // 0. PENDING REGISTRATION CHECK (Bonus 24h Access for New/Re-registering Users)
  // This applies to anyone who doesn't have a verified subscription but just registered
  const pendingReg = registrations?.find(r => 
    r.status === 'pending_verification' && 
    (r.halaqah_id === 'mufradat-premium' || r.halaqah_title?.toLowerCase().includes('mufradat'))
  );

  // 1. GUEST ACCESS & PENDING REGISTRATION TRIAL
  if (!user || user.mufradat_status === 'inactive' || !user.mufradat_group_id || !user.mufradat_due_date) {
    if (!user) {
      return {
        status: 'inactive',
        isBlocked: true,
        isVerified: false,
        showSoftReminder: false,
        message: "Program ini membutuhkan pendaftaran untuk mengakses seluruh ayat. Mari bergabung menjadi peserta Hi Mufradat!",
        redirectTo: '/register?redirectTo=/study-circles/registration?id=mufradat-premium',
        buttonText: 'DAFTAR PROGRAM SEKARANG'
      };
    }

    if (pendingReg) {
      const hoursSinceReg = differenceInHours(today, parseISO(pendingReg.created_at));
      
      // TRIAL ACCESS: 24 hours from registration
      if (hoursSinceReg < 24) {
        return {
          status: 'trial',
          isBlocked: false,
          isVerified: false,
          showSoftReminder: true,
          message: "Mode Trial Aktif! Pendaftaran Ukhti sedang diproses. Ukhti bisa mencoba akses seluruh ayat selama 24 jam pertama.",
          buttonText: 'LIHAT STATUS PENDAFTARAN',
          redirectTo: '/mufradat/billing'
        };
      }

      // After 24h, still pending but trial ended
      return {
        status: 'inactive',
        isBlocked: true,
        isVerified: false,
        showSoftReminder: false,
        message: "Sedang Menunggu Verifikasi. Pendaftaran Ukhti sedang ditinjau oleh Musyrifah. Mohon tunggu maksimal 1x24 jam.",
        redirectTo: '/mufradat/billing',
        buttonText: 'CEK RIWAYAT PENDAFTARAN'
      };
    }

    return {
      status: 'inactive',
      isBlocked: true,
      isVerified: false,
      showSoftReminder: false,
      message: "Ukhti belum terdaftar di program Hi Mufradat. Silakan lakukan pendaftaran terlebih dahulu.",
      redirectTo: '/study-circles/registration?id=mufradat-premium',
      buttonText: 'DAFTAR PROGRAM SEKARANG'
    };
  }

  // Handle Leave status
  if (user.mufradat_status === 'on_leave') {
    const leaveFrom = user.mufradat_leave_from ? parseISO(user.mufradat_leave_from) : null;
    const leaveUntil = user.mufradat_leave_until ? parseISO(user.mufradat_leave_until) : null;
    
    const isAfterFrom = !leaveFrom || today >= leaveFrom;
    const isBeforeUntil = !leaveUntil || today <= leaveUntil;
    
    if (isAfterFrom && isBeforeUntil) {
      return {
        status: 'on_leave',
        isBlocked: true,
        showSoftReminder: false,
        message: "Status Ukhti sedang Cuti. Akses ayat akan kembali terbuka setelah masa cuti berakhir."
      };
    }
  }

  const verifiedRegs = registrations
    ?.filter(r => 
      r.status?.toLowerCase() === 'verified' && 
      (
        r.halaqah_id?.toLowerCase().includes('mufradat') || 
        r.halaqah_title?.toLowerCase().includes('mufradat') || 
        r.halaqah_id === 'all' || 
        r.halaqah_id === user.mufradat_group_id
      )
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || [];

  const isVerified = verifiedRegs.length > 0;
  let dueDate = null;

  if (isVerified) {
    const firstVer = verifiedRegs[0];
    const baseDate = parseISO(firstVer.verified_at || firstVer.created_at);
    // Count how many verified months/regs (usually 1 per monthly, but handles legacy)
    dueDate = addMonths(baseDate, verifiedRegs.length);
  }

  // Fallback to mufradat_due_date ONLY if no registrations found
  // This allows legacy/manually added users to remain active while transition is in progress
  if (!dueDate && user.mufradat_due_date) {
    dueDate = parseISO(user.mufradat_due_date);
  }

  // If still no due date, they are effectively inactive/unpaid in billing sense
  // BUT: If they have a verified registration, we might want to let them see content?
  // The user says "Buka akses semua surat, juz untuk yang valid registration"
  // If we want billing to still work, we keep the block for expired.
  
  if (!dueDate) {
    return {
      status: 'inactive',
      isBlocked: true,
      isVerified,
      showSoftReminder: false,
      message: "Masa aktif akses Ukhti belum tersedia. Silakan lakukan aktivasi pembayaran.",
      redirectTo: '/mufradat/billing'
    };
  }

  // Grace Period: 3 Days
  const graceDate = addDays(dueDate, 3);
  const isExpired = today > dueDate;
  const isGraceEnded = today > graceDate;

  if (isGraceEnded) {
    const hasPendingCurrent = registrations.some(r => 
      r.status === 'pending_verification' && 
      (
        r.halaqah_id === 'mufradat-premium' || 
        r.halaqah_id === user.mufradat_group_id ||
        r.halaqah_title?.toLowerCase().includes('mufradat')
      ) &&
      (differenceInHours(today, parseISO(r.created_at)) < 48) // Allow 48h buffer for pending
    );

    if (hasPendingCurrent) {
       return {
         status: 'trial', // Show as trial/pending mode
         isBlocked: false,
         isVerified,
         showSoftReminder: true,
         message: "Bukti Infaq Ukhti sedang menunggu verifikasi Musyrifah. Akses tetap terbuka sementara (Mode Trial)."
       };
    }

    return {
      status: 'blocked',
      isBlocked: true,
      isVerified,
      showSoftReminder: false,
      dueDate: dueDate,
      message: "Akses Terhenti. Masa aktif Hi Mufradat Ukhti sudah habis. Mohon lakukan konfirmasi infaq.",
      redirectTo: '/mufradat/billing'
    };
  }

  if (isExpired) {
    return {
      status: 'grace_period',
      isBlocked: false,
      isVerified,
      showSoftReminder: true,
      dueDate: dueDate,
      message: `Masa aktif akses Ukhti telah berakhir pada ${format(dueDate, 'd MMM')}. Mohon segera konfirmasi pendaftaran.`
    };
  }

  // Calculate days remaining
  const diffTime = dueDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    status: 'active',
    isBlocked: false,
    isVerified,
    showSoftReminder: daysRemaining <= 3,
    daysRemaining,
    dueDate,
    message: daysRemaining <= 3 
      ? `Akses aktif. Sisa masa aktif Ukhti tinggal ${daysRemaining} hari lagi.` 
      : "Akses Aktif. Ahlan wa Sahlan di Hi Mufradat!"
  };
}
