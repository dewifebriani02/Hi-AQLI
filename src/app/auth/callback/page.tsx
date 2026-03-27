
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

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('Error exchanging code for session:', exchangeError);
          router.replace(`/login?error=${encodeURIComponent('Gagal menukar kode otentikasi: ' + exchangeError.message)}`);
          return;
        }
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No session found after callback:', sessionError);
        router.replace('/login?error=Sesi tidak ditemukan');
        return;
      }

      // Auto-sync profile for OAuth users
      const user = session.user;
      try {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }

        if (!profile) {
          // Create missing profile
          const { error: insertError } = await supabase.from('users').insert({
            id: user.id,
            username: user.user_metadata?.full_name || user.email?.split('@')[0],
            email: user.email,
            roleId: 'learner',
            points: 0,
            followedHalaqahs: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (insertError) {
            console.error('Error creating profile in callback:', insertError);
            // We don't block the user if profile creation fails, 
            // but log it for debugging
          }
        }
      } catch (err) {
        console.error('Unexpected error in profile sync:', err);
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
