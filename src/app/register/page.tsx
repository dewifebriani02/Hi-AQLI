
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, initiateEmailSignUp, initiateGoogleSignIn, supabase } from '@/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Mail, Lock, User as UserIcon, Eye, EyeOff, Zap as ZapIcon, ShieldCheck, AlertTriangle, Smartphone } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { Suspense } from 'react';
import { validateEmail, cn } from '@/lib/utils';
import { normalizeWhatsapp, whatsappErrorMessage } from '@/lib/whatsapp';

// Debug check for components to avoid Error #130

function RegisterContent() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const referralCode = searchParams.get('ref');
  const programParam = searchParams.get('program');

  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [salutation, setSalutation] = useState('Ukhti');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

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
  const [captchaChallenge, setCaptchaChallenge] = useState<{ a: number, b: number, result: number } | null>(null);

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

          // 2. Generate unique referral code
          const firstNameRaw = (fullName || user.user_metadata?.full_name || username || user.email?.split('@')[0] || 'AQLI');
          const firstName = firstNameRaw.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
          let sequence = 1;
          let generatedCode = "";
          let isUnique = false;

          while (!isUnique) {
            const seqStr = sequence.toString().padStart(2, '0');
            generatedCode = `AQLI-${firstName}${seqStr}`;

            const { data: existing } = await supabase
              .from("users")
              .select("id")
              .eq("referral_code", generatedCode)
              .maybeSingle();

            if (!existing) {
              isUnique = true;
            } else {
              sequence++;
              if (sequence > 99) {
                // Fallback if many users have same name
                generatedCode = `AQLI-${firstName}${Math.floor(Math.random() * 1000)}`;
                isUnique = true;
              }
            }
          }

          // 3. Create missing profile with referred_by_id and referral_code
          await supabase.from('users').upsert({
            id: user.id,
            full_name: fullName || user.user_metadata?.full_name || '',
            username: username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hamba Allah',
            email: user.email,
            role_id: 'learner',
            points: 0,
            followed_halaqahs: [],
            salutation: salutation || 'Ukhti',
            referred_by_id: referrerId,
            referral_code: generatedCode,
            whatsapp: whatsapp || user.user_metadata?.whatsapp || '',
            metadata: {
              has_chosen_salutation: true
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        }
        
        // IMPROVED: Logic for destination after registration/login
        const destination = redirectTo !== '/' 
          ? redirectTo 
          : (referralCode 
              ? `/study-circles/registration?ref=${referralCode}${programParam ? `&program=${programParam}` : ''}` 
              : (programParam ? `/study-circles/registration?program=${programParam}` : '/programs'));

        router.push(destination);
      };

      syncProfile();
    }
  }, [user, router, username, fullName, isUserLoading, referralCode, redirectTo]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Bot Check
    if (honeypot) {
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    if (!validateEmail(cleanEmail)) {
      setError('Format email tidak valid. Silakan periksa kembali.');
      setLoading(false);
      return;
    }

    if (!captchaChallenge || parseInt(userCaptcha) !== captchaChallenge.result) {
      setError(`Jawaban keamanan salah. ${captchaChallenge?.a} + ${captchaChallenge?.b} = ?`);
      setLoading(false);
      return;
    }

    const waError = whatsappErrorMessage(whatsapp);
    if (waError) {
      setError(`Nomor WhatsApp tidak valid: ${waError}`);
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

    const { data: signUpData, error: signUpError } = await initiateEmailSignUp(cleanEmail, password, {
      data: { 
        full_name: fullName,
        username: cleanUsername,
        whatsapp: normalizeWhatsapp(whatsapp)
      }
    });

    if (signUpError) {
      console.error('Signup Error:', signUpError);
      
      if (signUpError.message?.toLowerCase().includes('already registered')) {
        setError(
          <>
            Email ini sudah terdaftar. Silakan <Link href="/login" className="underline font-black">Masuk ke Akun</Link> Ukhti atau gunakan fitur lupa kata sandi jika lupa password.
          </>
        );
      } else {
        setError(signUpError.message || 'Pendaftaran gagal. Silakan coba lagi.');
      }
      setLoading(false);
    } else {
      // Sign up success!
      // If email confirmation is ON, Supabase return user but session is null.
      // If email confirmation is OFF, session is returned and useUser state will change.
      setLoading(false);
      if (signUpData.user) {
        if (signUpData.session) {
          toast({
            title: "Masyallah, Pendaftaran Berhasil!",
            description: "Selamat datang di Hi AQLI, Ukhti otomatis masuk.",
          });
          setTimeout(() => {
            const destination = redirectTo !== '/' 
              ? redirectTo 
              : (referralCode 
                  ? `/study-circles/registration?ref=${referralCode}${programParam ? `&program=${programParam}` : ''}` 
                  : (programParam ? `/study-circles/registration?program=${programParam}` : '/programs'));
              
            router.push(destination);
          }, 100);
        } else {
          toast({
            title: "Pendaftaran Berhasil!",
            description: "Mohon cek email Ukhti untuk klik link aktivasi sebelum login.",
          });
          setError("Silakan cek kotak masuk (atau folder spam) email Ukhti untuk memverifikasi akun sebelum masuk.");
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        // This case is unlikely if error is null but no user
        router.push('/login');
      }
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setError(null);
    
    // Determine the final destination after Google callback
    // IMPROVEMENT: If joining via referral, automatically show the registration form
    const googleRedirectBase = redirectTo !== '/' 
      ? redirectTo 
      : (referralCode 
          ? `/study-circles/registration?ref=${referralCode}${programParam ? `&program=${programParam}` : ''}` 
          : (programParam ? `/study-circles/registration?program=${programParam}` : '/programs'));
    
    // Add registration flag to authorize profile creation in callback
    const googleRedirect = googleRedirectBase.includes('?') 
      ? `${googleRedirectBase}&type=register` 
      : `${googleRedirectBase}?type=register`;

    const { error: googleError } = await initiateGoogleSignIn(googleRedirect);
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
                    referralStatus.isValid ? <ZapIcon className="w-4 h-4 fill-current" /> : 
                    <AlertTriangle className="w-4 h-4" />}
                </div>
                <AlertDescription className="text-[10px] font-black uppercase tracking-wider leading-tight">
                  {referralStatus.isLoading ? "Memvalidasi Kode Referral..." :
                    referralStatus.isValid ? (
                      <>Alhamdulillah! Kode <span className="text-emerald-600 underline">{referralCode}</span> dari {referralStatus.referrerName} Aktif. <br />
                        <span className="opacity-70 text-[9px]">Potongan Rp 5.000 otomatis berlaku.</span></>
                    ) : (
                      <>Maaf, Kode <span className="text-rose-600 underline">{referralCode}</span> Tidak Valid. <br />
                        <span className="opacity-70 text-[9px]">Ukhti tetap bisa mendaftar tanpa potongan.</span></>
                    )}
                </AlertDescription>
              </div>
            </Alert>
          )}



          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Nama Lengkap (Sesuai KTP)</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  placeholder="misal: Dewi Febrinani"
                  className="pl-10 h-12 border-2 rounded-xl focus-visible:ring-[#800000]"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Nomor WhatsApp (Aktif)</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  inputMode="tel"
                  placeholder="misal: 081234567890"
                  className="pl-10 h-12 border-2 rounded-xl focus-visible:ring-[#800000]"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                />
              </div>
              {whatsapp && whatsappErrorMessage(whatsapp) && (
                <p className="text-[10px] text-rose-600 font-bold px-1 animate-in fade-in slide-in-from-top-1">⚠ {whatsappErrorMessage(whatsapp)}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salutation" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Panggilan Akrab</Label>
                <Select value={salutation} onValueChange={setSalutation}>
                  <SelectTrigger className="h-12 border-2 rounded-xl focus:ring-[#800000]">
                    <SelectValue placeholder="Pilih Panggilan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ukhti" className="font-bold">Ukhti</SelectItem>
                    <SelectItem value="Kakak" className="font-bold">Kakak</SelectItem>
                    <SelectItem value="Ummu" className="font-bold">Ummu</SelectItem>
                    <SelectItem value="Ibu" className="font-bold">Ibu</SelectItem>
                    <SelectItem value="Neng" className="font-bold">Neng</SelectItem>
                    <SelectItem value="Mbak" className="font-bold">Mbak</SelectItem>
                    <SelectItem value="Uni" className="font-bold">Uni</SelectItem>
                    <SelectItem value="Teteh" className="font-bold">Teteh</SelectItem>
                    <SelectItem value="Bunda" className="font-bold">Bunda</SelectItem>
                    <SelectItem value="Sahabat" className="font-bold">Sahabat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kunyah_name" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Nama Kunyah</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="kunyah_name"
                    name="kunyah_name"
                    autoComplete="off"
                    placeholder="misal: Ummu Ahmad"
                    className="pl-10 h-12 border-2 rounded-xl focus-visible:ring-[#800000]"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Email</Label>
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
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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
