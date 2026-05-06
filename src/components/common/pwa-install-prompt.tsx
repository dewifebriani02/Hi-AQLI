
'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/supabase';
import { 
  Smartphone, 
  X, 
  Download, 
  Share, 
  PlusSquare, 
  Info,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface PWAInstallPromptProps {
  deferredPrompt: any;
  onInstall: () => void;
}

export function PWAInstallPrompt({ deferredPrompt, onInstall }: PWAInstallPromptProps) {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');

  useEffect(() => {
    // Detect platform
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    
    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');

    // Check if already in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    // Check localStorage
    const hasDismissed = localStorage.getItem('hide_pwa_prompt') === 'true';

    // Show after 2 seconds delay if user is logged in and not installed and not dismissed
    if (user && !isStandalone && !hasDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem('hide_pwa_prompt', 'true');
    }
    setIsVisible(false);
  };

  const handleInstallClick = () => {
    onInstall();
    // We don't hide yet, wait for outcome in layout
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-500">
        <div className="relative p-6">
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center animate-bounce">
              <Smartphone className="w-8 h-8 text-emerald-600" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Pasang Aplikasi Hi AQLI</h3>
              <p className="text-sm text-slate-500 font-medium">
                Akses lebih cepat & stabil langsung dari layar utama HP Ukhti.
              </p>
            </div>

            <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Info className="w-3.5 h-3.5" /> Panduan Instalasi
              </div>
              
              {platform === 'ios' ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white rounded-full shadow-sm flex items-center justify-center flex-shrink-0 text-[10px] font-black text-emerald-600 border border-emerald-100">1</div>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">
                      Klik ikon <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 mx-1"><Share className="w-3 h-3" /> Bagikan (Share)</span> di bagian bawah browser Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white rounded-full shadow-sm flex items-center justify-center flex-shrink-0 text-[10px] font-black text-emerald-600 border border-emerald-100">2</div>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">
                      Gulir ke bawah dan pilih <span className="font-black text-emerald-700 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5" /> Tambah ke Layar Utama</span> (Add to Home Screen).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    Klik tombol di bawah ini, lalu pilih <span className="text-emerald-700 font-black">"Install"</span> atau <span className="text-emerald-700 font-black">"Tambah"</span> saat konfirmasi muncul.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2.5 items-start">
                    <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium text-amber-800 leading-tight">
                      <span className="font-black uppercase block mb-0.5 text-amber-900">Catatan Penting:</span>
                      Jika muncul peringatan Google Play Protect (Aplikasi diblokir), klik tulisan <span className="font-black underline italic">"Tetap instal"</span> (teks kecil di atas tombol Oke). Aplikasi ini berbasis web yang aman & resmi dari AQLI.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full space-y-3 pt-2">
              {platform !== 'ios' && deferredPrompt && (
                <Button 
                  onClick={handleInstallClick}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 rounded-2xl shadow-lg shadow-emerald-200 uppercase tracking-wider text-xs gap-2"
                >
                  <Download className="w-5 h-5" /> PASANG SEKARANG
                </Button>
              )}
              
              <Button 
                variant="ghost"
                onClick={handleDismiss}
                className="w-full text-slate-400 font-black h-12 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
              >
                {platform === 'ios' ? "SUDAH MENGERTI" : "NANTI SAJA"}
              </Button>

              <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-50 w-full">
                <Checkbox 
                  id="dont-show" 
                  checked={dontShowAgain}
                  onCheckedChange={(checked) => setDontShowAgain(!!checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label 
                  htmlFor="dont-show" 
                  className="text-[10px] font-bold text-slate-400 cursor-pointer select-none"
                >
                  Jangan tampilkan informasi ini lagi
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-emerald-600 p-3 flex items-center justify-center gap-2">
           <CheckCircle2 className="w-3.5 h-3.5 text-white/80" />
           <span className="text-[9px] font-black text-white uppercase tracking-widest">Aman & Mudah untuk Seluruh Thalibah</span>
        </div>
      </div>
    </div>
  );
}
