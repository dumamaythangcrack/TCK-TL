import { searchDocuments } from "@/actions/documents";
import { getCategories, getGrades, getSubjects } from "@/actions/taxonomy";
import { createClient } from "@/lib/supabase/server";
import DocumentsCatalogClient from "./DocumentsCatalogClient";

export const metadata = {
  title: "Kho Tài Liệu & Giáo Án Học Tập Lớn Nhất - TCK Tài Liệu",
  description: "Khám phá hàng nghìn đề ôn thi THPT, slide bài giảng, đề kiểm tra học kì Toán, Lý, Hóa, Sinh, Văn, Anh từ lớp 1 đến lớp 12.",
};

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Load all initial taxonomies and approved document bundles server-side
  const [
    { data: initialDocs },
    categories,
    grades,
    subjects
  ] = await Promise.all([
    searchDocuments({ status: "approved" }, 24, 0),
    getCategories(),
    getGrades(),
    getSubjects(),
  ]);

  return (
    <DocumentsCatalogClient
      initialDocuments={initialDocs || []}
      categories={categories}
      grades={grades}
      subjects={subjects}
      isLoggedIn={!!user}
      currentUser={user}
    />
  );
}
