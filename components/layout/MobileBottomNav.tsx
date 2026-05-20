"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Brain, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  isLoggedIn: boolean;
  onUploadClick: () => void;
  onAuthClick: () => void;
}

export default function MobileBottomNav({
  isLoggedIn,
  onUploadClick,
  onAuthClick,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Trang chủ",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Tài liệu",
      icon: BookOpen,
      href: "/documents",
      active: pathname.startsWith("/documents") || pathname.startsWith("/document"),
    },
    {
      label: "AI Hub",
      icon: Brain,
      href: "/ai",
      active: pathname === "/ai",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-lg border-t border-slate-200/60 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 px-2 md:hidden flex justify-around items-center shadow-[0_-4px_16px_rgba(0,0,0,0.04)] select-none">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[50px] py-1 transition-all duration-200 rounded-xl",
            item.active
              ? "text-blue-600 font-bold scale-102"
              : "text-slate-400 hover:text-slate-600 font-medium"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[9px] tracking-tight">{item.label}</span>
        </Link>
      ))}

      {/* Plus upload trigger */}
      <button
        onClick={() => {
          if (!isLoggedIn) {
            onAuthClick();
          } else {
            onUploadClick();
          }
        }}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[50px] py-1 text-slate-450 hover:text-slate-600 transition"
      >
        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all">
          <Plus className="h-4.5 w-4.5" />
        </div>
        <span className="text-[9px] tracking-tight mt-0.5">Đăng tải</span>
      </button>

      {/* User Dashboard Tab */}
      <Link
        href={isLoggedIn ? "/dashboard" : "#"}
        onClick={(e) => {
          if (!isLoggedIn) {
            e.preventDefault();
            onAuthClick();
          }
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[50px] py-1 transition-all duration-200",
          pathname === "/dashboard"
            ? "text-blue-600 font-bold"
            : "text-slate-400 hover:text-slate-600 font-medium"
        )}
      >
        <User className="h-5 w-5" />
        <span className="text-[9px] tracking-tight">Cá nhân</span>
      </Link>
    </div>
  );
}
