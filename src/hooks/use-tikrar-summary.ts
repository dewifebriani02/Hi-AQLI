'use client';

import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '@/db/client';
import { useUser } from '@/db';
import type { TikrarSummary } from '@/lib/tikrar-server';

/** Ringkasan Tikrar (target aktif, jadwal hari ini, streak, halaman terbuka) dari /api/tikrar/schedule */
export function useTikrarSummary(refreshSignal = 0) {
  const { user, isUserLoading } = useUser();
  const [summary, setSummary] = useState<TikrarSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      // Jangan dianggap selesai selama status login belum diketahui (mencegah salah arah ke tab Target)
      if (!isUserLoading) {
        setSummary(null);
        setIsLoading(false);
      }
      return null;
    }
    try {
      const res = await authFetch('/api/tikrar/schedule');
      const json = await res.json();
      if (res.ok && json.data) {
        setSummary(json.data);
        return json.data as TikrarSummary;
      }
    } catch (e) {
      console.warn('Gagal memuat ringkasan Tikrar:', e);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [user?.id, isUserLoading]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshSignal]);

  return { summary, isLoading, refresh };
}
