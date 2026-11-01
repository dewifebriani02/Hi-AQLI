'use client';

import { useState, useEffect } from 'react';
import { db, authFetch } from '@/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.session?.user) {
            setHasSession(true);
            setHasPassword(Boolean(json.data.session.user.has_password));
            return;
          }
        }
        const { data: { session } } = await db.auth.getSession();
        if (session?.user) {
          setHasSession(true);
          setHasPassword(Boolean(session.user.has_password));
        } else {
          setHasSession(false);
          setError('Sesi tidak ditemukan atau tautan pemulihan telah kedaluwarsa. Silakan masuk terlebih dahulu.');
        }
      } catch {
        setHasSession(false);
        setError('Tautan pemulihan tidak valid atau telah kedaluwarsa.');
      }
    };
    checkSession();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSession) {
      setError('Silakan masuk terlebih dahulu untuk mengatur kata sandi.');
      return;
    }
    if (hasPassword && !currentPassword) {
      setError('Kata sandi saat ini wajib diisi.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Kata sandi baru tidak cocok.');
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: updateErr } = await db.auth.updateUser({
        password,
        current_password: hasPassword ? currentPassword : undefined,
      });
      if (updateErr) throw updateErr;

      toast({
        title: 'Berhasil!',
        description: 'Kata sandi Ukhti telah diperbarui.',
      });

      router.push('/profile');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh] px-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Lock className="w-6 h-6 text-[#800000]" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">
            {hasPassword ? 'Ubah Kata Sandi' : 'Atur Kata Sandi'}
          </CardTitle>
          <CardDescription>
            {hasPassword
              ? 'Masukkan kata sandi saat ini dan kata sandi baru Ukhti.'
              : 'Buat kata sandi baru untuk akun Ukhti.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdate}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Kata Sandi Saat Ini</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={hasSession === false}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi Baru</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={hasSession === false}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={hasSession === false}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold"
              disabled={loading || hasSession === false}
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : 'Perbarui Kata Sandi'}
            </Button>
            {hasSession === false && (
              <Button asChild variant="outline" className="w-full font-bold">
                <Link href="/login">Kembali ke Halaman Login</Link>
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
