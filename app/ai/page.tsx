"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  createAiChat,
  getAiChats,
  deleteAiChat,
  getAiMessages,
  renameAiChat,
} from "@/actions/ai";
import { getSubjects } from "@/actions/taxonomy";
import MarkdownRenderer, { loadKatex } from "@/components/viewers/MarkdownRenderer";
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
  Calculator,
  Languages,
  Atom,
  FlaskConical,
  Dna,
  BookOpen,
  ScrollText,
  Globe,
  Code2,
  Loader2,
  Mic,
  MicOff,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants & Configurations ───────────────────────────────────────────────

const SUBJECT_MODES = [
  { id: "general", label: "AI Chung", icon: "Sparkles", color: "slate" },
  { id: "math", label: "Toán", icon: "Calculator", color: "blue" },
  { id: "english", label: "Tiếng Anh", icon: "Languages", color: "emerald" },
  { id: "physics", label: "Vật Lý", icon: "Atom", color: "purple" },
  { id: "chemistry", label: "Hóa Học", icon: "FlaskConical", color: "orange" },
  { id: "biology", label: "Sinh Học", icon: "Dna", color: "green" },
  { id: "literature", label: "Ngữ Văn", icon: "BookOpen", color: "pink" },
  { id: "history", label: "Lịch Sử", icon: "ScrollText", color: "amber" },
  { id: "geography", label: "Địa Lý", icon: "Globe", color: "cyan" },
  { id: "it", label: "Lập Trình", icon: "Code2", color: "indigo" }
];

const COLOR_MAP: Record<string, { bg: string; active: string; hover: string; badge: string }> = {
  slate: {
    bg: "bg-slate-50 border-slate-200 text-slate-700",
    active: "bg-slate-900 border-slate-950 text-white shadow-xs",
    hover: "hover:bg-slate-100 text-slate-800",
    badge: "bg-slate-100 text-slate-700 border-slate-200"
  },
  blue: {
    bg: "bg-blue-50/50 border-blue-100 text-blue-700",
    active: "bg-blue-600 border-blue-700 text-white shadow-blue-500/10 shadow-xs",
    hover: "hover:bg-blue-50 text-blue-700",
    badge: "bg-blue-50 text-blue-700 border-blue-100"
  },
  emerald: {
    bg: "bg-emerald-50/50 border-emerald-100 text-emerald-700",
    active: "bg-emerald-600 border-emerald-700 text-white shadow-emerald-500/10 shadow-xs",
    hover: "hover:bg-emerald-50 text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-100"
  },
  purple: {
    bg: "bg-purple-50/50 border-purple-100 text-purple-700",
    active: "bg-purple-600 border-purple-700 text-white shadow-purple-500/10 shadow-xs",
    hover: "hover:bg-purple-50 text-purple-700",
    badge: "bg-purple-50 text-purple-700 border-purple-100"
  },
  orange: {
    bg: "bg-orange-50/50 border-orange-100 text-orange-700",
    active: "bg-orange-500 border-orange-600 text-white shadow-orange-500/10 shadow-xs",
    hover: "hover:bg-orange-50 text-orange-700",
    badge: "bg-orange-50 text-orange-700 border-orange-100"
  },
  green: {
    bg: "bg-green-50/50 border-green-100 text-green-700",
    active: "bg-green-600 border-green-700 text-white shadow-green-500/10 shadow-xs",
    hover: "hover:bg-green-50 text-green-700",
    badge: "bg-green-50 text-green-700 border-green-100"
  },
  pink: {
    bg: "bg-pink-50/50 border-pink-100 text-pink-700",
    active: "bg-pink-600 border-pink-700 text-white shadow-pink-500/10 shadow-xs",
    hover: "hover:bg-pink-50 text-pink-700",
    badge: "bg-pink-50 text-pink-700 border-pink-100"
  },
  amber: {
    bg: "bg-amber-50/50 border-amber-100 text-amber-700",
    active: "bg-amber-500 border-amber-600 text-white shadow-amber-500/10 shadow-xs",
    hover: "hover:bg-amber-50 text-amber-700",
    badge: "bg-amber-50 text-amber-700 border-amber-100"
  },
  cyan: {
    bg: "bg-cyan-50/50 border-cyan-100 text-cyan-700",
    active: "bg-cyan-600 border-cyan-700 text-white shadow-cyan-500/10 shadow-xs",
    hover: "hover:bg-cyan-50 text-cyan-700",
    badge: "bg-cyan-50 text-cyan-700 border-cyan-100"
  },
  indigo: {
    bg: "bg-indigo-50/50 border-indigo-100 text-indigo-700",
    active: "bg-indigo-600 border-indigo-700 text-white shadow-indigo-500/10 shadow-xs",
    hover: "hover:bg-indigo-50 text-indigo-700",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-100"
  }
};

const SUGGESTED_PROMPTS_BY_SUBJECT: Record<string, string[]> = {
  general: [
    "Tạo một thời khóa biểu tự học hiệu quả",
    "Hướng dẫn phương pháp ghi nhớ từ vựng lâu",
    "Cách viết bài luận thuyết phục người đọc",
    "Giải thích phương pháp học tập Pomodoro"
  ],
  math: [
    "Giải hệ phương trình bậc nhất hai ẩn",
    "Giải thích công thức đạo hàm lượng giác",
    "Cách chứng minh hai tam giác đồng dạng",
    "Tính tích phân hàm số f(x) = x^2"
  ],
  english: [
    "Sửa lỗi ngữ pháp đoạn văn tiếng Anh này",
    "Cách phân biệt thì Hiện tại Hoàn thành & Quá khứ Đơn",
    "Dịch câu: 'Học tập là một hành trình dài' sang tiếng Anh",
    "Giải thích cấu trúc câu điều kiện loại 3"
  ],
  physics: [
    "Giải thích định luật vạn vật hấp dẫn",
    "Tính lực hướng tâm của chuyển động tròn đều",
    "Cơ chế hoạt động của thấu kính hội tụ",
    "Giải thích định luật bảo toàn cơ năng"
  ],
  chemistry: [
    "Cân bằng phản ứng oxi hóa khử bất kỳ",
    "Cách tính nồng độ mol của dung dịch",
    "Giải thích liên kết cộng hóa trị là gì",
    "Viết các phương trình điều chế khí Oxi"
  ],
  biology: [
    "Viết sơ đồ lai hai cặp tính trạng Men-đen",
    "Giải thích quá trình phân bào nguyên phân",
    "Sự khác nhau giữa tế bào thực vật và động vật",
    "Cơ chế tự nhân đôi của ADN diễn ra thế nào?"
  ],
  literature: [
    "Dàn ý phân tích diễn biến tâm trạng nhân vật Mị",
    "Phân tích ý nghĩa hình tượng sóng trong bài thơ Sóng",
    "Lập dàn ý bài văn nghị luận về tinh thần tự học",
    "Tóm tắt cốt truyện và thông điệp tác phẩm Lão Hạc"
  ],
  history: [
    "Tóm tắt diễn biến Chiến dịch Điện Biên Phủ 1954",
    "Ý nghĩa lịch sử của cuộc Cách mạng Tháng Tám 1945",
    "Nguyên nhân trực tiếp dẫn tới Chiến tranh Thế giới thứ 1",
    "Dòng thời gian các triều đại phong kiến Việt Nam"
  ],
  geography: [
    "Tại sao khí hậu nước ta mang tính chất nhiệt đới gió mùa?",
    "Phân tích ảnh hưởng của địa hình đến sông ngòi",
    "Giải thích sự hình thành hiện tượng El Nino và La Nina",
    "Đặc điểm phát triển kinh tế vùng Đồng bằng sông Hồng"
  ],
  it: [
    "Giải thích khái niệm Async/Await trong JavaScript",
    "Viết thuật toán tìm kiếm nhị phân bằng TypeScript",
    "Cách thiết kế cơ sở dữ liệu cho app bán hàng",
    "Sự khác nhau giữa REST API và GraphQL"
  ]
};

const SubjectIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  switch (iconName) {
    case "Sparkles": return <Sparkles className={className} />;
    case "Calculator": return <Calculator className={className} />;
    case "Languages": return <Languages className={className} />;
    case "Atom": return <Atom className={className} />;
    case "FlaskConical": return <FlaskConical className={className} />;
    case "Dna": return <Dna className={className} />;
    case "BookOpen": return <BookOpen className={className} />;
    case "ScrollText": return <ScrollText className={className} />;
    case "Globe": return <Globe className={className} />;
    case "Code2": return <Code2 className={className} />;
    default: return <Sparkles className={className} />;
  }
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  base64?: string;
  textContext?: string;
  status?: "pending" | "parsing" | "parsed" | "error";
}


interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
  status?: "streaming" | "sent" | "error" | "retrying";
  isLoading?: boolean;
  isFallback?: boolean;
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
    if ((msg.isStreaming && !msg.content) || msg.isLoading || msg.isFallback) {
      timer = setTimeout(() => {
        setShowFallbackMsg(true);
      }, 2500);
    } else {
      setShowFallbackMsg(false);
    }
    return () => clearTimeout(timer);
  }, [msg.isStreaming, msg.content, msg.isLoading, msg.isFallback]);

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
          ) : (msg.isStreaming && !msg.content) || msg.status === "retrying" || msg.isLoading || msg.isFallback ? (
            /* Premium shimmer loading skeleton */
            <div className="space-y-2.5 w-64 md:w-80 py-1">
              <div className="h-3.5 bg-slate-200/80 rounded-lg animate-pulse w-3/4" />
              <div className="h-3.5 bg-slate-200/80 rounded-lg animate-pulse w-full" />
              <div className="h-3.5 bg-slate-200/80 rounded-lg animate-pulse w-5/6" />
              <p className="text-[10px] text-slate-400 font-bold mt-2 animate-pulse flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                <span>
                  {msg.status === "retrying"
                    ? msg.content || "Hệ thống AI đang kết nối lại..."
                    : (showFallbackMsg || msg.isFallback)
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
  const [currentSubjectMode, setCurrentSubjectMode] = useState<string>("general");
  const [preferences, setPreferences] = useState<{ length: "concise" | "detailed"; tone: "friendly" | "academic" }>({
    length: "detailed",
    tone: "friendly"
  });
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

  // V2 and Voice states
  const [isBooted, setIsBooted] = useState(false);
  const [loadingText, setLoadingText] = useState("Đang khởi tạo hệ thống AI...");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recognitionLanguage, setRecognitionLanguage] = useState("vi-VN");
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  // Refs
  const currentRequestIdRef = useRef(0);
  const currentRequestRef = useRef<string | null>(null);
  const skipLoadMessagesRef = useRef(false);
  const isRecordingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const recordingIntervalRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
      clearInterval(recordingIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
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

  // ── Auth & Preferences init ──────────────────────────────────────────────────
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

      // Load tone/length preferences
      const storedPrefs = localStorage.getItem("tck_ai_preferences");
      if (storedPrefs) {
        try {
          setPreferences(JSON.parse(storedPrefs));
        } catch (e) {
          console.error(e);
        }
      }
    }

    async function init() {
      const minBootTime = 4000;
      const start = Date.now();

      // Loading texts rotation
      const loadingTexts = [
        "Đang khởi tạo AI...",
        "Đang tải lịch sử trò chuyện...",
        "Đang tối ưu mô hình thông minh...",
        "Đang đồng bộ dữ liệu...",
        "Đang tải cấu hình KaTeX..."
      ];
      let textIdx = 0;
      const textInterval = setInterval(() => {
        textIdx = (textIdx + 1) % loadingTexts.length;
        setLoadingText(loadingTexts[textIdx]);
      }, 1000);

      try {
        await fetchHealth();
      } catch (e) {
        console.error("fetchHealth on init error:", e);
      }

      const preloadChats = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
        if (session) {
          setCurrentUser(session.user);
          try {
            const list = await getAiChats();
            setChats(list);
            if (list.length > 0 && !activeChatId) {
              setActiveChatId(list[0].id);
            }
          } catch (err) {
            console.error("loadChats error during boot:", err);
          }
        }
        setIsLoadingChats(false);
      };

      const preloadSubjects = async () => {
        try {
          const subs = await getSubjects();
          setSubjects(subs);
        } catch (e) {
          console.error("getSubjects error during boot:", e);
        }
      };

      const preloadKatex = async () => {
        try {
          await loadKatex();
        } catch (e) {
          console.error("loadKatex error during boot:", e);
        }
      };

      try {
        await Promise.all([
          preloadChats(),
          preloadSubjects(),
          preloadKatex(),
        ]);
      } catch (e) {
        console.error("Boot preloads failed:", e);
      } finally {
        clearInterval(textInterval);
        const elapsed = Date.now() - start;
        if (elapsed < minBootTime) {
          await new Promise((resolve) => setTimeout(resolve, minBootTime - elapsed));
        }
        setIsAiReady(true);
        setIsBooted(true);
      }
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

  // Sync active chat subject mode from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (activeChatId) {
        const storedChatSubject = localStorage.getItem(`tck_chat_subject_${activeChatId}`);
        if (storedChatSubject) {
          setCurrentSubjectMode(storedChatSubject);
        } else {
          const globalSubject = localStorage.getItem("tck_current_subject_mode") || "general";
          setCurrentSubjectMode(globalSubject);
        }
      } else {
        const globalSubject = localStorage.getItem("tck_current_subject_mode") || "general";
        setCurrentSubjectMode(globalSubject);
      }
    }
  }, [activeChatId]);

  const selectSubjectMode = (modeId: string) => {
    setCurrentSubjectMode(modeId);
    if (typeof window !== "undefined") {
      localStorage.setItem("tck_current_subject_mode", modeId);
      if (activeChatId) {
        localStorage.setItem(`tck_chat_subject_${activeChatId}`, modeId);
      }
    }
  };

  const updatePreference = (key: "length" | "tone", value: string) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("tck_ai_preferences", JSON.stringify(next));
    }
  };

  // ─── Speech recognition configuration ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSpeechSupported(true);
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = recognitionLanguage;

        rec.onstart = () => {
          setRecordingDuration(0);
          recordingIntervalRef.current = setInterval(() => {
            setRecordingDuration((prev) => prev + 1);
          }, 1000);
        };

        rec.onresult = (event: any) => {
          let finalTrans = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTrans += event.results[i][0].transcript;
            }
          }
          if (finalTrans) {
            setPrompt((prev) => {
              const spacing = prev && !prev.endsWith(" ") ? " " : "";
              return prev + spacing + finalTrans;
            });
          }
        };

        rec.onend = () => {
          if (isRecordingRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart speech recognition:", e);
            }
          } else {
            clearInterval(recordingIntervalRef.current);
          }
        };

        rec.onerror = (e: any) => {
          console.error("Speech recognition error:", e);
          if (e.error === "no-speech") {
            return;
          }
          toast.error("Lỗi nhận diện giọng nói: " + e.error);
        };

        recognitionRef.current = rec;
      }
    }
    return () => {
      clearInterval(recordingIntervalRef.current);
    };
  }, [recognitionLanguage]);

  const toggleRecognitionLanguage = (lang: string) => {
    if (lang === recognitionLanguage) return;
    setRecognitionLanguage(lang);
    if (isRecording) {
      isRecordingRef.current = false;
      recognitionRef.current?.stop();

      setTimeout(() => {
        isRecordingRef.current = true;
        setIsRecording(true);
        recognitionRef.current.lang = lang;
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error(e);
        }
      }, 300);
    }
  };

  const startRecording = () => {
    if (!isSpeechSupported || !recognitionRef.current) {
      toast.error("Trình duyệt không hỗ trợ nhận diện giọng nói.");
      return;
    }
    if (isRecording) return;

    isRecordingRef.current = true;
    setIsRecording(true);
    try {
      recognitionRef.current.start();
      toast.success("Đang lắng nghe...");
    } catch (e) {
      console.error("Speech recognition start failed:", e);
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    clearInterval(recordingIntervalRef.current);
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.error(e);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };


  // ── Scroll to bottom ────────────────────────────────────────────────────────
  const isNearBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return true;
    const { scrollHeight, scrollTop, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < 120;
  };

  const scrollToBottom = useCallback((force = false) => {
    const container = chatContainerRef.current;
    if (!container) return;
    if (force || isNearBottom()) {
      window.requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth"
        });
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Load messages on chat switch ────────────────────────────────────────────
  useEffect(() => {
    if (skipLoadMessagesRef.current) {
      // Skip aborting if we are initializing a new chat and skipping messages loading
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsSending(false);
      }
    }

    if (activeChatId) {
      if (skipLoadMessagesRef.current) {
        skipLoadMessagesRef.current = false;
      } else {
        loadMessages(activeChatId);
      }
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
    const requestId = ++currentRequestIdRef.current;
    try {
      const msgs = await getAiMessages(chatId);
      if (requestId !== currentRequestIdRef.current) return;
      setMessages(msgs.map((m: any) => ({
        id: m.id || crypto.randomUUID(),
        role: m.role,
        content: m.content,
        status: "sent"
      })));
    } catch {
      if (requestId !== currentRequestIdRef.current) return;
      toast.error("Không thể tải tin nhắn.");
    }
  };

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const handleCreateNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSending(false);
    }
    setActiveChatId(null);
    setMessages([]);
    setAttachedFiles([]);
    setPrompt("");
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
    currentRequestRef.current = null; // Clear request ownership
    setMessages((prev) => {
      const updated = [...prev];
      const lastIdx = updated.map(m => m.role === "model" && m.isStreaming).lastIndexOf(true);
      if (lastIdx !== -1) {
        const last = updated[lastIdx];
        if (!last.content.trim()) {
          // If it was completely empty, remove it!
          updated.splice(lastIdx, 1);
        } else {
          updated[lastIdx] = {
            ...last,
            isStreaming: false,
            isLoading: false,
            isFallback: false,
            status: "sent",
          };
        }
      }
      return updated.filter((m) => !m.isLoading && !m.isFallback);
    });
    toast.info("Đã dừng tạo câu trả lời.");
  };

  const handleCopyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Đã sao chép!"));
  }, []);

  // ─── File handling ────────────────────────────────────────────────────────────

  // ─── File handling ────────────────────────────────────────────────────────────

  const processUploadedFiles = async (files: File[]) => {
    for (const file of files) {
      if (file.size > 52_428_800) {
        toast.error(`"${file.name}" vượt quá 50MB.`);
        continue;
      }
      const isImg = file.type.startsWith("image/");
      if (isImg) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachedFiles((prev) => [
            ...prev,
            { name: file.name, size: file.size, type: file.type, base64: reader.result as string, status: "parsed" },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        // Document parsing via API
        const newFile: AttachedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          status: "parsing",
        };
        setAttachedFiles((prev) => [...prev, newFile]);

        try {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/ai/parse-file", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Không thể trích xuất tệp.");
          }

          const data = await res.json();
          if (data.success) {
            setAttachedFiles((prev) =>
              prev.map((f) =>
                f.name === file.name && f.status === "parsing"
                  ? { ...f, textContext: data.text, status: "parsed" }
                  : f
              )
            );
            toast.success(`Đã xử lý xong tệp: ${file.name}`);
          } else {
            throw new Error(data.error);
          }
        } catch (error: any) {
          console.error(error);
          toast.error(`Lỗi trích xuất tệp ${file.name}: ${error.message || error}`);
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.name === file.name && f.status === "parsing"
                ? { ...f, status: "error" }
                : f
            )
          );
        }
      }
    }
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

    const hasParsing = attachedFiles.some((f) => f.status === "parsing");
    if (hasParsing) {
      toast.warning("Hệ thống đang trích xuất nội dung tệp của bạn, vui lòng đợi trong giây lát!");
      return;
    }

    let targetChatId = activeChatId;
    if (isLoggedIn && !targetChatId) {
      try {
        const newChat = await createAiChat(text.slice(0, 35) || "Cuộc trò chuyện mới");
        skipLoadMessagesRef.current = true;
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        targetChatId = newChat.id;
      } catch {
        toast.error("Không thể tạo phòng trò chuyện.");
        return;
      }
    }

    const requestId = crypto.randomUUID();
    currentRequestRef.current = requestId;
    console.log("STREAM START");
    console.log("REQUEST ID", requestId);

    // Abort any ongoing stream requests safely
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const currentChatId = isLoggedIn ? targetChatId! : "guest-session";
    const imagesBase64 = attachedFiles.filter((f) => f.base64).map((f) => f.base64!);
    const combinedDocsContext = attachedFiles.filter((f) => f.textContext).map((f) => f.textContext!).join("\n");

    setPrompt("");
    setAttachedFiles([]);
    setIsSending(true);

    const userMsgId = crypto.randomUUID();
    const modelMsgId = crypto.randomUUID();

    // Optimistic UI — add user message + empty AI streaming bubble with isLoading flag
    // Also auto remove any old loading or fallback placeholders from the list
    setMessages((prev) => [
      ...prev.filter((m) => !m.isLoading && !m.isFallback),
      { id: userMsgId, role: "user", content: text, status: "sent" },
      {
        id: modelMsgId,
        role: "model",
        content: "",
        isStreaming: true,
        status: "streaming",
        isLoading: true,
        isFallback: false,
      },
    ]);

    let success = false;
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts && !success) {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Hard timeout: auto abort after 45 seconds
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 45000);

      try {
        if (currentRequestRef.current !== requestId) {
          clearTimeout(timeoutId);
          controller.abort();
          return;
        }

        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: currentChatId,
            prompt: text,
            imagesBase64,
            fileContext: combinedDocsContext || undefined,
            subject: currentSubjectMode !== "general" ? currentSubjectMode : undefined,
            mode: learningMode,
            preferences,
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
        let lastUpdate = 0;
        const THROTTLE_MS = 60;

        while (true) {
          if (currentRequestRef.current !== requestId) {
            console.log("Request ID mismatch in read loop, aborting stream. Request:", requestId);
            controller.abort();
            clearTimeout(timeoutId);
            return;
          }

          const { done, value } = await reader.read();
          if (done) break;
          const chunkText = decoder.decode(value, { stream: true });
          aiText += chunkText;
          console.log("STREAM CHUNK", chunkText.slice(0, 20));
          
          const now = Date.now();
          if (now - lastUpdate >= THROTTLE_MS) {
            if (currentRequestRef.current !== requestId) {
              clearTimeout(timeoutId);
              return;
            }

            setMessages((prev) => {
              const updated = prev.filter((m) => m.id === modelMsgId || (!m.isLoading && !m.isFallback));
              const idx = updated.findIndex((m) => m.id === modelMsgId);
              if (idx !== -1) {
                updated[idx] = {
                  ...updated[idx],
                  content: aiText,
                  isStreaming: true,
                  status: "streaming",
                  isLoading: false,
                  isFallback: false,
                };
              }
              return updated;
            });
            lastUpdate = now;
          }
        }

        clearTimeout(timeoutId);

        if (currentRequestRef.current !== requestId) return;

        console.log("STREAM COMPLETE");

        // Finalise on success - clean all loading/fallback markers
        setMessages((prev) => {
          const updated = prev.filter((m) => m.id === modelMsgId || (!m.isLoading && !m.isFallback));
          const idx = updated.findIndex((m) => m.id === modelMsgId);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              content: aiText,
              isStreaming: false,
              status: "sent",
              isLoading: false,
              isFallback: false,
            };
          }
          return updated;
        });

        success = true;
        currentRequestRef.current = null; // Clear ownership
        if (isLoggedIn) loadChats();
      } catch (err: any) {
        clearTimeout(timeoutId);

        if (currentRequestRef.current !== requestId) {
          // This request was overridden by a new request. Exit silently.
          return;
        }

        if (err.name === "AbortError") {
          setIsSending(false);
          abortControllerRef.current = null;
          currentRequestRef.current = null; // Clear ownership
          // Remove loading placeholders
          setMessages((prev) => prev.filter((m) => !m.isLoading && !m.isFallback));
          return;
        }

        attempt++;
        if (attempt < maxAttempts) {
          const delay = 2000 * Math.pow(2, attempt - 1);
          setMessages((prev) => {
            const updated = prev.filter((m) => m.id === modelMsgId || (!m.isLoading && !m.isFallback));
            const idx = updated.findIndex((m) => m.id === modelMsgId);
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                content: `⚠️ Đang thử kết nối lại... (Lần ${attempt}/${maxAttempts} - Chờ ${delay / 1000}s)`,
                status: "retrying",
                isStreaming: true,
                isLoading: false,
                isFallback: true, // Mark it as fallback
              };
            }
            return updated;
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Out of attempts - CLEANUP ON FAILURE
          const errorMessage = err.message || "Không thể gửi. Vui lòng thử lại.";
          toast.error(errorMessage);

          setMessages((prev) => {
            const updated = prev.filter((m) => m.id === modelMsgId || (!m.isLoading && !m.isFallback));
            const idx = updated.findIndex((m) => m.id === modelMsgId);
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                content: "⚠️ AI đang bận, vui lòng thử lại sau vài giây.",
                isError: true,
                isStreaming: false,
                status: "error",
                isLoading: false,
                isFallback: false,
              };
            }
            return updated;
          });

          setIsSending(false);
          abortControllerRef.current = null;
          currentRequestRef.current = null;
        }
      } finally {
        if (success) {
          setIsSending(false);
          abortControllerRef.current = null;
        }
      }
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
      <style>{`
        @keyframes waveform-bar {
          0% { transform: scaleY(0.35); }
          100% { transform: scaleY(1); }
        }
      `}</style>
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

        {/* Horizontal AI Mode Selector */}
        <div className="bg-white/60 backdrop-blur-md border-b border-black/[0.05] px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-none shrink-0 items-center select-none z-10">
          <div className="flex gap-2 max-w-7xl mx-auto w-full md:px-2">
            {SUBJECT_MODES.map((mode) => {
              const colors = COLOR_MAP[mode.color] || COLOR_MAP.slate;
              const isActive = currentSubjectMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => selectSubjectMode(mode.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all duration-200 whitespace-nowrap shrink-0 ${
                    isActive
                      ? `${colors.active} scale-[1.02] border-transparent`
                      : `${colors.bg} border-slate-150 text-slate-650 hover:bg-slate-100 hover:scale-[1.01] active:scale-[0.99]`
                  }`}
                >
                  <SubjectIcon iconName={mode.icon} className="h-3.5 w-3.5 shrink-0" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/20"
        >
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
            <div className="max-w-2xl mx-auto py-12 space-y-8 animate-fade-in">
              <div className="text-center space-y-4">
                {/* Glowing Logo */}
                <div className="relative h-16 w-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl animate-pulse" />
                  <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-fade-in">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Hôm nay bạn muốn học gì?
                </h1>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-semibold">
                  Hỏi đáp bài tập, giải đề thi khó, tóm tắt tài liệu học tập cùng trí tuệ nhân tạo thế hệ mới.
                </p>
              </div>

              {/* Suggested Prompts Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Gợi ý câu hỏi dành cho bạn
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(SUGGESTED_PROMPTS_BY_SUBJECT[currentSubjectMode] || SUGGESTED_PROMPTS_BY_SUBJECT.general).map((pText) => (
                    <button
                      key={pText}
                      onClick={() => {
                        setPrompt(pText);
                        textareaRef.current?.focus();
                        setTimeout(autoResize, 50);
                      }}
                      className="bg-white border border-black/[0.05] p-4 rounded-2xl hover:border-blue-500/30 hover:shadow-xs text-left transition-all duration-200 group/suggest cursor-pointer"
                    >
                      <p className="text-xs font-bold text-slate-800 group-hover/suggest:text-blue-600 line-clamp-2 leading-relaxed">
                        {pText}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400 mt-2 group-hover/suggest:text-blue-500 transition-colors">
                        Thử ngay <CornerDownRight className="h-3 w-3" />
                      </span>
                    </button>
                  ))}
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
                    
                    {/* Status Overlays */}
                    {file.status === "parsing" && (
                      <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-2">
                        <Loader2 className="animate-spin text-blue-600 h-5 w-5" />
                        <span className="text-[8px] font-extrabold text-blue-700 mt-1 uppercase tracking-wider animate-pulse">Đang quét...</span>
                      </div>
                    )}
                    {file.status === "error" && (
                      <div className="absolute inset-0 bg-rose-50/95 flex flex-col items-center justify-center z-2 border border-rose-250">
                        <X className="h-5 w-5 text-rose-600" />
                        <span className="text-[8px] font-extrabold text-rose-700 mt-1 uppercase tracking-wider">Lỗi đọc file</span>
                      </div>
                    )}

                    <button type="button" onClick={() => setAttachedFiles((p) => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-slate-900/50 hover:bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 cursor-pointer transition">
                      <X className="h-3 w-3" />
                    </button>
                    {file.base64 && file.status !== "parsing" && (
                      <button type="button" onClick={() => setZoomImage(file.base64!)} className="absolute bottom-1 left-1 h-5 w-5 rounded-full bg-slate-900/50 hover:bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 cursor-pointer transition">
                        <Maximize2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions (Pill row above input form) */}
            {messages.length > 0 && !isSending && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 flex-nowrap md:flex-wrap">
                {[
                  { label: "💡 Giải thích dễ hơn", prompt: "Hãy giải thích nội dung trên một cách dễ hiểu hơn, có ví dụ thực tế minh họa." },
                  { label: "📝 Tóm tắt", prompt: "Hãy tóm tắt ngắn gọn các ý chính của câu trả lời trước." },
                  { label: "⚡ Viết ngắn hơn", prompt: "Hãy viết lại câu trả lời trên một cách ngắn gọn, súc tích và tập trung vào đáp án." },
                  { label: "⏭️ Tiếp tục", prompt: "Hãy tiếp tục viết tiếp phần nội dung còn dang dở." },
                  { label: "🎴 Tạo flashcards", prompt: "Hãy tạo danh sách flashcards ghi nhớ (Câu hỏi - Câu trả lời) dựa trên thông tin trên." }
                ].map((act) => (
                  <button
                    key={act.label}
                    type="button"
                    onClick={() => sendMessage(act.prompt)}
                    className="px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-350 text-[10px] font-bold text-slate-650 transition cursor-pointer whitespace-nowrap shadow-3xs hover:shadow-2xs active:scale-95 animate-fade-in"
                  >
                    {act.label}
                  </button>
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

            {/* Voice Recording Panel */}
            {isRecording && (
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 p-4 rounded-3xl shadow-lg flex items-center justify-between gap-4 animate-fade-in select-none">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Đang ghi âm bằng giọng nói...</span>
                    <span className="text-[10px] text-slate-400 font-bold">{formatDuration(recordingDuration)}</span>
                  </div>
                </div>

                {/* Animated Waveform */}
                <div className="flex items-center gap-0.75 h-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => {
                    const delay = (bar * 0.12).toFixed(2);
                    const height = [14, 22, 10, 18, 6, 20, 12, 16, 8, 22][bar - 1];
                    return (
                      <span
                        key={bar}
                        className="w-0.75 bg-blue-600 rounded-full animate-pulse"
                        style={{
                          height: `${height}px`,
                          animation: `waveform-bar 1.2s ease-in-out infinite alternate`,
                          animationDelay: `${delay}s`
                        }}
                      />
                    );
                  })}
                </div>

                {/* Language Switcher & Stop Recording Button */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => toggleRecognitionLanguage("vi-VN")}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition ${
                        recognitionLanguage === "vi-VN"
                          ? "bg-white text-slate-850 shadow-3xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Tiếng Việt
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRecognitionLanguage("en-US")}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition ${
                        recognitionLanguage === "en-US"
                          ? "bg-white text-slate-850 shadow-3xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      English
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={stopRecording}
                    className="h-7 w-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition border border-slate-200/40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Input form */}
            <form
              onSubmit={handleSendMessage}
              className={`bg-white border border-black/[0.05] rounded-3xl shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-300 overflow-hidden ${
                !isAiReady ? "animate-pulse border-slate-100" : ""
              }`}
            >
              {/* Toolbar row (Settings & Mode options) */}
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-slate-100/80 bg-slate-50/50 flex-wrap">
                {/* Learning Modes button group */}
                <div className="flex items-center gap-0.5 bg-slate-200/60 p-0.5 rounded-lg shrink-0 select-none">
                  {[
                    { id: "chat", label: "Giải bài" },
                    { id: "summarize", label: "Tóm tắt" },
                    { id: "quiz", label: "Trắc nghiệm" },
                    { id: "notes", label: "Ghi chú" }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setLearningMode(m.id as any)}
                      className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold transition cursor-pointer ${
                        learningMode === m.id
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Preferences Controls */}
                <div className="flex items-center gap-2 select-none flex-wrap sm:flex-nowrap">
                  {/* Length Toggle */}
                  <div className="flex items-center gap-0.5 bg-slate-200/60 p-0.5 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => updatePreference("length", "concise")}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition cursor-pointer ${
                        preferences.length === "concise"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Ngắn gọn
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePreference("length", "detailed")}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition cursor-pointer ${
                        preferences.length === "detailed"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Chi tiết
                    </button>
                  </div>

                  {/* Tone Toggle */}
                  <div className="flex items-center gap-0.5 bg-slate-200/60 p-0.5 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => updatePreference("tone", "friendly")}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition cursor-pointer ${
                        preferences.tone === "friendly"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Thân thiện
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePreference("tone", "academic")}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition cursor-pointer ${
                        preferences.tone === "academic"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Học thuật
                    </button>
                  </div>
                </div>
              </div>

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

                {/* Microphone trigger button */}
                {isSpeechSupported && (
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 transition ${
                      isRecording
                        ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                    title={isRecording ? "Dừng ghi âm" : "Nhập liệu bằng giọng nói"}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                )}

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
        {!isBooted && (
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
                {loadingText}
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
