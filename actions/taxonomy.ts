"use server";

import { createClient } from "@/lib/supabase/server";

function isPlaceholder() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder");
}

const MOCK_CATEGORIES = [
  { id: "cat-1", name: "Tài liệu học tập", slug: "tai-lieu-hoc-tap", description: "Sách giáo khoa, sách tham khảo, đề cương" },
  { id: "cat-2", name: "Đề thi & Kiểm tra", slug: "de-thi-kiem-tra", description: "Đề thi giữa kỳ, cuối kỳ, thi thử THPT Quốc gia" },
  { id: "cat-3", name: "Giáo án & Bài giảng", slug: "giao-an-bai-giang", description: "Giáo án giáo viên, slide thuyết trình bài học" },
  { id: "cat-4", name: "Luận văn & Nghiên cứu", slug: "luan-van-nghien-cuu", description: "Đồ án tốt nghiệp, luận văn thạc sĩ" }
];

const MOCK_GRADES = [
  { id: "grade-1", name: "Lớp 1", level: "primary", sort_order: 1 },
  { id: "grade-2", name: "Lớp 2", level: "primary", sort_order: 2 },
  { id: "grade-3", name: "Lớp 3", level: "primary", sort_order: 3 },
  { id: "grade-4", name: "Lớp 4", level: "primary", sort_order: 4 },
  { id: "grade-5", name: "Lớp 5", level: "primary", sort_order: 5 },
  { id: "grade-6", name: "Lớp 6", level: "secondary", sort_order: 6 },
  { id: "grade-7", name: "Lớp 7", level: "secondary", sort_order: 7 },
  { id: "grade-8", name: "Lớp 8", level: "secondary", sort_order: 8 },
  { id: "grade-9", name: "Lớp 9", level: "secondary", sort_order: 9 },
  { id: "grade-10", name: "Lớp 10", level: "high_school", sort_order: 10 },
  { id: "grade-11", name: "Lớp 11", level: "high_school", sort_order: 11 },
  { id: "grade-12", name: "Lớp 12", level: "high_school", sort_order: 12 },
  { id: "grade-13", name: "Đại học", level: "university", sort_order: 13 }
];

const MOCK_SUBJECTS = [
  { id: "sub-1", name: "Toán học", slug: "toan-hoc" },
  { id: "sub-2", name: "Ngữ văn", slug: "ngu-van" },
  { id: "sub-3", name: "Tiếng Anh", slug: "tieng-anh" },
  { id: "sub-4", name: "Vật lý", slug: "vat-ly" },
  { id: "sub-5", name: "Hóa học", slug: "hoa-hoc" },
  { id: "sub-6", name: "Sinh học", slug: "sinh-hoc" },
  { id: "sub-7", name: "Lịch sử", slug: "lich-su" },
  { id: "sub-8", name: "Địa lý", slug: "dia-ly" },
  { id: "sub-9", name: "Tin học", slug: "tin-hoc" },
  { id: "sub-10", name: "GDCD", slug: "gdcd" }
];

export async function getCategories() {
  if (isPlaceholder()) {
    return MOCK_CATEGORIES;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    console.warn("Fetch Categories (Handled warning):", error.message);
    return MOCK_CATEGORIES;
  }
  return data || MOCK_CATEGORIES;
}

export async function getGrades() {
  if (isPlaceholder()) {
    return MOCK_GRADES;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grades")
    .select("*")
    .order("sort_order");

  if (error) {
    console.warn("Fetch Grades (Handled warning):", error.message);
    return MOCK_GRADES;
  }
  return data || MOCK_GRADES;
}

export async function getSubjects() {
  if (isPlaceholder()) {
    return MOCK_SUBJECTS;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("name");

  if (error) {
    console.warn("Fetch Subjects (Handled warning):", error.message);
    return MOCK_SUBJECTS;
  }
  return data || MOCK_SUBJECTS;
}

// Development helper to seed the tables if they are empty
export async function seedTaxonomyIfEmpty() {
  const supabase = await createClient();
  
  // 1. Categories
  const { count: catCount } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });

  if (catCount === 0) {
    const cats = [
      { name: "Tài liệu học tập", slug: "tai-lieu-hoc-tap", description: "Sách giáo khoa, sách tham khảo, đề cương" },
      { name: "Đề thi & Kiểm tra", slug: "de-thi-kiem-tra", description: "Đề thi giữa kỳ, cuối kỳ, thi thử THPT Quốc gia" },
      { name: "Giáo án & Bài giảng", slug: "giao-an-bai-giang", description: "Giáo án giáo viên, slide thuyết trình bài học" },
      { name: "Luận văn & Nghiên cứu", slug: "luan-van-nghien-cuu", description: "Đồ án tốt nghiệp, luận văn thạc sĩ" }
    ];
    await supabase.from("categories").insert(cats);
  }

  // 2. Grades
  const { count: gradeCount } = await supabase
    .from("grades")
    .select("*", { count: "exact", head: true });

  if (gradeCount === 0) {
    const grades = [];
    // Primary School
    for (let i = 1; i <= 5; i++) {
      grades.push({ name: `Lớp ${i}`, level: "primary", sort_order: i });
    }
    // Secondary School
    for (let i = 6; i <= 9; i++) {
      grades.push({ name: `Lớp ${i}`, level: "secondary", sort_order: i });
    }
    // High School
    for (let i = 10; i <= 12; i++) {
      grades.push({ name: `Lớp ${i}`, level: "high_school", sort_order: i });
    }
    // University
    grades.push({ name: "Đại học", level: "university", sort_order: 13 });

    await supabase.from("grades").insert(grades);
  }

  // 3. Subjects
  const { count: subCount } = await supabase
    .from("subjects")
    .select("*", { count: "exact", head: true });

  if (subCount === 0) {
    const subs = [
      { name: "Toán học", slug: "toan-hoc" },
      { name: "Ngữ văn", slug: "ngu-van" },
      { name: "Tiếng Anh", slug: "tieng-anh" },
      { name: "Vật lý", slug: "vat-ly" },
      { name: "Hóa học", slug: "hoa-hoc" },
      { name: "Sinh học", slug: "sinh-hoc" },
      { name: "Lịch sử", slug: "lich-su" },
      { name: "Địa lý", slug: "dia-ly" },
      { name: "Tin học", slug: "tin-hoc" },
      { name: "Giáo dục công dân", slug: "gdcd" }
    ];
    await supabase.from("subjects").insert(subs);
  }

  return { success: true };
}
