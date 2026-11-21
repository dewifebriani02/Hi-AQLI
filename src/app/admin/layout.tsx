'use client';

import { useUser, signOut } from "@/db";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Lock,
  Loader2,
  Home,
  LogOut,
  LayoutDashboard,
  Repeat,
  BookOpen,
  Users,
  ClipboardCheck,
  UserCog,
  CalendarCheck,
  HeartHandshake,
  MessageSquare,
  Shield,
  Library,
  Trophy,
  Coffee,
  BarChart3,
  ShieldCheck,
  Target,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUserPermissions, getProgramTypeFromPath } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/tikrar', label: 'Hi Tikrar', icon: Repeat, program: 'hi_tikrar' as const },
  { href: '/admin/mufradat', label: 'Hi Mufradat', icon: BookOpen, program: 'hi_mufradat' as const },
  { href: '/admin/groups', label: 'Grup & Robot WA', icon: MessageSquare },
  { href: '/admin/registrations', label: 'Verifikasi Daftar', icon: ClipboardCheck, superOnly: true },
  { href: '/admin/classes', label: 'Katalog Kelas', icon: Library, superOnly: true },
  { href: '/admin/users', label: 'Database Peserta', icon: UserCog, superOnly: true },
  { href: '/admin/mutabaah', label: 'Mutabaah & Muhasabah', icon: CalendarCheck, superOnly: true },
  { href: '/admin/donations', label: 'Infaq & Kampanye', icon: HeartHandshake, superOnly: true },
];

const MUFRADAT_SUB_NAV = [
  { href: '/admin/mufradat', label: 'Monitor & Reminder', icon: BookOpen, exact: true },
  { href: '/admin/mufradat/groups', label: 'Batch & Grup WA', icon: Users },
  { href: '/admin/mufradat/juz-access', label: 'Hak Akses Juz', icon: ShieldCheck },
  { href: '/admin/mufradat/mabar', label: 'Jadwal Mabar', icon: Trophy },
  { href: '/admin/mufradat/leave', label: 'Kelola Cuti', icon: Coffee },
  { href: '/admin/mufradat/reports', label: 'Laporan Kinerja', icon: BarChart3 },
];

const MUTABAAH_SUB_NAV = [
  { href: '/admin/mutabaah', label: "Laporan Mutaba'ah Yaumiyah", icon: CalendarCheck },
  { href: '/admin/muhasabah', label: 'Laporan Hi Muhasabah (14 Poin)', icon: Shield },
];

const USERS_SUB_NAV = [
  { href: '/admin/users', label: 'Semua Akun & Role', icon: UserCog, exact: true },
  { href: '/admin/thalibah', label: 'Direktori Thalibah & Blacklist', icon: Users, exact: true },
];

const INFAQ_SUB_NAV = [
  { href: '/admin/donations', label: 'Transaksi Infaq', icon: HeartHandshake, exact: true },
  { href: '/admin/campaigns', label: 'Kampanye Infaq', icon: Target, exact: true },
  { href: '/admin/finance', label: 'Keuangan & Rekening', icon: Landmark, exact: true },
  { href: '/admin/finance/reconciliation', label: 'Rekonsiliasi', icon: ClipboardCheck, exact: true },
  { href: '/admin/vouchers', label: 'Voucher Promo', icon: ShieldCheck, exact: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorizing, setIsAuthorizing] = useState(true);

  const {
    isSuperUser,
    isMusyrifah,
    canAccessProgram,
    isLoading: isPermissionsLoading,
  } = useUserPermissions(user?.id);

  const programForPath = getProgramTypeFromPath(pathname || "");
  const isGeneralAdminPage = pathname === '/admin' || pathname?.startsWith('/admin/groups');
  const hasAccess = isSuperUser || (isMusyrifah && (isGeneralAdminPage || (!!programForPath && canAccessProgram(programForPath))));

  useEffect(() => {
    if (!isUserLoading && !isPermissionsLoading) {
      setIsAuthorizing(false);
    }
  }, [isUserLoading, isPermissionsLoading]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // 1. Loading State
  if (isUserLoading || isAuthorizing) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#6D123F] animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Memasuki Area Terbatas...</p>
      </div>
    );
  }

  // 2. Not Logged In
  if (!user) {
    return null;
  }

  // 3. Access Denied
  if (!hasAccess) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-8 relative">
          <ShieldAlert className="w-12 h-12 text-red-600" />
          <Lock className="w-6 h-6 text-red-900 absolute -bottom-1 -right-1" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tighter">AKSES DITOLAK</h1>
        
        <p className="text-slate-500 max-w-md mb-10 font-medium leading-relaxed">
          Maaf Ukhti/Akhi, halaman ini hanya dapat diakses oleh Administrator atau Musyrifah program terkait di Hi AQLI. 
          Akun Anda tidak memiliki hak akses yang diperlukan.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Button asChild className="flex-1 bg-[#6D123F] hover:bg-[#6D123F]/90 font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl shadow-lg">
            <Link href="/"><Home className="w-4 h-4 mr-2" /> KEMBALI KE BERANDA</Link>
          </Button>
          <Button 
            onClick={() => signOut()} 
            variant="outline" 
            className="flex-1 border-2 border-slate-200 font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4 mr-2" /> KELUAR AKUN
          </Button>
        </div>
        
        <div className="mt-12 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">
          Hi AQLI Security Protocol v4.0
        </div>
      </div>
    );
  }

  const visibleNavItems = ADMIN_NAV_ITEMS.filter((item) => {
    if (isSuperUser) return true;
    if (item.superOnly) return false;
    if (item.program) return canAccessProgram(item.program);
    return true;
  });

  const isMufradatSection = pathname?.startsWith('/admin/mufradat');
  const isUsersSection = pathname?.startsWith('/admin/users') || pathname?.startsWith('/admin/thalibah');
  const isMutabaahSection = pathname?.startsWith('/admin/mutabaah') || pathname?.startsWith('/admin/muhasabah');
  const isInfaqSection =
    pathname?.startsWith('/admin/donations') ||
    pathname?.startsWith('/admin/campaigns') ||
    pathname?.startsWith('/admin/finance') ||
    pathname?.startsWith('/admin/vouchers');

  const activeSubNav = isMufradatSection
    ? MUFRADAT_SUB_NAV
    : isUsersSection
    ? USERS_SUB_NAV
    : isMutabaahSection
    ? MUTABAAH_SUB_NAV
    : isInfaqSection
    ? INFAQ_SUB_NAV
    : null;

  // 4. Authorized Access with Unified Admin Sub-Navbar
  return (
    <div className="space-y-4">
      <div className="max-w-6xl mx-auto space-y-2">
        <nav
          aria-label="Navigasi Cepat Admin"
          className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl shadow-sm overflow-x-auto no-scrollbar"
        >
          <div className="flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              let isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href);

              if (item.href === '/admin/users' && isUsersSection) isActive = true;
              if (item.href === '/admin/mutabaah' && isMutabaahSection) isActive = true;
              if (item.href === '/admin/donations' && isInfaqSection) isActive = true;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                    isActive
                      ? "bg-[#6D123F] text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Beranda Aplikasi</span>
          </Link>
        </nav>

        {/* Sub-Navigation Bar for Multi-Page Modules (Hi Mufradat, Mutabaah/Muhasabah, Infaq/Kampanye) */}
        {activeSubNav && (
          <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 p-1 rounded-xl overflow-x-auto no-scrollbar w-fit">
            {activeSubNav.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = (sub as any).exact
                ? pathname === sub.href
                : pathname === sub.href || pathname?.startsWith(`${sub.href}/`);
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all",
                    isSubActive
                      ? "bg-white dark:bg-slate-900 text-[#6D123F] dark:text-rose-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50"
                  )}
                >
                  <SubIcon className="w-3 h-3 shrink-0" />
                  <span>{sub.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>{children}</div>
    </div>
  );
}
