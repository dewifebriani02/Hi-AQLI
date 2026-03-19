
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
import React, { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();

  const { data: isAdminDoc } = useDoc("roles_admin", user?.id);
  const { data: isSuperAdminDoc } = useDoc("roles_superadmin", user?.id);
  const { data: userData } = useDoc("users", user?.id);

  const hasAdminAccess = !!isAdminDoc || !!isSuperAdminDoc;
  const points = userData?.points || 0;

  // BottomNav muncul untuk semua user di mobile & tablet (sampai lg breakpoint)
  // Di desktop (lg+): user biasa pakai bottom nav, admin pakai sidebar saja
  const showBottomNav = !hasAdminAccess;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="relative flex min-h-screen w-full">
        {/* Sidebar hanya muncul untuk admin */}
        {hasAdminAccess && <AppSidebar />}
        <SidebarInset className="w-full flex flex-col">
          {/* Padding bottom untuk BottomNav (di mobile & tablet) */}
          <div className="flex flex-col flex-1 w-full pb-20 lg:pb-0">
            <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4">
              {hasAdminAccess && <SidebarTrigger className="lg:hidden" />}
              <div className="flex-1 text-center font-headline font-bold text-lg tracking-tight uppercase text-[#800000]">
                Hi AQLI
              </div>
              <div className="flex items-center gap-3">
                {user && (
                  <Link href="/leaderboard" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 shadow-sm hover:bg-amber-100 transition-colors group">
                    <Trophy className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]/20" />
                    <span className="text-[11px] font-black text-amber-800 tracking-tight">
                      {points.toLocaleString()}
                    </span>
                    <Zap className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37] animate-pulse" />
                  </Link>
                )}
                {!isUserLoading && (
                  user ? (
                    <Link href="/profile">
                      <Avatar className="h-8 w-8 border-2 border-[#800000]/20">
                        <AvatarImage src={user.user_metadata?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/5 text-[#800000] text-xs font-bold uppercase">
                          {user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Button asChild size="sm" variant="ghost" className="text-[#800000] font-bold">
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
      {/* BottomNav: user biasa di semua device, admin hanya di mobile & tablet */}
      {showBottomNav ? (
        <BottomNav />
      ) : (
        <div className="lg:hidden"><BottomNav /></div>
      )}
      <Toaster />
    </SidebarProvider>
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
        <meta name="description" content="Pendamping Anda menuju keunggulan Al-Qur'an." />
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
