// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImportantDisclosure } from "./ImportantDisclosure";

describe("ImportantDisclosure", () => {
  it("renders nothing while the disclosure is empty", () => {
    const { container } = render(<ImportantDisclosure text="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the titled disclosure when supplied", () => {
    render(<ImportantDisclosure text="Approved disclosure wording." />);
    expect(screen.getByRole("heading", { name: "Important disclosure" })).toBeInTheDocument();
    expect(screen.getByText("Approved disclosure wording.")).toBeInTheDocument();
  });
});
