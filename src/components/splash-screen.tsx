"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Logo } from './logo';

interface SplashScreenProps {
  show?: boolean;
  onComplete?: () => void;
  minDisplayTime?: number; // milliseconds
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  show = false,
  onComplete,
  minDisplayTime = 2000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (!show) {
      setShouldRender(false);
      return;
    }

    setShouldRender(true);
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setShouldRender(false);
        onComplete?.();
      }, 500); // Wait for fade out animation
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [show, minDisplayTime, onComplete]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#800000] via-[#a32828] to-[#600000] transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#D4AF37]/5 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#D4AF37]/10 blur-3xl"></div>
      </div>

      {/* Logo container */}
      <div className="relative z-10 flex flex-col items-center justify-center animate-scale-in">
        {/* Logo Image */}
        <div className="relative w-48 h-48 mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-transparent blur-xl"></div>
          <Image
            src="/app-logo.png"
            alt="Hi AQLI Logo"
            fill
            className="object-contain relative z-10 drop-shadow-2xl"
            priority
          />
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-lg">
            HI AQLI
          </h1>
          <p className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">
            Berhijrah dengan Ilmu, Beramal dengan Itqan
          </p>
        </div>

        {/* Loading indicator */}
        <div className="mt-8 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse delay-100"></div>
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse delay-200"></div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-1">
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-[#D4AF37]/50"></div>
          <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
          <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-[#D4AF37]/50"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.6s ease-out forwards;
        }
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  );
};
