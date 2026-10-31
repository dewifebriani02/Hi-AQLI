'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get('next') || searchParams.get('redirectTo') || '/';
    const token = searchParams.get('token');

    const handleCallback = async () => {
      if (token) {
        try {
          localStorage.setItem('hiaqli_token', token);
          // Fetch current session from server to initialize client storage
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
          if (res.ok) {
            const json = await res.json();
            if (json.data?.session) {
              localStorage.setItem('hiaqli_session', JSON.stringify(json.data.session));
            }
          }
        } catch (e) {
          console.error('Error saving session in auth callback:', e);
        }
      }
      router.replace(next);
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#FAF9F5]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#800000]" />
        <p className="text-sm font-medium text-slate-600">Mengalihkan sesi...</p>
      </div>
    </div>
  );
}
