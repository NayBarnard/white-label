export type AdvisorFundSearchRecord = {
  id: string;
  name: string;
  strategy: string;
  jseCode?: string | null;
  isin?: string | null;
  platforms?: string[];
};

export type AdvisorPlatformListing = {
  fundId: string;
  fundName: string;
  platformName: string;
  platformFundCode: string | null;
  jseCode: string | null;
  isin: string | null;
  availability: "available" | "unavailable" | "under_review";
  verifiedAt: string | null;
};

export type AdvisorClientScope = "investments" | "documents" | "reports";
export type AdvisorAccessStatus =
  | "pending_client_consent"
  | "pending_placeholder_approval"
  | "active"
  | "rejected"
  | "revoked";

export type AdvisorClientGrant = {
  status: AdvisorAccessStatus;
  scopes: AdvisorClientScope[];
  clientConsentedAt: string | null;
  placeholderApprovedAt: string | null;
  revokedAt: string | null;
};

export function searchAdvisorFunds(
  funds: readonly AdvisorFundSearchRecord[],
  query: string,
): AdvisorFundSearchRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [...funds];
  return funds.filter((fund) =>
    [
      fund.name,
      fund.strategy,
      fund.jseCode ?? "",
      fund.isin ?? "",
      ...(fund.platforms ?? []),
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
  );
}

export function canReadLinkedClientRecord(
  grant: AdvisorClientGrant | null | undefined,
  requiredScope: AdvisorClientScope,
): boolean {
  return Boolean(
    grant &&
      grant.status === "active" &&
      grant.clientConsentedAt &&
      grant.placeholderApprovedAt &&
      !grant.revokedAt &&
      grant.scopes.includes(requiredScope),
  );
}

export function searchAdvisorPlatformListings(
  listings: readonly AdvisorPlatformListing[],
  query: string,
): AdvisorPlatformListing[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [...listings];
  return listings.filter((listing) =>
    [
      listing.fundName,
      listing.platformName,
      listing.platformFundCode ?? "",
      listing.jseCode ?? "",
      listing.isin ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
  );
}
