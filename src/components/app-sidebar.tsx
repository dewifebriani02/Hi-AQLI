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
} from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";

const adminItems = [
  { href: "/admin", label: "Dashboard Admin", icon: ShieldCheck },
  { href: "/admin/registrations", label: "Verifikasi Pendaftaran", icon: Lock },
  { href: "/admin/users", label: "Manajemen Peserta", icon: UserCog },
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
  const db = useFirestore();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();

  const adminDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "roles_admin", user.uid);
  }, [db, user?.uid]);

  const { data: isAdmin } = useDoc(adminDocRef);

  const isEmailAdmin = user?.email === "dewifebriani@gmail.com";
  const hasAdminAccess = isEmailAdmin || !!isAdmin;

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
            <Logo className="group-data-[collapsible=icon]:hidden scale-90 origin-left" />
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
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-[#D4AF37]/30 bg-[#800000]">
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="Pengaturan Admin" 
                  onClick={handleLinkClick}
                  className="text-white hover:bg-white/10"
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

function SidebarSeparator() {
  return <div className="mx-4 my-4 h-px bg-[#D4AF37]/20 group-data-[collapsible=icon]:hidden" />;
}