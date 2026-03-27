
"use client";

import './globals.css';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/bottom-nav';
import { SupabaseProvider, useUser, supabase } from '@/supabase';
import { useDoc, useCollection } from '@/supabase/db';
import { Trophy, Zap, Star } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const Logo = dynamic(() => import('@/components/logo').then(mod => mod.Logo), { 
  ssr: false,
  loading: () => <div className="w-[100px] h-[28px]" /> // Placeholder with similar dimensions
});


function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: isAdminDoc } = useDoc("roles_admin", user?.id);
  const { data: isSuperAdminDoc } = useDoc("roles_superadmin", user?.id);
  const { data: userData, isLoading: isUserDocLoading } = useDoc("users", user?.id);

  // Auto-sync profile if missing
  useEffect(() => {
    if (mounted && user && !isUserDocLoading && !userData) {
      const syncProfile = async () => {
        try {
          await supabase.from('users').insert({
            id: user.id,
            username: user.user_metadata?.full_name || user.email?.split('@')[0],
            email: user.email,
            roleId: 'learner',
            points: 0,
            followedHalaqahs: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Failed to auto-sync profile in layout:', err);
        }
      };
      syncProfile();
    }
  }, [mounted, user, userData, isUserDocLoading]);

  const hasAdminAccess = !!isAdminDoc || !!isSuperAdminDoc || userData?.roleId === 'admin' || userData?.roleId === 'superadmin';
  const points = userData?.points || 0;

  // Gate content until mounted to prevent hydration mismatch
  const showAdminUI = mounted && hasAdminAccess;
  const showUserUI = mounted && !isUserLoading;
  const showBottomNav = mounted && !hasAdminAccess && !isAuthPage;

  return (
    <>
      <SidebarProvider defaultOpen={false}>
      <div className="relative flex min-h-screen w-full">
        {/* Sidebar hanya muncul untuk admin di md ke atas */}
        {showAdminUI && <AppSidebar />}
        <SidebarInset className="w-full flex flex-col">
          {/* Padding bottom untuk BottomNav */}
          <div className="flex flex-col flex-1 w-full pb-20 md:pb-0">
            <header className="sticky top-0 z-40 flex h-20 items-center justify-between px-6 transition-all bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                {showAdminUI && <SidebarTrigger className="flex text-[#800000] hover:bg-[#800000]/5" />}
              </div>
              
              <div className="flex-1 flex justify-center">
                {!isAuthPage && (
                  <Logo variant="default" showText={true} className="scale-125 md:scale-150" textClassName="text-2xl md:text-3xl" imageSize={48} />
                )}
              </div>

              <div className="flex items-center gap-3">
                {mounted && user && (
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
