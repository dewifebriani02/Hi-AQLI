
'use client';

import { useState, useEffect } from 'react';
import { useUser, initiateEmailSignUp, initiateGoogleSignIn, supabase } from '@/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Suspense } from 'react';

function RegisterContent() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Bot Protection
  const [hasMounted, setHasMounted] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [userCaptcha, setUserCaptcha] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState<{a: number, b: number, result: number} | null>(null);

  useEffect(() => {
    setHasMounted(true);
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setCaptchaChallenge({ a, b, result: a + b });
  }, []);

  useEffect(() => {
    if (user && !isUserLoading) {
      const syncProfile = async () => {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profile) {
          // Create missing profile using upsert for better resilience
          await supabase.from('users').upsert({
            id: user.id,
            username: username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hamba Allah',
            email: user.email,
            roleId: 'learner',
            points: 0,
            followedHalaqahs: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { onConflict: 'id' });
        }
        router.push(redirectTo);
      };

      syncProfile();
    }
  }, [user, router, username, isUserLoading]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Bot Check
    if (honeypot) {
      // Bot filled the hidden field
      setLoading(false);
      return; 
    }

    if (!captchaChallenge || parseInt(userCaptcha) !== captchaChallenge.result) {
      setError(`Jawaban keamanan salah. ${captchaChallenge?.a} + ${captchaChallenge?.b} = ?`);
      setLoading(false);
      return;
    }

    const { data: signUpData, error: signUpError } = await initiateEmailSignUp(email, password, {
      data: { full_name: username }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
        // Sign up success! 
        // If email confirmation is ON, Supabase return user but session is null.
        // If email confirmation is OFF, session is returned and useUser state will change.
        setLoading(false);
        if (signUpData.user) {
            toast({
              title: "Masyallah, Pendaftaran Berhasil!",
              description: "Selamat datang di Hi AQLI, Ukhti otomatis masuk.",
            });
            // Give a tiny delay for toast
            setTimeout(() => router.push(redirectTo), 100);
        } else {
            // This case is unlikely if error is null but no user
            router.push('/login');
        }
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error: googleError } = await initiateGoogleSignIn(redirectTo);
    if (googleError) {
      setError(googleError.message);
      setGoogleLoading(false);
    }
  };


  return (
    <div className="flex flex-col justify-center items-center min-h-[85vh] px-4 py-8">

      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
        <div className="h-2 bg-gradient-to-r from-[#800000] via-[#D4AF37] to-[#800000]" />
        <CardHeader className="space-y-4 text-center pt-10 pb-2">
          <div className="flex justify-center mb-2">
            <Logo variant="default" showText={true} className="scale-125 md:scale-150" textClassName="text-2xl md:text-3xl" imageSize={56} />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black font-headline uppercase tracking-tight text-[#800000]">Daftar Akun Baru</CardTitle>
            <CardDescription className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Bergabunglah dalam Ekosistem Qur'ani</CardDescription>
          </div>
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
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  className="pl-10 pr-10 h-12 border-2 rounded-xl focus-visible:ring-[#800000]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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

            {/* Bot Protection UI */}
            {hasMounted && captchaChallenge && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-[#800000] min-w-[60px]">{captchaChallenge.a} + {captchaChallenge.b} = </span>
                  <Input
                    type="number"
                    placeholder="?"
                    className="h-10 w-20 border-2 rounded-xl text-center font-bold focus-visible:ring-[#800000]"
                    value={userCaptcha}
                    onChange={(e) => setUserCaptcha(e.target.value)}
                    required
                  />
                  <span className="text-[9px] font-medium text-muted-foreground leading-tight">
                    Verifikasi keamanan: Selesaikan hitungan di atas.
                  </span>
                </div>
                
                {/* Honeypot field - Hidden from users */}
                <div className="absolute opacity-0 -z-50 pointer-events-none left-[-9999px]">
                  <Input
                    type="text"
                    name="website_url"
                    tabIndex={-1}
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center min-h-[85vh] px-4 py-8">
        <Loader2 className="animate-spin h-8 w-8 text-[#800000]" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
