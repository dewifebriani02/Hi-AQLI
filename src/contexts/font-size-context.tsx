"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

interface FontSizeContextType {
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

const FontSizeContext = createContext<FontSizeContextType>({
  fontSize: 18,
  setFontSize: () => {},
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
});

export const FONT_SIZE_STORAGE_KEY = 'hiaqli_global_font_size';

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<number>(18);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 60) {
          setFontSizeState(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load font size from localStorage', e);
    }
  }, []);

  const setFontSize: React.Dispatch<React.SetStateAction<number>> = (action) => {
    setFontSizeState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      const clamped = Math.max(12, Math.min(60, next));
      try {
        localStorage.setItem(FONT_SIZE_STORAGE_KEY, clamped.toString());
      } catch (e) {
        console.error('Failed to save font size', e);
      }
      return clamped;
    });
  };

  const increaseFontSize = () => {
    setFontSize((f) => Math.min(60, f + 2));
  };

  const decreaseFontSize = () => {
    setFontSize((f) => Math.max(12, f - 2));
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize, increaseFontSize, decreaseFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
