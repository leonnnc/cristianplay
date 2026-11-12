"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Category,
  DurationFilter,
  SearchPayload,
  SearchProvider as ProviderName,
  SortOrder,
  Track,
} from "@/lib/types";

export interface SearchParams {
  query: string;
  category: Category;
  duration: DurationFilter;
  order: SortOrder;
  strict: boolean;
}

export interface SearchState {
  items: Track[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  notice?: string;
  provider?: ProviderName;
  relaxed: boolean;
  blocked: number;
  nextPageToken?: string;
  tookMs?: number;
  effectiveQuery?: string;
}

export interface SearchContextValue {
  params: SearchParams;
  state: SearchState;
  setQuery: (query: string) => void;
  setCategory: (category: Category) => void;
  setDuration: (duration: DurationFilter) => void;
  setOrder: (order: SortOrder) => void;
  setStrict: (strict: boolean) => void;
  submit: () => void;
  loadMore: () => void;
  clear: () => void;
  searchCategory: (category: Category) => void;
}

const INITIAL_PARAMS: SearchParams = {
  query: "",
  category: "todas",
  duration: "any",
  order: "relevance",
  strict: true,
};

const INITIAL_STATE: SearchState = {
  items: [],
  loading: false,
  loadingMore: false,
  error: null,
  relaxed: false,
  blocked: 0,
};

const SearchContext = createContext<SearchContextValue | null>(null);

function dedupe(items: Track[]): Track[] {
  const seen = new Set<string>();
  return items.filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useState<SearchParams>(INITIAL_PARAMS);
  const [state, setState] = useState<SearchState>(INITIAL_STATE);

  const paramsRef = useRef<SearchParams>(INITIAL_PARAMS);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const sequenceRef = useRef(0);

  const patchParams = useCallback((patch: Partial<SearchParams>) => {
    const next = { ...paramsRef.current, ...patch };
    paramsRef.current = next;
    setParams(next);
    return next;
  }, []);

  const cancelDebounce = useCallback(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const execute = useCallback(
    async (next: SearchParams, options?: { append?: boolean; token?: string }) => {
      cancelDebounce();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const sequence = ++sequenceRef.current;

      setState((current) => ({
        ...current,
        loading: !options?.append,
        loadingMore: Boolean(options?.append),
        error: null,
      }));

      const queryString = new URLSearchParams({
        q: next.query,
        category: next.category,
        duration: next.duration,
        order: next.order,
        strict: next.strict ? "1" : "0",
      });
      if (options?.token) queryString.set("pageToken", options.token);

      try {
        const response = await fetch(`/api/search?${queryString.toString()}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        const payload = (await response.json()) as
          | SearchPayload
          | { error?: string };

        if (sequence !== sequenceRef.current) return;

        if (!response.ok || !("items" in payload)) {
          const message =
            "error" in payload && payload.error
              ? payload.error
              : "No se pudieron obtener resultados.";
          throw new Error(message);
        }

        setState((current) => ({
          items: options?.append
            ? dedupe([...current.items, ...payload.items])
            : payload.items,
          loading: false,
          loadingMore: false,
          error: null,
          notice: payload.notice,
          provider: payload.provider,
          relaxed: payload.relaxed,
          blocked: payload.blocked,
          nextPageToken: payload.nextPageToken,
          tookMs: payload.tookMs,
          effectiveQuery: payload.query,
        }));
      } catch (error) {
        if (controller.signal.aborted || sequence !== sequenceRef.current) {
          return;
        }
        setState((current) => ({
          ...current,
          loading: false,
          loadingMore: false,
          error:
            error instanceof Error
              ? error.message
              : "Ocurrió un error inesperado al buscar.",
          items: options?.append ? current.items : [],
          nextPageToken: undefined,
        }));
      }
    },
    [cancelDebounce],
  );

  useEffect(() => {
    void execute(paramsRef.current);
    return () => {
      abortRef.current?.abort();
    };
  }, [execute]);

  const setQuery = useCallback(
    (query: string) => {
      patchParams({ query });
      cancelDebounce();

      const trimmed = query.trim();
      if (trimmed.length === 0) {
        debounceRef.current = window.setTimeout(() => {
          void execute(paramsRef.current);
        }, 250);
        return;
      }
      if (trimmed.length < 2) return;

      debounceRef.current = window.setTimeout(() => {
        void execute(paramsRef.current);
      }, 550);
    },
    [cancelDebounce, execute, patchParams],
  );

  const setCategory = useCallback(
    (category: Category) => {
      patchParams({ category });
      void execute(paramsRef.current);
    },
    [execute, patchParams],
  );

  const setDuration = useCallback(
    (duration: DurationFilter) => {
      patchParams({ duration });
      void execute(paramsRef.current);
    },
    [execute, patchParams],
  );

  const setOrder = useCallback(
    (order: SortOrder) => {
      patchParams({ order });
      void execute(paramsRef.current);
    },
    [execute, patchParams],
  );

  const setStrict = useCallback(
    (strict: boolean) => {
      patchParams({ strict });
      void execute(paramsRef.current);
    },
    [execute, patchParams],
  );

  const submit = useCallback(() => {
    void execute(paramsRef.current);
  }, [execute]);

  const loadMore = useCallback(() => {
    if (!state.nextPageToken || state.loadingMore || state.loading) return;
    void execute(paramsRef.current, {
      append: true,
      token: state.nextPageToken,
    });
  }, [execute, state.loading, state.loadingMore, state.nextPageToken]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    cancelDebounce();
    const next = patchParams({ query: "" });
    setState(INITIAL_STATE);
    void execute(next);
  }, [cancelDebounce, execute, patchParams]);

  const searchCategory = useCallback(
    (category: Category) => {
      patchParams({ category });
      void execute(paramsRef.current);
    },
    [execute, patchParams],
  );

  const value = useMemo<SearchContextValue>(
    () => ({
      params,
      state,
      setQuery,
      setCategory,
      setDuration,
      setOrder,
      setStrict,
      submit,
      loadMore,
      clear,
      searchCategory,
    }),
    [
      params,
      state,
      setQuery,
      setCategory,
      setDuration,
      setOrder,
      setStrict,
      submit,
      loadMore,
      clear,
      searchCategory,
    ],
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useSearch debe usarse dentro de SearchProvider");
  return context;
}
