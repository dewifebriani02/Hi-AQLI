"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mic, BookOpen, Bot, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Dasbor", icon: LayoutDashboard },
  { href: "/tilawah", label: "Qur'an", icon: Mic },
  { href: "/tajweed", label: "Tajwid", icon: BookOpen },
  { href: "/ai-scholar", label: "Cendekiawan", icon: Bot },
  { href: "/study-circles", label: "Komunitas", icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around border-t bg-background/95 backdrop-blur p-1 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2 text-[10px] font-medium transition-colors",
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
