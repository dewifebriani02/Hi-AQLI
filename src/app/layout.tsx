import type { Metadata } from 'next';
import './globals.css';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/bottom-nav';

export const metadata: Metadata = {
  title: 'AQLI Al-Qur\'an',
  description: 'Pendamping Anda menuju keunggulan Al-Qur\'an.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background')}>
        <SidebarProvider>
          <div className="relative flex min-h-screen w-full">
            <AppSidebar />
            <SidebarInset className="w-full flex flex-col">
               <div className="flex flex-col flex-1 w-full pb-20 md:pb-0">
                <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 md:hidden">
                   <SidebarTrigger />
                   <div className="flex-1 text-center font-headline font-bold text-lg tracking-tight">
                     AQLI AL-QUR'AN
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
      </body>
    </html>
  );
}
