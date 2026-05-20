"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import DocumentViewer from "@/components/viewers/DocumentViewer";
import AuthModal from "@/components/modals/AuthModal";
import { toggleLike, toggleBookmark, addComment, deleteComment, toggleFollow, reportDocument } from "@/actions/community";
import { downloadDocumentFile, incrementDocumentViews } from "@/actions/documents";
import {
  Heart,
  Bookmark,
  AlertTriangle,
  MessageSquare,
  UserPlus,
  UserCheck,
  CornerDownRight,
  Trash,
  Download,
  Eye,
  FileText,
  Calendar,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface DocumentDetailShellProps {
  bundle: any;
  isLoggedIn: boolean;
  currentUser: any;
  likedInitial: boolean;
  bookmarkedInitial: boolean;
  followedInitial: boolean;
}

export default function DocumentDetailShell({
  bundle,
  isLoggedIn,
  currentUser,
  likedInitial,
  bookmarkedInitial,
  followedInitial,
}: DocumentDetailShellProps) {
  // Active file inside bundle to preview
  const [activeFile, setActiveFile] = useState(bundle.files.find((f: any) => f.is_primary) || bundle.files[0]);
  const [activeFileUrl, setActiveFileUrl] = useState<string | null>(null);

  // States
  const [liked, setLiked] = useState(likedInitial);
  const [likeCount, setLikeCount] = useState(bundle.like_count || 0);
  const [bookmarked, setBookmarked] = useState(bookmarkedInitial);
  const [followed, setFollowed] = useState(followedInitial);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  // Comments state
  const [comments, setComments] = useState(bundle.comments || []);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Log views on open
  useEffect(() => {
    incrementDocumentViews(bundle.id);
  }, [bundle.id]);

  // Generate public R2 preview url for the active preview file
  useEffect(() => {
    if (activeFile) {
      if (isLoggedIn) {
        downloadDocumentFile(activeFile.id)
          .then((res) => {
            if (res.success && res.downloadUrl) {
              setActiveFileUrl(res.downloadUrl);
            } else {
              setActiveFileUrl(null);
            }
          })
          .catch(() => {
            setActiveFileUrl(null);
          });
      } else {
        // Guests see guest-locked placeholder in viewer
        setActiveFileUrl("GUEST_LOCKED");
      }
    }
  }, [activeFile, isLoggedIn]);

  const handleLike = async () => {
    if (!isLoggedIn) {
      setAuthTab("login");
      setIsAuthOpen(true);
      return;
    }
    try {
      const res = await toggleLike(bundle.id);
      setLiked(res.liked);
      setLikeCount((prev: number) => (res.liked ? prev + 1 : Math.max(prev - 1, 0)));
      toast.success(res.liked ? "Đã thích tài liệu!" : "Đã bỏ thích.");
    } catch (err: any) {
      toast.error(err.message || "Đã xảy ra lỗi.");
    }
  };

  const handleBookmark = async () => {
    if (!isLoggedIn) {
      setAuthTab("login");
      setIsAuthOpen(true);
      return;
    }
    try {
      const res = await toggleBookmark(bundle.id);
      setBookmarked(res.bookmarked);
      toast.success(res.bookmarked ? "Đã lưu tài liệu vào học tập!" : "Đã xóa khỏi danh sách.");
    } catch (err: any) {
      toast.error(err.message || "Đã xảy ra lỗi.");
    }
  };

  const handleFollow = async () => {
    if (!isLoggedIn) {
      setAuthTab("login");
      setIsAuthOpen(true);
      return;
    }
    if (!bundle.uploader_id) return;
    try {
      const res = await toggleFollow(bundle.uploader_id);
      setFollowed(res.followed);
      toast.success(res.followed ? "Đã theo dõi người đăng!" : "Đã bỏ theo dõi.");
    } catch (err: any) {
      toast.error(err.message || "Đã xảy ra lỗi.");
    }
  };

  const handleDownload = async () => {
    if (!isLoggedIn) {
      setAuthTab("login");
      setIsAuthOpen(true);
      return;
    }
    try {
      const res = await downloadDocumentFile(activeFile.id);
      if (res.success && res.downloadUrl) {
        window.open(res.downloadUrl, "_blank");
        toast.success("Đang chuẩn bị tải tài liệu xuống...");
      } else {
        toast.error(res.error || "Đã xảy ra lỗi khi tải.");
      }
    } catch (err: any) {
      toast.error(err.message || "Đã xảy ra lỗi khi tải.");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setAuthTab("login");
      setIsAuthOpen(true);
      return;
    }
    if (!newCommentText.trim()) return;

    try {
      const res = await addComment({
        bundleId: bundle.id,
        content: newCommentText.trim(),
      });

      if (res.success && res.comment) {
        const localComment = {
          ...res.comment,
          user: {
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || currentUser.email,
          },
        };
        setComments((prev: any) => [localComment, ...prev]);
        setNewCommentText("");
        toast.success("Đã đăng bình luận!");
      }
    } catch (err: any) {
      toast.error(err.message || "Đã xảy ra lỗi.");
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!isLoggedIn) {
      setAuthTab("login");
      setIsAuthOpen(true);
      return;
    }
    if (!replyText.trim()) return;

    try {
      const res = await addComment({
        bundleId: bundle.id,
        content: replyText.trim(),
        parentId,
      });

      if (res.success && res.comment) {
        const localComment = {
          ...res.comment,
          user: {
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || currentUser.email,
          },
        };
        setComments((prev: any) => [...prev, localComment]);
        setReplyText("");
        setReplyingToId(null);
        toast.success("Đã trả lời bình luận!");
      }
    } catch (err: any) {
      toast.error(err.message || "Đã xảy ra lỗi.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId, bundle.id);
      setComments((prev: any) =>
        prev.map((c: any) =>
          c.id === commentId
            ? { ...c, is_deleted: true, content: "[Bình luận này đã bị xóa]" }
            : c
        )
      );
      toast.success("Đã xóa bình luận.");
    } catch (err: any) {
      toast.error("Không có quyền xóa bình luận.");
    }
  };

  const handleReport = async () => {
    if (!isLoggedIn) {
      setAuthTab("login");
      setIsAuthOpen(true);
      return;
    }
    const reason = prompt("Nhập lý do báo cáo vi phạm (ví dụ: Sai bản quyền, file lỗi...):");
    if (!reason || !reason.trim()) return;

    try {
      await reportDocument({
        bundleId: bundle.id,
        reason: reason.trim(),
      });
      toast.success("Báo cáo vi phạm thành công. Admin sẽ kiểm duyệt tài liệu này.");
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi báo cáo.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 py-8 px-4 sm:px-6 relative font-sans">
      {/* Background gradients */}
      <div className="absolute top-10 left-10 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-bold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Trở lại kho tài liệu
          </Link>
        </div>

        {/* Document Title & Meta Hero Panel */}
        <div className="bg-white border border-black/[0.05] rounded-3xl p-6 md:p-8 space-y-4 shadow-3xs relative overflow-hidden">
          <div className="flex flex-wrap gap-1.5 text-[9px] font-bold">
            <span className="bg-blue-50 text-blue-600 border border-blue-100/40 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              {bundle.category?.name || "Tài liệu học tập"}
            </span>
            {bundle.grade?.name && (
              <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md">
                {bundle.grade.name}
              </span>
            )}
            {bundle.subject?.name && (
              <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md">
                Môn {bundle.subject.name}
              </span>
            )}
          </div>

          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 leading-snug">
            {bundle.title}
          </h1>

          <p className="text-xs md:text-sm text-slate-500 leading-relaxed max-w-4xl font-semibold">
            {bundle.description || "Tài liệu ôn thi chất lượng được chia sẻ công khai bởi thành viên."}
          </p>

          {/* Interaction Bar & Uploader info */}
          <div className="flex flex-wrap justify-between items-center border-t border-slate-100 pt-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 select-none">
                {bundle.uploader?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  {bundle.uploader?.full_name || "Thành viên TCK"}
                </p>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold mt-0.5">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(bundle.created_at).toLocaleDateString()}</span>
                  <span>&bull;</span>
                  <span className="capitalize">{bundle.uploader?.role || "Học sinh"}</span>
                </div>
              </div>

              {/* Follow Button */}
              {(!isLoggedIn || currentUser?.id !== bundle.uploader_id) && (
                <Button
                  onClick={handleFollow}
                  variant="ghost"
                  size="sm"
                  className="text-[9px] text-slate-500 hover:text-slate-900 h-7 px-2.5 flex items-center gap-1 hover:bg-slate-100/60 rounded-xl shrink-0 ml-2 font-bold border border-black/[0.04] transition-all"
                >
                  {followed ? (
                    <>
                      <UserCheck className="h-3 w-3 text-slate-500" /> Đang theo dõi
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3 text-slate-550" /> Theo dõi
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Like, Save, Report Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleLike}
                variant="outline"
                className={`border-slate-200 hover:bg-slate-50 bg-white flex items-center gap-1.5 h-8.5 rounded-xl text-[11px] font-bold transition-all shadow-3xs ${
                  liked ? "text-blue-600 border-blue-200 bg-blue-50/50" : "text-slate-600"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${liked ? "fill-blue-600 text-blue-600" : ""}`} />
                Thích ({likeCount})
              </Button>

              <Button
                onClick={handleBookmark}
                variant="outline"
                className={`border-slate-200 hover:bg-slate-50 bg-white flex items-center gap-1.5 h-8.5 rounded-xl text-[11px] font-bold transition-all shadow-3xs ${
                  bookmarked ? "text-blue-600 border-blue-200 bg-blue-50/50" : "text-slate-600"
                }`}
              >
                <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-blue-600 text-blue-600" : ""}`} />
                Lưu học tập
              </Button>

              <Button
                onClick={handleReport}
                variant="ghost"
                size="icon"
                className="h-8.5 w-8.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl border border-slate-200/50 shadow-3xs"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Dynamic Split Preview Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left panel: File selection sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-black/[0.05] rounded-3xl p-5 space-y-4 shadow-3xs">
              <h2 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3 select-none">
                <FileText className="h-4 w-4 text-blue-600" /> Tệp tài liệu gộp ({bundle.files.length})
              </h2>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {bundle.files.map((file: any) => (
                  <div
                    key={file.id}
                    onClick={() => setActiveFile(file)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between group ${
                      activeFile.id === file.id
                        ? "border-blue-600 bg-blue-50/10 text-blue-600 font-bold"
                        : "border-slate-100 bg-slate-50/20 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div className="truncate pr-2 font-semibold">
                      <p className={`truncate ${activeFile.id === file.id ? "text-blue-600 font-extrabold" : "text-slate-700"}`}>{file.file_name}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB &bull; {file.file_extension.toUpperCase()}
                      </p>
                    </div>
                    {file.is_primary && (
                      <span className="text-[8px] bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                        Chính
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Active preview file details and viewer */}
          <div className="lg:col-span-3 space-y-6">
            {activeFileUrl ? (
              <DocumentViewer
                fileUrl={activeFileUrl}
                fileName={activeFile.file_name}
                fileExtension={activeFile.file_extension}
                isLoggedIn={isLoggedIn}
                onDownloadRequest={handleDownload}
              />
            ) : (
              <div className="w-full aspect-[4/5] bg-white border border-black/[0.05] rounded-3xl flex flex-col items-center justify-center shadow-3xs gap-3">
                <span className="text-slate-400 text-xs font-semibold animate-pulse">Đang tải tài liệu xem trước...</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. COMMENTS & DISCUSSION SECTION */}
        <div className="bg-white border border-black/[0.05] rounded-3xl p-6 md:p-8 space-y-6 shadow-3xs">
          <h2 className="text-xs md:text-sm font-extrabold flex items-center gap-2 border-b border-slate-100 pb-4 text-slate-900 select-none">
            <MessageSquare className="h-4.5 w-4.5 text-slate-600" />
            Thảo luận & Bình luận ({comments.length})
          </h2>

          {/* Comment input form */}
          {isLoggedIn ? (
            <form onSubmit={handleAddComment} className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold shrink-0 uppercase select-none">
                {currentUser.email.charAt(0)}
              </div>
              <div className="flex-1 flex gap-2">
                <Input
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Nhập câu hỏi hoặc cảm nhận của bạn về tài liệu..."
                  className="bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-500 rounded-xl text-xs"
                />
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-xl shadow-xs text-xs h-9.5 shrink-0 transition-colors">
                  Gửi
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-5 bg-slate-50 border border-black/[0.04] rounded-2xl text-center text-xs text-slate-500 font-semibold">
              Bạn cần{" "}
              <button
                onClick={() => {
                  setAuthTab("login");
                  setIsAuthOpen(true);
                }}
                className="text-blue-600 hover:underline font-bold"
              >
                đăng nhập
              </button>{" "}
              để tham gia bình luận thảo luận.
            </div>
          )}

          {/* Comments list */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-semibold select-none">
                Chưa có bình luận nào. Hãy gửi bình luận đầu tiên của bạn!
              </div>
            ) : (
              comments
                .filter((c: any) => !c.parent_id) // Root comments
                .map((comment: any) => {
                  const replies = comments.filter((c: any) => c.parent_id === comment.id);

                  return (
                    <div key={comment.id} className="space-y-2">
                      {/* Root Comment row */}
                      <div className="p-4 bg-slate-50/20 rounded-2xl border border-slate-200/50 flex gap-3 justify-between items-start hover:bg-slate-50/40 transition">
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold shrink-0 uppercase select-none">
                            {comment.user?.full_name?.charAt(0) || "U"}
                          </div>
                          <div className="space-y-1">
                            <p className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                              {comment.user?.full_name || "Thành viên"}
                              {comment.user_id === bundle.uploader_id && (
                                <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-black uppercase">
                                  Tác giả
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed font-semibold">{comment.content}</p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1.5 font-bold select-none">
                              <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                              {isLoggedIn && !comment.is_deleted && (
                                <button
                                  onClick={() => setReplyingToId(comment.id)}
                                  className="hover:text-slate-800 font-extrabold cursor-pointer transition text-blue-600"
                                >
                                  Trả lời
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Admin/Owner Delete Comment */}
                        {isLoggedIn && (currentUser.id === comment.user_id || currentUser.user_metadata?.role === "admin") && !comment.is_deleted && (
                          <Button
                            onClick={() => handleDeleteComment(comment.id)}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-800 hover:bg-slate-100/60 rounded-lg shrink-0"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Replies mapping */}
                      {replies.map((reply: any) => (
                        <div key={reply.id} className="flex gap-3 pl-8">
                          <CornerDownRight className="h-4 w-4 text-slate-350 shrink-0 mt-3" />
                          <div className="p-3 bg-slate-50/10 hover:bg-slate-50/30 rounded-2xl border border-slate-250/40 flex-1 flex justify-between items-start transition duration-150">
                            <div className="flex gap-2">
                              <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-[10px] font-bold shrink-0 uppercase select-none">
                                {reply.user?.full_name?.charAt(0) || "U"}
                              </div>
                              <div className="space-y-0.5">
                                <p className="font-extrabold text-slate-800 text-[10px] flex items-center gap-1.5">
                                  {reply.user?.full_name || "Thành viên"}
                                  {reply.user_id === bundle.uploader_id && (
                                    <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-black uppercase">
                                      Tác giả
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-600 leading-relaxed font-semibold">{reply.content}</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-bold select-none">
                                  {new Date(reply.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {isLoggedIn && (currentUser.id === reply.user_id || currentUser.user_metadata?.role === "admin") && !reply.is_deleted && (
                              <Button
                                onClick={() => handleDeleteComment(reply.id)}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-slate-800 hover:bg-slate-100/60 rounded-lg shrink-0"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Reply Form Trigger */}
                      {replyingToId === comment.id && (
                        <div className="pl-8 flex gap-3 items-center">
                          <Input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Trả lời bình luận..."
                            className="bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-500 rounded-xl text-xs h-9"
                          />
                          <Button
                            onClick={() => handleAddReply(comment.id)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-3 rounded-xl shrink-0 text-xs transition"
                          >
                            Gửi
                          </Button>
                          <Button
                            onClick={() => setReplyingToId(null)}
                            variant="ghost"
                            size="sm"
                            className="text-xs h-9 font-bold px-2 rounded-xl text-slate-500 hover:text-slate-900"
                          >
                            Hủy
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal Portal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialTab={authTab}
      />
    </div>
  );
}
