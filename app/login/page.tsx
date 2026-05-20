"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { LogIn, ArrowLeft, Sparkles } from "lucide-react";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "auth_code_exchange_failed") {
      toast.error("Quá trình trao đổi mã xác thực Google OAuth thất bại. Vui lòng thử lại.");
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Không thể đăng nhập bằng Google.");
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Vui lòng nhập đầy đủ email và mật khẩu!");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
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
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 flex items-center justify-center p-4 relative font-sans">
      {/* Background soft gradients */}
      <div className="absolute top-10 left-10 h-[500px] w-[500px] rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 h-[500px] w-[500px] rounded-full bg-indigo-600/5 blur-3xl pointer-events-none" />

      {/* Floating navigation back home */}
      <Link href="/" className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-bold transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Về trang chủ
      </Link>

      <Card className="max-w-md w-full border border-black/[0.06] rounded-3xl p-4 shadow-xl bg-white/80 backdrop-blur-md relative z-10">
        <CardHeader className="text-center space-y-2 pb-4">
          <Link href="/" className="inline-flex items-center gap-2 cursor-pointer group mb-2 justify-center">
            <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center font-black text-[10px] text-white shadow-2xs group-hover:bg-blue-700 transition-colors">
              T
            </div>
            <span className="font-extrabold text-xs tracking-tight text-slate-900 uppercase">
              TCK <span className="font-normal text-slate-400 lowercase">tài liệu</span>
            </span>
          </Link>
          <CardTitle className="text-base font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Chào mừng trở lại
          </CardTitle>
          <CardDescription className="text-slate-500 text-[11px] font-semibold leading-relaxed">
            Đăng nhập để xem tài liệu, học tập cùng AI và thảo luận.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Google login button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-10 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-3xs transition-all duration-200"
          >
            <GoogleIcon className="h-4 w-4" />
            Tiếp tục với Google
          </Button>

          <div className="flex items-center justify-center gap-3 py-1">
            <span className="h-px bg-slate-100 flex-1" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hoặc Email</span>
            <span className="h-px bg-slate-100 flex-1" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Địa chỉ Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@school.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs h-9.5"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Mật khẩu</Label>
                <button
                  type="button"
                  onClick={() => toast.info("Tính năng quên mật khẩu sẽ sớm được cập nhật.")}
                  className="text-[10px] text-blue-600 hover:underline font-semibold"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs h-9.5"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors mt-2"
            >
              {isLoading ? "Đang xử lý..." : (
                <>
                  <LogIn className="h-3.5 w-3.5" />
                  Đăng nhập hệ thống
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-[11px] text-slate-500 pt-2 font-semibold">
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f6f7fb] text-slate-905 flex items-center justify-center p-4 font-sans">
        <span className="text-slate-400 text-xs font-semibold animate-pulse">Đang tải trang đăng nhập...</span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
