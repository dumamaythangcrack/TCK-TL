"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { LogIn, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Vui lòng nhập đầy đủ email và mật khẩu!");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || "Tài khoản hoặc mật khẩu không chính xác.");
      } else {
        toast.success("Đăng nhập thành công!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      toast.error("Đã xảy ra lỗi kết nối.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/40 text-slate-855 flex items-center justify-center p-4 relative font-sans">
      {/* Subtle Background Glows */}
      <div className="absolute top-10 left-10 h-96 w-96 rounded-full bg-slate-200/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-slate-300/10 blur-3xl pointer-events-none" />

      {/* Floating navigation back home */}
      <Link href="/" className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-905 font-bold transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Về trang chủ
      </Link>

      <Card className="max-w-md w-full border border-slate-200/50 rounded-2xl p-4 shadow-3xs bg-white relative z-10 animate-fade-in">
        <CardHeader className="text-center space-y-2 pb-4">
          <Link href="/" className="inline-flex items-center gap-2 cursor-pointer group mb-2 justify-center">
            <div className="h-6 w-6 rounded-lg bg-slate-905 flex items-center justify-center font-black text-[10px] text-white shadow-2xs group-hover:bg-slate-800 transition-colors">
              T
            </div>
            <span className="font-extrabold text-xs tracking-tight text-slate-905 uppercase">
              TCK <span className="font-normal text-slate-450 lowercase">tài liệu</span>
            </span>
          </Link>
          <CardTitle className="text-base font-extrabold text-slate-905 tracking-tight">Chào mừng trở lại</CardTitle>
          <CardDescription className="text-slate-450 text-[11px] font-semibold leading-relaxed">
            Đăng nhập để xem toàn bộ tài liệu học tập & tải xuống hoàn toàn miễn phí
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Địa chỉ Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@school.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-350 focus:ring-1 focus:ring-slate-200 rounded-xl text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-350 focus:ring-1 focus:ring-slate-200 rounded-xl text-xs h-9"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-905 hover:bg-slate-850 text-white font-bold text-xs h-9 rounded-xl shadow-3xs flex items-center justify-center gap-1.5 transition-colors mt-2"
            >
              {isLoading ? "Đang xử lý..." : (
                <>
                  <LogIn className="h-3.5 w-3.5" />
                  Đăng nhập hệ thống
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-[11px] text-slate-450 pt-2 font-semibold">
            <p>
              Chưa có tài khoản?{" "}
              <Link href="/register" className="text-slate-800 hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
