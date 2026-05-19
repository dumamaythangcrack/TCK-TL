"use server";

import LandingPage from "@/components/landing/LandingPage";
import { searchDocuments } from "@/actions/documents";
import { getCategories, getGrades, getSubjects } from "@/actions/taxonomy";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Pre-load all database lists server-side for high performance and SEO indexation
  const [
    { data: initialDocs },
    categories,
    grades,
    subjects
  ] = await Promise.all([
    searchDocuments({ status: "approved" }, 12, 0),
    getCategories(),
    getGrades(),
    getSubjects(),
  ]);

  return (
    <LandingPage
      initialDocuments={initialDocs || []}
      categories={categories}
      grades={grades}
      subjects={subjects}
      isLoggedIn={!!user}
      currentUser={user}
    />
  );
}
