import { describe, expect, it } from "vitest";
import { defaultHomePageData } from "@/components/home/HomePageEditorConfig";
import {
  isHomepageDraftRecoveryNewer,
  parseHomepageDraftRecovery,
} from "./draft-recovery";

describe("homepage draft recovery", () => {
  it("accepts a valid draft snapshot and rejects malformed or unsafe content", () => {
    const recovery = {
      content: defaultHomePageData,
      savedAt: "2026-11-21T09:00:00.000Z",
    };

    expect(parseHomepageDraftRecovery(JSON.stringify(recovery))).toEqual(recovery);
    expect(parseHomepageDraftRecovery("{")).toBeNull();
    expect(parseHomepageDraftRecovery(JSON.stringify({ ...recovery, savedAt: "invalid" }))).toBeNull();
    expect(parseHomepageDraftRecovery(JSON.stringify({
      ...recovery,
      content: { root: {}, content: [{ type: "UntrustedMarkup", props: { id: "bad" } }] },
    }))).toBeNull();
  });

  it("only offers recovery when the browser copy is newer than the saved server draft", () => {
    const recovery = {
      content: defaultHomePageData,
      savedAt: "2026-11-21T09:00:00.000Z",
    };

    expect(isHomepageDraftRecoveryNewer(recovery, null)).toBe(true);
    expect(isHomepageDraftRecoveryNewer(recovery, "2026-11-21T08:59:59.000Z")).toBe(true);
    expect(isHomepageDraftRecoveryNewer(recovery, "2026-11-21T09:00:00.000Z")).toBe(false);
    expect(isHomepageDraftRecoveryNewer(recovery, "2026-11-21T09:00:01.000Z")).toBe(false);
  });
});
