import { existsSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  featureRequirements,
  getEnvironmentChecks,
  migrationChecks,
  type SetupCheck,
  type SetupStatus,
} from "@/lib/admin/setup-status";
import { authorizeAdminApi } from "@/lib/admin/server";
import { features } from "@/config/features";
import { firmStats, fundFacts, leadership, performanceDisclosures } from "@/data/firmData";

const expectedSiteOrigin = "https://www.placeholder-am.co.za";
const expectedDocuments = [
  "placeholder-balanced-fact-sheet.pdf",
  "placeholder-cautious-fact-sheet.pdf",
  "conflict-of-interest-policy.pdf",
  "complaints-resolution-policy.pdf",
  "popi-act-statement.pdf",
  "paia-manual.pdf",
] as const;
const privateBuckets = ["client-documents", "manager-updates"] as const;

function hasPublishedValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasPublishedValue);
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some(hasPublishedValue);
  }
  return false;
}

async function schemaAvailable(table: string, columns: readonly string[]) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!projectUrl || !serviceRoleKey) return false;

  const url = new URL(`/rest/v1/${table}`, projectUrl);
  url.search = new URLSearchParams({ select: columns.join(","), limit: "0" }).toString();
  try {
    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
        "Accept-Profile": "public",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.error(`Setup check could not verify ${table}.`, response.status);
    }
    return response.ok;
  } catch (error) {
    console.error(`Setup check could not verify ${table}.`, error);
    return false;
  }
}

function setupCheck(
  id: string,
  title: string,
  status: SetupStatus,
  detail: string,
  nextStep: string,
): SetupCheck {
  return { id, title, status, detail, nextStep };
}

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  const [migrations, bucketResult] = await Promise.all([
    Promise.all(
      migrationChecks.map(async (migration) => {
        const available = await schemaAvailable(migration.table, migration.columns);
        if (!available) {
          return setupCheck(
            migration.id,
            migration.migration,
            "red",
            "One or more required tables or columns could not be found.",
            "Apply this migration in the database, then refresh this page.",
          );
        }
        if ("constraintOnly" in migration && migration.constraintOnly) {
          return setupCheck(
            migration.id,
            migration.migration,
            "amber",
            "The table is available, but this request-type constraint cannot be verified through the application API.",
            "Confirm this migration was applied in the database migration history.",
          );
        }
        return setupCheck(
          migration.id,
          migration.migration,
          "green",
          "The tables and columns created by this migration are available.",
          "No action needed.",
        );
      }),
    ),
    access.supabase.storage.listBuckets(),
  ]);
  if (bucketResult.error) console.error("Setup check could not list private storage buckets.", bucketResult.error);
  const buckets = privateBuckets.map((name) => {
    const bucket = bucketResult.data?.find((item) => item.name === name);
    if (!bucketResult.error && bucket && !bucket.public) {
      return setupCheck(name, `${name} private storage bucket`, "green", "Present and private.", "No action needed.");
    }
    if (bucket?.public) {
      return setupCheck(name, `${name} private storage bucket`, "red", "The bucket is public.", "Set this storage bucket to private.");
    }
    return setupCheck(
      name,
      `${name} private storage bucket`,
      "red",
      bucketResult.error ? "Could not verify this storage bucket." : "This bucket was not found.",
      "Apply the storage setup migration and refresh this page.",
    );
  });

  const documents = expectedDocuments.map((fileName) => {
    const present = existsSync(join(process.cwd(), "public", "documents", fileName));
    return setupCheck(
      fileName,
      fileName,
      present ? "green" : "amber",
      present ? "Real document file is present." : "Real document file has not been supplied.",
      present ? "No action needed." : "Ask the firm for this approved PDF and add it to public/documents/.",
    );
  });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let siteMatches = false;
  if (siteUrl) {
    try {
      siteMatches = new URL(siteUrl).origin === expectedSiteOrigin;
    } catch {
      siteMatches = false;
    }
  }
  const demoConfigured = (process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAILS ?? "")
    .split(",")
    .some((email) => email.trim().length > 0);
  const factsPopulated = Object.values(fundFacts).some(hasPublishedValue);
  const leadershipPhotosComplete = leadership.every((person) => Boolean(person.photo?.trim()));
  const flags = featureRequirements.map((feature) => {
    const enabled = features[feature.key];
    return {
      ...setupCheck(
        feature.key,
        feature.envName,
        enabled ? "green" : "amber",
        enabled ? "On." : "Off.",
        feature.needs,
      ),
      enabled,
      flagName: feature.envName,
    };
  });

  return NextResponse.json(
    {
      environment: getEnvironmentChecks(),
      migrations,
      buckets,
      documents,
      features: flags,
      siteUrl: setupCheck(
        "site-url",
        "Live website address",
        siteMatches ? "green" : "red",
        siteMatches ? "Matches the live website address." : "Does not match the live website address.",
        siteMatches ? "No action needed." : "Set NEXT_PUBLIC_SITE_URL to the live website domain.",
      ),
      demoAccounts: setupCheck(
        "demo-accounts",
        "Illustrative demo accounts",
        demoConfigured ? "green" : "amber",
        demoConfigured ? "At least one demo email is configured." : "No demo accounts are configured.",
        demoConfigured
          ? "Confirm each listed address is a dedicated demo account."
          : "Add approved demo email addresses to NEXT_PUBLIC_DEMO_ACCOUNT_EMAILS if demo access is needed.",
      ),
      content: [
        setupCheck(
          "fund-facts",
          "Strategy fund facts",
          factsPopulated ? "green" : "amber",
          factsPopulated ? "At least one fund fact is published." : "No fund facts have been supplied.",
          factsPopulated ? "Review every published field and its source date." : "Add verified details to fundFacts in src/data/firmData.ts.",
        ),
        setupCheck(
          "important-disclosure",
          "Important disclosure",
          performanceDisclosures.importantDisclosure.trim() ? "green" : "amber",
          performanceDisclosures.importantDisclosure.trim() ? "Disclosure text is present." : "Disclosure text has not been supplied.",
          "Add firm-approved wording to performanceDisclosures.importantDisclosure in src/data/firmData.ts.",
        ),
        setupCheck(
          "satisfied-clients",
          "Satisfied client count",
          typeof firmStats.satisfiedClients === "number" ? "green" : "amber",
          typeof firmStats.satisfiedClients === "number" ? "Client count is present." : "No client count has been supplied.",
          "Add a verified count to firmStats.satisfiedClients in src/data/firmData.ts.",
        ),
        setupCheck(
          "leadership-photos",
          "Leadership photos",
          leadershipPhotosComplete ? "green" : "amber",
          leadershipPhotosComplete ? "All leadership photos are present." : "Some or all leadership photos are missing.",
          "Add approved photo paths to each leadership record in src/data/firmData.ts.",
        ),
      ],
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
