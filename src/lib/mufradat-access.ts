import { subMonths, format, getDate, isAfter, parseISO, startOfMonth, addDays } from "date-fns";

export type MufradatAccessStatus = 
  | 'active'           // Fully paid and in good standing
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
  isFree?: boolean; // New: True for Al-Fatihah etc.
}

/**
 * Evaluates the Hi Mufradat subscription status for a user.
 * 
 * Rules:
 * 1. Billing issued on the 28th for the NEXT month.
 * 2. Grace period until the 10th of THAT month.
 * 3. Blocking starts after the 11th if unpaid.
 * 4. Leave (Cuti) exempts from billing but blocks verse access.
 * 5. Surah 1 (Al-Fatihah) Verses 1-5 are always FREE for everyone.
 */
export function getMufradatStatus(
  user: any, 
  registrations: any[] = [], 
  surahId?: string | number, 
  verseId?: string | number,
  redemptions: any[] = []
): MufradatAccessSummary {
  // 0. FREE ACCESS OVERRIDE: Al-Fatihah (1) Verses 1-5
  const sNum = surahId ? parseInt(surahId.toString()) : null;
  const vNum = verseId ? parseInt(verseId.toString()) : null;
  
  const today = new Date();
  const currentMonthStr = format(today, 'yyyy-MM');

  // SPECIAL: FREE APRIL 2026 PROMOTION
  // All logged in users get free access to Hi Mufradat in April 2026
  const isFreeApril = currentMonthStr === '2026-04';

  const freeSurahs = [1, 112, 113, 114];
  if (sNum !== null && freeSurahs.includes(sNum)) {
    return {
      status: 'active',
      isBlocked: false,
      isFree: true,
      showSoftReminder: false,
      message: "Selamat Datang! Ukhti sedang menikmati akses gratis surat pilihan."
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
      showSoftReminder: false,
      message: "Akses Aktif (Promo/Voucher). Selamat mempelajari mufradat Qur'an!"
    };
  }


  // Handle Global Promotions (e.g. Free April)
  // ONLY for users who have at least registered (joined a group)
  if (isFreeApril && user?.mufradat_group_id) {
    return {
      status: 'active',
      isBlocked: false,
      showSoftReminder: false,
      message: "🎉 BERKAH RAMADAN: Akses Hi Mufradat GRATIS untuk seluruh peserta selama bulan April! Selamat menghafal, Ukhti."
    };
  }

  // 1. GUEST ACCESS: Not logged in or no baseline profile
  if (!user || user.mufradat_status === 'inactive' || !user.mufradat_group_id) {
    // If not logged in at all, redirect to registration with automated funnel back to program registration
    if (!user) {
      return {
        status: 'inactive',
        isBlocked: true,
        showSoftReminder: false,
        message: "Program ini membutuhkan pendaftaran untuk mengakses seluruh ayat. Mari bergabung menjadi peserta Hi Mufradat!",
        redirectTo: '/register?redirectTo=/study-circles/registration?id=mufradat-premium',
        buttonText: 'DAFTAR PROGRAM SEKARANG'
      };
    }

    return {
      status: 'inactive',
      isBlocked: true,
      showSoftReminder: false,
      message: "Ukhti belum terdaftar di program Hi Mufradat. Silakan lakukan pendaftaran terlebih dahulu.",
      redirectTo: '/study-circles/registration?id=mufradat-premium',
      buttonText: 'DAFTAR PROGRAM SEKARANG'
    };
  }

  // Handle Leave status
  if (user.mufradat_status === 'on_leave') {
    const leaveUntil = user.mufradat_leave_until ? parseISO(user.mufradat_leave_until) : null;
    const isLeaveActive = leaveUntil ? isAfter(leaveUntil, new Date()) : false;
    
    if (isLeaveActive) {
      return {
        status: 'on_leave',
        isBlocked: true,
        showSoftReminder: false,
        message: "Status Ukhti sedang Cuti. Akses ayat akan kembali terbuka setelah masa cuti berakhir."
      };
    }
  }

  const dayOfMonth = getDate(today);
  const nextMonthStr = format(subMonths(today, -1), 'yyyy-MM');

  // Logic: 
  // 1. Initial registration (no payment_type) counts for the month it was created.
  // 2. Regular monthly payments must match the billing_month.
  // 3. Status must be 'verified' to be considered 'paid'.
  
  const hasPaidCurrent = registrations.some(r => 
    r.status === 'verified' && 
    (r.halaqah_id === 'mufradat-premium' || r.halaqah_id === user.mufradat_group_id || r.halaqah_title?.toLowerCase().includes('mufradat')) &&
    (
      (r.payment_type === 'monthly' && r.billing_month === currentMonthStr) ||
      (!r.payment_type && r.created_at && format(parseISO(r.created_at), 'yyyy-MM') === currentMonthStr) ||
      (!r.payment_type && !r.created_at) // Fallback for legacy
    )
  );
  
  const hasPaidNext = registrations.some(r => 
    r.status === 'verified' && 
    r.payment_type === 'monthly' && 
    r.billing_month === nextMonthStr
  );

  // Check for PENDING verification (to show specialized message)
  const hasPendingNext = registrations.some(r => 
    r.status === 'pending_verification' && 
    r.payment_type === 'monthly' && 
    r.billing_month === nextMonthStr
  );

  const hasPendingCurrent = registrations.some(r => 
    r.status === 'pending_verification' && 
    (
      (r.payment_type === 'monthly' && r.billing_month === currentMonthStr) ||
      (!r.payment_type)
    )
  );

  // SAFE ZONE: 28th to 10th
  // ACCESS IS NEVER BLOCKED HERE.
  const isSafeZone = dayOfMonth >= 28 || dayOfMonth <= 10;

  if (isSafeZone) {
    // If 28th-31st: Reminding for NEXT month
    if (dayOfMonth >= 28) {
      if (hasPaidNext) {
        return {
          status: 'active',
          isBlocked: false,
          showSoftReminder: false,
          message: "Akses Aktif. Jazakillah Khair atas infaqnya, Ukhti!"
        };
      }
      
      const msg = hasPendingNext 
        ? "Bukti Infaq periode depan sedang diverifikasi Musyrifah. Mohon ditunggu ya, Ukhti."
        : "Masa Infaq (28 s/d 10): Silakan konfirmasi infaq Hi Mufradat Ukhti untuk periode berikutnya. Syukran.";

      return {
        status: 'grace_period',
        isBlocked: false, // NO POPUP DURING SAFE ZONE
        showSoftReminder: true,
        nextBillingMonth: nextMonthStr,
        message: msg
      };
    } 
    // If 1st-10th: Reminding for CURRENT month
    else {
      if (hasPaidCurrent) {
        return {
          status: 'active',
          isBlocked: false,
          showSoftReminder: false,
          message: "Akses Aktif. Ahlan wa Sahlan di Hi Mufradat!"
        };
      }

      const msg = hasPendingCurrent
        ? "Bukti Infaq bulan ini sedang diverifikasi Musyrifah. Mohon ditunggu ya, Ukhti."
        : "Masa Tenggang: Mohon konfirmasi infaq Hi Mufradat Ukhti untuk bulan ini sebelum tanggal 10 agar akses tidak terputus.";

      return {
        status: 'grace_period',
        isBlocked: false, // NO POPUP DURING SAFE ZONE
        showSoftReminder: true,
        nextBillingMonth: currentMonthStr,
        message: msg
      };
    }
  } 

  // OUTSIDE SAFE ZONE: 11th to 27th
  // BLOCKING IS ACTIVE IF UNPAID.
  if (!hasPaidCurrent) {
    const msg = hasPendingCurrent
      ? "Bukti Infaq Ukhti sedang menunggu verifikasi Musyrifah. Akses akan terbuka otomatis setelah diverifikasi."
      : "Akses Terhenti. Infaq Hi Mufradat Ukhti belum terverifikasi untuk bulan ini. Hi AQLI membutuhkan dana untuk biaya operasional.";

    return {
      status: 'blocked',
      isBlocked: !hasPendingCurrent, // Only block if NO pending verification
      showSoftReminder: hasPendingCurrent,
      message: msg,
      redirectTo: '/mufradat/billing'
    };
  }

  return {
    status: 'active',
    isBlocked: false,
    showSoftReminder: false,
    message: "Akses Aktif. Ahlan wa Sahlan di Hi Mufradat!"
  };
}
