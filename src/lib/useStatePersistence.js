"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Custom hook for persisting admin page state to sessionStorage
 * @param {string} key - Unique storage key for this page
 * @param {object} initialState - Initial state values
 * @returns {object} State and handlers
 */
export function useAdminState(key, initialState = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storageKey = `kolektaku_admin_${key}_state`;
  const initialized = useRef(false);

  // Initialize state
  const [state, setState] = useState(initialState);

  // Restore from sessionStorage on mount (only if no URL params)
  useEffect(() => {
    if (!initialized.current && !searchParams.toString()) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setState(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.error(`Failed to restore ${key} state:`, e);
      }
      initialized.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to sessionStorage whenever state changes
  const updateState = useCallback((updates) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      sessionStorage.setItem(storageKey, JSON.stringify(newState));
      return newState;
    });
  }, [storageKey]);

  const clearState = useCallback(() => {
    setState(initialState);
    sessionStorage.removeItem(storageKey);
  }, [initialState, storageKey]);

  return {
    state,
    setState: updateState,
    clearState,
    page: state.page || 1,
    setPage: (newPage) => updateState({ page: newPage }),
  };
}

/**
 * Custom hook for persisting explore/search page state
 * @param {string} key - Unique storage key
 * @returns {object} State and handlers
 */
export function useExploreState(key = "explore") {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storageKey = `kolektaku_${key}_state`;
  const initialized = useRef(false);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    year: "",
    sort: "year_desc",
    genre: "",
  });
  const [page, setPage] = useState(1);

  // Restore from sessionStorage
  useEffect(() => {
    if (!initialized.current && !searchParams.toString()) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.query) setQuery(parsed.query);
          if (parsed.filters) setFilters(parsed.filters);
          if (parsed.page) setPage(parsed.page);
        }
      } catch (e) {
        console.error(`Failed to restore ${key} state:`, e);
      }
      initialized.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to sessionStorage
  useEffect(() => {
    const state = { query, filters, page };
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }, [query, filters, page, storageKey]);

  const clearState = useCallback(() => {
    setQuery("");
    setFilters({ type: "", status: "", year: "", sort: "year_desc", genre: "" });
    setPage(1);
    sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  const buildUrlParams = useCallback((q, f) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    Object.entries(f).forEach(([k, v]) => {
      if (v && v !== "year_desc") params.set(k, v);
    });
    return params.toString();
  }, []);

  const updateQuery = useCallback((value) => {
    setQuery(value);
    const urlStr = buildUrlParams(value, filters);
    router.replace(`/anime${urlStr ? `?${urlStr}` : ""}`, { scroll: false });
  }, [filters, buildUrlParams, router]);

  const updateFilter = useCallback((key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    const urlStr = buildUrlParams(query, next);
    router.replace(`/anime${urlStr ? `?${urlStr}` : ""}`, { scroll: false });
  }, [query, filters, buildUrlParams, router]);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    page,
    setPage,
    updateQuery,
    updateFilter,
    clearState,
  };
}

/**
 * Custom hook for persisting watch state
 * @param {string} slug - Anime slug
 * @returns {object} Watch state and handlers
 */
export function useWatchState(slug) {
  const storageKey = "kolektaku_watch_state";
  const [lastWatched, setLastWatched] = useState(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.slug === slug) {
            setLastWatched(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to restore watch state:", e);
      }
      initialized.current = true;
    }
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveWatchState = useCallback((episodeNumber, progress = 0, quality = "auto", animeTitle = "") => {
    try {
      const state = {
        slug,
        episodeNumber,
        animeTitle,
        progress,
        quality,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(storageKey, JSON.stringify(state));
      setLastWatched(state);
    } catch (e) {
      console.error("Failed to save watch state:", e);
    }
  }, [slug, storageKey]);

  const clearWatchState = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setLastWatched(null);
  }, [storageKey]);

  return {
    lastWatched,
    saveWatchState,
    clearWatchState,
  };
}
