import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const getSiteUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) return "https://tcktailieu.vercel.app";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};

export const metadata: Metadata = {
  title: "TCK Tài Liệu | Chia sẻ Đề thi & Giáo án Miễn Phí",
  description: "Nền tảng chia sẻ, lưu trữ tài liệu học tập phi lợi nhuận cho cộng đồng Việt Nam. Tích hợp AI giải bài tập thông minh.",
  metadataBase: new URL(getSiteUrl()),
  openGraph: {
    title: "TCK Tài Liệu | Nền tảng chia sẻ học tập thế hệ mới",
    description: "Chia sẻ giáo án, đề thi và hỗ trợ giải bài tập bằng công nghệ AI Gemini 3.0 Flash.",
    locale: "vi_VN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${outfit.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
        <Toaster richColors theme="light" position="top-center" closeButton />
      </body>
    </html>
  );
}

