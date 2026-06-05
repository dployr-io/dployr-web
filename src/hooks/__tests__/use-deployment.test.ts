// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import axios from "axios";
import { useDeployment, DEPLOYMENT_ERRORS } from "@/hooks/use-deployment";

vi.mock("axios");

const mockSetError = vi.fn();
vi.mock("@/contexts/app-alert-context", () => ({
  useAppAlert: () => ({ setError: mockSetError }),
}));

vi.mock("@/hooks/use-cluster-id", () => ({ useClusterId: () => "cluster-abc" }));

const mockSendJson = vi.fn();
vi.mock("@/hooks/use-instance-stream", () => ({
  useInstanceStream: () => ({ sendJson: mockSendJson }),
}));

const mockedAxios = vi.mocked(axios, true);

describe("useDeployment", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns error immediately when instanceName is empty", async () => {
    const { result } = renderHook(() => useDeployment());

    let res: any;
    await act(async () => {
      res = await result.current.deploy("", { name: "my-api" });
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe(DEPLOYMENT_ERRORS.MISSING_PARAMS);
    expect(mockSetError).toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test("calls POST /v1/deployments with instanceName and payload", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { data: { deployment: { id: "dep-1" }, taskId: "task-1" } },
    });

    const { result } = renderHook(() => useDeployment());

    await act(async () => {
      await result.current.deploy("node-east", { name: "my-api", run_cmd: "node index.js" });
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/v1/deployments"),
      expect.objectContaining({ instanceName: "node-east", payload: expect.objectContaining({ name: "my-api" }) }),
      expect.objectContaining({ params: { clusterId: "cluster-abc" } })
    );
  });

  test("returns success with taskId and deployment on successful deploy", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { data: { deployment: { id: "dep-1" }, taskId: "task-abc" } },
    });

    const { result } = renderHook(() => useDeployment());

    let res: any;
    await act(async () => {
      res = await result.current.deploy("node-east", { name: "my-api" });
    });

    expect(res.success).toBe(true);
    expect(res.taskId).toBe("task-abc");
    expect(res.deployment).toMatchObject({ id: "dep-1" });
  });

  test("sends WebSocket heartbeat after successful deploy", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { data: { deployment: {}, taskId: "task-1" } },
    });

    const { result } = renderHook(() => useDeployment());

    await act(async () => {
      await result.current.deploy("node-east", { name: "my-api" });
    });

    expect(mockSendJson).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "heartbeat" })
    );
  });

  test("does NOT send heartbeat when deploy fails", async () => {
    mockedAxios.post = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useDeployment());

    await act(async () => {
      await result.current.deploy("node-east", { name: "my-api" });
    });

    expect(mockSendJson).not.toHaveBeenCalled();
  });

  test("returns failure and calls setError on API error", async () => {
    mockedAxios.post = vi.fn().mockRejectedValue({
      response: { status: 422, data: { error: { message: "Blueprint not found" } } },
    });

    const { result } = renderHook(() => useDeployment());

    let res: any;
    await act(async () => {
      res = await result.current.deploy("node-east", { name: "my-api" });
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe(422);
    expect(mockSetError).toHaveBeenCalled();
  });

  test("extracts serviceId from error response when present", async () => {
    mockedAxios.post = vi.fn().mockRejectedValue({
      response: {
        status: 409,
        data: { error: { message: "Already deployed", serviceId: "svc-existing" } },
      },
    });

    const { result } = renderHook(() => useDeployment());

    let res: any;
    await act(async () => {
      res = await result.current.deploy("node-east", { name: "my-api" });
    });

    expect(res.serviceId).toBe("svc-existing");
  });
});
