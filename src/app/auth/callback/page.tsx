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

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get('code');
      const next = searchParams.get('next') || '/';
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      const hostname = window.location.hostname;
      const isWww = hostname.startsWith('www.');

      console.log('AUTH_DEBUG:', {
        url: window.location.href,
        hostname,
        hasCode: !!code,
        next,
        error,
        errorDescription
      });

      try {
        if (error) {
          setErrorMessage(`Google Auth Error: ${error}`);
          setErrorDetails(errorDescription || 'No description provided');
          return;
        }

        if (code) {
          console.log('AUTH_DEBUG: Exchanging code for session...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('AUTH_DEBUG: Exchange error:', exchangeError);
            setErrorMessage(`Gagal menukar kode login: ${exchangeError.message}`);
            setErrorDetails(`Kode Error: ${exchangeError.name || 'AuthError'} ${isWww ? '(Ukhti terdeteksi menggunakan www. - ini penyebab umum gagal login)' : ''}`);
            return;
          }
        } else {
            console.warn('AUTH_DEBUG: No code found in search params.');
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('AUTH_DEBUG: Session not found after exchange or init');
          // If we had a code but still no session, it's a real failure
          if (code) {
            setErrorMessage('Sesi tidak ditemukan setelah penukaran kode.');
            setErrorDetails('Kemungkinan penyebab: Cookies browser terblokir atau domain mismatch antara login dan callback.');
            return;
          }
          // If no code and no session, maybe they are already logged in?
          // Let's check onAuthStateChange state from the provider via getSession again or just wait
        }

        if (session) {
          console.log('AUTH_DEBUG: Session found, sync profile...');
          const user = session.user;
          const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();

          if (!profile) {
            await supabase.from('users').upsert({
              id: user.id,
              username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hamba Allah',
              email: user.email,
              role_id: 'learner',
              points: 0,
              created_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          }
          
          console.log('AUTH_DEBUG: Success, redirecting to:', next);
          router.replace(next);
        } else {
            // Fallback for no code and no session landing
            setErrorMessage('Sesi tidak ditemukan. Silakan masuk kembali.');
            setErrorDetails('Jika Ukhti baru saja login, pastikan Ukhti tidak menggunakan www.hiaqli.pro');
        }
      } catch (err: any) {
        console.error('AUTH_DEBUG: System error:', err);
        setErrorMessage(`Terjadi kesalahan sistem: ${err.message || 'Unknown Error'}`);
        setErrorDetails(err.stack || 'No stack trace available');
      }
    };

    handleAuthCallback();
  }, [searchParams, router]);

  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center space-y-6">
        <div className="p-8 bg-white rounded-3xl shadow-2xl border-t-4 border-red-500 max-w-md w-full space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-red-600">Ops! Ada Masalah</h1>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-800 font-bold bg-red-50 p-4 rounded-xl border border-red-100">
              {errorMessage}
            </p>
            {errorDetails && (
              <p className="text-[10px] text-gray-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100 break-words">
                {errorDetails}
              </p>
            )}
          </div>

          <div className="pt-4 flex flex-col space-y-2 text-left bg-amber-50 p-4 rounded-xl border border-amber-100">
             <h2 className="text-[10px] font-black uppercase text-amber-700 mb-1">Coba Langkah Ini:</h2>
             <ul className="text-[10px] text-amber-800 font-medium list-disc list-inside space-y-1">
                <li>Gunakan alamat <b>hiaqli.pro</b> (tanpa <b>www</b>)</li>
                <li>Bersihkan Cookies browser untuk domain ini</li>
                <li>Gunakan mode Incognito/Privacy browser</li>
             </ul>
          </div>

          <div className="pt-4 flex flex-col space-y-2">
            <Button onClick={() => window.location.href = 'https://hiaqli.pro/login'} className="bg-[#800000] hover:bg-[#800000]/90 font-black uppercase text-xs h-12 rounded-xl text-white">
              Gunakan Alamat Resmi (hiaqli.pro)
            </Button>
            <Button variant="ghost" onClick={() => router.push('/login')} className="text-gray-500 text-[10px] font-bold uppercase">
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <div className="p-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border-none text-center space-y-6">
        <Loader2 className="w-12 h-12 text-[#800000] animate-spin mx-auto" />
        <div className="space-y-2">
            <h1 className="text-xl font-black uppercase tracking-tight text-[#800000]">Memproses Masuk...</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest italic">Mohon tunggu sebentar ya Ukhti.</p>
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
