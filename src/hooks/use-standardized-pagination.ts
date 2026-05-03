// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useMemo, useCallback } from "react";

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  itemsPerPage: number;
}

export interface PaginationActions {
  goToPage: (page: number) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  setItemsPerPage: (count: number) => void;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialItemsPerPage?: number;
  externalPage?: number;
  onPageChange?: (page: number) => void;
}

export interface UsePaginationResult<T> extends PaginationState, PaginationActions {
  paginatedItems: T[];
  totalItems: number;
  paginationRange: (number | "dots")[];
}

export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { initialPage = 1, initialItemsPerPage = 8, externalPage, onPageChange } = options;

  const [internalPage, setInternalPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const currentPage = externalPage ?? internalPage;

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Ensure current page is within bounds
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  if (externalPage === undefined && safePage !== internalPage) {
    setInternalPage(safePage);
  }

  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  const paginationRange = useMemo((): (number | "dots")[] => {
    const totalPageNumbersToShow = 7;
    if (totalPages <= totalPageNumbersToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const current = safePage;
    const firstPage = 1;
    const lastPage = totalPages;
    const siblingCount = 1;
    const leftSibling = Math.max(current - siblingCount, firstPage + 1);
    const rightSibling = Math.min(current + siblingCount, lastPage - 1);

    const showLeftDots = leftSibling > firstPage + 1;
    const showRightDots = rightSibling < lastPage - 1;

    const pages: (number | "dots")[] = [firstPage];

    if (!showLeftDots && showRightDots) {
      const leftRangeEnd = 3 + 2 * siblingCount;
      for (let i = 2; i <= leftRangeEnd; i++) {
        pages.push(i);
      }
      pages.push("dots");
    } else if (showLeftDots && !showRightDots) {
      pages.push("dots");
      const rightRangeStart = totalPages - (3 + 2 * siblingCount) + 1;
      for (let i = rightRangeStart; i < lastPage; i++) {
        pages.push(i);
      }
    } else if (showLeftDots && showRightDots) {
      pages.push("dots");
      for (let i = leftSibling; i <= rightSibling; i++) {
        pages.push(i);
      }
      pages.push("dots");
    } else {
      for (let i = 2; i < lastPage; i++) {
        pages.push(i);
      }
    }

    pages.push(lastPage);
    return pages;
  }, [safePage, totalPages]);

  const setPage = useCallback((page: number) => {
    const safePageTarget = Math.max(1, Math.min(page, totalPages));
    if (onPageChange) {
      onPageChange(safePageTarget);
    } else {
      setInternalPage(safePageTarget);
    }
  }, [totalPages, onPageChange]);

  const goToPage = useCallback(
    (page: number) => setPage(page),
    [setPage]
  );

  const goToPreviousPage = useCallback(
    () => setPage(safePage - 1),
    [setPage, safePage]
  );

  const goToNextPage = useCallback(
    () => setPage(safePage + 1),
    [setPage, safePage]
  );

  return {
    // State
    currentPage: safePage,
    totalPages,
    startIndex,
    endIndex,
    itemsPerPage,
    totalItems,
    paginatedItems,
    paginationRange,
    // Actions
    goToPage,
    goToPreviousPage,
    goToNextPage,
    setItemsPerPage,
  };
}
