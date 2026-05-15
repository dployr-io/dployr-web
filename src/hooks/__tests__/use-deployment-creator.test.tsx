// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeploymentCreator } from "@/hooks/use-deployment-creator";

const mockDeploy = vi.fn();
const mockSetError = vi.fn();

vi.mock("@/hooks/use-cluster-id", () => ({ useClusterId: () => "cluster-abc" }));
vi.mock("@/hooks/use-dns", () => ({ useDns: () => ({ domains: [], isLoadingDomains: false }) }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/use-url-state", () => ({
  useUrlState: () => ({
    useDeploymentsTabsState: () => [{ tab: "quick" }, vi.fn()],
  }),
}));
vi.mock("@/contexts/app-alert-context", () => ({
  useAppAlert: () => ({ setError: mockSetError }),
}));
vi.mock("@/hooks/use-deployment", () => ({
  useDeployment: () => ({ deploy: mockDeploy }),
}));

describe("useDeploymentCreator", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("starts with isCreating false and no draft", async () => {
    const { result } = renderHook(() => useDeploymentCreator());

    expect(result.current.isCreating).toBe(false);
    expect(result.current.currentDraft).toBeNull();
  });

  test("handleStartCreate sets isCreating true and creates a draft", async () => {
    const { result } = renderHook(() => useDeploymentCreator());

    act(() => result.current.handleStartCreate());

    expect(result.current.isCreating).toBe(true);
    expect(result.current.currentDraft).not.toBeNull();
  });

  test("setField updates a draft field", async () => {
    const { result } = renderHook(() => useDeploymentCreator());

    act(() => result.current.handleStartCreate());
    act(() => result.current.setField("name", "my-api"));

    expect(result.current.currentDraft?.name).toBe("my-api");
  });

  test("handleDeploy does not call deploy when validation fails (empty name)", async () => {
    const { result } = renderHook(() => useDeploymentCreator());

    act(() => result.current.handleStartCreate());
    await act(() => result.current.handleDeploy("node-east"));

    expect(mockDeploy).not.toHaveBeenCalled();
    expect(result.current.validationErrors).toHaveProperty("name");
  });

  const fillValidDraft = (result: any) => {
    act(() => result.current.setField("name", "my-api"));
    act(() => result.current.setField("runCmd", "node dist/index.js"));
    act(() => result.current.setField("remote", { url: "https://github.com/org/repo", branch: "main", commit_hash: "" }));
  };

  test("handleDeploy calls deploy with correct payload when valid", async () => {
    mockDeploy.mockResolvedValue({ success: true, taskId: "task-1" });

    const { result } = renderHook(() => useDeploymentCreator());

    act(() => result.current.handleStartCreate());
    fillValidDraft(result);

    await act(() => result.current.handleDeploy("node-east"));

    expect(mockDeploy).toHaveBeenCalledWith("node-east", expect.objectContaining({ name: "my-api" }));
  });

  test("handleDeploy resets draft and isCreating on success", async () => {
    mockDeploy.mockResolvedValue({ success: true, taskId: "task-1" });

    const { result } = renderHook(() => useDeploymentCreator());

    act(() => result.current.handleStartCreate());
    fillValidDraft(result);

    await act(() => result.current.handleDeploy("node-east"));

    expect(result.current.isCreating).toBe(false);
    expect(result.current.currentDraft).toBeNull();
  });

  test("handleDeploy leaves isCreating true when deploy fails", async () => {
    mockDeploy.mockResolvedValue({ success: false, error: "Instance unavailable" });

    const { result } = renderHook(() => useDeploymentCreator());

    act(() => result.current.handleStartCreate());
    fillValidDraft(result);

    await act(() => result.current.handleDeploy("node-east"));

    expect(result.current.isCreating).toBe(true);
  });

  test("handleBack shows exit dialog when there are unsaved changes", async () => {
    const { result } = renderHook(() => useDeploymentCreator());

    act(() => result.current.handleStartCreate());
    act(() => result.current.setField("name", "dirty-draft")); // any mutation marks dirty

    act(() => result.current.handleBack());

    expect(result.current.showExitDialog).toBe(true);
    expect(result.current.isCreating).toBe(true);
  });

  test("handleDiscardAndExit clears draft and closes creator", async () => {
    const { result } = renderHook(() => useDeploymentCreator());

    act(() => result.current.handleStartCreate());
    act(() => result.current.setField("name", "dirty-draft"));
    act(() => result.current.handleDiscardAndExit());

    expect(result.current.isCreating).toBe(false);
    expect(result.current.currentDraft).toBeNull();
  });

  test("handleSaveAndExit persists draft and closes creator", async () => {
    const { result } = renderHook(() => useDeploymentCreator());

    act(() => result.current.handleStartCreate());
    act(() => result.current.setField("name", "to-save"));
    act(() => result.current.handleSaveAndExit());

    expect(result.current.isCreating).toBe(false);
    const stored = JSON.parse(localStorage.getItem("dployr_deployment_drafts") ?? "[]") as { name: string }[];
    expect(stored.some(d => d.name === "to-save")).toBe(true);
  });
});