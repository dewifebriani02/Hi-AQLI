'use client';

import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, Mail, Calendar, Shield } from 'lucide-react';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Profil Saya</h1>
        <p className="text-muted-foreground">Kelola informasi akun dan pengaturan profil Anda.</p>
      </div>

      <Card className="border-none shadow-xl overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[#800000] to-[#b30000]" />
        <CardHeader className="relative pb-0 px-8">
          <Avatar className="w-24 h-24 border-4 border-background absolute -top-12">
            <AvatarImage src={user.photoURL || undefined} />
            <AvatarFallback className="bg-accent text-accent-foreground text-2xl font-bold">
              {user.displayName?.[0] || user.email?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="pt-14 pb-4">
            <CardTitle className="text-2xl font-bold">{user.displayName || 'Pengguna Sahabat AQLI'}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Mail className="w-3 h-3" /> {user.email}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
              <UserIcon className="w-5 h-5 text-[#800000]" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">UID</p>
                <p className="text-sm font-mono truncate max-w-[150px]">{user.uid}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
              <Calendar className="w-5 h-5 text-[#800000]" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Bergabung</p>
                <p className="text-sm">{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('id-ID') : '-'}</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="px-8 py-6 bg-muted/20 border-t flex justify-between items-center">
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10 gap-2" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" /> Keluar
          </Button>
          <Button className="bg-[#800000] hover:bg-[#800000]/90 font-bold">
            Edit Profil
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
