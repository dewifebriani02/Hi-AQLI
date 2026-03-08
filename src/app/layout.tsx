
"use client";

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/bottom-nav';
import { FirebaseClientProvider, useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import React from 'react';

// Note: Metadata cannot be exported from 'use client' components. 
// For PWA and Title purposes, we keep them in head tags or a separate layout-metadata.ts if needed.

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const db = useFirestore();

  const adminDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "roles_admin", user.uid);
  }, [db, user]);

  const superAdminDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "roles_superadmin", user.uid);
  }, [db, user]);

  const { data: isAdmin } = useDoc(adminDocRef);
  const { data: isSuperAdmin } = useDoc(superAdminDocRef);

  const hasAdminAccess = !!isAdmin || !!isSuperAdmin;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="relative flex min-h-screen w-full">
        {hasAdminAccess && <AppSidebar />}
        <SidebarInset className="w-full flex flex-col">
           <div className="flex flex-col flex-1 w-full pb-20 md:pb-0">
            <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4">
               {hasAdminAccess && <SidebarTrigger className="md:hidden" />}
               <div className="flex-1 text-center font-headline font-bold text-lg tracking-tight uppercase text-[#800000]">
                 Sahabat AQLI
               </div>
               <div className="w-8" />
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
        <title>Sahabat AQLI</title>
        <meta name="description" content="Pendamping Anda menuju keunggulan Al-Qur'an." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background')}>
        <FirebaseClientProvider>
          <LayoutContent>{children}</LayoutContent>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
