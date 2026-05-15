// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeploymentDraft } from "@/hooks/use-deployment-draft";

vi.mock("@/hooks/use-cluster-id", () => ({ useClusterId: () => "cluster-abc" }));

describe("useDeploymentDraft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("createDraft initialises a draft with default values", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());

    expect(result.current.currentDraft).not.toBeNull();
    expect(result.current.currentDraft?.name).toBe("");
    expect(result.current.currentDraft?.source).toBe("remote");
    expect(result.current.currentDraft?.type).toBe("web");
    expect(result.current.currentDraft?.runtime).toBe("nodejs");
  });

  test("updateDraft mutates a field on the active draft", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());
    act(() => result.current.updateDraft("name", "my-service"));

    expect(result.current.currentDraft?.name).toBe("my-service");
  });

  test("isDirty is true after updating a field", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());
    expect(result.current.isDirty).toBe(false);

    act(() => result.current.updateDraft("name", "changed"));
    expect(result.current.isDirty).toBe(true);
  });

  test("saveDraft persists draft to localStorage", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());
    act(() => result.current.updateDraft("name", "saved-service"));
    act(() => result.current.saveDraft());

    const stored = JSON.parse(localStorage.getItem("dployr_deployment_drafts") ?? "[]");
    expect(stored.some((d: { name: string }) => d.name === "saved-service")).toBe(true);
  });

  test("discardDraft clears the current draft", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());
    act(() => result.current.discardDraft());

    expect(result.current.currentDraft).toBeNull();
    expect(result.current.isDirty).toBe(false);
  });

  test("validate returns errors when required fields are empty", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());
    const validation = result.current.validate();

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toHaveProperty("name");
  });

  test("validate passes when all required fields are provided", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());
    act(() => result.current.updateDraft("name", "valid-service"));
    act(() => result.current.updateDraft("source", "remote"));
    act(() => result.current.updateDraft("runtime", "nodejs"));
    act(() => result.current.updateDraft("run_cmd", "node dist/index.js"));

    const validation = result.current.validate();
    expect(validation.isValid).toBe(true);
    expect(Object.keys(validation.errors)).toHaveLength(0);
  });

  test("validate rejects name with uppercase letters", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());
    act(() => result.current.updateDraft("name", "MyService"));

    const validation = result.current.validate();
    expect(validation.isValid).toBe(false);
    expect(validation.errors.name).toBeTruthy();
  });

  test("validate rejects image source without an image", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());
    act(() => result.current.updateDraft("name", "my-service"));
    act(() => result.current.updateDraft("source", "image"));
    act(() => result.current.updateDraft("image", ""));

    const validation = result.current.validate();
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toHaveProperty("image");
  });

  test("deleteDraft removes a saved draft by id", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());
    act(() => result.current.updateDraft("name", "to-delete"));
    act(() => result.current.saveDraft());

    const draftId = result.current.drafts[0]?.id;
    expect(draftId).toBeDefined();

    act(() => result.current.deleteDraft(draftId!));
    expect(result.current.drafts.find(d => d.id === draftId)).toBeUndefined();
  });

  test("loadDraft restores a previously saved draft", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());
    act(() => result.current.updateDraft("name", "restored"));
    act(() => result.current.saveDraft());

    const draftId = result.current.drafts[0]?.id;
    act(() => result.current.discardDraft());
    act(() => result.current.loadDraft(draftId!));

    expect(result.current.currentDraft?.name).toBe("restored");
  });

  test("multiple drafts can be saved independently", () => {
    const { result } = renderHook(() => useDeploymentDraft());

    act(() => result.current.createDraft());
    act(() => result.current.updateDraft("name", "draft-one"));
    act(() => result.current.saveDraft());

    act(() => result.current.createDraft());
    act(() => result.current.updateDraft("name", "draft-two"));
    act(() => result.current.saveDraft());

    expect(result.current.drafts).toHaveLength(2);
  });
});
