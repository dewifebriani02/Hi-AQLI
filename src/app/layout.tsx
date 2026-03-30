
"use client";

import './globals.css';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/bottom-nav';
import { SupabaseProvider, useUser, supabase } from '@/supabase';
import { signOut } from '@/supabase/auth';
import { useDoc, useCollection } from '@/supabase/db';
import { Trophy, Zap, Star, ShieldAlert, LogOut } from 'lucide-react';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';

const Logo = dynamic(() => import('@/components/logo').then(mod => mod.Logo), { 
  ssr: false,
  loading: () => <div className="w-[100px] h-[28px]" /> // Placeholder with similar dimensions
});


function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const [mounted, setMounted] = useState(false);
  const [showInitialSplash, setShowInitialSplash] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if splash has been shown in this session
    const hasShownSplash = sessionStorage.getItem('hi_aqli_splash_shown');
    if (!hasShownSplash) {
      setShowInitialSplash(true);
      // Increased delay to 10 seconds as requested by the user
      const timer = setTimeout(() => {
        setShowInitialSplash(false);
      }, 10000);
      sessionStorage.setItem('hi_aqli_splash_shown', 'true');
      return () => clearTimeout(timer);
    }
  }, []);

  const { data: isAdminDoc } = useDoc("roles_admin", user?.id);
  const { data: isSuperAdminDoc } = useDoc("roles_superadmin", user?.id);
  const { data: userData, isLoading: isUserDocLoading } = useDoc("users", user?.id);

  const hasAttemptedSync = useRef(false);

  // Auto-sync profile if missing
  useEffect(() => {
    if (mounted && user && !isUserDocLoading && !userData && !hasAttemptedSync.current) {
      const syncProfile = async () => {
        hasAttemptedSync.current = true;
        try {
          // Use upsert to avoid 409 Conflict errors if the user already exists
          const { error } = await supabase.from('users').upsert({
            id: user.id,
            username: user.user_metadata?.full_name || user.email?.split('@')[0],
            email: user.email,
            role_id: 'learner',
            points: 0,
            followed_halaqahs: [],
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id', ignoreDuplicates: true });
          
          if (error) {
            console.error('Failed to auto-sync profile in layout:', error);
          }
        } catch (err) {
          console.error('Failed to auto-sync profile in layout:', err);
        }
      };
      syncProfile();
    }
  }, [mounted, user, userData, isUserDocLoading]);

  const hasAdminAccess = !!isAdminDoc || !!isSuperAdminDoc || userData?.role_id === 'admin' || userData?.role_id === 'superadmin';
  const points = userData?.points || 0;
  const isBlacklisted = !!userData?.is_blacklisted;

  // Render a consistent splash screen for loading and initial view
  const SplashView = () => (
    <div className="fixed inset-0 z-[9999] bg-[#800000] flex flex-col items-center justify-center p-8 text-center overscroll-none touch-none">
       {/* Background Ornaments from splash-bg.png */}
       <img 
          src="/splash-bg.png" 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity duration-1000" 
       />
       {/* Subtle Overlay to make logo/text pop */}
       <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
       
       <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-amber-500/20 rounded-full animate-pulse" />
            <img 
              src="/app-logo-gold.png" 
              alt="Logo" 
              className="w-48 h-48 sm:w-64 sm:h-64 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-20"
            />
          </div>
          <div className="space-y-4 max-w-xs sm:max-w-md">
            <h1 className="text-4xl sm:text-5xl font-black text-[#D4AF37] font-headline tracking-tighter drop-shadow-xl">Hi AQLI</h1>
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto opacity-50" />
            <p className="text-white text-base sm:text-lg font-bold italic tracking-wider drop-shadow-lg uppercase leading-tight px-4">
              "Berhijrah dengan Ilmu, Beramal dengan Itqan"
            </p>
          </div>
       </div>
    </div>
  );

  // The server and initial client render must match. 
  // We return a splash shell until mounted to avoid white flicker.
  if (!mounted) {
    return <SplashView />;
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
          Maaf, akun Anda telah dibatalkan aksesnya oleh sistem atau administrator Hi AQLI. Silakan hubungi admin via WhatsApp untuk informasi lebih lanjut.
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
  const showBottomNav = !isBlacklisted;

  return (
    <>
      {showInitialSplash && (
        <div className="fixed inset-0 z-[9999] bg-[#800000] flex items-center justify-center animate-out fade-out duration-1000 fill-mode-forwards ease-in-out pointer-events-none">
          <img 
            src="/splash-bg.png" 
            alt="Hi AQLI Splash" 
            className="w-full h-full object-cover sm:object-contain"
          />
        </div>
      )}
      <SidebarProvider defaultOpen={false}>
      <div className="relative flex min-h-screen w-full">
        {/* Sidebar hanya muncul untuk admin di md ke atas */}
        {showAdminUI && <AppSidebar />}
        <SidebarInset className="w-full flex flex-col">
          {/* Padding bottom untuk BottomNav (selalu ada) */}
          <div className="flex flex-col flex-1 w-full pb-20">
            <header className="sticky top-0 z-40 flex h-24 items-center justify-between px-6 md:px-10 transition-all bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                {showAdminUI && <SidebarTrigger className="text-[#800000] hover:bg-[#800000]/5 mr-2" />}
                <Link href="/" className="transition-transform hover:scale-105 active:scale-95">
                  <Logo variant="default" showText={true} className="scale-110 md:scale-125 origin-left" textClassName="text-2xl md:text-3xl font-black tracking-tight" imageSize={48} />
                </Link>
              </div>
              
              <div className="flex items-center gap-3">
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
                      <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm transform hover:scale-105 transition-transform">
                        <AvatarImage src={user.user_metadata?.avatar_url || undefined} />
                        <AvatarFallback className="bg-slate-100 text-[#800000] text-xs font-black uppercase">
                          {user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Button asChild size="sm" className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black uppercase rounded-xl px-6 shadow-md transition-all active:scale-95 text-[10px]">
                      <Link href="/login">Masuk</Link>
                    </Button>
                  )
                )}
              </div>
            </header>
            <main className="p-4 sm:p-6 lg:p-8 flex-1">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
      <BottomNav />
      <Toaster />
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
        
        {/* Preload splash assets as early as possible */}
        <link rel="preload" href="/splash-bg.png" as="image" />
        <link rel="preload" href="/app-logo-gold.png" as="image" />

        {/* PWA & iOS Optimization */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-startup-image" href="/splash-bg.png" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hiaqli.pro/" />
        <meta property="og:title" content="Hi AQLI" />
        <meta property="og:description" content="Berhijrah dengan Ilmu, Beramal dengan Itqan." />
        <meta property="og:image" content="https://hiaqli.pro/app-splash.jpg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://hiaqli.pro/" />
        <meta name="twitter:title" content="Hi AQLI" />
        <meta name="twitter:description" content="Berhijrah dengan Ilmu, Beramal dengan Itqan." />
        <meta name="twitter:image" content="https://hiaqli.pro/app-splash.jpg" />

        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background')}>
        <SupabaseProvider>
          <LayoutContent>{children}</LayoutContent>
        </SupabaseProvider>
      </body>
    </html>
  );
}
