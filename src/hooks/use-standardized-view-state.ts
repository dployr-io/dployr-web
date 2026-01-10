// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useReducer } from "react";

type Action<S> =
  | { type: "SET_FIELD"; field: keyof S; value: S[keyof S] }
  | { type: "SET_FIELDS"; payload: Partial<S> }
  | { type: "RESET"; payload?: Partial<S> };

function createReducer<S>(initialState: S) {
  return function reducer(state: S, action: Action<S>): S {
    switch (action.type) {
      case "SET_FIELD":
        return { ...state, [action.field]: action.value };
      case "SET_FIELDS":
        return { ...state, ...action.payload };
      case "RESET":
        return { ...initialState, ...action.payload };
      default:
        return state;
    }
  };
}

export interface ViewStateActions<S> {
  setField: <K extends keyof S>(field: K, value: S[K]) => void;
  setFields: (payload: Partial<S>) => void;
  reset: (overrides?: Partial<S>) => void;
}

export function useViewState<S extends Record<string, any>>(
  initialState: S,
  overrides: Partial<S> = {}
): [S, ViewStateActions<S>] {
  const mergedInitial = { ...initialState, ...overrides };
  const reducer = createReducer(mergedInitial);
  const [state, dispatch] = useReducer(reducer, mergedInitial);

  const setField = useCallback(
    <K extends keyof S>(field: K, value: S[K]) => {
      dispatch({ type: "SET_FIELD", field, value });
    },
    []
  );

  const setFields = useCallback((payload: Partial<S>) => {
    dispatch({ type: "SET_FIELDS", payload });
  }, []);

  const reset = useCallback((resetOverrides?: Partial<S>) => {
    dispatch({ type: "RESET", payload: resetOverrides });
  }, []);

  return [state, { setField, setFields, reset }];
}

// ============================================
// Pre-built view states for common patterns
// ============================================

// Dialog state pattern
export interface DialogState {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
}

export const initialDialogState: DialogState = {
  isOpen: false,
  isSubmitting: false,
  error: null,
};

export function useDialogState(overrides?: Partial<DialogState>) {
  const [state, actions] = useViewState(initialDialogState, overrides);

  const open = useCallback(() => {
    actions.setFields({ isOpen: true, error: null });
  }, [actions]);

  const close = useCallback(() => {
    actions.setFields({ isOpen: false, isSubmitting: false, error: null });
  }, [actions]);

  const setSubmitting = useCallback(
    (isSubmitting: boolean) => actions.setField("isSubmitting", isSubmitting),
    [actions]
  );

  const setError = useCallback(
    (error: string | null) => actions.setField("error", error),
    [actions]
  );

  return {
    ...state,
    open,
    close,
    setSubmitting,
    setError,
    ...actions,
  };
}

// Loading state pattern
export interface LoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

export const initialLoadingState: LoadingState = {
  isLoading: false,
  isRefreshing: false,
  error: null,
};

export function useLoadingState(overrides?: Partial<LoadingState>) {
  const [state, actions] = useViewState(initialLoadingState, overrides);

  const startLoading = useCallback(() => {
    actions.setFields({ isLoading: true, error: null });
  }, [actions]);

  const stopLoading = useCallback(() => {
    actions.setField("isLoading", false);
  }, [actions]);

  const startRefreshing = useCallback(() => {
    actions.setFields({ isRefreshing: true, error: null });
  }, [actions]);

  const stopRefreshing = useCallback(() => {
    actions.setField("isRefreshing", false);
  }, [actions]);

  const setError = useCallback(
    (error: string | null) => {
      actions.setFields({ isLoading: false, isRefreshing: false, error });
    },
    [actions]
  );

  return {
    ...state,
    startLoading,
    stopLoading,
    startRefreshing,
    stopRefreshing,
    setError,
    ...actions,
  };
}

// Form state pattern
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  isDirty: boolean;
  isSubmitting: boolean;
}

export function useFormState<T extends Record<string, any>>(initialValues: T) {
  const [state, actions] = useViewState<FormState<T>>({
    values: initialValues,
    errors: {},
    isDirty: false,
    isSubmitting: false,
  });

  const setValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      actions.setFields({
        values: { ...state.values, [field]: value },
        isDirty: true,
      });
    },
    [actions, state.values]
  );

  const setError = useCallback(
    <K extends keyof T>(field: K, error: string | undefined) => {
      actions.setField("errors", {
        ...state.errors,
        [field]: error,
      });
    },
    [actions, state.errors]
  );

  const setErrors = useCallback(
    (errors: Partial<Record<keyof T, string>>) => {
      actions.setField("errors", errors);
    },
    [actions]
  );

  const resetForm = useCallback(() => {
    actions.reset({ values: initialValues });
  }, [actions, initialValues]);

  return {
    ...state,
    setValue,
    setError,
    setErrors,
    resetForm,
    setSubmitting: (isSubmitting: boolean) => actions.setField("isSubmitting", isSubmitting),
  };
}
