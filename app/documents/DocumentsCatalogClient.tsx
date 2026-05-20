"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UploadModal from "@/components/modals/UploadModal";
import AuthModal from "@/components/modals/AuthModal";
import DocumentCard from "@/components/cards/DocumentCard";
import UserDropdown from "@/components/layout/UserDropdown";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import {
  Search,
  BookOpen,
  Brain,
  Upload,
  User,
  LogIn,
  BookMarked,
  Compass,
  Plus
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { searchDocuments } from "@/actions/documents";
import { createClient } from "@/lib/supabase/client";

interface DocumentsCatalogClientProps {
  initialDocuments: any[];
  categories: any[];
  grades: any[];
  subjects: any[];
  isLoggedIn: boolean;
  currentUser: any;
}

export default function DocumentsCatalogClient({
  initialDocuments,
  categories,
  grades,
  subjects,
  isLoggedIn,
  currentUser,
}: DocumentsCatalogClientProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "downloads" | "likes">("newest");
  const [isSearching, setIsSearching] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

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

  const executeSearch = async (
    query: string,
    catId: string,
    gradeId: string,
    subId: string,
    sort: "newest" | "downloads" | "likes"
  ) => {
    setIsSearching(true);
    try {
      const res = await searchDocuments({
        query: query.trim() || undefined,
        categoryId: catId === "all" ? undefined : catId,
        gradeId: gradeId === "all" ? undefined : gradeId,
        subjectId: subId === "all" ? undefined : subId,
        sortBy: sort === "newest" ? "newest" : sort === "downloads" ? "downloads" : "likes",
        status: "approved",
      }, 30, 0);

      if (res && res.data) {
        setDocuments(res.data);
      } else {
        // client-side fallback
        let filtered = [...initialDocuments];
        if (query.trim()) {
          filtered = filtered.filter(doc => doc.title.toLowerCase().includes(query.toLowerCase()));
        }
        if (catId !== "all") filtered = filtered.filter(doc => doc.category_id === catId);
        if (gradeId !== "all") filtered = filtered.filter(doc => doc.grade_id === gradeId);
        if (subId !== "all") filtered = filtered.filter(doc => doc.subject_id === subId);
        setDocuments(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    executeSearch(val, selectedCategory, selectedGrade, selectedSubject, sortBy);
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    executeSearch(searchQuery, id, selectedGrade, selectedSubject, sortBy);
  };

  const handleGradeSelect = (id: string) => {
    setSelectedGrade(id);
    executeSearch(searchQuery, selectedCategory, id, selectedSubject, sortBy);
  };

  const handleSubjectSelect = (id: string) => {
    setSelectedSubject(id);
    executeSearch(searchQuery, selectedCategory, selectedGrade, id, sortBy);
  };

  const handleSortChange = (sort: "newest" | "downloads" | "likes") => {
    setSortBy(sort);
    executeSearch(searchQuery, selectedCategory, selectedGrade, selectedSubject, sort);
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
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 flex flex-col justify-between relative font-sans pb-16 md:pb-0">
      
      {/* 1. STICKY SLICK NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-black/[0.05] bg-white/70 backdrop-blur-md transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="h-6.5 w-6.5 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-[11px] text-white shadow-sm group-hover:bg-blue-700 transition-colors">
                T
              </div>
              <span className="font-extrabold text-xs tracking-tight text-slate-905 uppercase">
                TCK <span className="font-normal text-slate-450 lowercase">tài liệu</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-500">
              <Link href="/documents" className="text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-blue-50/50">
                <Compass className="h-3.5 w-3.5 text-blue-600" />
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

            {isLoggedIn && currentUser ? (
              <UserDropdown user={currentUser} />
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

      {/* Catalog Workspace */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 flex flex-col lg:flex-row gap-8 z-10">
        
        {/* Left Filter Sidebar - Google Drive/Notion Style */}
        <aside className="w-full lg:w-60 shrink-0 space-y-5">
          
          {/* Categories Sidebar navigation */}
          <div className="bg-white border border-black/[0.05] p-4 rounded-2xl space-y-3 shadow-3xs">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Danh Mục Tài Liệu</h3>
            <div className="space-y-1">
              <button
                onClick={() => handleCategorySelect("all")}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-blue-50 text-blue-600 font-bold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                Tất cả danh mục
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all truncate cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-blue-50 text-blue-600 font-bold"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <BookMarked className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grades Filter */}
          <div className="bg-white border border-black/[0.05] rounded-2xl p-4 space-y-3 shadow-3xs">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Khối Lớp</h3>
            <div className="grid grid-cols-2 gap-1 text-[9px]">
              <button
                onClick={() => handleGradeSelect("all")}
                className={`py-1.5 px-1.5 rounded-xl font-bold border transition-all cursor-pointer truncate ${
                  selectedGrade === "all"
                    ? "bg-blue-600 border-blue-700 text-white shadow-2xs"
                    : "bg-slate-50 border-black/[0.05] text-slate-600 hover:bg-slate-100"
                }`}
              >
                Tất cả lớp
              </button>
              {grades.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGradeSelect(g.id)}
                  className={`py-1.5 px-1.5 rounded-xl font-bold border transition-all truncate cursor-pointer ${
                    selectedGrade === g.id
                      ? "bg-blue-600 border-blue-700 text-white shadow-2xs"
                      : "bg-slate-50 border-black/[0.05] text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

        </aside>

        {/* Right Search Content Panel */}
        <section className="flex-1 space-y-5">
          
          {/* Top Search Gateway & Sorting Controls */}
          <div className="bg-white border border-black/[0.05] p-4 rounded-2xl shadow-3xs space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Tìm kiếm tài liệu ôn thi đại học, đề thi kiểm tra, giáo án..."
                  className="pl-9 h-10 bg-slate-50 border-black/[0.05] text-slate-900 placeholder-slate-450 focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-500 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(val: any) => handleSortChange(val)}>
                  <SelectTrigger className="bg-slate-50 border-black/[0.05] text-slate-700 rounded-xl h-10 text-[10px] w-[130px] font-bold">
                    <SelectValue placeholder="Sắp xếp" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-800 text-xs">
                    <SelectItem value="newest">Mới đăng nhất</SelectItem>
                    <SelectItem value="downloads">Tải nhiều nhất</SelectItem>
                    <SelectItem value="likes">Yêu thích nhất</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Horizontal Subjects Quick Filter bar */}
            <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-3">
              <button
                onClick={() => handleSubjectSelect("all")}
                className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all cursor-pointer ${
                  selectedSubject === "all"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-500 border border-black/[0.05]"
                }`}
              >
                Tất cả môn học
              </button>
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleSubjectSelect(sub.id)}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all cursor-pointer ${
                    selectedSubject === sub.id
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-500 border border-black/[0.05]"
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>

          {/* Results Listings */}
          {isSearching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="bg-white border border-black/[0.05] rounded-2xl p-5 space-y-5 shadow-3xs animate-pulse">
                  <div className="h-32 bg-slate-100 rounded-xl shimmer" />
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-150 rounded shimmer w-3/4" />
                    <div className="h-3 bg-slate-150 rounded shimmer w-5/6" />
                    <div className="h-3 bg-slate-150 rounded shimmer w-2/3" />
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex justify-between">
                    <div className="h-5 bg-slate-150 rounded shimmer w-12" />
                    <div className="h-5 bg-slate-150 rounded shimmer w-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white border border-black/[0.05] rounded-3xl p-12 text-center flex flex-col items-center gap-4 shadow-3xs max-w-md mx-auto mt-6">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-1">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Chưa có tài liệu phù hợp</h3>
              <p className="text-[11px] text-slate-500 max-w-xs font-semibold leading-relaxed">
                Nền tảng chưa có tài liệu nào thuộc danh mục này. Hãy đóng góp và chia sẻ tài liệu hữu ích của bạn để tích luỹ lượt tải!
              </p>
              <Button
                onClick={() => {
                  if (!isLoggedIn) {
                    setAuthTab("login");
                    setIsAuthOpen(true);
                  } else {
                    setIsUploadOpen(true);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 h-9 rounded-xl flex items-center gap-1.5 shadow-2xs mt-1 transition-all"
              >
                <Plus className="h-4 w-4" />
                Đăng tài liệu đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  isBookmarked={bookmarkedIds.includes(doc.id)}
                  onBookmarkClick={handleBookmarkClick}
                />
              ))}
            </div>
          )}
        </section>

      </main>

      {/* 6. STATIC SECURE FOOTER */}
      <footer className="w-full bg-slate-50/50 border-t border-black/[0.05] py-8 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} TCK <span className="font-light text-slate-500 lowercase">tài liệu</span>. Nền tảng chia sẻ tài liệu mở hàng đầu Việt Nam.</p>
      </footer>

      {/* Auth Modal Portal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialTab={authTab}
      />

      {/* Render Upload Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        isLoggedIn={isLoggedIn}
        onUploadClick={() => setIsUploadOpen(true)}
        onAuthClick={() => {
          setAuthTab("login");
          setIsAuthOpen(true);
        }}
      />
    </div>
  );
}
