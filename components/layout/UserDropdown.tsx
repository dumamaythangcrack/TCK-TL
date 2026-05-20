"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  FileText,
  Bookmark,
  History,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldAlert
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

interface UserDropdownProps {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

export default function UserDropdown({ user }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const email = user.email || "";
  const fullName = user.user_metadata?.full_name || email.split("@")[0];
  const avatarLetter = fullName.charAt(0).toUpperCase();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Đã đăng xuất thành công.");
      setIsOpen(false);
      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi đăng xuất.");
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1 pr-2.5 rounded-full hover:bg-slate-100 transition-all duration-200 border border-transparent hover:border-slate-200/40 select-none group"
      >
        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shadow-xs select-none">
          {avatarLetter}
        </div>
        <span className="hidden sm:inline text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition">
          {fullName}
        </span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-lg z-50 overflow-hidden py-1.5 origin-top-right focus:outline-none"
          >
            {/* Header info */}
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tài khoản</p>
              <h4 className="text-xs font-bold text-slate-800 truncate mt-0.5">{fullName}</h4>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{email}</p>
            </div>

            {/* Menu Items */}
            <div className="p-1 space-y-0.5">
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition"
              >
                <User className="h-3.5 w-3.5 text-slate-450" />
                Hồ sơ cá nhân
              </Link>
              
              <Link
                href="/dashboard?tab=my-uploads"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition"
              >
                <FileText className="h-3.5 w-3.5 text-slate-450" />
                Tài liệu của tôi
              </Link>

              <Link
                href="/dashboard?tab=bookmarks"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition"
              >
                <Bookmark className="h-3.5 w-3.5 text-slate-450" />
                Tài liệu đã lưu
              </Link>

              <Link
                href="/dashboard?tab=ai"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition"
              >
                <History className="h-3.5 w-3.5 text-slate-450" />
                Lịch sử AI
              </Link>

              <Link
                href="/dashboard?tab=settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition"
              >
                <Settings className="h-3.5 w-3.5 text-slate-450" />
                Cài đặt tài khoản
              </Link>
            </div>

            {/* Logout button */}
            <div className="px-1 py-1 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 rounded-xl hover:bg-red-50 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
