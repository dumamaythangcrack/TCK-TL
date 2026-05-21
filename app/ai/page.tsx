"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAiChat,
  getAiChats,
  deleteAiChat,
  getAiMessages,
  renameAiChat,
} from "@/actions/ai";
import { getSubjects } from "@/actions/taxonomy";
import MarkdownRenderer from "@/components/viewers/MarkdownRenderer";
import AuthModal from "@/components/modals/AuthModal";
import UserDropdown from "@/components/layout/UserDropdown";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import {
  Brain,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  Sparkles,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  History,
  GraduationCap,
  Info,
  Maximize2,
  LogOut,
  Copy,
  RotateCw,
  Square,
  Pin,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Search,
  CornerDownRight,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  base64?: string;
  textContext?: string;
}

interface Message {
  role: "user" | "model";
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
}

// ─── Memoised message bubble ──────────────────────────────────────────────────

const MessageBubble = memo(function MessageBubble({
  msg,
  index,
  isLast,
  onCopy,
  onRegenerate,
  onContinue,
  speakingIndex,
  onSpeakToggle,
}: {
  msg: Message;
  index: number;
  isLast: boolean;
  onCopy: (text: string) => void;
  onRegenerate: () => void;
  onContinue: () => void;
  speakingIndex: number | null;
  onSpeakToggle: (index: number, text: string) => void;
}) {
  const isUser = msg.role === "user";
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const isSpeaking = speakingIndex === index;

  // Fallback status indicator for latency/retries
  const [showFallbackMsg, setShowFallbackMsg] = useState(false);
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (msg.isStreaming && !msg.content) {
      timer = setTimeout(() => {
        setShowFallbackMsg(true);
      }, 2500);
    } else {
      setShowFallbackMsg(false);
    }
    return () => clearTimeout(timer);
  }, [msg.isStreaming, msg.content]);

  return (
    <div className={`group relative flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* AI avatar */}
      {!isUser && (
        <div className="h-8 w-8 rounded-xl bg-white border border-black/[0.05] flex items-center justify-center shrink-0 shadow-3xs select-none mt-0.5">
          <Brain className="h-4 w-4 text-blue-600" />
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-w-[85%]">
        {/* Bubble */}
        <div
          className={`p-4 md:p-5 rounded-2xl border text-xs leading-relaxed font-semibold ${
            isUser
              ? "bg-slate-900 border-slate-950 text-white shadow-2xs"
              : msg.isError
              ? "bg-rose-50 border-rose-200 text-rose-800 shadow-3xs"
              : "bg-white border-black/[0.05] text-slate-850 shadow-3xs"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap font-semibold text-xs leading-relaxed">
              {msg.content}
            </p>
          ) : msg.isStreaming && !msg.content ? (
            /* Premium shimmer loading skeleton */
            <div className="space-y-2.5 w-64 md:w-80 py-1">
              <div className="h-3.5 bg-slate-200/80 rounded-lg animate-pulse w-3/4" />
              <div className="h-3.5 bg-slate-200/80 rounded-lg animate-pulse w-full" />
              <div className="h-3.5 bg-slate-200/80 rounded-lg animate-pulse w-5/6" />
              <p className="text-[10px] text-slate-400 font-bold mt-2 animate-pulse flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                <span>
                  {showFallbackMsg 
                    ? "AI đang chuyển sang máy chủ dự phòng..." 
                    : "Đang khởi động kết nối AI..."}
                </span>
              </p>
            </div>
          ) : (
            <div className={isLast && msg.isStreaming ? "streaming-cursor" : ""}>
              <MarkdownRenderer content={msg.content} />
            </div>
          )}

          {/* Quick retry button inside error bubble */}
          {msg.isError && (
            <button
              onClick={onRegenerate}
              className="mt-3 bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-200 font-extrabold text-[10px] py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs transition"
            >
              <RotateCw className="h-3 w-3" />
              <span>Gửi lại câu hỏi</span>
            </button>
          )}
        </div>

        {/* Premium action toolbar for AI messages */}
        {!isUser && msg.content && !msg.isStreaming && (
          <div className="flex items-center gap-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/80 backdrop-blur-md border border-black/[0.04] p-1 rounded-xl w-fit shadow-3xs">
            {/* Copy Button */}
            <button
              onClick={() => onCopy(msg.content)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Sao chép câu trả lời"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            {/* Speech/TTS Button */}
            <button
              onClick={() => onSpeakToggle(index, msg.content)}
              className={`p-1.5 rounded-lg transition ${
                isSpeaking ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title={isSpeaking ? "Dừng đọc" : "Đọc thành tiếng"}
            >
              {isSpeaking ? (
                <VolumeX className="h-3.5 w-3.5 animate-pulse" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Like Feedback */}
            <button
              onClick={() => setFeedback(feedback === "like" ? null : "like")}
              className={`p-1.5 rounded-lg transition ${
                feedback === "like" ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title="Hữu ích"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>

            {/* Dislike Feedback */}
            <button
              onClick={() => setFeedback(feedback === "dislike" ? null : "dislike")}
              className={`p-1.5 rounded-lg transition ${
                feedback === "dislike" ? "text-rose-600 bg-rose-50" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title="Không hữu ích"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>

            {/* Continue writing (only on last message) */}
            {isLast && (
              <button
                onClick={onContinue}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1 text-[10px] font-bold"
                title="Viết tiếp câu trả lời"
              >
                <CornerDownRight className="h-3.5 w-3.5" />
                <span>Viết tiếp</span>
              </button>
            )}

            {/* Regenerate (only on last message) */}
            {isLast && (
              <button
                onClick={onRegenerate}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition flex items-center gap-1 text-[10px] font-bold"
                title="Tạo lại câu trả lời"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Thử lại</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-950 flex items-center justify-center text-white shrink-0 shadow-2xs font-extrabold text-[10px] select-none mt-0.5">
          U
        </div>
      )}
    </div>
  );
});

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiHubPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [learningMode, setLearningMode] = useState<"chat" | "summarize" | "quiz" | "notes">("chat");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sidebar V2 States
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  // Performance and queue management states
  const [isAiReady, setIsAiReady] = useState(false);
  const [aiHealth, setAiHealth] = useState<{ status: string; message: string }>({
    status: "online",
    message: "Hệ thống AI hoạt động ổn định",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const pendingQueue = useRef<string[]>([]);
  const supabase = createClient();

  // Sync messages reference
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Process pending messages queue when AI becomes ready and is not sending
  useEffect(() => {
    if (isAiReady && !isSending && pendingQueue.current.length > 0) {
      const nextPrompt = pendingQueue.current.shift();
      if (nextPrompt !== undefined) {
        sendMessage(nextPrompt);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAiReady, isSending]);

  // ── Auto-resize textarea ────────────────────────────────────────────────────
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [prompt, autoResize]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Fetch health status
  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/ai/health");
      if (res.ok) {
        const data = await res.json();
        setAiHealth({ status: data.status, message: data.message });
      }
    } catch (e) {
      console.error("fetchHealth:", e);
    }
  };

  // ── Auth init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsHistoryOpen(false);
    }

    // Load pinned chats from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tck_pinned_chats");
      if (stored) {
        try {
          setPinnedChatIds(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }

    async function init() {
      const startTime = Date.now();
      try {
        await fetchHealth();
      } catch (e) {
        console.error("fetchHealth on init error:", e);
      }

      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      if (session) {
        setCurrentUser(session.user);
        await loadChats();
      } else {
        setIsLoadingChats(false);
      }
      const subs = await getSubjects();
      setSubjects(subs);

      // Ensure boot loader overlay stays for at least 2 seconds
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        setIsAiReady(true);
      }, delay);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        setCurrentUser(session.user);
      } else {
        setCurrentUser(null);
        setChats([]);
        setMessages([]);
        setActiveChatId(null);
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Load messages on chat switch ────────────────────────────────────────────
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSending(false);
    }

    if (activeChatId) {
      loadMessages(activeChatId);
    } else {
      setMessages([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId]);

  // ─── Data loaders ────────────────────────────────────────────────────────────

  const loadChats = async () => {
    setIsLoadingChats(true);
    try {
      const list = await getAiChats();
      setChats(list);
      if (list.length > 0 && !activeChatId) {
        setActiveChatId(list[0].id);
      }
    } catch (err) {
      console.error("loadChats:", err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const msgs = await getAiMessages(chatId);
      setMessages(msgs.map((m: any) => ({ role: m.role, content: m.content })));
    } catch {
      toast.error("Không thể tải tin nhắn.");
    }
  };

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const handleCreateNewChat = async () => {
    if (!isLoggedIn) { setAuthTab("login"); setIsAuthOpen(true); return; }
    setIsCreatingChat(true);
    try {
      const newChat = await createAiChat("Cuộc hội thoại học tập mới");
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      setMessages([]);
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo cuộc hội thoại.");
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm("Xóa cuộc trò chuyện này?")) return;
    try {
      await deleteAiChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) setActiveChatId(null);
      toast.success("Đã xóa.");
    } catch {
      toast.error("Xóa thất bại.");
    }
  };

  // Sidebar V2 Logic
  const handleRenameStart = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  const handleRenameSave = async (chatId: string) => {
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    try {
      await renameAiChat(chatId, editingTitle.trim());
      setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, title: editingTitle.trim() } : c));
      toast.success("Đã đổi tên cuộc hội thoại.");
    } catch {
      toast.error("Đổi tên thất bại.");
    } finally {
      setEditingChatId(null);
    }
  };

  const togglePinChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setPinnedChatIds((prev) => {
      const next = prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId];
      localStorage.setItem("tck_pinned_chats", JSON.stringify(next));
      return next;
    });
  };

  const getGroupedChats = () => {
    const filtered = chats.filter((c) =>
      c.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );

    const pinned = filtered.filter((c) => pinnedChatIds.includes(c.id));
    const unpinned = filtered.filter((c) => !pinnedChatIds.includes(c.id));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const groups: { [key: string]: { label: string; items: any[] } } = {
      pinned: { label: "Đã ghim", items: pinned },
      today: { label: "Hôm nay", items: [] },
      yesterday: { label: "Hôm qua", items: [] },
      last7Days: { label: "7 ngày qua", items: [] },
      older: { label: "Cũ hơn", items: [] },
    };

    unpinned.forEach((c) => {
      const d = new Date(c.updated_at || c.created_at);
      d.setHours(0, 0, 0, 0);

      if (d.getTime() === today.getTime()) {
        groups.today.items.push(c);
      } else if (d.getTime() === yesterday.getTime()) {
        groups.yesterday.items.push(c);
      } else if (d.getTime() >= sevenDaysAgo.getTime()) {
        groups.last7Days.items.push(c);
      } else {
        groups.older.items.push(c);
      }
    });

    return groups;
  };

  // Message Actions Logic
  const handleSpeakToggle = useCallback((index: number, text: string) => {
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
    } else {
      window.speechSynthesis.cancel();
      const plainText = text
        .replace(/[\*\#\`\_\[\]\(\)\$]/g, "")
        .replace(/\$\$[\s\S]*?\$\$/g, "");
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.lang = "vi-VN";
      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);
      window.speechSynthesis.speak(utterance);
      setSpeakingIndex(index);
    }
  }, [speakingIndex]);

  const handleContinue = useCallback(() => {
    sendMessage("Hãy viết tiếp câu trả lời của bạn.");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsSending(false);
    // Mark last streaming bubble as done
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.isStreaming) updated[updated.length - 1] = { ...last, isStreaming: false };
      return updated;
    });
    toast.info("Đã dừng tạo câu trả lời.");
  };

  const handleCopyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Đã sao chép!"));
  }, []);

  // ─── File handling ────────────────────────────────────────────────────────────

  const processUploadedFiles = (files: File[]) => {
    files.forEach((file) => {
      if (file.size > 52_428_800) {
        toast.error(`"${file.name}" vượt quá 50MB.`);
        return;
      }
      const isImg = file.type.startsWith("image/");
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFiles((prev) => [
          ...prev,
          isImg
            ? { name: file.name, size: file.size, type: file.type, base64: reader.result as string }
            : { name: file.name, size: file.size, type: file.type, textContext: reader.result as string },
        ]);
      };
      if (isImg) reader.readAsDataURL(file);
      else reader.readAsText(file.slice(0, 20_000));
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processUploadedFiles(Array.from(e.target.files));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processUploadedFiles(Array.from(e.dataTransfer.files));
  };

  // ─── Send message ─────────────────────────────────────────────────────────────

  const sendMessage = async (overridePrompt?: string) => {
    const text = (overridePrompt ?? prompt).trim();
    if (!text && attachedFiles.length === 0) {
      toast.warning("Vui lòng nhập nội dung câu hỏi!");
      return;
    }

    if (!isAiReady) {
      toast.info("Hệ thống AI đang khởi động, tin nhắn đã được thêm vào hàng đợi...");
      pendingQueue.current.push(text);
      setPrompt("");
      return;
    }

    if (isSending && !overridePrompt) {
      toast.info("Đang nhận phản hồi, tin nhắn mới đã được thêm vào hàng đợi...");
      pendingQueue.current.push(text);
      setPrompt("");
      return;
    }

    // Abort any ongoing stream requests safely
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    let targetChatId = activeChatId;
    if (isLoggedIn && !targetChatId) {
      try {
        const newChat = await createAiChat(text.slice(0, 40) || "Cuộc trò chuyện mới");
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        targetChatId = newChat.id;
      } catch {
        toast.error("Không thể tạo phòng trò chuyện.");
        return;
      }
    }

    const currentChatId = isLoggedIn ? targetChatId! : "guest-session";
    const imagesBase64 = attachedFiles.filter((f) => f.base64).map((f) => f.base64!);
    const combinedDocsContext = attachedFiles.filter((f) => f.textContext).map((f) => f.textContext!).join("\n");

    setPrompt("");
    setAttachedFiles([]);
    setIsSending(true);

    // Optimistic UI — add user message + empty AI streaming bubble
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "model", content: "", isStreaming: true },
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: currentChatId,
          prompt: text,
          imagesBase64,
          fileContext: combinedDocsContext || undefined,
          subject: selectedSubject || undefined,
          mode: learningMode,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Lỗi kết nối AI.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Không thể đọc stream.");

      const decoder = new TextDecoder("utf-8");
      let aiText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "model") {
            updated[updated.length - 1] = { ...last, content: aiText, isStreaming: true };
          }
          return updated;
        });
      }

      // Finalise — remove streaming flag
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "model") {
          updated[updated.length - 1] = { ...last, isStreaming: false };
        }
        return updated;
      });

      if (isLoggedIn) loadChats();
    } catch (err: any) {
      if (err.name === "AbortError") return; // user stopped, already handled

      const errorMessage = err.message || "Không thể gửi. Vui lòng thử lại.";
      toast.error(errorMessage);

      // Replace empty AI bubble with error message
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "model" && last.isStreaming) {
          updated[updated.length - 1] = {
            role: "model",
            content: "⚠️ AI đang bận, vui lòng thử lại sau vài giây.",
            isError: true,
            isStreaming: false,
          };
        }
        return updated;
      });
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRegenerate = useCallback(() => {
    // Find last user message and resend
    const lastUser = [...messagesRef.current].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    // Remove last AI message
    setMessages((prev) => {
      const updated = [...prev];
      if (updated[updated.length - 1]?.role === "model") updated.pop();
      return updated;
    });
    sendMessage(lastUser.content);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-[#f6f7fb] text-slate-900 flex flex-col md:flex-row relative font-sans overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            {/* Mobile backdrop */}
            <div
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-slate-900/10 backdrop-blur-xs z-35 md:hidden"
            />
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed md:relative top-0 left-0 h-full shrink-0 bg-white border-r border-black/[0.05] flex flex-col z-40 shadow-lg md:shadow-none overflow-hidden"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-slate-100 flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <Link href="/" className="flex items-center gap-2 group">
                    <div className="h-6.5 w-6.5 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-[11px] text-white shadow-sm group-hover:bg-blue-700 transition-colors">
                      T
                    </div>
                    <span className="font-extrabold text-xs tracking-tight text-slate-900 uppercase">
                      TCK <span className="font-normal text-slate-400 lowercase">ai hub</span>
                    </span>
                  </Link>
                  <Button
                    onClick={() => setIsHistoryOpen(false)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-700 md:hidden"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  onClick={handleCreateNewChat}
                  disabled={isCreatingChat}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition"
                >
                  <Plus className="h-4 w-4" />
                  {isCreatingChat ? "Đang tạo..." : "Cuộc hội thoại mới"}
                </Button>

                {/* Search Bar */}
                {isLoggedIn && chats.length > 0 && (
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm cuộc hội thoại..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Chat list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {!isLoggedIn ? (
                  <div className="p-4 text-center space-y-3 mt-8">
                    <Brain className="h-8 w-8 text-slate-350 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Lưu trữ lịch sử học tập</p>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                      Đăng nhập để đồng bộ lịch sử các câu hỏi của bạn.
                    </p>
                    <button
                      onClick={() => { setAuthTab("login"); setIsAuthOpen(true); }}
                      className="w-full text-xs font-bold py-1.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl hover:bg-blue-100 transition cursor-pointer"
                    >
                      Đăng nhập ngay
                    </button>
                  </div>
                ) : (isLoadingChats || !isAiReady) ? (
                  <div className="space-y-2 p-2 animate-pulse">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-transparent">
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          <div className="h-4 w-4 bg-slate-200/70 rounded-md shrink-0" />
                          <div className="h-3 bg-slate-200/70 rounded-md w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : chats.length === 0 ? (
                  <div className="text-center mt-8 space-y-2">
                    <MessageSquare className="h-7 w-7 text-slate-300 mx-auto" />
                    <p className="text-[10px] font-semibold text-slate-400">Chưa có cuộc hội thoại nào</p>
                  </div>
                ) : (
                  (() => {
                    const grouped = getGroupedChats();
                    const hasItems = Object.values(grouped).some((g) => g.items.length > 0);
                    if (!hasItems) {
                      return (
                        <div className="text-center mt-8 space-y-2">
                          <p className="text-[10px] font-semibold text-slate-400">Không tìm thấy cuộc hội thoại nào</p>
                        </div>
                      );
                    }
                    return Object.entries(grouped).map(([key, group]) => {
                      if (group.items.length === 0) return null;
                      return (
                        <div key={key} className="space-y-1 mb-4">
                          <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
                            {key === "pinned" && <Pin className="h-2.5 w-2.5 text-blue-500 fill-current shrink-0" />}
                            {group.label}
                          </div>
                          {group.items.map((c) => (
                            <div key={c.id}>
                              {editingChatId === c.id ? (
                                <div className="px-2 py-1">
                                  <input
                                    type="text"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onBlur={() => handleRenameSave(c.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleRenameSave(c.id);
                                      else if (e.key === "Escape") setEditingChatId(null);
                                    }}
                                    autoFocus
                                    className="w-full bg-white border border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
                                  />
                                </div>
                              ) : (
                                <div
                                  onClick={() => { setActiveChatId(c.id); if (window.innerWidth < 768) setIsHistoryOpen(false); }}
                                  className={`group/item w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border border-transparent ${
                                    activeChatId === c.id
                                      ? "bg-blue-50 text-blue-700 border-blue-100/60 shadow-3xs"
                                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-1">
                                    <MessageSquare className={`h-4 w-4 shrink-0 ${activeChatId === c.id ? "text-blue-600" : "text-slate-400"}`} />
                                    <span
                                      className="truncate"
                                      onDoubleClick={() => handleRenameStart(c.id, c.title)}
                                    >
                                      {c.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 shrink-0">
                                    <button
                                      onClick={(e) => togglePinChat(e, c.id)}
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                      title={pinnedChatIds.includes(c.id) ? "Bỏ ghim" : "Ghim hội thoại"}
                                    >
                                      <Pin className={`h-3 w-3 ${pinnedChatIds.includes(c.id) ? "text-blue-600 fill-current" : ""}`} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRenameStart(c.id, c.title); }}
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                      title="Đổi tên"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteChat(e, c.id)}
                                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"
                                      title="Xóa"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Sidebar footer */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2 shrink-0">
                {isLoggedIn && currentUser && (
                  <button
                    onClick={async () => {
                      const client = createClient();
                      await client.auth.signOut();
                      toast.success("Đã đăng xuất.");
                    }}
                    className="flex items-center justify-center gap-1.5 w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-xl border border-red-100 transition text-xs cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Đăng xuất ({currentUser.email?.split("@")[0]})
                  </button>
                )}
                <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-black/[0.04] shadow-3xs">
                  <Brain className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                  <div className="truncate">
                    <span className="font-extrabold text-slate-800 block leading-tight text-[11px]">Gemini 2.5 Flash</span>
                    <span className="text-slate-400 font-medium text-[10px]">Mô hình AI học tập thông minh</span>
                  </div>
                </div>
                <div className="text-center font-semibold text-slate-400 uppercase tracking-wider text-[8px]">
                  TCK TÀI LIỆU &copy; {new Date().getFullYear()}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN AREA ───────────────────────────────────────────────────────── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 flex flex-col overflow-hidden relative bg-[#f6f7fb]"
        style={{ height: "100dvh" }}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-blue-600/10 backdrop-blur-xs z-50 flex flex-col items-center justify-center pointer-events-none border-2 border-dashed border-blue-500/80 m-4 rounded-3xl"
            >
              <div className="bg-white px-6 py-5 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-blue-100 max-w-sm text-center">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 animate-bounce">
                  <Paperclip className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Thả tệp tin để tải lên</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Hỗ trợ PNG, JPG, PDF, DOCX dưới 50MB.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticky Header */}
        <header className="h-14 border-b border-black/[0.05] bg-white/70 backdrop-blur-md px-4 md:px-6 flex items-center justify-between shrink-0 z-10 select-none">
          <div className="flex items-center gap-3">
            {!isHistoryOpen && (
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                <History className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2">
                <Brain className="h-4.5 w-4.5 text-blue-600" />
                <span className="font-extrabold text-xs text-slate-900 tracking-tight">Gia Sư TCK AI</span>
              </div>
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold select-none transition ${
                  aiHealth.status === "online"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-250/50"
                    : aiHealth.status === "high_traffic"
                    ? "bg-amber-50 text-amber-700 border-amber-250/50"
                    : "bg-rose-50 text-rose-700 border-rose-250/50"
                }`}
                title={aiHealth.message}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    aiHealth.status === "online"
                      ? "bg-emerald-500 animate-pulse"
                      : aiHealth.status === "high_traffic"
                      ? "bg-amber-500"
                      : "bg-rose-500 animate-ping"
                  }`}
                />
                <span className="hidden sm:inline">
                  {aiHealth.status === "online"
                    ? "Hoạt động ổn định"
                    : aiHealth.status === "high_traffic"
                    ? "Lưu lượng truy cập cao"
                    : "Quá tải tạm thời"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/documents"
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 h-8 rounded-xl transition"
            >
              Kho Tài Liệu
            </Link>
            {isLoggedIn && currentUser ? (
              <UserDropdown user={currentUser} />
            ) : (
              <button
                onClick={() => { setAuthTab("login"); setIsAuthOpen(true); }}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 h-8 rounded-xl transition"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/20">
          {!isAiReady ? (
            /* Pulsing skeleton when AI is booting */
            <div className="max-w-2xl mx-auto space-y-6 py-6 animate-pulse">
              {/* User skeleton bubble */}
              <div className="flex gap-3 justify-end">
                <div className="flex flex-col gap-1.5 max-w-[85%] items-end">
                  <div className="h-10 bg-slate-200 rounded-2xl w-48" />
                </div>
                <div className="h-8 w-8 rounded-xl bg-slate-200 shrink-0 mt-0.5" />
              </div>
              {/* Model skeleton bubble */}
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-xl bg-slate-200 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1.5 max-w-[85%] w-full">
                  <div className="p-4 md:p-5 rounded-2xl border border-slate-100 bg-white space-y-2.5">
                    <div className="h-3.5 bg-slate-200 rounded-lg w-3/4" />
                    <div className="h-3.5 bg-slate-200 rounded-lg w-full" />
                    <div className="h-3.5 bg-slate-200 rounded-lg w-5/6" />
                  </div>
                </div>
              </div>
              {/* Another user bubble */}
              <div className="flex gap-3 justify-end">
                <div className="flex flex-col gap-1.5 max-w-[85%] items-end">
                  <div className="h-10 bg-slate-200 rounded-2xl w-64" />
                </div>
                <div className="h-8 w-8 rounded-xl bg-slate-200 shrink-0 mt-0.5" />
              </div>
              {/* Another model bubble */}
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-xl bg-slate-200 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1.5 max-w-[85%] w-full">
                  <div className="p-4 md:p-5 rounded-2xl border border-slate-100 bg-white space-y-2.5">
                    <div className="h-3.5 bg-slate-200 rounded-lg w-2/3" />
                    <div className="h-3.5 bg-slate-200 rounded-lg w-4/5" />
                  </div>
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* Welcome screen */
            <div className="max-w-2xl mx-auto py-12 space-y-8">
              <div className="text-center space-y-3">
                <div className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center mx-auto shadow-sm">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                  Gia Sư Học Tập TCK AI
                </h1>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-semibold">
                  Hỏi đáp bài tập, giải đề thi khó, tóm tắt tài liệu học tập cùng trí tuệ nhân tạo thế hệ mới.
                </p>
              </div>

              {/* Settings panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-black/[0.05] p-5 rounded-2xl shadow-3xs">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-500" /> Chọn môn học
                  </Label>
                  <Select value={selectedSubject} onValueChange={(val) => setSelectedSubject(val || "")}>
                    <SelectTrigger className="bg-slate-50/50 border-slate-200/80 text-slate-700 rounded-xl h-10 text-xs">
                      <SelectValue placeholder="Toán học, Vật lý, Tiếng Anh..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-800">
                      {subjects.map((sub) => (
                        <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-slate-500" /> Chế độ học tập
                  </Label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-50/50 p-1 rounded-xl border border-slate-200/60">
                    {(["chat", "summarize", "quiz", "notes"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setLearningMode(m)}
                        className={`py-1.5 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          learningMode === m ? "bg-white text-slate-900 shadow-3xs border border-black/[0.04]" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {m === "chat" ? "Giải bài & Chat" : m === "summarize" ? "Tóm tắt" : m === "quiz" ? "Trắc nghiệm" : "Ghi chú"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <ImageIcon className="h-4 w-4 text-blue-600" />, title: "OCR & Quét Đề thi", desc: "Chụp ảnh đề thi, AI dịch và giải chi tiết từng bước." },
                  { icon: <FileText className="h-4 w-4 text-blue-600" />, title: "Phân Tích PDF", desc: "Đính kèm slide bài giảng để AI giải thích thuật ngữ khó." },
                  { icon: <Sparkles className="h-4 w-4 text-blue-600" />, title: "Trắc Nghiệm Tự Ôn", desc: "Yêu cầu AI tạo đề kiểm tra 10 câu để tự ôn tập." },
                ].map((card) => (
                  <div key={card.title} className="bg-white border border-black/[0.05] p-4 rounded-2xl space-y-2 hover:border-black/[0.1] hover:shadow-sm transition-all duration-200">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">{card.icon}</div>
                    <h3 className="text-xs font-bold text-slate-900">{card.title}</h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Message list */
            <div className="max-w-2xl mx-auto space-y-5 pb-52 md:pb-40 group">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  msg={msg}
                  index={i}
                  isLast={i === messages.length - 1}
                  onCopy={handleCopyMessage}
                  onRegenerate={handleRegenerate}
                  onContinue={handleContinue}
                  speakingIndex={speakingIndex}
                  onSpeakToggle={handleSpeakToggle}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input zone */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[#f6f7fb] via-[#f6f7fb]/95 to-transparent z-10 pointer-events-none">
          <div className="max-w-2xl mx-auto space-y-2.5 pointer-events-auto">

            {/* Attached files preview */}
            {attachedFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 bg-white/95 backdrop-blur-md border border-black/[0.05] p-3 rounded-2xl shadow-sm max-h-32 overflow-y-auto">
                {attachedFiles.map((file, i) => (
                  <div key={i} className="group relative border border-slate-100 bg-slate-50/50 rounded-xl overflow-hidden aspect-video flex flex-col justify-between p-2">
                    {file.base64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.base64} alt={file.name} className="absolute inset-0 w-full h-full object-cover z-0" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-50/80 z-0">
                        <FileText className="h-5 w-5 text-rose-600" />
                        <span className="text-[9px] font-extrabold text-rose-700 mt-1">{file.name.split(".").pop()?.toUpperCase()}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/30 transition z-1" />
                    <button type="button" onClick={() => setAttachedFiles((p) => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-slate-900/50 hover:bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 cursor-pointer transition">
                      <X className="h-3 w-3" />
                    </button>
                    {file.base64 && (
                      <button type="button" onClick={() => setZoomImage(file.base64!)} className="absolute bottom-1 left-1 h-5 w-5 rounded-full bg-slate-900/50 hover:bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 cursor-pointer transition">
                        <Maximize2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Stop button */}
            {isSending && (
              <div className="flex justify-center animate-fade-in">
                <Button
                  type="button"
                  onClick={handleStopGeneration}
                  variant="outline"
                  className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-bold px-4 h-9 rounded-xl shadow-xs flex items-center gap-2 text-rose-600 hover:text-rose-700 transition"
                >
                  <Square className="h-3 w-3 fill-current" />
                  Dừng tạo câu trả lời
                </Button>
              </div>
            )}

            {/* Input form */}
            <form
              onSubmit={handleSendMessage}
              className={`bg-white border border-black/[0.05] rounded-3xl shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-300 overflow-hidden ${
                !isAiReady ? "animate-pulse border-slate-100" : ""
              }`}
            >
              {/* Toolbar row */}
              {messages.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 pt-2 pb-1.5 border-b border-slate-100/60 flex-wrap">
                  <Select value={selectedSubject} onValueChange={(val) => setSelectedSubject(val || "")}>
                    <SelectTrigger className="border-0 bg-transparent text-slate-500 hover:text-slate-800 rounded-lg h-7 text-[10px] w-auto max-w-[120px] gap-1 px-1.5 font-bold focus:ring-0">
                      <SelectValue placeholder="Môn học" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-800 text-xs">
                      <SelectItem value="none">Không môn học</SelectItem>
                      {subjects.map((sub) => <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="h-3 w-px bg-slate-200 mx-1" />
                  <Select value={learningMode} onValueChange={(val: any) => setLearningMode(val)}>
                    <SelectTrigger className="border-0 bg-transparent text-slate-500 hover:text-slate-800 rounded-lg h-7 text-[10px] w-auto gap-1 px-1.5 font-bold focus:ring-0">
                      <SelectValue placeholder="Chế độ học" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-800 text-xs">
                      <SelectItem value="chat">Giải bài & Chat</SelectItem>
                      <SelectItem value="summarize">Tóm tắt tài liệu</SelectItem>
                      <SelectItem value="quiz">Tạo trắc nghiệm</SelectItem>
                      <SelectItem value="notes">Soạn ghi chú</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Text + actions row */}
              <div className="flex items-end gap-2 p-2 px-3">
                <label className={`h-9 w-9 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition text-slate-500 border border-slate-200 shrink-0 ${!isAiReady ? "opacity-55 pointer-events-none cursor-not-allowed" : ""}`}>
                  <Paperclip className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    multiple
                    onChange={handleFileUpload}
                    disabled={!isAiReady}
                    className="hidden"
                  />
                </label>

                {/* Auto-expanding textarea */}
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => { setPrompt(e.target.value); autoResize(); }}
                  onKeyDown={handleKeyDown}
                  placeholder={!isAiReady ? "Đang kết nối với hệ thống AI..." : "Gửi câu hỏi của bạn... (Enter để gửi, Shift+Enter để xuống dòng)"}
                  rows={1}
                  disabled={isSending || !isAiReady}
                  className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-sm md:text-xs py-2 placeholder-slate-400 text-slate-900 focus:outline-none font-semibold resize-none overflow-hidden leading-relaxed"
                  style={{ maxHeight: "160px" }}
                />

                <Button
                  type="submit"
                  disabled={isSending || !isAiReady || (!prompt.trim() && attachedFiles.length === 0)}
                  className="h-9 w-9 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 p-0 shadow-2xs transition"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>

            <div className="text-[9px] text-slate-400 text-center flex items-center justify-center gap-1 font-semibold select-none">
              <Info className="h-3 w-3 text-slate-350" />
              <span>Câu trả lời từ AI chỉ dùng làm tài liệu tham khảo hỗ trợ học tập.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Image zoom modal */}
      <AnimatePresence>
        {zoomImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setZoomImage(null)}
              className="fixed inset-0 bg-slate-950/85"
            />
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="relative max-w-3xl max-h-[90vh] z-10 overflow-hidden rounded-2xl border border-white/10"
            >
              <button onClick={() => setZoomImage(null)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-900/50 hover:bg-slate-900 text-white flex items-center justify-center transition z-10">
                <X className="h-4 w-4" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomImage} alt="Preview" className="w-full h-full object-contain" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} initialTab={authTab} />

      {/* ── BOOT LOADER SYSTEM OVERLAY ── */}
      <AnimatePresence>
        {!isAiReady && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-xl pointer-events-auto"
          >
            <div className="bg-white/80 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
              <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 animate-pulse">
                <Brain className="h-7 w-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Đang khởi tạo hệ thống AI...
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Thiết lập môi trường an toàn và đồng bộ dữ liệu cá nhân của bạn.
              </p>
              <div className="flex items-center gap-1.5 mt-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/40">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {aiHealth.status === "online" ? "Kết nối ổn định" : "Lượng truy cập cao"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
