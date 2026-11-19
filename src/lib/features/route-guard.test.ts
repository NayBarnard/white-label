import { describe, expect, it } from "vitest";
import { features } from "@/config/features";
import { disabledFeatureResponse } from "./route-guard";

describe("feature gates", () => {
  it("returns 404 for a disabled feature route", () => {
    expect(features.managerUpdates).toBe(false);
    expect(disabledFeatureResponse("managerUpdates")?.status).toBe(404);
  });
});
