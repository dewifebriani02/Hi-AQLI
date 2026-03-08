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
import { cn } from "@/lib/utils";

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
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b py-4">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="w-auto h-8 text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
          </Link>
          <SidebarTrigger className="hidden md:flex" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 pt-4">
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
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="Pengaturan">
                    <Settings />
                    <span>Pengaturan</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
