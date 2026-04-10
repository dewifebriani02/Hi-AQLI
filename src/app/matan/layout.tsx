'use client';

import { Inter } from 'next/font/google';
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'] });

export default function MatanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      "min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-[#800000]/10 selection:text-[#800000]",
      inter.className
    )}>
      {/* Subtle Premium Texture/Glow - Maroon & Gold */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[60%] h-[40%] bg-[#800000]/5 blur-[120px] rounded-full opacity-60" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[30%] bg-[#D4AF37]/5 blur-[100px] rounded-full opacity-40" />
      </div>

      <main className="relative z-10">
        {children}
      </main>

      {/* Decorative Border Glow - Branding Consistent */}
      <div className="fixed inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#800000]/10 to-transparent z-50" />
    </div>
  );
}
