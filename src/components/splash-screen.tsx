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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="relative w-full h-full max-w-md mx-auto aspect-square animate-fade-in">
        <Image
          src="/app-splash.jpg"
          alt="Hi AQLI Splash"
          fill
          className="object-contain"
          priority
        />
      </div>

      <style jsx>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
