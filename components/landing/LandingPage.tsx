"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import UploadModal from "@/components/modals/UploadModal";
import AuthModal from "@/components/modals/AuthModal";
import DocumentCard from "@/components/cards/DocumentCard";
import {
  Search,
  Brain,
  Upload,
  BookOpen,
  Sparkles,
  LogIn,
  User,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Plus
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface LandingPageProps {
  initialDocuments: any[];
  categories: any[];
  grades: any[];
  subjects: any[];
  isLoggedIn: boolean;
  currentUser: any;
}

export default function LandingPage({
  initialDocuments,
  categories,
  grades,
  subjects,
  isLoggedIn,
  currentUser,
}: LandingPageProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const router = useRouter();

  // Load initial bookmarked items if logged in
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      const loadBookmarks = async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("bookmarks")
          .select("bundle_id")
          .eq("user_id", currentUser.id);
        if (data) {
          setBookmarkedIds(data.map((b) => b.bundle_id));
        }
      };
      loadBookmarks();
    }
  }, [isLoggedIn, currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/documents?query=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/documents");
    }
  };

  const handleBookmarkClick = async (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      setAuthTab("login");
      setIsAuthOpen(true);
      return;
    }

    const supabase = createClient();
    const isSaved = bookmarkedIds.includes(docId);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("bundle_id", docId);
        if (error) throw error;
        setBookmarkedIds((prev) => prev.filter((id) => id !== docId));
        toast.success("Đã bỏ lưu tài liệu.");
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert({ user_id: currentUser.id, bundle_id: docId });
        if (error) throw error;
        setBookmarkedIds((prev) => [...prev, docId]);
        toast.success("Đã lưu tài liệu thành công!");
      }
    } catch (err: any) {
      toast.error(err.message || "Không thể thực hiện thao tác lưu tài liệu.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 flex flex-col justify-between relative font-sans overflow-x-hidden">
      
      {/* Dynamic Background Mesh Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-[400px] left-[-200px] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* 1. STICKY SLICK GLASS NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-black/[0.05] bg-white/70 backdrop-blur-md transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="h-6.5 w-6.5 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-[11px] text-white shadow-sm group-hover:bg-blue-700 transition-colors">
                T
              </div>
              <span className="font-extrabold text-xs tracking-tight text-slate-900 uppercase">
                TCK <span className="font-normal text-slate-400 lowercase">tài liệu</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-500">
              <Link href="/documents" className="hover:text-slate-900 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-100/50">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                Kho Tài Liệu
              </Link>
              <Link href="/ai" className="hover:text-slate-900 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-100/50">
                <Brain className="h-3.5 w-3.5 text-slate-400" />
                AI Hub
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (!isLoggedIn) {
                  setAuthTab("login");
                  setIsAuthOpen(true);
                  return;
                }
                setIsUploadOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 h-8 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all duration-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Đăng tài liệu
            </Button>

            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="outline" className="border-black/[0.06] bg-white/50 hover:bg-slate-100 text-slate-700 text-xs px-3 h-8 rounded-xl flex items-center gap-1.5 shadow-3xs transition-all duration-200">
                  <User className="h-3.5 w-3.5 text-slate-450" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setAuthTab("login");
                  setIsAuthOpen(true);
                }}
                className="border-black/[0.06] bg-white/50 hover:bg-slate-100 text-slate-700 text-xs px-3 h-8 rounded-xl flex items-center gap-1.5 shadow-3xs transition-all duration-200 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5 text-slate-400" />
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MINIMALIST HERO PORTAL */}
      <section className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-12 text-center space-y-6 z-10 w-full">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-[9px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-blue-500 animate-pulse" /> Hệ sinh thái học tập TCK thế hệ mới
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.12]">
            Nền tảng chia sẻ tài liệu <br /> & giải bài tập bằng Trí tuệ nhân tạo
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed font-semibold">
            Học tập khoa học, bảo mật và tinh gọn. Truy cập kho giáo trình chuẩn và nhận hỗ trợ giải bài tập chi tiết cùng trợ lý AI giáo viên chuyên nghiệp.
          </p>
        </div>

        {/* Dynamic Minimal Search Gateway */}
        <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex gap-2 bg-white border border-black/[0.06] p-1.5 rounded-2xl shadow-sm hover:border-black/[0.1] focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-300">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập tên tài liệu, đề thi thử Toán, Lý, Hóa..."
              className="w-full pl-9 bg-transparent border-0 outline-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 h-8 rounded-xl shadow-2xs transition-all duration-200">
            Tìm kiếm
          </Button>
        </form>
      </section>

      {/* 3. ENTRY PORTAL SECTION - TÀI LIỆU & AI */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-4 w-full z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Portal 1: Kho Tài Liệu */}
          <div className="bg-white border border-black/[0.05] p-6 rounded-2xl flex flex-col justify-between gap-6 hover:border-black/[0.08] hover:shadow-sm transition-all duration-300 group">
            <div className="space-y-3">
              <div className="h-9 w-9 rounded-xl bg-blue-50/50 border border-blue-100/40 flex items-center justify-center text-blue-600">
                <BookOpen className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">Kho Tài Liệu Ôn Thi</h2>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Nơi bạn tìm thấy hàng nghìn đề thi thử tốt nghiệp THPT Quốc gia, slide bài giảng Đại học, giáo án đề kiểm tra các môn học chính lớp 1 đến lớp 12.
              </p>
            </div>
            
            <Link href="/documents" className="pt-1">
              <Button variant="ghost" className="p-0 text-xs font-bold text-blue-600 hover:bg-transparent group-hover:translate-x-0.5 transition-all flex items-center gap-1.5 cursor-pointer">
                Khám phá kho tài liệu <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
              </Button>
            </Link>
          </div>

          {/* Portal 2: Trợ Lý AI Học Tập */}
          <div className="bg-white border border-black/[0.05] p-6 rounded-2xl flex flex-col justify-between gap-6 hover:border-black/[0.08] hover:shadow-sm transition-all duration-300 group">
            <div className="space-y-3">
              <div className="h-9 w-9 rounded-xl bg-blue-50/50 border border-blue-100/40 flex items-center justify-center text-blue-600">
                <Brain className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">Gia Sư AI Học Tập</h2>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Tích hợp mô hình Gemini 2.5 Flash. Bạn có thể chụp ảnh bài tập toán lý hóa để giải chi tiết từng bước, tải giáo án PDF lên để tóm tắt hoặc tự tạo đề trắc nghiệm kiểm tra.
              </p>
            </div>
            
            <Link href="/ai" className="pt-1">
              <Button variant="ghost" className="p-0 text-xs font-bold text-blue-600 hover:bg-transparent group-hover:translate-x-0.5 transition-all flex items-center gap-1.5 cursor-pointer">
                Trải nghiệm Trợ lý AI học tập <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
              </Button>
            </Link>
          </div>

        </div>
      </section>

      {/* 4. SHOWCASE OUTSTANDING DOCUMENTS */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full z-10">
        <div className="flex justify-between items-center mb-6 border-b border-black/[0.05] pb-3">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tài Liệu Nổi Bật Vừa Cập Nhật</h2>
          </div>
          <Link href="/documents" className="text-xs font-bold text-slate-500 hover:text-blue-600 transition flex items-center gap-0.5">
            Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {initialDocuments.slice(0, 3).map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isBookmarked={bookmarkedIds.includes(doc.id)}
              onBookmarkClick={handleBookmarkClick}
            />
          ))}
        </div>
      </section>

      {/* 5. SLICK SECURE STORAGE BENEFITS */}
      <section className="bg-white/50 backdrop-blur-md border-t border-b border-black/[0.05] py-16 w-full z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-700 mx-auto mb-2.5">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Bảo Mật Bằng Supabase</h4>
            <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto leading-relaxed">Toàn bộ tài liệu được phân quyền Row-Level Security (RLS) an toàn trước khi tải xuống.</p>
          </div>

          <div className="space-y-2">
            <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-700 mx-auto mb-2.5">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Tải lên Cực nhanh</h4>
            <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto leading-relaxed">Sử dụng liên kết có chữ ký của kho lưu trữ để truyền tải trực tiếp từ trình duyệt của bạn.</p>
          </div>

          <div className="space-y-2">
            <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-700 mx-auto mb-2.5">
              <Globe className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Kiểm duyệt Minh bạch</h4>
            <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto leading-relaxed">Tất cả bài viết được duyệt kỹ lưỡng để tránh tài liệu rác và duy trì giáo trình chất lượng.</p>
          </div>
        </div>
      </section>

      {/* 6. STATIC SECURE FOOTER */}
      <footer className="w-full bg-slate-50/50 border-t border-black/[0.05] py-8 text-center text-xs text-slate-400 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-extrabold text-slate-700">TCK <span className="font-light text-slate-500 lowercase">tài liệu</span></span>
          <div className="flex gap-4 text-xs text-slate-400 font-semibold">
            <Link href="/documents" className="hover:text-slate-900 transition">Kho Tài Liệu</Link>
            <span>&bull;</span>
            <Link href="/ai" className="hover:text-slate-900 transition">Trợ Lý AI</Link>
          </div>
        </div>
      </footer>

      {/* Auth Modal Portal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialTab={authTab}
      />

      {/* Render Upload Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
}
