// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import axios from "axios";
import { useServiceRemove } from "@/hooks/use-service-remove";

vi.mock("axios");

const mockSetError = vi.fn();
const mockSetNotification = vi.fn();
vi.mock("@/contexts/app-alert-context", () => ({
  useAppAlert: () => ({ setError: mockSetError, setNotification: mockSetNotification }),
}));

const mockedAxios = vi.mocked(axios, true);

describe("useServiceRemove", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns error immediately when serviceId is empty", async () => {
    const { result } = renderHook(() => useServiceRemove());

    let res: any;
    await act(async () => {
      res = await result.current.handleRemoveService("");
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/required/i);
    expect(mockSetError).toHaveBeenCalled();
    expect(mockedAxios.delete).not.toHaveBeenCalled();
  });

  test("calls DELETE on the correct endpoint", async () => {
    mockedAxios.delete = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useServiceRemove());

    await act(async () => {
      await result.current.handleRemoveService("svc-42");
    });

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      expect.stringContaining("/v1/services/svc-42"),
      expect.any(Object)
    );
  });

  test("returns success and shows notification on successful deletion", async () => {
    mockedAxios.delete = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useServiceRemove());

    let res: any;
    await act(async () => {
      res = await result.current.handleRemoveService("svc-42");
    });

    expect(res.success).toBe(true);
    expect(mockSetNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("removed") })
    );
  });

  test("returns failure and calls setError when API call fails", async () => {
    mockedAxios.delete = vi.fn().mockRejectedValue({ response: { data: { error: { message: "Not found" } } } });
    const { result } = renderHook(() => useServiceRemove());

    let res: any;
    await act(async () => {
      res = await result.current.handleRemoveService("svc-42");
    });

    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
    expect(mockSetError).toHaveBeenCalled();
  });

  test("does not show success notification on failure", async () => {
    mockedAxios.delete = vi.fn().mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useServiceRemove());

    await act(async () => {
      await result.current.handleRemoveService("svc-42");
    });

    expect(mockSetNotification).not.toHaveBeenCalled();
  });
});
