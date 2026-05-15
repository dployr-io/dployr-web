// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "@/hooks/use-standardized-pagination";

const makeItems = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("usePagination", () => {
  test("returns all items when count is less than page size", () => {
    const { result } = renderHook(() => usePagination(makeItems(5)));
    expect(result.current.paginatedItems).toHaveLength(5);
    expect(result.current.totalPages).toBe(1);
  });

  test("slices items to page size on page 1", () => {
    const { result } = renderHook(() => usePagination(makeItems(20)));
    expect(result.current.paginatedItems).toHaveLength(8);
    expect(result.current.paginatedItems[0]).toBe(1);
  });

  test("goToNextPage advances to page 2", () => {
    const { result } = renderHook(() => usePagination(makeItems(20)));
    act(() => result.current.goToNextPage());
    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems[0]).toBe(9);
  });

  test("goToPreviousPage cannot go below page 1", () => {
    const { result } = renderHook(() => usePagination(makeItems(20)));
    act(() => result.current.goToPreviousPage());
    expect(result.current.currentPage).toBe(1);
  });

  test("goToNextPage cannot exceed totalPages", () => {
    const { result } = renderHook(() => usePagination(makeItems(8)));
    act(() => result.current.goToNextPage());
    expect(result.current.currentPage).toBe(1);
  });

  test("goToPage jumps directly to a specific page", () => {
    const { result } = renderHook(() => usePagination(makeItems(30)));
    act(() => result.current.goToPage(3));
    expect(result.current.currentPage).toBe(3);
  });

  test("totalItems matches the full list length", () => {
    const { result } = renderHook(() => usePagination(makeItems(17)));
    expect(result.current.totalItems).toBe(17);
    expect(result.current.totalPages).toBe(3);
  });

  test("last page may contain fewer items than page size", () => {
    const { result } = renderHook(() => usePagination(makeItems(10)));
    act(() => result.current.goToPage(2));
    expect(result.current.paginatedItems).toHaveLength(2);
  });

  test("externalPage overrides internal page state", () => {
    const { result } = renderHook(() => usePagination(makeItems(20), { externalPage: 2 }));
    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems[0]).toBe(9);
  });

  test("onPageChange callback fires when navigating pages", () => {
    let reported = 0;
    const { result } = renderHook(() =>
      usePagination(makeItems(20), { externalPage: 1, onPageChange: p => { reported = p; } })
    );
    act(() => result.current.goToNextPage());
    expect(reported).toBe(2);
  });

  test("empty list returns single page with no items", () => {
    const { result } = renderHook(() => usePagination([]));
    expect(result.current.paginatedItems).toHaveLength(0);
    expect(result.current.totalPages).toBe(1);
  });
});