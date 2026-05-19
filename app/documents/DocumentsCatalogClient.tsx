"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UploadModal from "@/components/modals/UploadModal";
import {
  Search,
  BookOpen,
  Filter,
  Eye,
  Download,
  CheckCircle2,
  Brain,
  Upload,
  User,
  LogIn,
  SlidersHorizontal,
  ChevronRight,
  BookMarked,
  Tags,
  Compass,
  LayoutGrid
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { searchDocuments } from "@/actions/documents";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "downloads" | "likes">("newest");
  const [isSearching, setIsSearching] = useState(false);

  // Server-side + client fallback searching
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

  return (
    <div className="min-h-screen bg-slate-50/40 text-slate-850 flex flex-col justify-between relative font-sans">
      
      {/* Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/55 bg-white/80 backdrop-blur-md transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center font-extrabold text-xs text-white shadow-xs group-hover:bg-slate-800 transition-colors">
                TCK
              </div>
              <span className="font-extrabold text-xs tracking-wider text-slate-900 uppercase">
                Tài Liệu
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-550">
              <Link href="/documents" className="text-slate-900 hover:text-slate-950 transition flex items-center gap-1.5 font-bold">
                <Compass className="h-3.5 w-3.5" />
                Kho Tài Liệu
              </Link>
              <Link href="/ai" className="hover:text-slate-900 transition flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-slate-450" />
                AI Hub
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (!isLoggedIn) {
                  toast.error("Vui lòng đăng nhập trước khi tải lên tài liệu!");
                  return;
                }
                setIsUploadOpen(true);
              }}
              className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs px-3.5 py-1.5 h-8 rounded-xl flex items-center gap-1.5 shadow-xs transition-all duration-200"
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

      {/* Catalog Workspace */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 w-full flex-1 flex flex-col lg:flex-row gap-8">
        
        {/* Left Filter Sidebar - Google Drive/Notion Style */}
        <aside className="w-full lg:w-60 shrink-0 space-y-5">
          
          {/* Categories Sidebar navigation */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 space-y-3 shadow-3xs">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Danh Mục Tài Liệu</h3>
            <div className="space-y-1">
              <button
                onClick={() => handleCategorySelect("all")}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  selectedCategory === "all"
                    ? "bg-slate-100 text-slate-900"
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
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition truncate ${
                    selectedCategory === cat.id
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <BookMarked className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grades Filter */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 space-y-3 shadow-3xs">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Khối Lớp</h3>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <button
                onClick={() => handleGradeSelect("all")}
                className={`py-1 px-1.5 rounded-lg font-bold border transition ${
                  selectedGrade === "all"
                    ? "bg-slate-900 border-slate-950 text-white"
                    : "bg-slate-50 border-slate-200/60 text-slate-650 hover:bg-slate-100/60"
                }`}
              >
                Tất cả lớp
              </button>
              {grades.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGradeSelect(g.id)}
                  className={`py-1 px-1.5 rounded-lg font-bold border transition truncate ${
                    selectedGrade === g.id
                      ? "bg-slate-900 border-slate-950 text-white"
                      : "bg-slate-50 border-slate-200/60 text-slate-650 hover:bg-slate-100/60"
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
          <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-3xs space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Tìm kiếm tài liệu ôn thi đại học, đề thi kiểm tra, giáo án..."
                  className="pl-9 h-10 bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-450 focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:border-slate-400 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(val: any) => handleSortChange(val)}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-700 rounded-xl h-10 text-[11px] w-[130px]">
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
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition ${
                  selectedSubject === "all"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-550 border border-slate-200/50"
                }`}
              >
                Tất cả môn học
              </button>
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleSubjectSelect(sub.id)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition ${
                    selectedSubject === sub.id
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-550 border border-slate-200/50"
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>

          {/* Results Listings */}
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white border border-slate-200/60 rounded-2xl animate-pulse">
              <div className="h-6 w-6 rounded-full border-2 border-t-slate-800 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <span className="text-[10px] text-slate-450 font-medium">Đang tìm kiếm trong kho dữ liệu...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white border border-slate-200/60 rounded-2xl p-16 text-center flex flex-col items-center gap-3 shadow-3xs">
              <BookOpen className="h-10 w-10 text-slate-350" />
              <h3 className="font-bold text-sm text-slate-800">Không tìm thấy tài liệu phù hợp</h3>
              <p className="text-[11px] text-slate-450 max-w-xs font-medium leading-relaxed">
                Thử điều chỉnh lại từ khóa hoặc bỏ các bộ lọc môn học và lớp học để xem thêm nhiều tài liệu khác.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200/55 rounded-2xl p-5 flex flex-col justify-between gap-5 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.02)] transition-all duration-300 group shadow-3xs"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[8px] bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
                        {doc.category?.name || "Tài liệu"}
                      </span>
                      <span className="text-[8px] text-emerald-600 font-extrabold flex items-center gap-1 bg-emerald-50 border border-emerald-100/65 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="h-3 w-3" /> ĐÃ DUYỆT
                      </span>
                    </div>

                    <Link href={`/document/${doc.slug}`}>
                      <h3 className="text-xs font-bold text-slate-850 group-hover:text-slate-950 cursor-pointer transition line-clamp-1 leading-snug">
                        {doc.title}
                      </h3>
                    </Link>

                    <p className="text-[11px] text-slate-550 line-clamp-2 leading-relaxed font-medium">
                      {doc.description || "Tài liệu ôn thi chia sẻ cộng đồng không kèm mô tả."}
                    </p>
                  </div>

                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1 text-[9px] text-slate-500 font-bold">
                      {doc.grade?.name && (
                        <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200/50">
                          {doc.grade.name}
                        </span>
                      )}
                      {doc.subject?.name && (
                        <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200/50">
                          {doc.subject.name}
                        </span>
                      )}
                      {doc.files && (
                        <span className="bg-slate-900 text-white px-2 py-0.5 rounded">
                          {doc.files.length} tệp
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-650 border border-slate-200 flex items-center justify-center font-bold">
                          {doc.uploader?.full_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <span className="text-slate-550 truncate max-w-[80px]">{doc.uploader?.full_name || "Thành viên"}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5">
                          <Eye className="h-3 w-3" /> {doc.view_count || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Download className="h-3 w-3" /> {doc.download_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full bg-slate-50/50 border-t border-slate-200/50 py-8 text-center text-[10px] text-slate-400">
        <p>&copy; {new Date().getFullYear()} TCK Tài Liệu. Nền tảng chia sẻ tài liệu mở hàng đầu Việt Nam.</p>
      </footer>

      {/* Render Upload Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
}
