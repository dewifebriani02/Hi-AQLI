
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
  Mic,
  BookOpen,
  Bot,
  Users,
  LayoutDashboard,
  HeartHandshake,
  Settings,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";

const adminItems = [
  { href: "/admin", label: "Dashboard Admin", icon: ShieldCheck },
  { href: "/admin/content", label: "Kelola Konten", icon: Lock },
];

const navItems = [
  { href: "/", label: "Dasbor", icon: LayoutDashboard },
  { href: "/tilawah", label: "Asisten Qur'an", icon: Mic },
  { href: "/tajweed", label: "Modul Tajwid", icon: BookOpen },
  { href: "/ai-scholar", label: "Cendekiawan AI", icon: Bot },
  { href: "/study-circles", label: "Lingkar Studi", icon: Users },
  { href: "/donate", label: "Donasi", icon: HeartHandshake },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();

  const adminDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "roles_admin", user.uid);
  }, [db, user]);

  const superAdminDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "roles_superadmin", user.uid);
  }, [db, user]);

  const { data: isAdmin } = useDoc(adminDocRef);
  const { data: isSuperAdmin } = useDoc(superAdminDocRef);

  const hasAdminAccess = !!isAdmin || !!isSuperAdmin;

  if (!hasAdminAccess) {
    return null;
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b py-4">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2">
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
                >
                  <Link href={item.href}>
                    <item.icon className={cn(pathname === item.href && "text-sidebar-primary")} />
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
                >
                  <Link href={item.href}>
                    <item.icon className={cn(pathname === item.href && "text-sidebar-primary")} />
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
                <SidebarMenuButton tooltip="Pengaturan Admin">
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
