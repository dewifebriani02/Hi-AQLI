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
} from "lucide-react";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dasbor", icon: LayoutDashboard },
  { href: "/tilawah", label: "Asisten Tilawah", icon: Mic },
  { href: "/tajweed", label: "Modul Tajwid", icon: BookOpen },
  { href: "/ai-scholar", label: "Cendekiawan AI", icon: Bot },
  { href: "/study-circles", label: "Lingkar Studi", icon: Users },
  { href: "/donate", label: "Donasi", icon: HeartHandshake },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Logo className="w-auto h-6 text-sidebar-foreground" />
          <SidebarTrigger className={cn("hidden", state === 'expanded' && 'md:flex')} />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.label }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" className="justify-start gap-2 p-2 h-8 w-full">
            <Settings />
            <span>Pengaturan</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
