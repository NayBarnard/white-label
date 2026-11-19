// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdvisorPortalContent } from "./AdvisorPortalContent";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("AdvisorPortalContent", () => {
  afterEach(cleanup);

  it("presents the adviser resources without inventing unpublished platform data", () => {
    render(<AdvisorPortalContent />);
    expect(screen.getByRole("heading", { name: "Advisor Portal" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fund Centre" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "LISP Availability" })).toBeInTheDocument();
    expect(screen.getByText(/Platform-specific fund codes, availability status, and verification dates are not currently published/)).toBeInTheDocument();
  });

  it("does not display investor records to an adviser account by default", () => {
    render(<AdvisorPortalContent />);
    expect(screen.getByText(/Client information is not shown to adviser accounts by default/)).toBeInTheDocument();
    expect(screen.getByText(/Adviser access requires client authorization, PLACEHOLDER BRAND approval, a defined access scope, and an auditable active link/)).toBeInTheDocument();
  });

  it("filters the fund catalogue using published fund names", () => {
    render(<AdvisorPortalContent />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search funds" }), { target: { value: "cautious" } });
    expect(screen.getByRole("heading", { name: "PLACEHOLDER BRAND Cautious Strategy" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "PLACEHOLDER BRAND Balanced Strategy" })).not.toBeInTheDocument();
  });

  it("tracks recent fund selection within the adviser session", () => {
    render(<AdvisorPortalContent />);
    fireEvent.click(screen.getAllByRole("button", { name: "Record as recently accessed" })[0]);
    expect(screen.getByRole("link", { name: "PLACEHOLDER BRAND Balanced" })).toHaveAttribute("href", "/portfolios#balanced");
  });

  it("filters the public document catalogue by category", () => {
    render(<AdvisorPortalContent />);
    fireEvent.change(screen.getByRole("combobox", { name: "Category" }), {
      target: { value: "Compliance & Regulatory" },
    });
    expect(screen.getByText("Conflict of Interest Policy")).toBeInTheDocument();
    expect(screen.queryByText("PLACEHOLDER BRAND Balanced Fact Sheet")).not.toBeInTheDocument();
  });
});
