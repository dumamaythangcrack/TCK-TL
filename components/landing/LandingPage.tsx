"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UploadModal from "@/components/modals/UploadModal";
import {
  Search,
  Brain,
  Upload,
  BookOpen,
  Sparkles,
  LogIn,
  User,
  Eye,
  Download,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  FolderLock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/documents?query=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/documents");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/40 text-slate-850 flex flex-col justify-between relative font-sans">
      
      {/* 1. STICKY SLICK NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/55 bg-white/80 backdrop-blur-md transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center font-extrabold text-xs text-white shadow-xs group-hover:bg-slate-800 transition-colors">
                TCK
              </div>
              <span className="font-extrabold text-xs tracking-wider text-slate-900 uppercase">
                Tài Liệu
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-500">
              <Link href="/documents" className="hover:text-slate-900 transition flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                Kho Tài Liệu
              </Link>
              <Link href="/ai" className="hover:text-slate-900 transition flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-slate-400" />
                AI Hub
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (!isLoggedIn) {
                  toast.error("Vui lòng đăng nhập trước khi đăng tải tài liệu!");
                  return;
                }
                setIsUploadOpen(true);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 h-8 rounded-xl flex items-center gap-1.5 shadow-xs transition-all duration-200"
            >
              <Upload className="h-3.5 w-3.5" />
              Đăng tài liệu
            </Button>

            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs px-3 h-8 rounded-xl flex items-center gap-1.5 shadow-2xs">
                  <User className="h-3.5 w-3.5 text-slate-450" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs px-3 h-8 rounded-xl flex items-center gap-1.5 shadow-2xs">
                  <LogIn className="h-3.5 w-3.5 text-slate-450" />
                  Đăng nhập
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. MINIMALIST HERO LANDING PORTAL */}
      <section className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-14 text-center space-y-6 z-10 w-full">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-750 rounded-full border border-slate-200/50 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-slate-500" /> Hệ sinh thái học tập TCK thế hệ mới
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Nền tảng chia sẻ tài liệu <br /> & giải bài tập bằng Trí tuệ nhân tạo
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed font-medium">
            Học tập khoa học, bảo mật và tinh gọn. Truy cập kho giáo trình chuẩn và nhận hỗ trợ giải bài tập chi tiết cùng trợ lý AI giáo viên chuyên nghiệp.
          </p>
        </div>

        {/* Dynamic Minimal Search Gateway */}
        <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex gap-2 bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.01),0_4px_16px_rgba(0,0,0,0.02)] focus-within:border-slate-350 transition-all duration-200">
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
          <Button type="submit" className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs px-4 h-8 rounded-xl shadow-xs transition-all duration-200">
            Tìm kiếm
          </Button>
        </form>
      </section>

      {/* 3. DOUBLE PORTAL ENTRY SECTION - TÀI LIỆU & AI */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-4 w-full z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Kho Tài Liệu */}
          <div className="bg-white border border-slate-200/60 p-6 rounded-2xl flex flex-col justify-between gap-6 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.02)] transition-all duration-300 group">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-slate-950 transition">Kho Tài Liệu Ôn Thi</h2>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Nơi bạn tìm thấy hàng nghìn đề thi thử tốt nghiệp THPT Quốc gia, slide bài giảng Đại học, giáo án đề kiểm tra một tiết các môn học chính lớp 1 đến lớp 12.
              </p>
            </div>
            
            <Link href="/documents" className="pt-2">
              <Button variant="ghost" className="p-0 text-xs font-bold text-slate-800 hover:bg-transparent group-hover:translate-x-1 transition-all flex items-center gap-1.5">
                Khám phá kho tài liệu <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </Link>
          </div>

          {/* Card 2: Trợ Lý AI Học Tập */}
          <div className="bg-white border border-slate-200/60 p-6 rounded-2xl flex flex-col justify-between gap-6 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.02)] transition-all duration-300 group">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
                <Brain className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-slate-950 transition">Gia Sư AI Học Tập</h2>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Tích hợp mô hình Gemini 2.5 Flash. Bạn có thể chụp ảnh bài tập toán lý hóa để giải chi tiết từng bước, tải giáo án PDF lên để tóm tắt hoặc tự tạo đề trắc nghiệm kiểm tra.
              </p>
            </div>
            
            <Link href="/ai" className="pt-2">
              <Button variant="ghost" className="p-0 text-xs font-bold text-slate-800 hover:bg-transparent group-hover:translate-x-1 transition-all flex items-center gap-1.5">
                Trải nghiệm Trợ lý AI học tập <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </Link>
          </div>

        </div>
      </section>

      {/* 4. SHOWCASE OUTSTANDING DOCUMENTS */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full z-10">
        <div className="flex justify-between items-center mb-6 border-b border-slate-200/50 pb-3">
          <div>
            <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Tài Liệu Nổi Bật Vừa Cập Nhật</h2>
          </div>
          <Link href="/documents" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition flex items-center gap-0.5">
            Xem tất cả <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {initialDocuments.slice(0, 3).map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-slate-200/55 rounded-2xl p-5 flex flex-col justify-between gap-5 shadow-3xs hover:shadow-[0_8px_24px_rgba(0,0,0,0.02)] hover:border-slate-300 transition-all duration-300 group"
            >
              <div className="space-y-3">
                <span className="text-[8px] bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
                  {doc.category?.name || "Tài liệu"}
                </span>
                
                <Link href={`/document/${doc.slug}`}>
                  <h3 className="text-xs font-bold text-slate-850 line-clamp-1 group-hover:text-slate-950 transition">
                    {doc.title}
                  </h3>
                </Link>
                <p className="text-[11px] text-slate-450 line-clamp-2 leading-relaxed font-medium">
                  {doc.description || "Không kèm mô tả chi tiết."}
                </p>
              </div>

              <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-500">{doc.subject?.name || "Học tập"}</span>
                <span className="flex items-center gap-1 font-semibold">
                  <Download className="h-3 w-3" /> {doc.download_count || 0} lượt tải
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. SLICK SECURE STORAGE BENEFITS */}
      <section className="bg-white border-t border-b border-slate-200/50 py-12 w-full z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-650 mx-auto mb-2">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Bảo Mật Bằng Supabase</h4>
            <p className="text-[10px] text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">Toàn bộ tài liệu được phân quyền Row-Level Security (RLS) an toàn trước khi tải xuống.</p>
          </div>

          <div className="space-y-2">
            <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-650 mx-auto mb-2">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Tải lên Cực nhanh</h4>
            <p className="text-[10px] text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">Sử dụng liên kết có chữ ký của kho lưu trữ để truyền tải trực tiếp từ trình duyệt của bạn.</p>
          </div>

          <div className="space-y-2">
            <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-650 mx-auto mb-2">
              <Globe className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Kiểm duyệt Minh bạch</h4>
            <p className="text-[10px] text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">Tất cả bài viết được duyệt kỹ lưỡng để tránh tài liệu rác và duy trì giáo trình chất lượng.</p>
          </div>
        </div>
      </section>

      {/* 6. STATIC SECURE FOOTER */}
      <footer className="w-full bg-slate-50/50 border-t border-slate-200/50 py-8 text-center text-[10px] text-slate-400 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-extrabold text-slate-600">TCK TÀI LIỆU &copy; {new Date().getFullYear()}</span>
          <div className="flex gap-4 text-[10px] text-slate-400 font-medium">
            <Link href="/documents" className="hover:text-slate-850 transition">Kho Tài Liệu</Link>
            <span>&bull;</span>
            <Link href="/ai" className="hover:text-slate-850 transition">Trợ Lý AI</Link>
            <span>&bull;</span>
            <span className="text-slate-500 font-semibold flex items-center gap-0.5">
              <CheckCircle2 className="h-3 w-3 text-slate-450" /> State: Active
            </span>
          </div>
        </div>
      </footer>

      {/* Render Upload Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
}
