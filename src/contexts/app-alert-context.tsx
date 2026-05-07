// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface AppAlert {
  message: string;
  helpLink?: string;
}

interface AppAlertContextValue {
  error: AppAlert | null;
  notification: AppAlert | null;
  setError: (alert: AppAlert | null) => void;
  setNotification: (alert: AppAlert | null) => void;
  clearError: () => void;
  clearNotification: () => void;
}

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const [error, setErrorState] = useState<AppAlert | null>(null);
  const [notification, setNotificationState] = useState<AppAlert | null>(null);

  const setError = useCallback((alert: AppAlert | null) => setErrorState(alert), []);
  const setNotification = useCallback((alert: AppAlert | null) => setNotificationState(alert), []);
  const clearError = useCallback(() => setErrorState(null), []);
  const clearNotification = useCallback(() => setNotificationState(null), []);

  return (
    <AppAlertContext.Provider value={{ error, notification, setError, setNotification, clearError, clearNotification }}>
      {children}
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AppAlertContext);
  if (!ctx) throw new Error("useAppAlert must be used within AppAlertProvider");
  return ctx;
}
