import { NextResponse } from "next/server";
import { authorizeAdviserApi } from "@/lib/adviser/server";
import {
  classifyPlatformQuery,
  searchPlatformRecords,
  type AvailabilityRecord,
  type PlatformRecord,
  type PlatformSearchRecord,
  type ShareClassRecord,
} from "@/lib/platforms";
import { enforceAuthenticatedRateLimit } from "@/lib/server/rate-limit";

const EMPTY_MESSAGE = "No platform availability has been published yet";

export async function GET(request: Request) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;
  const rateLimit = await enforceAuthenticatedRateLimit(access.user.id, "adviser-platforms", 30, 60);
  if (!rateLimit.ok) return rateLimit.response;

  try {
    const [platformResult, shareClassResult, availabilityResult] = await Promise.all([
      access.supabase.from("platforms").select("*").eq("is_active", true).order("name").limit(1000),
      access.supabase.from("fund_share_classes").select("*").eq("is_active", true).order("fund_name").limit(5000),
      access.supabase.from("platform_availability").select("*").order("updated_at", { ascending: false }).limit(10000),
    ]);
    const failure = platformResult.error ?? shareClassResult.error ?? availabilityResult.error;
    if (failure || !platformResult.data || !shareClassResult.data || !availabilityResult.data) {
      console.error("Adviser platform availability could not be loaded.", failure);
      return NextResponse.json({ error: "Platform availability could not be loaded. Please try again." }, { status: 502 });
    }

    const platforms: PlatformRecord[] = platformResult.data.map((item) => ({
      id: item.id, name: item.name, isActive: item.is_active,
    }));
    const shareClasses: ShareClassRecord[] = shareClassResult.data.map((item) => ({
      id: item.id, fundName: item.fund_name, shareClass: item.share_class,
      jseCode: item.jse_code, isin: item.isin, isActive: item.is_active,
    }));
    const availability: AvailabilityRecord[] = availabilityResult.data.map((item) => ({
      id: item.id, shareClassId: item.share_class_id, platformId: item.platform_id,
      status: item.status, platformFundCode: item.platform_fund_code,
      source: item.source, sourceUrl: item.source_url, verifiedBy: item.verified_by,
      verifiedOn: item.verified_on, createdAt: item.created_at, updatedAt: item.updated_at,
    }));
    const platformById = new Map(platforms.map((item) => [item.id, item]));
    const shareClassById = new Map(shareClasses.map((item) => [item.id, item]));
    const records: PlatformSearchRecord[] = availability.flatMap((item) => {
      const platform = platformById.get(item.platformId);
      const shareClass = shareClassById.get(item.shareClassId);
      return platform && shareClass ? [{ availability: item, platform, shareClass }] : [];
    });
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const matching = searchPlatformRecords(records, query);
    return NextResponse.json({
      items: matching,
      recognizedQuery: query.trim()
        ? { value: query.trim(), type: classifyPlatformQuery(query, records) }
        : null,
      emptyMessage: records.length === 0 ? EMPTY_MESSAGE : null,
    });
  } catch (error) {
    console.error("Adviser platform availability could not be loaded.", error);
    return NextResponse.json({ error: "Platform availability could not be loaded. Please try again." }, { status: 502 });
  }
}
