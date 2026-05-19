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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between relative font-sans">
      
      {/* Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/95 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-sm group-hover:bg-blue-700 transition-colors">
                TCK
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 uppercase">
                Tài Liệu
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-650">
              <Link href="/documents" className="text-blue-600 hover:text-blue-700 transition flex items-center gap-1.5 font-bold">
                <Compass className="h-4 w-4" />
                Kho Tài Liệu
              </Link>
              <Link href="/ai" className="hover:text-blue-600 transition flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-blue-600" />
                Trợ lý AI
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                if (!isLoggedIn) {
                  toast.error("Vui lòng đăng nhập trước khi tải lên tài liệu!");
                  return;
                }
                setIsUploadOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition group"
            >
              <Upload className="h-4 w-4" />
              Đăng tài liệu
            </Button>

            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs md:text-sm rounded-xl flex items-center gap-1.5">
                  <User className="h-4 w-4 text-blue-600" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs md:text-sm rounded-xl flex items-center gap-1.5">
                  <LogIn className="h-4 w-4" />
                  Đăng nhập
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Catalog Workspace */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full flex-1 flex flex-col lg:flex-row gap-8">
        
        {/* Left Filter Sidebar - Google Drive/Notion Style */}
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
          
          {/* Categories Sidebar navigation */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-3xs">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Danh Mục Tài Liệu</h3>
            <div className="space-y-1">
              <button
                onClick={() => handleCategorySelect("all")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  selectedCategory === "all"
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Compass className="h-4 w-4" />
                Tất cả danh mục
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition truncate ${
                    selectedCategory === cat.id
                      ? "bg-blue-50 text-blue-600 animate-pulse-once"
                      : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <BookMarked className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grades Filter */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-3xs">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Khối Lớp</h3>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <button
                onClick={() => handleGradeSelect("all")}
                className={`py-1.5 px-2 rounded-lg font-bold border transition ${
                  selectedGrade === "all"
                    ? "bg-slate-900 border-slate-950 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Tất cả lớp
              </button>
              {grades.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGradeSelect(g.id)}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition truncate ${
                    selectedGrade === g.id
                      ? "bg-slate-900 border-slate-950 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

        </aside>

        {/* Right Search Content Panel */}
        <section className="flex-1 space-y-6">
          
          {/* Top Search Gateway & Sorting Controls */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-3xl shadow-3xs space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Tìm kiếm tài liệu ôn thi đại học, đề thi kiểm tra, giáo án..."
                  className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600 rounded-2xl text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(val: any) => handleSortChange(val)}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-700 rounded-2xl h-12 text-xs w-[140px]">
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
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
              <button
                onClick={() => handleSubjectSelect("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  selectedSubject === "all"
                    ? "bg-blue-600 text-white shadow-3xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200/60"
                }`}
              >
                Tất cả môn học
              </button>
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleSubjectSelect(sub.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    selectedSubject === sub.id
                      ? "bg-blue-600 text-white shadow-3xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200/60"
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>

          {/* Results Listings */}
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white border border-slate-200/60 rounded-3xl">
              <div className="h-8 w-8 rounded-full border-2 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <span className="text-xs text-slate-400">Đang quét thư mục tài liệu...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center flex flex-col items-center gap-4 shadow-3xs">
              <BookOpen className="h-14 w-14 text-slate-350" />
              <h3 className="font-bold text-lg text-slate-800">Không có tài liệu trùng khớp</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Hãy làm sạch hoặc tùy chọn lại bộ lọc môn học, khối lớp để tìm thấy tài liệu phù hợp hơn.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between gap-5 hover:border-blue-600/30 hover:shadow-lg transition-all duration-300 group shadow-3xs"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                        {doc.category?.name || "Tài liệu"}
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Được phê duyệt
                      </span>
                    </div>

                    <Link href={`/document/${doc.slug}`}>
                      <h3 className="text-sm font-extrabold text-slate-800 group-hover:text-blue-600 cursor-pointer transition line-clamp-1 leading-snug">
                        {doc.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {doc.description || "Tài liệu ôn thi chia sẻ cộng đồng không kèm mô tả."}
                    </p>
                  </div>

                  <div className="space-y-3 border-t border-slate-100 pt-3.5">
                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1 text-[9px] text-slate-500 font-semibold">
                      {doc.grade?.name && (
                        <span className="bg-slate-50 text-slate-650 px-2 py-0.5 rounded border border-slate-200/60">
                          {doc.grade.name}
                        </span>
                      )}
                      {doc.subject?.name && (
                        <span className="bg-slate-50 text-slate-650 px-2 py-0.5 rounded border border-slate-200/60">
                          {doc.subject.name}
                        </span>
                      )}
                      {doc.files && (
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded">
                          {doc.files.length} Tệp tin
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between items-center text-[9px] text-slate-450">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
                          {doc.uploader?.full_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <span className="font-bold text-slate-600 truncate max-w-[80px]">{doc.uploader?.full_name || "Thành viên"}</span>
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
      <footer className="w-full bg-white border-t border-slate-200/60 py-8 mt-16 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} TCK Tài Liệu. Nền tảng chia sẻ tài liệu mở hàng đầu Việt Nam.</p>
      </footer>

      {/* Render Upload Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
}
