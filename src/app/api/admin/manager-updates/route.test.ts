import { describe, expect, it } from "vitest";
import { features } from "@/config/features";
import { GET } from "./route";

describe("manager updates API feature gate", () => {
  it("returns 404 before checking admin credentials when disabled", async () => {
    expect(features.managerUpdates).toBe(false);
    const response = await GET();
    expect(response.status).toBe(404);
  });
});
