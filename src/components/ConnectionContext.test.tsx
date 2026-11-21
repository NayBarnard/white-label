// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionProvider, useConnection } from "./ConnectionContext";

const mocks = vi.hoisted(() => ({
  pathname: vi.fn(() => "/studio"),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.pathname,
}));

function ConnectionStatus() {
  const { status, showInitialSplash } = useConnection();
  return <output>{`${status}:${showInitialSplash}`}</output>;
}

describe("ConnectionProvider", () => {
  beforeEach(() => {
    mocks.pathname.mockReturnValue("/studio");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("does not perform the public site connection check in Studio", () => {
    render(
      <ConnectionProvider>
        <ConnectionStatus />
      </ConnectionProvider>,
    );

    expect(screen.getByText("connected:false")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
