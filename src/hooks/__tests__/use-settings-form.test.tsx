// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSettingsForm } from "@/hooks/use-settings-form";

const updateProfile = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "old@example.com",
      name: "Old User",
      picture: "/img/chess.png",
    },
    updateProfile,
  }),
}));

describe("useSettingsForm", () => {
  beforeEach(() => {
    updateProfile.mockReset();
  });

  test("requests verification when email changes without a code", async () => {
    updateProfile.mockResolvedValueOnce({
      data: { verificationRequired: true, email: "new@example.com" },
    });

    const { result } = renderHook(() => useSettingsForm());

    act(() => {
      result.current.form.setFieldValue("email", "new@example.com");
    });

    const submitResult = await result.current.submit();

    expect(updateProfile).toHaveBeenCalledWith({
      email: "new@example.com",
      code: undefined,
      name: "Old User",
      picture: "/img/chess.png",
    });
    expect(submitResult).toEqual({ verificationRequired: true, email: "new@example.com" });
  });

  test("submits verification code with changed email", async () => {
    updateProfile.mockResolvedValueOnce({
      data: { user: { email: "new@example.com" } },
    });

    const { result } = renderHook(() => useSettingsForm());

    act(() => {
      result.current.form.setFieldValue("email", "new@example.com");
    });

    const submitResult = await result.current.submit("ABC123");

    expect(updateProfile).toHaveBeenCalledWith({
      email: "new@example.com",
      code: "ABC123",
      name: "Old User",
      picture: "/img/chess.png",
    });
    expect(submitResult).toBeNull();
  });
});
