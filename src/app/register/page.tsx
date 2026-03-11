
'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore, useUser, initiateEmailSignUp, initiateGoogleSignIn } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Mail, Lock, User } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function RegisterPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Sync profile data once user is created.
      const syncProfile = async () => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // New user profile
          if (user.displayName !== username && username) {
            await updateProfile(user, { displayName: username }).catch(() => {});
          }
          
          setDocumentNonBlocking(userRef, {
            id: user.uid,
            username: username || user.displayName || user.email?.split('@')[0],
            email: user.email,
            roleId: 'learner',
            points: 0,
            followedHalaqahs: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        router.push('/');
      };
      
      syncProfile();
    }
  }, [user, router, username, db]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    initiateEmailSignUp(auth, email, password);

    setTimeout(() => {
      if (!user) {
        setLoading(false);
        setError('Gagal mendaftarkan akun. Silakan periksa kembali data Anda.');
      }
    }, 5000);
  };

  const handleGoogleRegister = () => {
    setGoogleLoading(true);
    setError(null);
    initiateGoogleSignIn(auth);
    
    setTimeout(() => {
      if (!user) setGoogleLoading(false);
    }, 5000);
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-[85vh] px-4 py-8">
      <div className="mb-8 scale-125">
        <Logo />
      </div>

      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
        <div className="h-2 bg-gradient-to-r from-[#800000] via-[#D4AF37] to-[#800000]" />
        <CardHeader className="space-y-1 text-center pt-8">
          <CardTitle className="text-2xl font-black font-headline uppercase tracking-tight text-[#800000]">Daftar Akun Baru</CardTitle>
          <CardDescription className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Bergabunglah dalam Ekosistem Qur'ani</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {error && (
            <Alert variant="destructive" className="animate-in fade-in zoom-in duration-300">
              <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Nama Pengguna</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="Contoh: hamba_allah"
                  className="pl-10 h-12 border-2 rounded-xl focus-visible:ring-[#800000]"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  className="pl-10 h-12 border-2 rounded-xl focus-visible:ring-[#800000]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Kata Sandi</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  className="pl-10 h-12 border-2 rounded-xl focus-visible:ring-[#800000]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-14 rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest"
              disabled={loading || googleLoading}
            >
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <><UserPlus className="mr-2 h-5 w-5" /> Daftar Sekarang</>}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-dashed" />
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-white px-4 text-muted-foreground">Atau Gunakan</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-14 rounded-xl border-2 hover:bg-muted font-bold transition-all active:scale-[0.98]"
            onClick={handleGoogleRegister}
            disabled={loading || googleLoading}
          >
            {googleLoading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : (
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c1.68-1.55 2.64-3.84 2.64-6.59z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google Account
              </div>
            )}
          </Button>
        </CardContent>
        <CardFooter className="bg-muted/30 py-6 border-t">
          <p className="text-center text-sm text-muted-foreground w-full">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-[#800000] font-black hover:underline uppercase text-xs tracking-wider">
              Masuk ke Akun
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
