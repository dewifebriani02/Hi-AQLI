'use client';

import { useState } from 'react';
import { initiatePasswordReset } from '@/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const { error } = await initiatePasswordReset(email);
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError('Gagal mengirim email pemulihan. Pastikan email Ukhti benar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <KeyRound className="w-6 h-6 text-[#800000]" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">Lupa Kata Sandi</CardTitle>
          <CardDescription>Kami akan mengirimkan instruksi pemulihan ke email Ukhti</CardDescription>
        </CardHeader>
        {success ? (
          <CardContent className="space-y-6 pt-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="font-bold text-lg text-green-600">Email Terkirim!</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Silakan periksa kotak masuk email Ukhti (dan folder spam) untuk tautan pengaturan ulang kata sandi.
            </p>
            <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90">
              <Link href="/login">Kembali ke Login</Link>
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleReset}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email Terdaftar</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : 'Kirim Tautan Pemulihan'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Ingat kata sandi?{' '}
                <Link href="/login" className="text-[#800000] font-bold hover:underline">
                  Kembali ke Login
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
