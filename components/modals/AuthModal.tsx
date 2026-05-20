"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
}

export default function AuthModal({ isOpen, onClose, initialTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Không thể đăng nhập bằng Google.");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.warning("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    try {
      setLoading(true);
      if (activeTab === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Đăng nhập thành công!");
        router.refresh();
        onClose();
      } else {
        if (!fullName.trim()) {
          toast.warning("Vui lòng nhập họ và tên.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: "student",
            },
          },
        });
        if (error) throw error;
        toast.success("Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác thực.");
        setActiveTab("login");
      }
    } catch (err: any) {
      toast.error(err.message || "Thao tác xác thực thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Dialog Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-black/[0.05] grid grid-cols-1 md:grid-cols-12 max-h-[90vh] md:max-h-[600px] z-10"
          >
            {/* Left Side: Onboarding & Guidance Column */}
            <div className="md:col-span-5 bg-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden select-none">
              {/* Subtle visual glow */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/25 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-600/25 rounded-full blur-3xl" />

              <div className="relative space-y-8">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-[10px] text-white">
                    T
                  </div>
                  <span className="font-extrabold text-xs tracking-wider uppercase text-slate-100">
                    TCK <span className="font-normal text-slate-400 lowercase">tài liệu</span>
                  </span>
                </div>

                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-semibold text-blue-400 uppercase tracking-wider">
                    <Sparkles className="h-2.5 w-2.5" /> Bắt đầu hành trình
                  </span>
                  <h2 className="text-xl font-bold tracking-tight leading-tight text-white">
                    Nâng tầm kết quả học tập của bạn
                  </h2>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Đăng nhập hoặc tạo tài khoản để trải nghiệm toàn bộ các công cụ học tập nâng cao hoàn toàn miễn phí.
                  </p>
                </div>

                {/* Tutorial List */}
                <div className="space-y-4 pt-2">
                  <div className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-200">Kho tài liệu miễn phí</h4>
                      <p className="text-[10px] text-slate-400">Tải đề thi thử THPT, tài liệu ôn thi chất lượng cao.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-200">Gia sư AI 24/7</h4>
                      <p className="text-[10px] text-slate-400">Giải đáp chi tiết bài tập Toán, Lý, Hóa qua chat hoặc ảnh chụp.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-200">Lưu trữ & Tương tác</h4>
                      <p className="text-[10px] text-slate-400">Bookmark tài liệu, bình luận và thảo luận cùng cộng đồng.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative text-[10px] text-slate-500 pt-6">
                Bảo mật & vận hành dựa trên nền tảng Supabase Auth.
              </div>
            </div>

            {/* Right Side: Auth Forms Column */}
            <div className="md:col-span-7 p-8 flex flex-col justify-between overflow-y-auto">
              {/* Close Trigger */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-6">
                {/* Custom modern tab selector */}
                <div className="flex border-b border-slate-100 pb-px">
                  <button
                    onClick={() => setActiveTab("login")}
                    className={`pb-2.5 font-bold text-xs relative px-1 transition-colors ${
                      activeTab === "login" ? "text-blue-600" : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Đăng nhập
                    {activeTab === "login" && (
                      <motion.div
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("register")}
                    className={`ml-6 pb-2.5 font-bold text-xs relative px-1 transition-colors ${
                      activeTab === "register" ? "text-blue-600" : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Đăng ký tài khoản
                    {activeTab === "register" && (
                      <motion.div
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      />
                    )}
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Google OAuth trigger */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleLogin}
                    disabled={loading}
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

                  {/* Standard Form */}
                  <form onSubmit={handleEmailAuth} className="space-y-3">
                    {activeTab === "register" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Họ và tên</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            type="text"
                            placeholder="Nguyễn Văn A"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-9 h-9.5 rounded-xl text-xs bg-slate-50/50 border-slate-200"
                            required={activeTab === "register"}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Địa chỉ Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          type="email"
                          placeholder="example@gmail.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 h-9.5 rounded-xl text-xs bg-slate-50/50 border-slate-200"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Mật khẩu</label>
                        {activeTab === "login" && (
                          <button
                            type="button"
                            onClick={() => toast.info("Tính năng quên mật khẩu sẽ sớm được cập nhật.")}
                            className="text-[10px] text-blue-600 hover:underline font-semibold"
                          >
                            Quên mật khẩu?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-9 h-9.5 rounded-xl text-xs bg-slate-50/50 border-slate-200"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-10 mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      {loading
                        ? "Vui lòng đợi..."
                        : activeTab === "login"
                        ? "Đăng nhập"
                        : "Đăng ký tài khoản"}
                    </Button>
                  </form>
                </div>
              </div>

              <div className="text-[10px] text-slate-450 text-center pt-6 leading-relaxed font-semibold">
                Bằng việc tiếp tục, bạn đồng ý với các Điều khoản Dịch vụ và Chính sách Bảo mật của chúng tôi.
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
