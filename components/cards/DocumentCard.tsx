"use client";

import Link from "next/link";
import { Download, Eye, Bookmark, FileText, CheckCircle2, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface DocumentCardProps {
  doc: {
    id: string;
    title: string;
    description?: string;
    slug: string;
    view_count?: number;
    download_count?: number;
    like_count?: number;
    category?: { name: string };
    grade?: { name: string };
    subject?: { name: string };
    uploader?: { full_name: string; avatar_url?: string };
    files?: any[];
  };
  isBookmarked?: boolean;
  onBookmarkClick?: (e: React.MouseEvent, docId: string) => void;
}

export default function DocumentCard({ doc, isBookmarked = false, onBookmarkClick }: DocumentCardProps) {
  // Determine gradient color based on subject name
  const getSubjectGradient = (subjectName: string = "") => {
    const name = subjectName.toLowerCase();
    if (name.includes("toán")) return "from-blue-600 to-indigo-700";
    if (name.includes("lý") || name.includes("vật lý")) return "from-purple-600 to-indigo-700";
    if (name.includes("hóa") || name.includes("hóa học")) return "from-emerald-500 to-teal-600";
    if (name.includes("văn") || name.includes("ngữ văn")) return "from-rose-500 to-orange-600";
    if (name.includes("anh") || name.includes("tiếng anh")) return "from-sky-500 to-blue-600";
    if (name.includes("sinh") || name.includes("sinh học")) return "from-green-500 to-emerald-600";
    return "from-slate-600 to-zinc-700";
  };

  // Get primary file details
  const primaryFile = doc.files?.find((f) => f.is_primary) || doc.files?.[0];
  const fileExt = primaryFile?.file_extension?.toUpperCase() || "PDF";
  
  // Resolve thumbnail path if any
  const thumbnailKey = primaryFile?.thumbnail_key;
  const thumbnailUrl = thumbnailKey
    ? `/api/download?bucket=thumbnails&path=${encodeURIComponent(thumbnailKey)}`
    : null;

  return (
    <div className="group bg-white border border-black/[0.05] rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.04)] hover:border-black/[0.08] transition-all duration-300 flex flex-col h-full relative">
      
      {/* 1. Styled Thumbnail Header block */}
      <div className="h-32 w-full relative overflow-hidden shrink-0 select-none">
        {thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbnailUrl}
            alt={doc.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getSubjectGradient(doc.subject?.name)} flex items-center justify-center relative p-4`}>
            {/* Visual background textures */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="flex flex-col items-center gap-1.5 text-white/90">
              <FileText className="h-8 w-8 text-white/90 drop-shadow-sm" />
              <span className="text-[10px] font-bold tracking-wider opacity-90 uppercase">
                {doc.subject?.name || "TÀI LIỆU KHÓA HỌC"}
              </span>
            </div>
          </div>
        )}

        {/* Category Tag Overlay */}
        <span className="absolute bottom-2.5 left-2.5 text-[8px] bg-slate-900/60 backdrop-blur-xs text-white border border-white/10 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
          {doc.category?.name || "Tài liệu"}
        </span>

        {/* File Extension tag overlay */}
        <span className="absolute bottom-2.5 right-2.5 text-[8px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded-md shadow-sm">
          {fileExt}
        </span>

        {/* Bookmark Trigger */}
        {onBookmarkClick && (
          <button
            onClick={(e) => onBookmarkClick(e, doc.id)}
            className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-white/90 backdrop-blur-xs hover:bg-white border border-black/[0.04] text-slate-500 hover:text-red-500 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
          >
            <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-red-500 text-red-500" : ""}`} />
          </button>
        )}
      </div>

      {/* 2. Text description details */}
      <div className="p-4 flex flex-col justify-between flex-1 gap-4">
        <div className="space-y-1.5">
          <Link href={`/document/${doc.slug}`}>
            <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug tracking-tight">
              {doc.title}
            </h3>
          </Link>
          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
            {doc.description || "Tài liệu ôn thi chất lượng được chia sẻ miễn phí bởi thành viên."}
          </p>
        </div>

        {/* 3. Footer row */}
        <div className="space-y-3 border-t border-slate-100 pt-3">
          {/* Metadata tags */}
          <div className="flex flex-wrap gap-1 text-[9px] font-bold">
            {doc.grade?.name && (
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                {doc.grade.name}
              </span>
            )}
            {doc.subject?.name && (
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                {doc.subject.name}
              </span>
            )}
            {doc.files && doc.files.length > 1 && (
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                {doc.files.length} tệp
              </span>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
            {/* Uploader info */}
            <div className="flex items-center gap-1.5 max-w-[120px]">
              <div className="h-5 w-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[9px] text-slate-700 uppercase shrink-0">
                {doc.uploader?.full_name?.charAt(0) || "U"}
              </div>
              <span className="truncate text-slate-600 font-semibold">{doc.uploader?.full_name || "Thành viên"}</span>
            </div>

            {/* View & download stats */}
            <div className="flex items-center gap-2 text-slate-400">
              <span className="flex items-center gap-0.5 font-semibold">
                <Eye className="h-3 w-3" /> {doc.view_count || 0}
              </span>
              <span className="flex items-center gap-0.5 font-semibold">
                <Download className="h-3 w-3" /> {doc.download_count || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
