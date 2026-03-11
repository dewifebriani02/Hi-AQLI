
"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  textClassName?: string;
}

export const Logo = ({ className, textClassName }: LogoProps) => (
  <div className={cn("flex items-center gap-3", className)}>
    <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-600 shadow-inner">
      <svg
        viewBox="0 0 100 100"
        className="w-7 h-7 text-white drop-shadow-sm"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Simplified Arabic Calligraphy style */}
        <path d="M50 20C40 20 30 30 30 50C30 70 40 80 50 80C60 80 70 70 70 50C70 30 60 20 50 20ZM50 70C45 70 40 65 40 50C40 35 45 30 50 30C55 30 60 35 60 50C60 65 55 70 50 70Z" />
        <circle cx="55" cy="40" r="5" />
        <circle cx="65" cy="45" r="5" />
        <path d="M35 30C30 40 30 60 35 70" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    </div>
    <span className={cn("font-headline text-2xl font-black tracking-tight text-[#800000]", textClassName)}>
      HI AQLI
    </span>
  </div>
);
