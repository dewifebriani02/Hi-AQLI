
'use client';

import { useUser, signOut } from "@/db";
import { useDoc } from "@/db";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldAlert, Lock, Loader2, Home, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isAuthorizing, setIsAuthorizing] = useState(true);

  const { data: isAdmin, isLoading: isAdminLoading } = useDoc(user ? "roles_admin" : null, user?.id);
  const { data: isSuperAdmin, isLoading: isSuperAdminLoading } = useDoc(user ? "roles_superadmin" : null, user?.id);

  const hasAccess = !!isAdmin?.id || !!isSuperAdmin?.id;

  useEffect(() => {
    if (!isUserLoading && !isAdminLoading && !isSuperAdminLoading) {
      setIsAuthorizing(false);
    }
  }, [isUserLoading, isAdminLoading, isSuperAdminLoading]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // 1. Loading State
  if (isUserLoading || isAuthorizing) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#800000] animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Memasuki Area Terbatas...</p>
      </div>
    );
  }

  // 2. Not Logged In (Redirect handled in useEffect, but return null to prevent flash)
  if (!user) {
    return null;
  }

  // 3. Access Denied (Not an Admin)
  if (!hasAccess) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-8 relative">
          <ShieldAlert className="w-12 h-12 text-red-600" />
          <Lock className="w-6 h-6 text-red-900 absolute -bottom-1 -right-1" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tighter">AKSES DITOLAK</h1>
        
        <p className="text-slate-500 max-w-md mb-10 font-medium leading-relaxed">
          Maaf Ukhti/Akhi, halaman ini hanya dapat diakses oleh Administrator Hi AQLI. 
          Akun Anda tidak memiliki hak akses yang diperlukan.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Button asChild className="flex-1 bg-[#800000] hover:bg-[#800000]/90 font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl shadow-lg">
            <Link href="/"><Home className="w-4 h-4 mr-2" /> KEMBALI KE BERANDA</Link>
          </Button>
          <Button 
            onClick={() => signOut()} 
            variant="outline" 
            className="flex-1 border-2 border-slate-200 font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4 mr-2" /> KELUAR AKUN
          </Button>
        </div>
        
        <div className="mt-12 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">
          Hi AQLI Security Protocol v4.0
        </div>
      </div>
    );
  }

  // 4. Authorized Access
  return (
    <div className="animate-in fade-in duration-500">
      {children}
    </div>
  );
}
