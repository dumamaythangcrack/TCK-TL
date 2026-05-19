"use server";

import { getDashboardData } from "@/actions/profile";
import { getAiHistory } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Bookmark, Brain, History, User, CheckCircle, Clock, AlertTriangle, Sparkles } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  let dashboardData;
  let aiHistory: any[] = [];

  try {
    dashboardData = await getDashboardData();
    aiHistory = await getAiHistory();
  } catch (error) {
    // Redirect if unauthorized
    redirect("/login");
  }

  const { profile, uploads, bookmarks, downloads } = dashboardData;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 relative">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-100/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-100/10 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header Hero Section */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center shadow-xs">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-md">
              {profile?.full_name?.charAt(0).toUpperCase() || profile?.email.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                Xin chào, {profile?.full_name || profile?.email}
                {profile?.role === "admin" && (
                  <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                    Admin
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400">Email: {profile?.email}</p>
              {profile?.bio && <p className="text-sm text-slate-500 mt-1 max-w-md">{profile.bio}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/ai">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center gap-1.5 rounded-xl shadow-xs">
                <Sparkles className="h-4 w-4" />
                Học tập AI
              </Button>
            </Link>
            {profile?.role === "admin" && (
              <Link href="/adminpanel">
                <Button variant="outline" className="border-red-200 text-red-650 hover:bg-red-50 rounded-xl">
                  Quản trị viên
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "Tổng tài liệu", value: uploads.length, desc: "Đã tải lên hệ thống", icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-100" },
            { title: "Duyệt thành công", value: uploads.filter(u => u.status === "approved").length, desc: "Đã được phê duyệt", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
            { title: "Tài liệu lưu", value: bookmarks.length, desc: "Trong danh sách lưu", icon: Bookmark, color: "text-yellow-600 bg-yellow-50 border-yellow-100" },
            { title: "Lượt tải về", value: downloads.length, desc: "Tài liệu đã tải về", icon: Download, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          ].map((stat, idx) => (
            <Card key={idx} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-4">
                <CardTitle className="text-xs font-semibold text-slate-400">{stat.title}</CardTitle>
                <div className={`p-1.5 rounded-lg border ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                <p className="text-[10px] text-slate-400 mt-0.5">{stat.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="my-uploads" className="w-full space-y-6">
          <TabsList className="bg-slate-200/60 border border-slate-200/30 p-1 rounded-2xl flex gap-1 justify-start overflow-x-auto w-full md:w-max">
            <TabsTrigger value="my-uploads" className="rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FileText className="h-4 w-4" />
              Tài liệu của tôi
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Bookmark className="h-4 w-4" />
              Tài liệu đã lưu
            </TabsTrigger>
            <TabsTrigger value="downloads" className="rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Download className="h-4 w-4" />
              Lịch sử tải
            </TabsTrigger>
            <TabsTrigger value="ai" className="rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Brain className="h-4 w-4" />
              AI Lịch sử
            </TabsTrigger>
          </TabsList>

          {/* 1. MY UPLOADS */}
          <TabsContent value="my-uploads" className="space-y-4 outline-none">
            {uploads.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center flex flex-col items-center gap-3 shadow-xs">
                <FileText className="h-12 w-12 text-slate-300" />
                <h3 className="font-bold text-lg text-slate-800">Chưa tải tài liệu nào</h3>
                <p className="text-sm text-slate-500 max-w-sm">Hãy chia sẻ giáo án, đề cương hoặc tài liệu học tập của bạn để tích lũy lượt tải!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uploads.map((doc) => (
                  <div key={doc.id} className="p-5 bg-white border border-slate-200/80 rounded-2xl flex flex-col justify-between gap-4 shadow-xs">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-3">
                        <Link href={`/document/${doc.slug}`}>
                          <h3 className="font-bold text-slate-800 hover:text-blue-600 transition text-sm md:text-base line-clamp-1 cursor-pointer">
                            {doc.title}
                          </h3>
                        </Link>
                        
                        {/* Status badges */}
                        {doc.status === "approved" && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Đã duyệt
                          </span>
                        )}
                        {doc.status === "pending" && (
                          <span className="text-[10px] bg-yellow-50 text-yellow-600 border border-yellow-100 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Chờ duyệt
                          </span>
                        )}
                        {doc.status === "rejected" && (
                          <span className="text-[10px] bg-red-50 text-red-650 border border-red-100 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Bị từ chối
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{doc.description || "Không có mô tả."}</p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-3 mt-1">
                      <span>Lớp: {doc.grade?.name || "N/A"} • Môn: {doc.subject?.name || "N/A"}</span>
                      <span>Lượt xem: {doc.view_count} • Tải về: {doc.download_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 2. BOOKMARKS */}
          <TabsContent value="bookmarks" className="space-y-4 outline-none">
            {bookmarks.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center flex flex-col items-center gap-3 shadow-xs">
                <Bookmark className="h-12 w-12 text-slate-300" />
                <h3 className="font-bold text-lg text-slate-800">Chưa có tài liệu đã lưu</h3>
                <p className="text-sm text-slate-500 max-w-sm">Tài liệu bạn bấm lưu sẽ xuất hiện tại đây để dễ dàng xem lại.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookmarks.map((doc: any) => (
                  <div key={doc.id} className="p-5 bg-white border border-slate-200/80 rounded-2xl flex flex-col justify-between gap-4 shadow-xs">
                    <div className="space-y-2">
                      <Link href={`/document/${doc.slug}`}>
                        <h3 className="font-bold text-slate-800 hover:text-blue-600 transition text-sm md:text-base line-clamp-1 cursor-pointer">
                          {doc.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{doc.description || "Không có mô tả."}</p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-3 mt-1">
                      <span>Đăng bởi: {doc.uploader?.full_name || "N/A"}</span>
                      <span>Lượt xem: {doc.view_count} • Lượt thích: {doc.like_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 3. DOWNLOAD HISTORY */}
          <TabsContent value="downloads" className="space-y-4 outline-none">
            {downloads.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center flex flex-col items-center gap-3 shadow-xs">
                <Download className="h-12 w-12 text-slate-300" />
                <h3 className="font-bold text-lg text-slate-800">Lịch sử tải trống</h3>
                <p className="text-sm text-slate-500 max-w-sm">Danh sách tài liệu bạn đã tải xuống máy tính sẽ lưu trữ tại đây.</p>
              </div>
            ) : (
              <div className="p-6 bg-white border border-slate-200/80 rounded-2xl space-y-4 shadow-xs">
                {downloads.map((log: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-b-0 text-xs md:text-sm">
                    <div className="flex items-center gap-3">
                      <Download className="h-4 w-4 text-indigo-650" />
                      {log.bundle ? (
                        <Link href={`/document/${log.bundle.slug}`} className="text-slate-700 hover:text-blue-600 transition font-medium">
                          {log.bundle.title}
                        </Link>
                      ) : (
                        <span className="text-slate-400">[Tài liệu đã bị xóa]</span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[10px] md:text-xs">
                      {new Date(log.created_at).toLocaleString("vi-VN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 4. AI INTERACTION HISTORY */}
          <TabsContent value="ai" className="space-y-4 outline-none">
            {aiHistory.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center flex flex-col items-center gap-3 shadow-xs">
                <Brain className="h-12 w-12 text-slate-300" />
                <h3 className="font-bold text-lg text-slate-800">Chưa dùng AI giải bài</h3>
                <p className="text-sm text-slate-500 max-w-sm">Các bài toán, bài văn đã giải bằng công nghệ TCK AI Solver của bạn.</p>
              </div>
            ) : (
              <div className="p-6 bg-white border border-slate-200/80 rounded-2xl space-y-4 shadow-xs">
                {aiHistory.map((log) => (
                  <div key={log.id} className="py-3 border-b border-slate-100 last:border-b-0 text-xs space-y-1">
                    <div className="flex justify-between items-center text-blue-600 font-semibold text-[10px]">
                      <span>{new Date(log.created_at).toLocaleString("vi-VN")}</span>
                      <Link href="/ai" className="hover:underline flex items-center gap-0.5">
                        Đi tới AI Solver <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <p className="text-slate-800 font-medium line-clamp-1">Hỏi: {log.prompt}</p>
                    <p className="text-slate-500 line-clamp-2">{log.response}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ChevronRight fallback icon
function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
