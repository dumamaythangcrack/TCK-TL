"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import DocumentViewer from "@/components/viewers/DocumentViewer";
import { toggleLike, toggleBookmark, addComment, deleteComment, toggleFollow, reportDocument } from "@/actions/community";
import { downloadDocumentFile, incrementDocumentViews } from "@/actions/documents";
import { Heart, Bookmark, AlertTriangle, MessageSquare, ChevronRight, UserPlus, UserCheck, CornerDownRight, Trash } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";

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

  // Comments state
  const [comments, setComments] = useState(bundle.comments || []);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Report Modal / simple prompt
  const [isReporting, setIsReporting] = useState(false);

  // Log views on open
  useEffect(() => {
    incrementDocumentViews(bundle.id);
  }, [bundle.id]);

  // Generate public R2 preview url for the active preview file
  useEffect(() => {
    if (activeFile) {
      // Direct call download helper (which creates presigned R2 URL) if logged in.
      // If guest, we mock or give a lock preview. The DocumentViewer handles guest lock nicely.
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
        // Guests can't fetch presigned URL, but we need some dummy/placeholder link so viewer knows it's guest.
        setActiveFileUrl("GUEST_LOCKED");
      }
    }
  }, [activeFile, isLoggedIn]);

  const handleLike = async () => {
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
    try {
      const res = await toggleBookmark(bundle.id);
      setBookmarked(res.bookmarked);
      toast.success(res.bookmarked ? "Đã lưu tài liệu vào danh sách học tập!" : "Đã xóa khỏi danh sách.");
    } catch (err: any) {
      toast.error(err.message || "Đã xảy ra lỗi.");
    }
  };

  const handleFollow = async () => {
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
      toast.error("Vui lòng đăng nhập để tải xuống tài liệu!");
      return;
    }
    try {
      const res = await downloadDocumentFile(activeFile.id);
      if (res.success && res.downloadUrl) {
        // Trigger browser download by opening in new window or hidden element
        window.open(res.downloadUrl, "_blank");
        toast.success("Đang bắt đầu tải tài liệu xuống máy...");
      } else {
        toast.error(res.error || "Đã xảy ra lỗi khi tải.");
      }
    } catch (err: any) {
      toast.error(err.message || "Đã xảy ra lỗi khi tải.");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const res = await addComment({
        bundleId: bundle.id,
        content: newCommentText.trim(),
      });

      if (res.success && res.comment) {
        // Optimistically add comment with user profile data
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
    const reason = prompt("Nhập lý do báo cáo vi phạm (ví dụ: Sai bản quyền, nội dung bậy bạ, file lỗi...):");
    if (!reason || !reason.trim()) return;

    try {
      await reportDocument({
        bundleId: bundle.id,
        reason: reason.trim(),
      });
      toast.success("Đã gửi báo cáo vi phạm thành công. Admin sẽ kiểm duyệt ngay!");
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi báo cáo.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 relative">
      {/* Subtle Background Glows */}
      <div className="absolute top-10 left-10 h-96 w-96 rounded-full bg-blue-100/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-indigo-100/10 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Document Title & Meta Hero Panel */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-4 shadow-xs">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-full font-bold uppercase">
              {bundle.category?.name || "Tài liệu học tập"}
            </span>
            <span className="bg-slate-50 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-100 font-semibold">
              {bundle.grade?.name || "Lớp học"}
            </span>
            <span className="bg-slate-50 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-100 font-semibold">
              Môn {bundle.subject?.name || "Môn học"}
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {bundle.title}
          </h1>

          <p className="text-sm md:text-base text-slate-500 leading-relaxed max-w-4xl">
            {bundle.description || "Không có mô tả chi tiết."}
          </p>

          {/* Interaction Bar & Uploader info */}
          <div className="flex flex-wrap justify-between items-center border-t border-slate-100 pt-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg font-black shrink-0">
                {bundle.uploader?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  Đăng bởi: {bundle.uploader?.full_name || "Thành viên TCK"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {new Date(bundle.created_at).toLocaleDateString()} • {bundle.uploader?.role}
                </p>
              </div>

              {/* Follow Button */}
              {isLoggedIn && currentUser.id !== bundle.uploader_id && (
                <Button
                  onClick={handleFollow}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-600 hover:text-blue-700 h-8 px-2 flex items-center gap-1 hover:bg-blue-50 rounded-lg shrink-0 ml-2"
                >
                  {followed ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5" /> Đã theo dõi
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" /> Theo dõi
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
                className={`border-slate-200 hover:bg-slate-50 bg-white flex items-center gap-1.5 h-9 rounded-xl text-xs font-semibold ${
                  liked ? "text-red-650 border-red-200 bg-red-50 hover:bg-red-100" : "text-slate-700"
                }`}
              >
                <Heart className={`h-4.5 w-4.5 ${liked ? "fill-red-500" : ""}`} />
                Thích ({likeCount})
              </Button>

              <Button
                onClick={handleBookmark}
                variant="outline"
                className={`border-slate-200 hover:bg-slate-50 bg-white flex items-center gap-1.5 h-9 rounded-xl text-xs font-semibold ${
                  bookmarked ? "text-yellow-650 border-yellow-200 bg-yellow-50 hover:bg-yellow-100" : "text-slate-700"
                }`}
              >
                <Bookmark className={`h-4.5 w-4.5 ${bookmarked ? "fill-yellow-500" : ""}`} />
                Lưu học tập
              </Button>

              <Button
                onClick={handleReport}
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-xl"
              >
                <AlertTriangle className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Dynamic Split Preview Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left panel: File selection sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-xs">
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <FileText className="h-4 w-4 text-blue-600" /> Danh sách File gộp ({bundle.files.length})
              </h2>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {bundle.files.map((file: any) => (
                  <div
                    key={file.id}
                    onClick={() => setActiveFile(file)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between group ${
                      activeFile.id === file.id
                        ? "border-blue-600 bg-blue-50/20 text-blue-700"
                        : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className={`font-bold truncate ${activeFile.id === file.id ? "text-blue-700" : "text-slate-850"}`}>{file.file_name}</p>
                      <p className="text-[10px] text-slate-400">
                        {(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB • {file.file_extension.toUpperCase()}
                      </p>
                    </div>
                    {file.is_primary && (
                      <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
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
              <div className="w-full aspect-[4/5] bg-slate-100/50 rounded-3xl border border-slate-200 flex items-center justify-center">
                <span className="text-slate-400 text-sm animate-pulse">Đang tải tài liệu xem trước...</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. COMMENTS & DISCUSSION SECTION */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 border-b border-slate-100 pb-4 text-slate-900">
            <MessageSquare className="h-5.5 w-5.5 text-blue-600" />
            Thảo luận & Bình luận ({comments.length})
          </h2>

          {/* Comment input form */}
          {isLoggedIn ? (
            <form onSubmit={handleAddComment} className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xs font-black shrink-0">
                {currentUser.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 flex gap-2">
                <Input
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Nhập câu hỏi hoặc cảm nhận của bạn về tài liệu..."
                  className="bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:ring-0 rounded-xl text-xs md:text-sm"
                />
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-xl shadow-sm">
                  Gửi
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              Bạn cần đăng nhập để tham gia thảo luận.
            </div>
          )}

          {/* Comments list */}
          <div className="space-y-4">
            {comments
              .filter((c: any) => !c.parent_id) // Root comments
              .map((comment: any) => {
                const replies = comments.filter((c: any) => c.parent_id === comment.id);

                return (
                  <div key={comment.id} className="space-y-3">
                    {/* Root Comment row */}
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-150 flex gap-3 justify-between items-start">
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-black shrink-0">
                          {comment.user?.full_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            {comment.user?.full_name || "Thành viên"}
                            {comment.user_id === bundle.uploader_id && (
                              <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-bold uppercase">
                                Tác giả
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-650 leading-relaxed">{comment.content}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                            <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                            {isLoggedIn && !comment.is_deleted && (
                              <button
                                onClick={() => setReplyingToId(comment.id)}
                                className="hover:text-blue-600 font-semibold cursor-pointer"
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
                          className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Replies mapping */}
                    {replies.map((reply: any) => (
                      <div key={reply.id} className="flex gap-3 pl-8">
                        <CornerDownRight className="h-5 w-5 text-slate-300 shrink-0 mt-2" />
                        <div className="p-3 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-150 flex-1 flex justify-between items-start">
                          <div className="flex gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-[10px] font-black shrink-0">
                              {reply.user?.full_name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800 text-[10px] flex items-center gap-1.5">
                                {reply.user?.full_name || "Thành viên"}
                                {reply.user_id === bundle.uploader_id && (
                                  <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-bold uppercase">
                                    Tác giả
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-650 leading-relaxed">{reply.content}</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {isLoggedIn && (currentUser.id === reply.user_id || currentUser.user_metadata?.role === "admin") && !reply.is_deleted && (
                            <Button
                              onClick={() => handleDeleteComment(reply.id)}
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg"
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
                          className="bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:ring-0 rounded-xl text-xs h-9"
                        />
                        <Button
                          onClick={() => handleAddReply(comment.id)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-3 rounded-xl shrink-0"
                        >
                          Trả lời
                        </Button>
                        <Button
                          onClick={() => setReplyingToId(null)}
                          variant="ghost"
                          size="sm"
                          className="text-xs h-9"
                        >
                          Hủy
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom icons fallbacks
function FileText(props: any) {
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
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}
