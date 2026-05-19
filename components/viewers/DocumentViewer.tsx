"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Download, ShieldAlert, Lock, ZoomIn, ZoomOut } from "lucide-react";

interface DocumentViewerProps {
  fileUrl: string;
  fileName: string;
  fileExtension: string;
  isLoggedIn: boolean;
  onDownloadRequest: () => void;
}

export default function DocumentViewer({
  fileUrl,
  fileName,
  fileExtension,
  isLoggedIn,
  onDownloadRequest,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);

  const ext = fileExtension.toLowerCase();
  const isPdf = ext === "pdf";
  const isImage = ["png", "jpg", "jpeg"].includes(ext);
  const isOffice = ["docx", "pptx", "xlsx"].includes(ext);

  // Office viewer fallback URL (Google Docs Viewer)
  const officeViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));

  return (
    <div className="relative w-full aspect-[4/5] md:aspect-[3/4] bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      
      {/* Light Premium Viewer Controls Header */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 max-w-[60%]">
          <Eye className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-xs md:text-sm font-bold truncate text-slate-800">{fileName}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls for PDF & Images */}
          {(isPdf || isImage) && isLoggedIn && (
            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5 mr-2">
              <Button onClick={handleZoomOut} size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-slate-800">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-bold px-2 text-slate-600">{zoom}%</span>
              <Button onClick={handleZoomIn} size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-slate-800">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            onClick={onDownloadRequest}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl shadow-2xs transition"
          >
            <Download className="h-3.5 w-3.5" />
            Tải về
          </Button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="w-full h-full pt-14 flex items-center justify-center relative overflow-hidden bg-slate-200">
        
        {/* Guest Lock & Blur Overlay */}
        {!isLoggedIn && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-md animate-fade-in space-y-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">Xem trước bị giới hạn</h3>
                <p className="text-xs text-slate-500 leading-relaxed px-4">
                  Bạn đang xem tài liệu học tập dưới quyền Khách. Vui lòng đăng nhập hoặc đăng ký tài khoản miễn phí để mở khóa toàn bộ các trang và tải xuống tốc độ cao.
                </p>
              </div>
              <Button
                onClick={onDownloadRequest}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-2xs"
              >
                Đăng nhập / Đăng ký ngay
              </Button>
            </div>
          </div>
        )}

        {/* WATERMARK OVERLAY (Security & Branding) */}
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-center gap-16 select-none opacity-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="text-slate-800 text-xs md:text-sm font-extrabold tracking-widest uppercase transform -rotate-45"
            >
              TCK TÀI LIỆU
            </span>
          ))}
        </div>

        {/* PDF Viewer */}
        {isPdf && (
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            className="w-full h-full transition-transform duration-200"
          >
            <iframe
              src={`${fileUrl}#toolbar=0`}
              className="w-full h-full border-0 bg-slate-200"
              title="PDF Viewer"
            />
          </div>
        )}

        {/* Office File Viewer */}
        {isOffice && (
          <iframe
            src={officeViewerUrl}
            className="w-full h-full border-0 bg-slate-200"
            title="Office Document Viewer"
          />
        )}

        {/* Image Viewer */}
        {isImage && (
          <div
            style={{ transform: `scale(${zoom / 100})` }}
            className="max-w-[90%] max-h-[90%] flex items-center justify-center transition-transform duration-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-full rounded-xl object-contain shadow-sm border border-slate-200 bg-white"
            />
          </div>
        )}

        {/* Fallback for unsupported formats */}
        {!isPdf && !isOffice && !isImage && (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-slate-400">
            <ShieldAlert className="h-10 w-10 text-slate-500" />
            <p className="font-bold text-slate-800 text-xs">Không hỗ trợ xem trước trực tiếp định dạng này</p>
            <p className="text-[10px] text-slate-450 max-w-xs leading-relaxed">
              Tệp tin .{ext} có dung lượng lớn hoặc định dạng chuyên biệt. Bạn hãy bấm **Tải về** ở góc phải để mở tài liệu trực tiếp trên thiết bị cá nhân.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
