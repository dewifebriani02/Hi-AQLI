
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Supabase client-side auth automatically handles the hash/fragment 
      // when initialized or when it detects it in the URL.
      // We just need to wait a brief moment for the session to be established.
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        router.replace('/');
      } else {
        // If no session is found after a short delay, go to login
        const timer = setTimeout(() => {
          router.replace('/login');
        }, 2000);
        return () => clearTimeout(timer);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <div className="p-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border-none text-center space-y-6 animate-in zoom-in duration-500">
        <div className="h-2 w-full bg-gradient-to-r from-[#800000] via-[#D4AF37] to-[#800000] rounded-full absolute top-0 left-0" />
        <div className="mx-auto w-16 h-16 rounded-full bg-[#800000]/5 flex items-center justify-center border-4 border-[#800000]/10">
          <Loader2 className="w-8 h-8 text-[#800000] animate-spin" />
        </div>
        <div className="space-y-2">
            <h1 className="text-xl font-black font-headline uppercase tracking-tight text-[#800000]">Memproses Masuk...</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Alhamdulillah, sebentar lagi Ukhti masuk.</p>
        </div>
      </div>
    </div>
  );
}
