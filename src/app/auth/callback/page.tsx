'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/supabase';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
 
  const clearSessionAndRetry = async () => {
    setIsClearing(true);
    try {
        console.log('AUTH_DEBUG: Force clearing all Supabase storage...');
        // Clear all possible storage
        if (typeof window !== 'undefined') {
            window.localStorage.clear();
            window.sessionStorage.clear();
            // Clear supabase cookies if possible (client-side)
            document.cookie.split(";").forEach((c) => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
        }
        await supabase.auth.signOut();
        window.location.href = 'https://hiaqli.pro/login';
    } catch (e) {
        console.error('Error clearing session:', e);
        window.location.reload();
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get('code');
      const next = searchParams.get('next') || '/';
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      const hostname = window.location.hostname;
      const isWww = hostname.startsWith('www.');
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const hasAccessToken = hash.includes('access_token=');

      console.log('AUTH_DEBUG [START]:', {
        url: window.location.href,
        hostname,
        hasCode: !!code,
        hasHashToken: hasAccessToken,
        next
      });

      try {
        if (error) {
          setErrorMessage(`Google Auth Error: ${error}`);
          setErrorDetails(errorDescription || 'No description provided');
          return;
        }

        // 1. PKCE: Exchange code
        if (code) {
          console.log('AUTH_DEBUG: PKCE Flow detected. Exchanging code...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('AUTH_DEBUG: Exchange error:', exchangeError);
            setErrorMessage(`Gagal menukar kode login (PKCE Error)`);
            setErrorDetails(`Detail: ${exchangeError.message}. ${isWww ? '(Ukhti menggunakan www. - silakan hapus www-nya)' : ''}`);
            return;
          }
        }

        // 2. CAPTURE SESSION (Implicit or After PKCE Exchange)
        console.log('AUTH_DEBUG: Capturing session...');
        
        let session = null;
        
        // Strategy A: Immediate check
        const { data: { session: initialSession }, error: sErr } = await supabase.auth.getSession();
        if (initialSession) {
            session = initialSession;
            console.log('AUTH_DEBUG: Session found immediately');
        } else {
            if (sErr) console.warn('AUTH_DEBUG: Initial getSession error:', sErr);
            
            // Strategy B: Wait for parse (up to 3 seconds)
            console.log('AUTH_DEBUG: Waiting for Supabase to parse URL/Cookies...');
            for (let i = 0; i < 6; i++) {
                await new Promise(r => setTimeout(r, 500));
                const { data: { session: retrySession } } = await supabase.auth.getSession();
                if (retrySession) {
                    session = retrySession;
                    console.log(`AUTH_DEBUG: Session found after ${i+1} retries`);
                    break;
                }
            }
        }

        if (!session && (code || hasAccessToken)) {
          console.error('AUTH_DEBUG: Critical! Fragment/Code exists but no session resolved. Check 401 logs.');
          setErrorMessage('Masalah Otentikasi (Error 401)');
          setErrorDetails('Supabase menolak token Anda. Kemungkinan penyebab: Cache/Cookies dari project lama masih tertanam di browser ini.');
          return;
        }

        if (session) {
          console.log('AUTH_DEBUG: Auth successful. Syncing user profile...');
          const user = session.user;
          
          // User profile check & sync
          const { data: profile, error: pErr } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();

          if (!profile && !pErr) {
            console.log('AUTH_DEBUG: Profile missing, creating new one...');
            await supabase.from('users').upsert({
              id: user.id,
              username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hamba Allah',
              email: user.email,
              role_id: 'learner',
              points: 0,
              created_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          }
          
          // Final Redirect
          console.log('AUTH_DEBUG: Redirecting to:', next);
          if (window.history.replaceState) {
            window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
          }
          router.replace(next);
        } else {
            // Landing here means no session was found AND no code/hash was present
            console.warn('AUTH_DEBUG: Landing on callback without any auth markers.');
            setErrorMessage('Sesi Masuk Berakhir');
            setErrorDetails('Ukhti tidak memiliki token aktif. Silakan login kembali.');
        }
      } catch (err: any) {
        console.error('AUTH_DEBUG: Global Exception:', err);
        setErrorMessage(`Kesalahan Sistem`);
        setErrorDetails(err.message || 'Unknown system error');
      }
    };

    handleAuthCallback();
  }, [searchParams, router]);

  if (errorMessage) {
    const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not defined';
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'Not defined';
    const diagnosticInfo = `
URL: ${envUrl.substring(0, 30)}...
Key: ${envKey.substring(0, 15)}...${envKey.substring(envKey.length - 10)}
    `.trim();

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center space-y-6">
        <div className="p-8 bg-white rounded-3xl shadow-2xl border-t-8 border-red-500 max-w-md w-full space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" strokeWidth={3} />
          <div className="space-y-1">
             <h1 className="text-2xl font-black text-red-600 uppercase tracking-tight">Login Gagal</h1>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Diagnostic Error 401 / Project Conflict</p>
          </div>
          
          <div className="p-5 bg-red-50 rounded-2xl border border-red-100 text-left">
            <p className="text-sm text-red-800 font-bold mb-1">
              {errorMessage}
            </p>
            <p className="text-[10px] text-red-600 font-medium leading-relaxed">
              {errorDetails}
            </p>
          </div>

          <div className="pt-2 flex flex-col space-y-3">
             <Button 
               onClick={clearSessionAndRetry} 
               disabled={isClearing}
               className="bg-[#800000] hover:bg-black text-white font-black py-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
             >
               {isClearing ? <Loader2 className="w-5 h-5 animate-spin" /> : "BERSIHKAN CACHE & COBA LAGI"}
             </Button>

             <Button 
               variant="outline"
               onClick={() => setShowDiagnostics(!showDiagnostics)} 
               className="text-[10px] text-slate-500 font-black border-slate-200 uppercase tracking-widest h-10 rounded-xl"
             >
               {showDiagnostics ? "HILANGKAN DIAGNOSA" : "LIHAT DIAGNOSA ENV"}
             </Button>
          </div>

          {showDiagnostics && (
             <div className="mt-4 p-4 bg-slate-900 rounded-xl text-left font-mono text-[9px] text-emerald-400 overflow-hidden border-2 border-slate-700 shadow-inner">
                <p className="text-slate-500 mb-1 font-bold border-b border-slate-800 pb-1 uppercase tracking-tighter">System Diagnostic (Encrypted View)</p>
                <p className="whitespace-pre-wrap leading-tight">{diagnosticInfo}</p>
                <div className="mt-2 text-slate-500 italic">
                    *Pastikan KEY ini cocok dengan project: lhqbqzrghdbbmstnhple
                </div>
             </div>
          )}

          <div className="pt-4 text-[10px] text-slate-400 font-medium">
             Ukhti juga bisa mencoba login lewat <b>Google Incognito</b> agar lebih bersih.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] space-y-8 animate-in fade-in duration-1000">
      <div className="relative">
        <div className="absolute inset-0 bg-[#800000]/20 rounded-full blur-3xl animate-pulse" />
        <div className="relative p-12 bg-white/40 backdrop-blur-xl rounded-[40px] shadow-2xl border-4 border-white text-center space-y-8">
            <Loader2 className="w-16 h-16 text-[#800000] animate-spin mx-auto" strokeWidth={3} />
            <div className="space-y-3">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-[#800000] leading-none">Menautkan Ruh Hafalan...</h1>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.3em] italic opacity-60">Mohon bersabar ya Ukhti, kami sedang menyiapkan sesi aman Anda.</p>
            </div>
            <div className="h-1.5 w-48 bg-slate-200 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#800000] to-[#D4AF37] animate-progress-loading" />
            </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
       <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="w-12 h-12 text-[#800000] animate-spin" />
      </div>
    }>
      <AuthCallbackHandler />
    </Suspense>
  );
}
