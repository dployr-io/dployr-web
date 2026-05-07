// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

type ApiErrorPayload = {
  message?: unknown;
  helpLink?: unknown;
};

function getApiErrorPayload(error: unknown): ApiErrorPayload | string | undefined {
  if (!error || typeof error !== "object") return undefined;

  const response = (error as { response?: { data?: { error?: ApiErrorPayload | string } } }).response;
  return response?.data?.error;
}

export function getApiErrorMessage(error: unknown, fallback = "An error occurred") {
  const errorPayload = getApiErrorPayload(error);

  if (typeof errorPayload === "string" && errorPayload.trim()) {
    return errorPayload;
  }

  if (
    errorPayload &&
    typeof errorPayload !== "string" &&
    typeof errorPayload.message === "string" &&
    errorPayload.message.trim()
  ) {
    return errorPayload.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function getApiErrorHelpLink(error: unknown) {
  const errorPayload = getApiErrorPayload(error);

  if (errorPayload && typeof errorPayload !== "string" && typeof errorPayload.helpLink === "string") {
    return errorPayload.helpLink;
  }

  return "";
}
