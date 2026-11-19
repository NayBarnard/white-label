import { describe, expect, it } from "vitest";
import { getResearchVersionStatus } from "./library";

describe("research document version status", () => {
  it("marks only the newest published version as current", () => {
    expect(getResearchVersionStatus("published", 3, 3)).toBe("Latest");
    expect(getResearchVersionStatus("published", 2, 3)).toBe("Archived");
    expect(getResearchVersionStatus("archived", 4, 3)).toBe("Archived");
    expect(getResearchVersionStatus("published", 1, undefined)).toBe("Archived");
  });
});
