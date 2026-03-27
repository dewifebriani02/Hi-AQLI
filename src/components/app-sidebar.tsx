
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  HeartHandshake,
  Settings,
  ShieldCheck,
  Lock,
  Trophy,
  UserCog,
  LayoutGrid,
  Library,
} from "lucide-react";
import dynamic from 'next/dynamic';
const Logo = dynamic(() => import('./logo').then(mod => mod.Logo), { ssr: false });
import { cn } from "@/lib/utils";
import { useUser } from "@/supabase";
import { useDoc } from "@/supabase/db";

const adminItems = [
  { href: "/admin", label: "Dashboard Admin", icon: ShieldCheck },
  { href: "/admin/registrations", label: "Verifikasi Pendaftaran", icon: Lock },
  { href: "/admin/donations", label: "Manajemen Infaq", icon: HeartHandshake },
  { href: "/admin/campaigns", label: "Manajemen Kampanye", icon: LayoutGrid },
  { href: "/admin/users", label: "Manajemen Peserta", icon: UserCog },
  { href: "/admin/classes", label: "Manajemen Kelas", icon: Library },
  { href: "/admin/mufradat", label: "Progres Mufradat", icon: GraduationCap },
];

const navItems = [
  { href: "/", label: "Dasbor", icon: LayoutDashboard },
  { href: "/mufradat", label: "Hi Mufradat", icon: BookOpen },
  { href: "/ngaji", label: "Hi Ngaji", icon: LayoutGrid },
  { href: "/hafal", label: "Hi Hafal", icon: GraduationCap },
  { href: "/berbagi", label: "Hi Berbagi", icon: HeartHandshake },
  { href: "/leaderboard", label: "Papan Juara", icon: Trophy },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();

  const { data: isAdmin } = useDoc(user ? "roles_admin" : null, user?.id);
  const { data: isSuperAdmin } = useDoc(user ? "roles_superadmin" : null, user?.id);
  const { data: userData } = useDoc(user ? "users" : null, user?.id);

  const hasAdminAccess = !!isAdmin || !!isSuperAdmin || userData?.roleId === 'admin' || userData?.roleId === 'superadmin';

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  if (!hasAdminAccess) {
    return null;
  }

  return (
    <Sidebar collapsible="icon" className="border-r-[#D4AF37]/30">
      <SidebarHeader className="border-b border-[#D4AF37]/30 py-4 bg-[#800000]">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2" onClick={handleLinkClick}>
            <Logo
              className="group-data-[collapsible=icon]:hidden scale-90 origin-left"
              textClassName="text-white"
            />
          </Link>
          <SidebarTrigger className="hidden md:flex text-white hover:bg-white/10" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 pt-4 bg-[#800000]">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-[10px] font-black uppercase tracking-widest text-white/50 group-data-[collapsible=icon]:hidden">
            Menu Admin
          </h2>
          <SidebarMenu>
            {adminItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                    className={cn(
                      "transition-all duration-300",
                      isActive ? "bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90" : "text-white hover:bg-white/10"
                    )}
                  >
                    <Link href={item.href} onClick={handleLinkClick}>
                      <item.icon className={cn("shrink-0", isActive ? "text-black" : "text-white")} />
                      <span className="font-bold">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>

        <SidebarSeparator />

        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-[10px] font-black uppercase tracking-widest text-white/50 group-data-[collapsible=icon]:hidden">
            Navigasi Utama
          </h2>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                    className={cn(
                      "transition-all duration-300",
                      isActive ? "bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90" : "text-white hover:bg-white/10"
                    )}
                  >
                    <Link href={item.href} onClick={handleLinkClick}>
                      <item.icon className={cn("shrink-0", isActive ? "text-black" : "text-white")} />
                      <span className="font-bold">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-[#D4AF37]/30 bg-[#800000]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Pengaturan Admin"
              className="text-white hover:bg-white/10"
              onClick={handleLinkClick}
            >
              <Settings className="text-white" />
              <span className="font-bold">Pengaturan</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

const SidebarSeparator = () => (
  <div className="mx-4 my-4 h-px bg-[#D4AF37]/20 group-data-[collapsible=icon]:hidden" />
);
