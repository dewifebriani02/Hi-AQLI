
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
import { Loader2, UserPlus, Mail, Lock, User as UserIcon, Eye, EyeOff, Zap, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { Suspense } from 'react';
import { validateEmail } from '@/lib/utils';

function RegisterContent() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const referralCode = searchParams.get('ref');
  
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Referral Validation State
  const [referralStatus, setReferralStatus] = useState<{
    isLoading: boolean;
    isValid: boolean;
    referrerName: string | null;
  }>({ isLoading: false, isValid: false, referrerName: null });

  // Password Strength State
  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  }, [password]);
  
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

  // Referral Validation Effect
  useEffect(() => {
    async function validateRef() {
      if (!referralCode) {
        setReferralStatus({ isLoading: false, isValid: false, referrerName: null });
        return;
      }

      setReferralStatus(prev => ({ ...prev, isLoading: true }));
      try {
        const { data, error } = await supabase
          .from('users')
          .select('username')
          .eq('referral_code', referralCode.toUpperCase())
          .maybeSingle();

        if (data) {
          setReferralStatus({ isLoading: false, isValid: true, referrerName: data.username });
        } else {
          setReferralStatus({ isLoading: false, isValid: false, referrerName: null });
        }
      } catch (e) {
        setReferralStatus({ isLoading: false, isValid: false, referrerName: null });
      }
    }
    validateRef();
  }, [referralCode]);

  useEffect(() => {
    if (user && !isUserLoading) {
      const syncProfile = async () => {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profile) {
          let referrerId = null;

          // 1. Resolve Referrer ID if ref code exists
          if (referralCode) {
            const { data: referrer } = await supabase
              .from('users')
              .select('id, referral_balance')
              .eq('referral_code', referralCode.toUpperCase())
              .maybeSingle();
            
            if (referrer) {
              referrerId = referrer.id;
              console.log('Detected persistent referral from:', referrerId);
            }
          }

          // 3. Create missing profile with referred_by_id
          await supabase.from('users').upsert({
            id: user.id,
            username: username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hamba Allah',
            email: user.email,
            role_id: 'learner',
            points: 0,
            followed_halaqahs: [],
            referred_by_id: referrerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        }
        router.push(redirectTo);
      };

      syncProfile();
    }
  }, [user, router, username, isUserLoading, referralCode, redirectTo]);

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

    if (!validateEmail(email)) {
      setError('Format email tidak valid. Silakan periksa kembali.');
      setLoading(false);
      return;
    }

    if (!captchaChallenge || parseInt(userCaptcha) !== captchaChallenge.result) {
      setError(`Jawaban keamanan salah. ${captchaChallenge?.a} + ${captchaChallenge?.b} = ?`);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Kata sandi tidak cocok. Mohon ulangi kembali.');
      setLoading(false);
      return;
    }

    if (!agreedToTerms) {
      setError('Ukhti harus setuju dengan Syarat & Ketentuan untuk melanjutkan.');
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

          {referralCode && (
            <Alert className={cn(
              "animate-in slide-in-from-top-2 duration-500",
              referralStatus.isLoading ? "bg-slate-50 border-slate-200" :
              referralStatus.isValid ? "bg-emerald-50 border-emerald-200 text-emerald-800" : 
              "bg-rose-50 border-rose-200 text-rose-800"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg text-white",
                  referralStatus.isLoading ? "bg-slate-400" :
                  referralStatus.isValid ? "bg-emerald-500" : "bg-rose-500"
                )}>
                  {referralStatus.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                   referralStatus.isValid ? <Zap className="w-4 h-4 fill-current" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
                <AlertDescription className="text-[10px] font-black uppercase tracking-wider leading-tight">
                  {referralStatus.isLoading ? "Memvalidasi Kode Referral..." : 
                   referralStatus.isValid ? (
                     <>Alhamdulillah! Kode <span className="text-emerald-600 underline">{referralCode}</span> dari {referralStatus.referrerName} Aktif. <br/>
                     <span className="opacity-70 text-[9px]">Potongan Rp 5.000 otomatis berlaku.</span></>
                   ) : (
                     <>Maaf, Kode <span className="text-rose-600 underline">{referralCode}</span> Tidak Valid. <br/>
                     <span className="opacity-70 text-[9px]">Ukhti tetap bisa mendaftar tanpa potongan.</span></>
                   )}
                </AlertDescription>
              </div>
            </Alert>
          )}

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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-dashed" />
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-white px-4 text-muted-foreground">Atau Gunakan</span>
            </div>
          </div>

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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Kata Sandi</Label>
                {password && (
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                    passwordStrength <= 25 ? "bg-rose-100 text-rose-600" :
                    passwordStrength <= 75 ? "bg-amber-100 text-amber-600" :
                    "bg-emerald-100 text-emerald-600"
                  )}>
                    {passwordStrength <= 25 ? "Lemah" : passwordStrength <= 75 ? "Sedang" : "Kuat"}
                  </span>
                )}
              </div>
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
              {password && (
                <div className="px-1">
                  <Progress value={passwordStrength} className="h-1" indicatorClassName={cn(
                    passwordStrength <= 25 ? "bg-rose-500" :
                    passwordStrength <= 75 ? "bg-amber-500" :
                    "bg-emerald-500"
                  )} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Ulangi Kata Sandi</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ketik ulang kata sandi"
                  className={cn(
                    "pl-10 h-12 border-2 rounded-xl focus-visible:ring-[#800000]",
                    password && confirmPassword && password !== confirmPassword && "border-rose-400 focus-visible:ring-rose-400"
                  )}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {password && confirmPassword && password === confirmPassword && (
                  <ShieldCheck className="absolute right-3 top-3.5 h-5 w-5 text-emerald-500" />
                )}
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

            <div className="flex items-start space-x-3 py-2">
              <Checkbox 
                id="terms" 
                checked={agreedToTerms} 
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-1 border-[#800000] data-[state=checked]:bg-[#800000]"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-[10px] font-bold text-slate-600 leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Saya setuju dengan <Link href="/syarat-ketentuan" className="text-[#800000] underline">Syarat & Ketentuan</Link> Hi AQLI dan berkomitmen untuk beramal dengan Itqan.
                </label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-14 rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest"
              disabled={loading || googleLoading || !agreedToTerms}
            >
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <><UserPlus className="mr-2 h-5 w-5" /> Daftar Sekarang</>}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-muted/30 py-6 border-t">
          <p className="text-center text-sm text-muted-foreground w-full">
            Sudah punya akun?{' '}
            <Link 
              href={`/login?redirectTo=${encodeURIComponent(redirectTo)}${referralCode ? `&ref=${referralCode}` : ''}`} 
              className="text-[#800000] font-black hover:underline uppercase text-xs tracking-wider"
            >
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
