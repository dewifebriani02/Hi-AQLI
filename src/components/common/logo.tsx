"use client";

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  textClassName?: string;
  showText?: boolean;
  imageSize?: number;
  variant?: 'default' | 'gold';
  whiteText?: boolean;
}

export const Logo = ({ 
  className, 
  textClassName, 
  showText = true, 
  imageSize = 40,
  variant = 'default',
  whiteText = false
}: LogoProps) => (
  <div className={cn("flex items-center gap-2 sm:gap-3 shrink-0", className)}>
    <div className="relative flex items-center justify-center shrink-0" style={{ width: imageSize, height: imageSize }}>
      <Image
        src={variant === 'gold' ? "/app-logo-gold.png" : "/app-logo.png"}
        alt="AQLI Logo"
        width={imageSize}
        height={imageSize}
        className="object-contain"
        priority
      />
    </div>
    {showText && (
      <span className={cn(
        "font-headline font-black tracking-tight leading-none select-none whitespace-nowrap mt-0.5",
        whiteText ? "text-white" : (variant === 'gold' ? "text-[#D4AF37]" : "text-[#800000]"),
        textClassName
      )}>
        Hi AQLI
      </span>
    )}
  </div>
);
