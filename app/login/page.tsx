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
import { Brain, LogIn, ArrowLeft } from "lucide-react";

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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-4 relative font-sans">
      
      {/* Floating navigation back home */}
      <Link href="/" className="absolute top-6 left-6 inline-flex items-center gap-1 text-xs text-slate-450 hover:text-slate-850 font-bold transition">
        <ArrowLeft className="h-4 w-4" /> Về trang chủ
      </Link>

      <Card className="max-w-md w-full border border-slate-200 rounded-3xl p-4 shadow-sm bg-white relative z-10">
        <CardHeader className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-1.5 justify-center mx-auto mb-2 cursor-pointer group">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs text-white shadow-2xs group-hover:bg-blue-700 transition-colors">
              TCK
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 uppercase">Tài Liệu</span>
          </Link>
          <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Chào mừng trở lại</CardTitle>
          <CardDescription className="text-slate-400 text-xs font-semibold">
            Đăng nhập để xem toàn bộ tài liệu học tập & tải xuống hoàn toàn miễn phí
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-600">Địa chỉ Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@school.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-50 border-slate-200 text-slate-850 placeholder-slate-400 focus:border-slate-350 focus:ring-0 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-slate-600">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-50 border-slate-200 text-slate-850 placeholder-slate-400 focus:border-slate-350 focus:ring-0 rounded-xl text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-5 rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition"
            >
              {isLoading ? "Đang xử lý..." : (
                <>
                  <LogIn className="h-4 w-4" />
                  Đăng nhập hệ thống
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-xs text-slate-400 mt-6 space-y-2 font-semibold">
            <p>
              Chưa có tài khoản?{" "}
              <Link href="/register" className="text-blue-600 hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
