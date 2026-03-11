
"use client";

import './globals.css';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/bottom-nav';
import { FirebaseClientProvider, useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const adminDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "roles_admin", user.uid);
  }, [db, user?.uid]);

  const superAdminDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "roles_superadmin", user.uid);
  }, [db, user?.uid]);

  const { data: isAdminDoc } = useDoc(adminDocRef);
  const { data: isSuperAdminDoc } = useDoc(superAdminDocRef);

  // Deteksi admin gabungan (Email + Database)
  const isSpecialAdmin = user?.email === "dewifebriani@gmail.com";
  const hasAdminAccess = isSpecialAdmin || !!isAdminDoc || !!isSuperAdminDoc;

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
               <div className="flex items-center gap-2">
                 {!isUserLoading && (
                   user ? (
                     <Link href="/profile">
                        <Avatar className="h-8 w-8 border-2 border-[#800000]/20">
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback className="bg-primary/5 text-[#800000] text-xs font-bold uppercase">
                            {user.displayName?.[0] || user.email?.[0] || 'U'}
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
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background')}>
        <FirebaseClientProvider>
          <LayoutContent>{children}</LayoutContent>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
