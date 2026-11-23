// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLocalWorkspaceValue } from "./use-local-workspace";

const workspace = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}));

vi.mock("./local-workspace", () => ({
  readWorkspaceValue: workspace.read,
  writeWorkspaceValue: workspace.write,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("useLocalWorkspaceValue", () => {
  it("writes changes immediately after the stored value is loaded", async () => {
    workspace.read.mockResolvedValue(["loaded"]);
    workspace.write.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLocalWorkspaceValue("notes", [] as string[]));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.setValue((current) => [...current, "edited"]));

    await waitFor(() => {
      expect(workspace.write).toHaveBeenLastCalledWith("notes", ["loaded", "edited"]);
    });
  });

  it("surfaces local persistence errors", async () => {
    workspace.read.mockResolvedValue([]);
    workspace.write.mockRejectedValue(new Error("Storage is full."));
    const { result } = renderHook(() => useLocalWorkspaceValue("notes", [] as string[]));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.setValue(["edited"]));

    await waitFor(() => expect(result.current.error).toBe("Storage is full."));
  });
});
