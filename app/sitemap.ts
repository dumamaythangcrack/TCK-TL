import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tcktailieu.vercel.app";
  
  // Static Routes
  const routes = ["", "/ai", "/documents", "/dashboard", "/login", "/register"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    const supabase = await createAdminClient();
    
    // Fetch all approved documents to dynamic SEO links
    const { data: bundles } = await supabase
      .from("document_bundles")
      .select("slug, updated_at")
      .eq("status", "approved");

    const dynamicRoutes = (bundles || []).map((bundle) => ({
      url: `${baseUrl}/document/${bundle.slug}`,
      lastModified: new Date(bundle.updated_at).toISOString(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...routes, ...dynamicRoutes];
  } catch (error) {
    console.error("Dynamic Sitemap Generation Error:", error);
    return routes;
  }
}
