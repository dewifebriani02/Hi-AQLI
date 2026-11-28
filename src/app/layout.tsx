"use client";

import './globals.css';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/common/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/common/bottom-nav';
import { PWAInstallPrompt } from '@/components/common/pwa-install-prompt';
import { GlobalReportWidget, ReportTriggerButton } from '@/components/common/report-issue-widget';
import { AuthProvider, useUser, db, signOut, useDoc } from '@/db';
import { useUserPermissions } from '@/lib/permissions';
import { Trophy, Zap, ShieldAlert, LogOut, Smartphone, Minus, Plus } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { FontSizeProvider, useFontSize } from '@/contexts/font-size-context';

const Logo = dynamic(() => import('@/components/common/logo').then(mod => mod.Logo), { 
  ssr: false,
  loading: () => <div className="w-[100px] h-[28px]" /> // Placeholder with similar dimensions
});


function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { fontSize, increaseFontSize, decreaseFontSize } = useFontSize();
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname?.startsWith('/auth/');
  const isAdminRoute = pathname?.startsWith('/admin');
  const isStandalonePreviewRoute = pathname?.startsWith('/jht');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { isSuperUser, isMusyrifah } = useUserPermissions(user?.id);
  const { data: userData, isLoading: isUserDocLoading } = useDoc("users", user?.id);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const hasAttemptedSync = useRef(false);

  // PWA Install Logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser-provided "Add to Home Screen" banner
      // so we can show our custom "UNDUH APP" button in the UI instead.
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Service Worker registration failed:', err);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Auto-sync profile if missing
  useEffect(() => {
    if (mounted && user && !isUserDocLoading && !userData && !hasAttemptedSync.current) {
      const syncProfile = async () => {
        hasAttemptedSync.current = true;
        try {
          // Use upsert to avoid 409 Conflict errors if the user already exists
          const { error } = await db.from('users').upsert({
            id: user.id,
            username: user.user_metadata?.full_name || user.email?.split('@')[0],
            email: user.email,
            role_id: 'learner',
            points: 0,
            followed_halaqahs: [],
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id', ignoreDuplicates: true });
          
          if (error) {
            // If the error is about unique constraint, it means the trigger might have 
            // already created it, which is fine.
            if (!error.message?.includes('duplicate key')) {
                console.warn('Sync Profile Info:', error.message || 'Row might already exist via Trigger');
            }
          }
        } catch (err: any) {
          console.error('System error during profile sync:', err.message || err);
        }
      };
      syncProfile();
    }
  }, [mounted, user, userData, isUserDocLoading]);

  const [isPWAOpen, setIsPWAOpen] = useState(false);

  useEffect(() => {
    const handleOpenPWA = () => setIsPWAOpen(true);
    window.addEventListener('open-pwa-install', handleOpenPWA);
    return () => window.removeEventListener('open-pwa-install', handleOpenPWA);
  }, []);

  const hasAdminAccess = isSuperUser || isMusyrifah;
  const points = userData?.points || 0;
  const isBlacklisted = !!userData?.is_blacklisted;
  const salutation = userData?.salutation || "Ukhti";

  // The server and initial client render must match. 
  // We return null until mounted to avoid hydration white flicker.
  if (!mounted) {
    return null;
  }

  if (isStandalonePreviewRoute) {
    return (
      <>
        {children}
        <GlobalReportWidget />
        <Toaster />
      </>
    );
  }

  // Blacklist Guard View
  if (user && !isUserDocLoading && isBlacklisted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-rose-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">AKSES DIBATASI</h1>
        <p className="text-slate-500 max-w-sm mb-8 font-medium">
          Maaf, akun {salutation} telah dibatalkan aksesnya oleh sistem atau administrator Hi AQLI. Silakan hubungi admin via WhatsApp untuk informasi lebih lanjut.
        </p>
        <Button 
          onClick={() => signOut()} 
          variant="outline" 
          className="border-2 border-slate-200 font-black uppercase text-[10px] tracking-widest gap-2 py-6 px-10 rounded-2xl bg-white shadow-xl active:scale-95"
        >
          <LogOut className="w-4 h-4" /> KELUAR DARI AKUN
        </Button>
      </div>
    );
  }

  const showAdminUI = hasAdminAccess && !isBlacklisted;
  const showUserUI = !isUserLoading;
  // Sembunyikan BottomNav peserta di portal /admin/* dan halaman autentikasi
  const showBottomNav = !isBlacklisted && !isAdminRoute && !isAuthPage;

  return (
    <>
      <SidebarProvider defaultOpen={false}>
      <div className="relative flex min-h-screen w-full">
        {/* Sidebar hanya muncul untuk admin/musyrifah */}
        {showAdminUI && <AppSidebar />}
        <SidebarInset className="w-full min-w-0 flex flex-col overflow-x-clip">
          <div className={cn("flex flex-col flex-1 w-full min-w-0", showBottomNav ? "pb-24" : "pb-6")}>
            <header className="sticky top-0 z-40 flex h-16 sm:h-20 items-center justify-between gap-2 px-3 sm:px-6 md:px-10 transition-all bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
              <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
                {showAdminUI && (
                  <SidebarTrigger
                    className={cn(
                      "md:hidden shrink-0",
                      isAdminRoute
                        ? "text-primary bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl"
                        : "text-slate-400"
                    )}
                  />
                )}
                <Link href="/" className="transition-transform hover:scale-105 active:scale-95 shrink-0">
                  <Logo variant="default" showText={true} className="sm:scale-110 md:scale-125 origin-left" textClassName="text-base sm:text-2xl md:text-3xl font-black tracking-tight whitespace-nowrap" imageSize={32} />
                </Link>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
                {/* Global Report Error Button — Available on every thalibah page */}
                {!isAuthPage && (
                  <ReportTriggerButton
                    label="Lapor"
                    className="h-7 sm:h-8 px-2 sm:px-3 rounded-full text-[10px] sm:text-[11px] font-black border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-[#800000] whitespace-nowrap"
                  />
                )}

                {/* Global Font Size Stepper */}
                <div 
                  className="flex items-center gap-0.5 sm:gap-1 bg-slate-50 border border-slate-200/90 shadow-xs rounded-full px-1.5 py-0.5" 
                  title="Ukuran Font Teks Arab (Global)"
                >
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    onClick={decreaseFontSize}
                    aria-label="Perkecil Font"
                    className="h-6 w-6 sm:h-7 sm:w-7 text-[#800000] hover:bg-slate-200/60 rounded-full"
                  >
                    <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                  <span className="text-[11px] sm:text-xs font-black text-slate-700 w-5 sm:w-6 text-center select-none">
                    {fontSize}
                  </span>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    onClick={increaseFontSize}
                    aria-label="Perbesar Font"
                    className="h-6 w-6 sm:h-7 sm:w-7 text-[#800000] hover:bg-slate-200/60 rounded-full"
                  >
                    <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </div>

                {/* PWA Install Button */}
                {isInstallable && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsPWAOpen(true)}
                    className="flex border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-tight gap-1.5 rounded-xl hover:bg-slate-50 transition-all border-2"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">UNDUH APP</span>
                  </Button>
                )}
                
                {user && (
                  <Link href="/leaderboard" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm hover:bg-slate-100 transition-all group backdrop-blur-sm">
                    <Trophy className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]/20" />
                    <span className="text-[11px] font-black text-slate-700 tracking-tight">
                      {points.toLocaleString()}
                    </span>
                    <Zap className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37] animate-pulse" />
                  </Link>
                )}
                {showUserUI && (
                  user ? (
                    <Link href="/profile">
                      <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-slate-100 shadow-sm transform hover:scale-105 transition-transform">
                        <AvatarImage src={user.user_metadata?.avatar_url || (userData?.metadata as any)?.avatar_url || (userData as any)?.avatar_url || (user as any)?.avatar_url || undefined} />
                        <AvatarFallback className="bg-slate-100 text-[#800000] text-xs font-black uppercase">
                          {user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Button asChild size="sm" className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black uppercase rounded-xl px-4 sm:px-6 shadow-md transition-all active:scale-95 text-[10px]">
                      <Link href="/login">Masuk</Link>
                    </Button>
                  )
                )}
              </div>
            </header>
            <main className="p-3 sm:p-6 lg:p-8 flex-1 min-w-0">
              {children}
              {!isAdminRoute && !isAuthPage && (
                <div className="max-w-5xl mx-auto mt-10 pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left px-2">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Menemukan kekeliruan harakat, terjemah, soal kuis, rujukan jawaban, atau kendala teknis di halaman ini?
                  </p>
                  <ReportTriggerButton
                    label="Laporkan Kesalahan di Halaman Ini"
                    className="h-8 px-3.5 shrink-0"
                  />
                </div>
              )}
            </main>
          </div>
        </SidebarInset>
      </div>
      {showBottomNav && <BottomNav />}
      <GlobalReportWidget />
      <Toaster />
      <PWAInstallPrompt 
        deferredPrompt={deferredPrompt} 
        onInstall={handleInstallClick} 
        isOpen={isPWAOpen}
        onClose={() => setIsPWAOpen(false)}
      />
    </SidebarProvider>
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <title>Hi AQLI</title>
        <meta name="description" content="Berhijrah dengan Ilmu, Beramal dengan Itqan." />
        
        {/* PWA & iOS Optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#800000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hi AQLI" />
        <meta name="application-name" content="Hi AQLI" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hiaqli.pro/" />
        <meta property="og:title" content="Hi AQLI" />
        <meta property="og:description" content="Berhijrah dengan Ilmu, Beramal dengan Itqan." />
        <meta property="og:image" content="https://hiaqli.pro/app-splash.jpg" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://hiaqli.pro/" />
        <meta property="twitter:title" content="Hi AQLI" />
        <meta property="twitter:description" content="Berhijrah dengan Ilmu, Beramal dengan Itqan." />
        <meta property="twitter:image" content="https://hiaqli.pro/app-splash.jpg" />

        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background')}>
        <AuthProvider>
          <FontSizeProvider>
            <LayoutContent>{children}</LayoutContent>
          </FontSizeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
