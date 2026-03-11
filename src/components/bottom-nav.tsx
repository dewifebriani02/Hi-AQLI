"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, GraduationCap, HeartHandshake, Globe, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Dasbor", icon: LayoutDashboard },
  { href: "/study-circles", label: "Hi Halaqah", icon: LayoutGrid },
  { href: "/tilawah", label: "Hi Ngaji", icon: BookOpen, isProminent: true },
  { href: "/tajweed", label: "Hi Hafal", icon: GraduationCap },
  { href: "/ai-scholar", label: "Hi Mufradat", icon: Globe },
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
    <nav className="fixed bottom-0 left-0 right-0 z-[100] flex items-end justify-around border-t bg-background/95 backdrop-blur px-1 pb-2 pt-1 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        
        if (item.isProminent) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative -top-4 flex flex-col items-center justify-center gap-1 group"
            >
              <div className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300",
                isActive 
                  ? "bg-[#800000] text-white scale-110" 
                  : "bg-white text-[#800000] border-2 border-[#800000]/20 hover:bg-[#800000] hover:text-white"
              )}>
                <item.icon className="h-7 w-7" />
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider transition-colors mt-1",
                isActive ? "text-[#800000]" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2 text-[10px] font-medium transition-colors",
              isActive 
                ? "text-[#800000] bg-[#800000]/5" 
                : "text-muted-foreground hover:text-[#800000]"
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
