
"use client";

import './globals.css';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/bottom-nav';
import { SupabaseProvider, useUser } from '@/supabase';
import { useDoc, useCollection } from '@/supabase/db';
import { Trophy, Zap, Star } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SplashScreen } from '@/components/splash-screen';
import dynamic from 'next/dynamic';

const Logo = dynamic(() => import('@/components/logo').then(mod => mod.Logo), { 
  ssr: false,
  loading: () => <div className="w-[100px] h-[28px]" /> // Placeholder with similar dimensions
});

// Splash screen state management
let splashShown = false;

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();

  const { data: isAdminDoc } = useDoc("roles_admin", user?.id);
  const { data: isSuperAdminDoc } = useDoc("roles_superadmin", user?.id);
  const { data: userData } = useDoc("users", user?.id);

  const hasAdminAccess = !!isAdminDoc || !!isSuperAdminDoc || userData?.roleId === 'admin' || userData?.roleId === 'superadmin';
  const points = userData?.points || 0;

  // Sidebar muncul untuk admin di tablet (md+) ke atas
  // BottomNav muncul untuk user biasa di semua device
  // Untuk admin: BottomNav hanya di mobile (sm), sidebar di md+
  const showBottomNav = !hasAdminAccess;

  // Splash screen logic - only show once per session
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Check if splash has been shown in this session
    if (!splashShown && typeof window !== 'undefined') {
      const sessionKey = 'aqli_splash_shown';
      const hasShown = sessionStorage.getItem(sessionKey);

      if (!hasShown) {
        setShowSplash(true);
        sessionStorage.setItem(sessionKey, 'true');
        splashShown = true;
      }
    }
  }, []);

  return (
    <>
      <SplashScreen
        show={showSplash}
        onComplete={() => setShowSplash(false)}
        minDisplayTime={2000}
      />
      <SidebarProvider defaultOpen={false}>
      <div className="relative flex min-h-screen w-full">
        {/* Sidebar hanya muncul untuk admin di md ke atas */}
        {hasAdminAccess && <AppSidebar />}
        <SidebarInset className="w-full flex flex-col">
          {/* Padding bottom untuk BottomNav */}
          <div className="flex flex-col flex-1 w-full pb-20 md:pb-0">
            <header className="sticky top-0 z-40 flex h-16 items-center gap-4 bg-[#800000] border-b border-[#D4AF37]/30 shadow-lg px-4 transition-all">
              {hasAdminAccess && <SidebarTrigger className="flex text-[#D4AF37] hover:bg-white/10" />}
              <div className="flex-1 flex justify-center">
                <Logo variant="gold" showText={true} className="scale-75" textClassName="text-lg" imageSize={32} />
              </div>
              <div className="flex items-center gap-3">
                {user && (
                  <Link href="/leaderboard" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-[#D4AF37]/30 shadow-sm hover:bg-white/20 transition-all group backdrop-blur-sm">
                    <Trophy className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]/20" />
                    <span className="text-[11px] font-black text-white tracking-tight">
                      {points.toLocaleString()}
                    </span>
                    <Zap className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37] animate-pulse" />
                  </Link>
                )}
                {!isUserLoading && (
                  user ? (
                    <Link href="/profile">
                      <Avatar className="h-9 w-9 border-2 border-[#D4AF37]/50 shadow-md transform hover:scale-105 transition-transform">
                        <AvatarImage src={user.user_metadata?.avatar_url || undefined} />
                        <AvatarFallback className="bg-white/10 text-[#D4AF37] text-xs font-black uppercase">
                          {user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Button asChild size="sm" className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#800000] font-black uppercase rounded-xl px-5 shadow-lg shadow-[#000]/20 transition-all active:scale-95 text-[10px]">
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
      {/* BottomNav: user biasa di semua device, admin hanya di mobile */}
      {showBottomNav ? (
        <BottomNav />
      ) : (
        <div className="md:hidden"><BottomNav /></div>
      )}
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
