import { expect, test } from "@playwright/test";

test("advisor portal follows deployment mode", async ({ request }) => {
  const isStaffDeployment = process.env.APP_MODE === "staff";
  const response = await request.get("/advisor");
  expect(response.status()).toBe(isStaffDeployment ? 307 : 404);
});
