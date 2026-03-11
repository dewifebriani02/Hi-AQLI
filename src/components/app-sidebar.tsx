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
  Globe,
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
  { href: "/tilawah", label: "Hi Ngaji", icon: BookOpen },
  { href: "/tajweed", label: "Hi Hafal", icon: GraduationCap },
  { href: "/ai-scholar", label: "Hi Mufradat", icon: Globe },
  { href: "/donate", label: "Hi Berbagi", icon: HeartHandshake },
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

  const superAdminDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "roles_superadmin", user.uid);
  }, [db, user?.uid]);

  const { data: isAdmin } = useDoc(adminDocRef);
  const { data: isSuperAdmin } = useDoc(superAdminDocRef);

  const isEmailAdmin = user?.email === "dewifebriani@gmail.com";
  const hasAdminAccess = isEmailAdmin || !!isAdmin || !!isSuperAdmin;

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
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b py-4">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2" onClick={handleLinkClick}>
            <Logo className="group-data-[collapsible=icon]:hidden" />
          </Link>
          <SidebarTrigger className="hidden md:flex" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 pt-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
            Menu Admin
          </h2>
          <SidebarMenu>
            {adminItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  onClick={handleLinkClick}
                >
                  <Link href={item.href}>
                    <item.icon className={cn(pathname === item.href && "text-[#800000]")} />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
        
        <SidebarSeparator />

        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
            Navigasi Utama
          </h2>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  onClick={handleLinkClick}
                >
                  <Link href={item.href}>
                    <item.icon className={cn(pathname === item.href && "text-[#800000]")} />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="Pengaturan Admin" onClick={handleLinkClick}>
                    <Settings />
                    <span>Pengaturan Admin</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarSeparator() {
  return <div className="mx-4 my-4 h-px bg-border group-data-[collapsible=icon]:hidden" />;
}
