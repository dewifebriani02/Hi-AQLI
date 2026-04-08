
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const next = params.get('next') || '/';

      console.log('AUTH_CALLBACK: Starting exchange process', { hasCode: !!code, next });

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('AUTH_CALLBACK: Exchange error:', exchangeError);
          router.replace(`/login?error=${encodeURIComponent('Gagal menukar kode otentikasi: ' + exchangeError.message)}`);
          return;
        }
      }

      // Small delay to let browser settle cookies in some environments
      await new Promise(res => setTimeout(res, 300));

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('AUTH_CALLBACK: No session found:', sessionError);
        // Try one more time before giving up
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (!retrySession) {
          router.replace('/login?error=Sesi tidak ditemukan (Pastikan Ukhti menggunakan hiaqli.pro tanpa www)');
          return;
        }
      }

      // Auto-sync profile for OAuth users
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      const user = currentSession?.user;
      
      if (user) {
        try {
          // Profile check logic remained the same but safer
          const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();

          if (!profile) {
            console.log('AUTH_CALLBACK: Profile missing, creating default...');
            await supabase.from('users').upsert({
              id: user.id,
              username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hamba Allah',
              email: user.email,
              role_id: 'learner',
              points: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          }
        } catch (err) {
          console.error('AUTH_CALLBACK: Unexpected error in profile sync:', err);
        }
      }
      
      router.replace(next);
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
