
'use client';

import { useState, useEffect } from 'react';
import { useUser, initiateEmailSignIn, initiateGoogleSignIn } from '@/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, LogIn, Mail, Lock, Eye, EyeOff, Zap as ZapIcon } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { Suspense } from 'react';
import { validateEmail } from '@/lib/utils';

function LoginContent() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const referralCode = searchParams.get('ref');
  
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorMsg = searchParams.get('error');
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
    }

    if (user && !loading) {
      router.push(redirectTo);
    }
  }, [user, loading, redirectTo, searchParams, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!validateEmail(cleanEmail)) {
      setLoading(false);
      setError('Format email tidak valid. Silakan periksa kembali.');
      return;
    }

    const { error: signInError } = await initiateEmailSignIn(cleanEmail, password);

    if (signInError) {
      setLoading(false);
      if (signInError.message.toLowerCase().includes('email not confirmed')) {
        setError('Email Ukhti belum diverifikasi. Mohon cek inbox (atau spam) email Ukhti untuk klik link aktivasi.');
      } else if (signInError.message.toLowerCase().includes('invalid login credentials')) {
        setError('Email atau kata sandi salah. Mohon periksa kembali.');
      } else {
        setError(signInError.message || 'Gagal masuk. Mohon coba lagi.');
      }
    } else {
      // Login successful - auth state change will trigger redirect
      toast({
        title: "Selamat Datang!",
        description: "Masyallah, Ukhti telah masuk ke Hi AQLI.",
      });
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await initiateGoogleSignIn(redirectTo);

    if (error) {
      setGoogleLoading(false);
      setError('Gagal masuk dengan Google.');
      toast({
        variant: "destructive",
        title: "Gagal Masuk",
        description: "Terjadi kesalahan saat mencoba masuk dengan Google.",
      });
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-[85vh] px-4 py-8">

      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
        <div className="h-2 bg-gradient-to-r from-[#800000] via-[#D4AF37] to-[#800000]" />
        <CardHeader className="space-y-4 text-center pt-10 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black font-headline uppercase tracking-tight text-[#800000] italic">Ahlan wa Sahlan</CardTitle>
            <CardDescription className="text-muted-foreground font-medium text-[11px] tracking-tight italic">Berhijrah dengan Ilmu, Beramal dengan Itqan.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {error && (
            <Alert variant="destructive" className="animate-in fade-in zoom-in duration-300">
              <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
            </Alert>
          )}

          {referralCode && (
            <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 animate-in slide-in-from-top-2 duration-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg text-white">
                  <ZapIcon className="w-4 h-4 fill-current" />
                </div>
                <AlertDescription className="text-[10px] font-black uppercase tracking-wider leading-tight">
                  Kode Referal <span className="text-emerald-600 underline">{referralCode}</span> Aktif. <br/>
                  <span className="opacity-70">Masuk untuk melanjutkan pendaftaran program Ukhti.</span>
                </AlertDescription>
              </div>
            </Alert>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full h-14 rounded-xl border-2 hover:bg-muted font-bold transition-all active:scale-[0.98]"
            onClick={handleGoogleLogin}
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-dashed" />
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-white px-4 text-muted-foreground">Atau Masuk Dengan</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Alamat Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  className="pl-10 h-12 border-2 rounded-xl focus-visible:ring-[#800000]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Kata Sandi</Label>
                <Link
                  href="/forgot-password"
                  className="text-[10px] text-[#D4AF37] hover:underline font-black uppercase tracking-widest"
                >
                  Lupa?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pl-10 pr-10 h-12 border-2 rounded-xl focus-visible:ring-[#800000]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-[#800000] focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-14 rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest"
              disabled={loading || googleLoading}
            >
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <><LogIn className="mr-2 h-5 w-5" /> Masuk Sekarang</>}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-muted/30 py-6 border-t">
          <p className="text-center text-sm text-muted-foreground w-full">
            Belum punya akun?{' '}
            <Link 
              href={`/register?redirectTo=${encodeURIComponent(redirectTo)}${referralCode ? `&ref=${referralCode}` : ''}`} 
              className="text-[#800000] font-black hover:underline uppercase text-xs tracking-wider"
            >
              Daftar Sekarang
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center min-h-[85vh] px-4 py-8">
        <Loader2 className="animate-spin h-8 w-8 text-[#800000]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
