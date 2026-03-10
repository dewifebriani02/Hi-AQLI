'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore, useUser, initiateEmailSignUp } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Sync profile data once user is created.
      // Note: updateProfile is also non-blocking in terms of UI flow here.
      if (user.displayName !== username) {
        updateProfile(user, { displayName: username }).catch(() => {});
        
        const userRef = doc(db, 'users', user.uid);
        setDocumentNonBlocking(userRef, {
          id: user.uid,
          username: username,
          email: email,
          roleId: 'learner',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      router.push('/');
    }
  }, [user, router, username, email, db]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Non-blocking sign up call.
    initiateEmailSignUp(auth, email, password);

    // Timeout to reset loading state if registration doesn't complete quickly.
    setTimeout(() => {
      setLoading(false);
      if (!user) {
        setError('Gagal mendaftarkan akun. Silakan periksa kembali data Anda.');
      }
    }, 5000);
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <UserPlus className="w-6 h-6 text-[#800000]" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">Daftar Akun Baru</CardTitle>
          <CardDescription>Bergabunglah dengan komunitas Sahabat AQLI</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Nama Pengguna</Label>
              <Input
                id="username"
                placeholder="Contoh: hamba_allah"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : 'Daftar Sekarang'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-[#800000] font-bold hover:underline">
                Masuk ke Akun
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}