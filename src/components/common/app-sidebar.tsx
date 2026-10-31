
"use client";

import { useState } from "react";
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
  GraduationCap,
  HeartHandshake,
  Settings,
  ShieldCheck,
  Lock,
  UserCog,
  LayoutGrid,
  Library,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Search,
  CheckCircle,
  BookOpen,
  Users,
} from "lucide-react";
import dynamic from 'next/dynamic';
const Logo = dynamic(() => import('./logo').then(mod => mod.Logo), { ssr: false });
import { cn } from "@/lib/utils";
import { useUser } from "@/db";
import { useDoc } from "@/db";
import { useUserPermissions } from "@/lib/permissions";

const adminItems = [
  { href: "/admin", label: "Dashboard Admin", icon: ShieldCheck },
  { href: "/admin/registrations", label: "Verifikasi Pendaftaran", icon: Lock },
  { href: "/admin/users", label: "Manajemen Users", icon: UserCog },
  { href: "/admin/thalibah", label: "Direktori Thalibah", icon: Users },
  { href: "/admin/finance", label: "Monitor Keuangan", icon: BarChart3 },
  { href: "/admin/vouchers", label: "Manajemen Voucher", icon: ShieldCheck },
  { 
    label: "Kelola Hi Mufradat", 
    icon: GraduationCap,
    subItems: [
      { href: "/admin/mufradat/groups", label: "Kelola Group" },
      { href: "/admin/mufradat", label: "Monitor Peserta & Group" },
      { href: "/admin/mufradat/leave", label: "Kelola Permohonan Cuti" },
      // { href: "/admin/mufradat/juz-access", label: "Hak Akses Juz" }, // Deprecated - replaced by auto-unlock
      { href: "/admin/registrations", label: "Verifikasi Pembayaran" },
      { href: "/admin/mufradat/reports", label: "Laporan Kinerja" },
      { href: "/admin/mufradat/mabar", label: "Kelola Mabar Terjadwal" },
    ]
  },
  { 
    label: "Kelola Hi Berbagi", 
    icon: HeartHandshake,
    subItems: [
      { href: "/admin/donations", label: "Daftar Infaq" },
      { href: "/admin/campaigns", label: "Kelola Kampanye" },
    ]
  },
  { 
    label: "Kelola Hi Ngaji", 
    icon: Library,
    subItems: [
      { href: "/admin/classes", label: "Manajemen Kelas" },
    ]
  },
  { 
    label: "Kelola Hi Tikrar", 
    icon: BookOpen,
    subItems: [
      { href: "/admin/tikrar", label: "Peserta Tikrar" },
    ]
  },
  { 
    label: "Kelola Hi Mutabaah", 
    icon: CheckCircle,
    subItems: [
      { href: "/admin/mutabaah", label: "Laporan Mutabaah" },
    ]
  },
  { 
    label: "Kelola Hi Muhasabah", 
    icon: Search,
    subItems: [
      { href: "/admin/muhasabah", label: "Laporan Muhasabah" },
    ]
  },
];


export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const { data: isAdmin } = useDoc(user ? "roles_admin" : null, user?.id);
  const { data: isSuperAdmin } = useDoc(user ? "roles_superadmin" : null, user?.id);
  const { isSuperUser, canAccessProgram, isMusyrifah } = useUserPermissions(user?.id);

  // Security Hardening: Only trust the dedicated RBAC tables
  const hasAdminAccess = !!isAdmin?.id || !!isSuperAdmin?.id || isMusyrifah;

  // Define program mapping for menu filtering
  const programMenuMap: Record<string, string[]> = {
    hi_mufradat: ["/admin/mufradat", "/admin/mufradat/groups", "/admin/mufradat/leave", "/admin/mufradat/reports", "/admin/mufradat/mabar"],
    hi_tikrar: ["/admin/tikrar"],
    hi_ngaji: ["/admin/classes"],
    hi_berbagi: ["/admin/donations", "/admin/campaigns"],
    hi_mutabaah: ["/admin/mutabaah"],
    hi_muhasabah: ["/admin/muhasabah"],
  };

  // Filter menu items based on user permissions
  const filteredItems = adminItems.map(item => {
    // For non-subItems (single level items), show for superusers only
    if (!item.subItems) {
      return isSuperUser ? item : null;
    }

    // For superusers, show all subItems
    if (isSuperUser) return item;

    // For musyrifah, filter subItems based on assigned programs
    const allowedSubItems = item.subItems.filter(sub => {
      const program = Object.entries(programMenuMap).find(([_, paths]) => paths.includes(sub.href));
      return program ? canAccessProgram(program[0] as any) : false;
    });

    // Return item with filtered subItems
    return { ...item, subItems: allowedSubItems };
  }).filter(item => {
    // Remove null items and items with no subItems left
    return item && (!item.subItems || item.subItems.length > 0);
  });

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
      <SidebarHeader className="py-4 bg-[#800000]">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2" onClick={handleLinkClick}>
            <Logo
              className="group-data-[collapsible=icon]:hidden scale-90 origin-left"
              textClassName="text-white"
            />
          </Link>
          <SidebarTrigger className="flex text-white hover:bg-white/10" />
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-[#800000] overflow-y-auto custom-scrollbar">
        <SidebarMenu className="p-4 pb-24 gap-2">
          <h2 className="mb-4 px-4 text-[10px] font-black uppercase tracking-widest text-white/50 group-data-[collapsible=icon]:hidden">
            Menu Admin
          </h2>
          {filteredItems.map((item) => {
            if (item.subItems) {
              const isExpanded = expandedItems.includes(item.label);
              const isAnySubActive = item.subItems.some(sub => pathname === sub.href);
              
              return (
                <SidebarMenuItem key={item.label}>
                  <div className="flex flex-col gap-1">
                    <SidebarMenuButton
                      onClick={() => toggleExpand(item.label)}
                      className={cn(
                        "transition-all duration-300",
                        isExpanded || isAnySubActive ? "text-[#D4AF37]" : "text-white hover:bg-white/10"
                      )}
                      tooltip={item.label}
                    >
                      <item.icon className="size-5 shrink-0" />
                      <span className="font-bold flex-1 group-data-[collapsible=icon]:hidden">{item.label}</span>
                      <div className="group-data-[collapsible=icon]:hidden">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </SidebarMenuButton>
                    
                    {isExpanded && (
                      <div className="flex flex-col gap-1 ml-4 pl-4 border-l border-white/10 mt-1">
                        {item.subItems.map((sub) => {
                          const isSubActive = pathname === sub.href;
                          return (
                            <SidebarMenuButton
                              key={sub.href}
                              asChild
                              isActive={isSubActive}
                              className={cn(
                                "transition-all duration-300 h-8",
                                isSubActive ? "bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90" : "text-white/60 hover:text-white hover:bg-white/5"
                              )}
                            >
                              <Link href={sub.href} onClick={handleLinkClick}>
                                <span className="text-[11px] font-bold">{sub.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </SidebarMenuItem>
              );
            }
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href || item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={cn(
                    "transition-all duration-300 h-11",
                    isActive ? "bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90" : "text-white hover:bg-white/10"
                  )}
                >
                  <Link href={item.href!} onClick={handleLinkClick}>
                    <item.icon className={cn("size-5 shrink-0", isActive ? "text-black" : "text-white")} />
                    <span className="font-bold group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-[#D4AF37]/30 bg-[#800000]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Pengaturan Admin"
              className="text-white hover:bg-white/10 h-11"
              onClick={handleLinkClick}
            >
              <Settings className="text-white size-5" />
              <span className="font-bold group-data-[collapsible=icon]:hidden">Pengaturan</span>
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
