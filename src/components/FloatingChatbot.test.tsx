// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FloatingChatbot } from "./FloatingChatbot";

describe("FloatingChatbot portal launcher", () => {
  afterEach(cleanup);

  it("opens from the portal menu event without rendering a floating launcher", () => {
    render(<FloatingChatbot standalone hideLauncher />);
    expect(screen.queryByRole("button", { name: "Open PLACEHOLDER BRAND AI Assistant" })).not.toBeInTheDocument();

    fireEvent(window, new Event("placeholder-open-assistant"));

    expect(screen.getByRole("region", { name: "PLACEHOLDER BRAND AI Assistant chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close chat" })).toBeInTheDocument();
  });
});
