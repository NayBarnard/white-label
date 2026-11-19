import { createClient } from "@supabase/supabase-js";
import { company } from "@/data/firmData";
import { features } from "@/config/features";
import { getResearchArticle, type ResearchArticle, researchCategories } from "@/lib/insights/catalog";
import type { PortalDatabase } from "@/lib/supabase/portal";

function researchClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient<PortalDatabase>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function mapManagerUpdate(data: {
  public_slug: string;
  title: string;
  body: string;
  category: string;
  author_name: string | null;
  author_designation: string | null;
  author_bio: string | null;
  executive_summary: string | null;
  key_takeaways: string[];
  placeholder_perspective: string | null;
  related_slugs: string[];
  strategy: "PLACEHOLDER BRAND Balanced" | "PLACEHOLDER BRAND Cautious" | "Both";
  published_at: string | null;
  featured: boolean;
}): ResearchArticle {
  const category = researchCategories.find((item) => item === data.category) ?? "Fund Updates";
  const sentences = data.body.split(/(?<=[.!?])\s+/).filter(Boolean);
  const executiveSummary = data.executive_summary ?? sentences.slice(0, 2).join(" ").slice(0, 500);
  return {
    slug: data.public_slug,
    title: data.title,
    category,
    date: (data.published_at ?? new Date().toISOString()).slice(0, 10),
    excerpt: executiveSummary,
    body: data.body,
    author: data.author_name ?? "PLACEHOLDER BRAND Investment Team",
    designation: data.author_designation ?? "Investment research",
    authorBio: data.author_bio ?? "The team responsible for PLACEHOLDER BRAND' investment research and portfolio perspectives.",
    executiveSummary,
    readingTime: Math.max(1, Math.ceil(data.body.split(/\s+/).length / 220)),
    strategy: data.strategy,
    documentType: "Research",
    keyTakeaways: data.key_takeaways.length ? data.key_takeaways : sentences.slice(0, 3),
    perspective: data.placeholder_perspective ?? `${company.legalName} has published this manager update for general information. It is not a personal recommendation.`,
    relatedSlugs: data.related_slugs,
    source: company.legalName,
    featured: data.featured,
  };
}

export async function getCanonicalResearchArticle(slug: string): Promise<ResearchArticle | undefined> {
  const knownArticle = getResearchArticle(slug);
  if (knownArticle) return knownArticle;
  if (!features.managerUpdates) return undefined;
  const supabase = researchClient();
  if (!supabase) return undefined;
  const { data, error } = await supabase
    .from("manager_updates")
    .select("public_slug,title,body,category,author_name,author_designation,author_bio,executive_summary,key_takeaways,placeholder_perspective,related_slugs,strategy,published_at,scheduled_at,status,featured")
    .eq("public_slug", slug)
    .eq("status", "published")
    .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
    .maybeSingle();
  if (error) {
    console.error("Published research article could not be loaded.", error);
    throw new Error("Published research could not be loaded.");
  }
  if (!data) return undefined;
  return mapManagerUpdate(data);
}

export async function getPublishedResearchCatalog(): Promise<ResearchArticle[]> {
  if (!features.managerUpdates) return [];
  const supabase = researchClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("manager_updates")
    .select("public_slug,title,body,category,author_name,author_designation,author_bio,executive_summary,key_takeaways,placeholder_perspective,related_slugs,strategy,published_at,scheduled_at,status,featured")
    .eq("status", "published")
    .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("Published research catalog could not be loaded.", error);
    throw new Error("Published research could not be loaded.");
  }
  return data.map(mapManagerUpdate);
}
