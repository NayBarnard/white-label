import { describe, expect, it } from "vitest";
import { nextManagerUpdateStatus } from "./workflow";

describe("manager update approval workflow", () => {
  it("allows only Draft → Internal Review → Approved → Published → Archived", () => {
    expect(nextManagerUpdateStatus("draft", "submit")).toBe("internal_review");
    expect(nextManagerUpdateStatus("internal_review", "approve")).toBe("approved");
    expect(nextManagerUpdateStatus("approved", "publish")).toBe("published");
    expect(nextManagerUpdateStatus("published", "archive")).toBe("archived");
  });

  it("does not allow approval or publication to skip a stage or revive archived content", () => {
    expect(nextManagerUpdateStatus("draft", "approve")).toBeNull();
    expect(nextManagerUpdateStatus("internal_review", "publish")).toBeNull();
    expect(nextManagerUpdateStatus("archived", "publish")).toBeNull();
  });
});
