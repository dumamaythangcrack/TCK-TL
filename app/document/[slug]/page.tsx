"use server";

import { getDocumentDetails } from "@/actions/documents";
import DocumentDetailShell from "@/components/document/DocumentDetailShell";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface DocumentPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate dynamic SEO metadata directly from database values for absolute search engine optimization
export async function generateMetadata({ params }: DocumentPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const bundle = await getDocumentDetails(resolvedParams.slug);

  if (!bundle) {
    return {
      title: "Tài liệu không tồn tại | TCK Tài Liệu",
    };
  }

  return {
    title: `${bundle.title} | TCK Tài Liệu`,
    description: bundle.description || "Nền tảng chia sẻ và lưu trữ tài liệu học tập phi lợi nhuận cho cộng đồng Việt Nam.",
    openGraph: {
      title: `${bundle.title} | TCK Tài Liệu`,
      description: bundle.description || "Nền tảng chia sẻ và ôn thi THPT Quốc Gia.",
      type: "article",
    },
  };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const resolvedParams = await params;
  const bundle = await getDocumentDetails(resolvedParams.slug);

  if (!bundle) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let likedInitial = false;
  let bookmarkedInitial = false;
  let followedInitial = false;

  // If user logged in, pre-fetch relationship states
  if (user) {
    const [
      { data: like },
      { data: bookmark },
      { data: follow }
    ] = await Promise.all([
      supabase.from("document_likes").select("*").eq("user_id", user.id).eq("bundle_id", bundle.id).maybeSingle(),
      supabase.from("bookmarks").select("*").eq("user_id", user.id).eq("bundle_id", bundle.id).maybeSingle(),
      bundle.uploader_id 
        ? supabase.from("followers").select("*").eq("follower_id", user.id).eq("following_id", bundle.uploader_id).maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    likedInitial = !!like;
    bookmarkedInitial = !!bookmark;
    followedInitial = !!follow;
  }

  // Pre-load comments with profiles details
  const { data: comments } = await supabase
    .from("document_comments")
    .select(`
      *,
      user:profiles(id, full_name, role)
    `)
    .eq("bundle_id", bundle.id)
    .order("created_at", { ascending: false });

  // Bind comments to bundle
  const enrichedBundle = {
    ...bundle,
    comments: comments || [],
  };

  return (
    <DocumentDetailShell
      bundle={enrichedBundle}
      isLoggedIn={!!user}
      currentUser={user}
      likedInitial={likedInitial}
      bookmarkedInitial={bookmarkedInitial}
      followedInitial={followedInitial}
    />
  );
}
