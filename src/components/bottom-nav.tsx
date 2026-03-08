"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mic, BookOpen, Bot, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dasbor", icon: LayoutDashboard },
  { href: "/tilawah", label: "Tilawah", icon: Mic },
  { href: "/tajweed", label: "Tajwid", icon: BookOpen },
  { href: "/ai-scholar", label: "Cendekiawan", icon: Bot },
  { href: "/study-circles", label: "Komunitas", icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-background p-2 pb-safe md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              isActive 
                ? "text-primary bg-primary/5" 
                : "text-muted-foreground hover:text-primary"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
