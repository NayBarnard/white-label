// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureGate, FeatureLink } from "./FeatureGate";

describe("FeatureGate", () => {
  it("omits disabled feature content and navigation links", () => {
    render(
      <>
        <FeatureGate feature="managerUpdates"><p>Manager Updates</p></FeatureGate>
        <FeatureLink feature="managerUpdates" href="/portal/manager-updates">Manager Updates link</FeatureLink>
      </>,
    );
    expect(screen.queryByText("Manager Updates")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Manager Updates link" })).not.toBeInTheDocument();
  });
});
