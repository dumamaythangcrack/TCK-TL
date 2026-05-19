"use server";

import {
  getAdminStats,
  getPendingDocuments,
  getUsersList,
  getDocumentReports,
  getAdminChartData,
  moderateDocument,
  toggleUserLock,
  resolveReport,
} from "@/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, AlertTriangle, ShieldCheck, Download, Calendar, Eye, Lock, Unlock, EyeOff, Check, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function AdminPanelPage() {
  let stats;
  let pendingDocs: any[] = [];
  let usersList: any[] = [];
  let reports: any[] = [];
  let chartData: any[] = [];

  try {
    stats = await getAdminStats();
    pendingDocs = await getPendingDocuments();
    usersList = await getUsersList();
    reports = await getDocumentReports();
    chartData = await getAdminChartData();
  } catch (error) {
    // Redirect if unauthorized or failed role check in actions
    redirect("/dashboard");
  }

  // Server actions wrapper handlers to moderate directly from layout
  const handleApprove = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    await moderateDocument(id, "approve");
  };

  const handleReject = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    await moderateDocument(id, "reject");
  };

  const handleLockUser = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    const lock = formData.get("lock") === "true";
    await toggleUserLock(id, lock);
  };

  const handleResolveReport = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    const action = formData.get("action") as "resolved" | "dismissed";
    await resolveReport(id, action);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 relative">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-red-100/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-blue-100/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Admin Header */}
        <div className="flex justify-between items-center border-b border-slate-200/80 pb-6">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2 text-red-600">
              <ShieldCheck className="h-8 w-8 text-red-600" />
              TCK Admin Panel
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Bảng điều khiển hệ thống TCK Tài Liệu. Phê duyệt tài liệu, xử lý vi phạm, quản lý người dùng.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl">
              Quay lại Dashboard
            </Button>
          </Link>
        </div>

        {/* Dashboard Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Tổng người dùng", value: stats.totalUsers, desc: "Tài khoản đăng ký", icon: Users, color: "text-blue-600 bg-blue-50 border-blue-100" },
            { title: "Tài liệu hệ thống", value: stats.totalBundles, desc: `Tổng dung lượng: ${stats.totalSizeMB} MB`, icon: FileText, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
            { title: "Chờ phê duyệt", value: stats.totalPending, desc: "Tài liệu cần kiểm duyệt", icon: Calendar, color: "text-yellow-600 bg-yellow-50 border-yellow-100" },
            { title: "Báo cáo vi phạm", value: stats.totalReports, desc: "Cần được xử lý", icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-100" },
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

        {/* Dynamic Visual Traffic Charts (Custom Premium SVG Charts) */}
        <Card className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <Eye className="h-5 w-5 text-blue-600" />
              Thống kê hoạt động (7 ngày gần nhất)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Biểu đồ thể hiện lượt tải tài liệu và lượt đăng tải theo ngày.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Chưa đủ dữ liệu để dựng biểu đồ.
              </div>
            ) : (
              <div className="space-y-4">
                {/* SVG Visual Bars */}
                <div className="h-48 w-full flex items-end justify-between gap-4 border-b border-slate-200 pb-2 pt-4">
                  {chartData.map((d: any, idx: number) => {
                    const maxCount = Math.max(...chartData.map((x: any) => Math.max(x.downloads, x.uploads))) || 1;
                    const dlHeight = (d.downloads / maxCount) * 100;
                    const ulHeight = (d.uploads / maxCount) * 100;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                        <div className="flex gap-1.5 w-full items-end justify-center h-full">
                          {/* Downloads Bar */}
                          <div
                            style={{ height: `${dlHeight}%` }}
                            className="w-3 md:w-5 bg-blue-600 rounded-t-sm shadow-sm min-h-[4px]"
                          />
                          {/* Uploads Bar */}
                          <div
                            style={{ height: `${ulHeight}%` }}
                            className="w-3 md:w-5 bg-slate-350 rounded-t-sm shadow-sm min-h-[4px]"
                          />
                        </div>

                        {/* Hover Tooltip Info */}
                        <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-slate-900 border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] space-y-0.5 z-20 shadow-xl pointer-events-none">
                          <p className="text-white font-bold">{d.date}</p>
                          <p className="text-blue-400">Lượt tải: {d.downloads}</p>
                          <p className="text-slate-400">Đăng tải: {d.uploads}</p>
                        </div>

                        <span className="text-[10px] text-slate-400 font-semibold truncate w-full text-center">
                          {d.date}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legends */}
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 bg-blue-600 rounded-sm" />
                    <span className="text-slate-500">Lượt tải về</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 bg-slate-350 rounded-sm" />
                    <span className="text-slate-500">Đăng tải tài liệu mới</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Layout grid split */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left/Middle Columns: Document and User Moderation (Span 2) */}
          <div className="xl:col-span-2 space-y-8">
            {/* 1. DOCUMENT MODERATION QUEUE */}
            <Card className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
              <CardHeader className="p-0 pb-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-yellow-600 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-yellow-600" />
                    Hàng đợi phê duyệt tài liệu ({pendingDocs.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Tài liệu mới tải lên chờ phê duyệt để hiển thị công khai.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {pendingDocs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">Hàng đợi trống. Không có tài liệu nào chờ duyệt.</div>
                ) : (
                  <div className="space-y-4">
                    {pendingDocs.map((doc) => (
                      <div key={doc.id} className="p-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{doc.title}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed max-w-lg line-clamp-2">
                            {doc.description || "Không có mô tả."}
                          </p>
                          <div className="flex gap-2 text-[10px] text-slate-450 mt-1">
                            <span>Người đăng: {doc.uploader?.full_name || doc.uploader?.email || "N/A"}</span>
                            <span>•</span>
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Moderation Actions Forms */}
                        <div className="flex gap-2 w-full sm:w-auto shrink-0">
                          {/* Secure direct server action forms */}
                          <form action={handleApprove}>
                            <input type="hidden" name="id" value={doc.id} />
                            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 h-8 flex items-center gap-1 shadow-xs">
                              <Check className="h-3.5 w-3.5" /> Duyệt
                            </Button>
                          </form>
                          <form action={handleReject}>
                            <input type="hidden" name="id" value={doc.id} />
                            <Button type="submit" size="sm" className="bg-red-650 hover:bg-red-750 text-white font-bold text-xs px-3 h-8 flex items-center gap-1 shadow-xs">
                              <X className="h-3.5 w-3.5" /> Từ chối
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. USER MANAGEMENT */}
            <Card className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Danh sách thành viên ({usersList.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">Khóa hoặc kích hoạt tài khoản của các thành viên.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {usersList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">Chưa có người dùng.</div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                    {usersList.map((usr) => (
                      <div key={usr.id} className="p-3 bg-slate-50/50 border border-slate-200/60 rounded-xl flex justify-between items-center text-xs md:text-sm">
                        <div>
                          <p className="font-bold text-slate-800">{usr.full_name || "[Chưa điền tên]"}</p>
                          <p className="text-[10px] text-slate-500">{usr.email} • {usr.role}</p>
                        </div>

                        {/* Lock / Unlock Toggle Form */}
                        <form action={handleLockUser}>
                          <input type="hidden" name="id" value={usr.id} />
                          <input type="hidden" name="lock" value={usr.is_locked ? "false" : "true"} />
                          <Button
                            type="submit"
                            size="sm"
                            variant={usr.is_locked ? "default" : "outline"}
                            className={
                              usr.is_locked
                                ? "bg-red-650 hover:bg-red-750 text-white font-bold h-8 text-xs shadow-xs"
                                : "border-slate-200 hover:bg-slate-50 text-slate-600 h-8 text-xs flex items-center gap-1 bg-white shadow-xs"
                            }
                          >
                            {usr.is_locked ? (
                              <>
                                <Lock className="h-3.5 w-3.5" /> Bị khóa
                              </>
                            ) : (
                              <>
                                <Unlock className="h-3.5 w-3.5" /> Hoạt động
                              </>
                            )}
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Violation Reports queue (Span 1) */}
          <div className="space-y-8">
            <Card className="bg-white border border-slate-200/80 rounded-3xl p-6 h-full flex flex-col justify-between shadow-xs">
              <div>
                <CardHeader className="p-0 pb-6">
                  <CardTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Báo cáo vi phạm ({reports.filter(r => r.status === "pending").length})
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Các khiếu nại hoặc báo cáo tài liệu vi phạm từ cộng đồng.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {reports.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-sm">Không có báo cáo vi phạm.</div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                      {reports.map((rep) => (
                        <div key={rep.id} className="p-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl space-y-3">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] bg-red-55 text-red-650 border border-red-100 px-2 py-0.5 rounded-full font-bold">
                                {rep.reason}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(rep.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-700">
                              Từ: {rep.user?.full_name || rep.user?.email || "Ẩn danh"}
                            </p>
                            {rep.description && (
                              <p className="text-xs text-slate-500 bg-white p-2 rounded-lg mt-1 border border-slate-200 leading-relaxed">
                                {rep.description}
                              </p>
                            )}
                          </div>

                          <div className="text-[10px] border-t border-slate-100 pt-2 flex flex-col gap-2">
                            {rep.bundle ? (
                              <span className="text-slate-600 font-bold block truncate">
                                Tài liệu bị báo cáo: {rep.bundle.title}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-bold block truncate">[Tài liệu đã bị xóa]</span>
                            )}

                            {/* Reports Resolvers Actions Forms */}
                            {rep.status === "pending" && (
                              <div className="flex gap-2 justify-end pt-1">
                                <form action={handleResolveReport}>
                                  <input type="hidden" name="id" value={rep.id} />
                                  <input type="hidden" name="action" value="resolved" />
                                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-7 px-2 shadow-xs">
                                    Đã giải quyết
                                  </Button>
                                </form>
                                <form action={handleResolveReport}>
                                  <input type="hidden" name="id" value={rep.id} />
                                  <input type="hidden" name="action" value="dismissed" />
                                  <Button type="submit" size="sm" variant="ghost" className="text-red-650 hover:text-red-700 hover:bg-red-50 font-bold text-[10px] h-7 px-2">
                                    Bỏ qua
                                  </Button>
                                </form>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
