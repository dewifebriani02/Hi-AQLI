'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        // Check if we have a session (the hash from email link should auto-login the user temporarily)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Tautan pemulihan tidak valid atau telah kedaluwarsa.');
            }
        };
        checkSession();
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Kata sandi tidak cocok.');
            return;
        }
        if (password.length < 6) {
            setError('Kata sandi minimal 6 karakter.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            toast({
                title: "Berhasil!",
                description: "Kata sandi Ukhti telah diperbarui. Silakan masuk kembali.",
            });

            router.push('/login');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Gagal memperbarui kata sandi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[70vh]">
            <Card className="w-full max-w-md border-none shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                        <Lock className="w-6 h-6 text-[#800000]" />
                    </div>
                    <CardTitle className="text-2xl font-bold font-headline">Atur Ulang Kata Sandi</CardTitle>
                    <CardDescription>Masukkan kata sandi baru Ukhti di bawah ini</CardDescription>
                </CardHeader>
                <form onSubmit={handleUpdate}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="py-2">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="password">Kata Sandi Baru</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : 'Perbarui Kata Sandi'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
