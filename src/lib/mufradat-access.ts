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
}

/**
 * Evaluates the Hi Mufradat subscription status for a user.
 * 
 * Rules:
 * 1. Billing issued on the 28th for the NEXT month.
 * 2. Grace period until the 10th of THAT month.
 * 3. Blocking starts after the 11th if unpaid.
 * 4. Leave (Cuti) exempts from billing but blocks verse access.
 */
export function getMufradatStatus(user: any, registrations: any[] = []): MufradatAccessSummary {
  if (!user || user.mufradat_status === 'inactive' || !user.mufradat_group_id) {
    return {
      status: 'inactive',
      isBlocked: true,
      showSoftReminder: false,
      message: "Ukhti belum terdaftar di program Hi Mufradat. Silakan lakukan pendaftaran terlebih dahulu."
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

  const today = new Date();
  const dayOfMonth = getDate(today);
  
  // Identify currently relevant billing months
  // If today is 28th-31st, we are issuing for NEXT month.
  // If today is 1st-10th, we are in grace for CURRENT month.
  
  const currentMonthStr = format(today, 'yyyy-MM');
  const nextMonthStr = format(subMonths(today, -1), 'yyyy-MM');
  
  // Check if user has a verified payment for the relevant month
  const hasPaidCurrent = registrations.some(r => 
    r.status === 'active' && 
    r.payment_type === 'monthly' && 
    r.billing_month === currentMonthStr
  );
  
  const hasPaidNext = registrations.some(r => 
    r.status === 'active' && 
    r.payment_type === 'monthly' && 
    r.billing_month === nextMonthStr
  );

  // LOGIC: After 10th of current month
  if (dayOfMonth > 10) {
    // If not paid for current month, user is BLOCKED
    if (!hasPaidCurrent) {
      return {
        status: 'blocked',
        isBlocked: true,
        showSoftReminder: false,
        message: "Akses Terhenti. Infaq Hi Mufradat Ukhti belum terverifikasi untuk bulan ini. Hi AQLI membutuhkan dana untuk biaya operasional."
      };
    }
    
    // If paid for current month but it's >= 28th, show reminder for NEXT month
    if (dayOfMonth >= 28 && !hasPaidNext) {
      return {
        status: 'grace_period',
        isBlocked: false,
        showSoftReminder: true,
        nextBillingMonth: nextMonthStr,
        message: "Pengingat Lembut: Tagihan periode berikutnya sudah tersedia. Hi AQLI membutuhkan dukungan operasional tepat waktu. Syukran."
      };
    }
  } 
  // LOGIC: 1st to 10th (Grace Period for current month)
  else {
    if (!hasPaidCurrent) {
      return {
        status: 'grace_period',
        isBlocked: false,
        showSoftReminder: true,
        nextBillingMonth: currentMonthStr,
        message: "Masa Tenggang: Mohon konfirmasi infaq Hi Mufradat Ukhti untuk bulan ini sebelum tanggal 10 agar akses tidak terputus."
      };
    }
  }

  return {
    status: 'active',
    isBlocked: false,
    showSoftReminder: false,
    message: "Akses Aktif. Ahlan wa Sahlan di Hi Mufradat!"
  };
}
