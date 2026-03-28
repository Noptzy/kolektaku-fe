"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import animeService from "@/lib/animeApi";
import Navbar from "@/components/Navbar";

const SORT_OPTIONS = [
  { value: "year_desc", label: "Tahun Baru" },
  { value: "year_asc", label: "Tahun Lama" },
  { value: "title_asc", label: "Judul A-Z" },
  { value: "title_desc", label: "Judul Z-A" },
];

const STORAGE_KEY = "kolektaku_anime_search_state";

function AnimeBrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const [anime, setAnime] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchExtras, setSearchExtras] = useState({ studios: [], voiceActors: [], characters: [] });
  const observerTarget = useRef(null);

  // Filters
  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "",
    status: searchParams.get("status") || "",
    year: searchParams.get("year") || "",
    sort: searchParams.get("sort") || "year_desc",
    genre: searchParams.get("genre") || "",
  });
  const [filterOptions, setFilterOptions] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch filter options on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await animeService.getFilterOptions();
        setFilterOptions(res.data);
      } catch (e) {
        console.error("Failed to fetch filters:", e);
      }
    })();
  }, []);

  // Restore from sessionStorage on mount (only if no URL params)
  useEffect(() => {
    if (!searchParams.toString()) {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.query || parsed.filters) {
            const query = parsed.query || "";
            const restoredFilters = parsed.filters || filters;
            setSearchQuery(query);
            setFilters(restoredFilters);
            const urlStr = buildUrlParams(query, restoredFilters);
            router.replace(`/anime${urlStr ? `?${urlStr}` : ""}`, { scroll: false });
          }
        }
      } catch (e) {
        console.error("Failed to restore search state:", e);
      }
    }
  }, []);

  // Initial load & Sync URL params to state
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchQuery(q);

    setFilters({
      type: searchParams.get("type") || "",
      status: searchParams.get("status") || "",
      year: searchParams.get("year") || "",
      sort: searchParams.get("sort") || "year_desc",
      genre: searchParams.get("genre") || "",
    });

    setPage(1);
    setAnime([]);
  }, [searchParams]);

  const fetchAnime = useCallback(async (query, pageNum, activeFilters) => {
    if (pageNum === 1) setInitialLoading(true);
    else setFetchingMore(true);

    try {
      let newItems = [];
      let totalData = { total: 0, totalPages: 0 };

      if (query && query.length >= 2) {
        let searchUrl = `/api/anime/search?q=${encodeURIComponent(query)}&page=${pageNum}&limit=24`;
        Object.entries(activeFilters).forEach(([k, v]) => {
          if (v) searchUrl += `&${k}=${encodeURIComponent(v)}`;
        });

        const { data: d } = await api.get(searchUrl);
        newItems = d.data || [];
        totalData = { total: d.total, totalPages: d.totalPages };

        if (pageNum === 1) {
          try {
            let extrasUrl = `/api/search?q=${encodeURIComponent(query)}`;
            Object.entries(activeFilters).forEach(([k, v]) => {
              if (v) extrasUrl += `&${k}=${encodeURIComponent(v)}`;
            });
            const { data: extras } = await api.get(extrasUrl);
            setSearchExtras({
              studios: extras.data?.studios || [],
              voiceActors: extras.data?.voiceActors || [],
              characters: extras.data?.characters || [],
            });
          } catch { setSearchExtras({ studios: [], voiceActors: [], characters: [] }); }
        }
      } else {
        const res = await animeService.getAllAnime(pageNum, 24, activeFilters);
        newItems = res.data || [];
        totalData = { total: res.total, totalPages: res.totalPages };
        if (pageNum === 1) setSearchExtras({ studios: [], voiceActors: [], characters: [] });
      }

      setAnime(prev => {
        const combined = pageNum === 1 ? newItems : [...prev, ...newItems];
        // Ensure uniqueness by ID
        return Array.from(new Map(combined.map(item => [item.id, item])).values());
      });
      setMeta(totalData);
      setHasMore(totalData.totalPages ? pageNum < totalData.totalPages : false);
    } catch (err) {
      console.error("Failed to fetch anime:", err);
    } finally {
      if (pageNum === 1) setInitialLoading(false);
      else setFetchingMore(false);
    }
  }, []);

  // Main Fetch Effect
  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (!q || q.length >= 2) {
      fetchAnime(q, page, filters);
    } else {
      setInitialLoading(false);
      setAnime([]);
      setMeta(null);
    }
  }, [fetchAnime, searchParams, page, filters]);

  // Save search state to sessionStorage whenever URL params change
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const state = {
      query: q,
      filters: {
        type: searchParams.get("type") || "",
        status: searchParams.get("status") || "",
        year: searchParams.get("year") || "",
        sort: searchParams.get("sort") || "year_desc",
        genre: searchParams.get("genre") || "",
      },
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [searchParams]);

  // Build URL params from filters
  const buildUrlParams = (query, activeFilters) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    Object.entries(activeFilters).forEach(([k, v]) => {
      if (v && v !== "year_desc") params.set(k, v);
    });
    return params.toString();
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);

    if (!value) {
      const urlStr = buildUrlParams("", filters);
      router.replace(`/anime${urlStr ? `?${urlStr}` : ""}`, { scroll: false });
      return;
    }

    if (value.length >= 2) {
      setSearchTimeout(
        setTimeout(() => {
          const urlStr = buildUrlParams(value, filters);
          router.replace(`/anime${urlStr ? `?${urlStr}` : ""}`, { scroll: false });
        }, 500)
      );
    }
  };

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    const urlStr = buildUrlParams(searchQuery, next);
    router.replace(`/anime${urlStr ? `?${urlStr}` : ""}`, { scroll: false });
  };

  const clearFilters = () => {
    const cleared = { type: "", status: "", year: "", sort: "year_desc", genre: "" };
    setFilters(cleared);
    setPage(1);
    const urlStr = buildUrlParams(searchQuery, cleared);
    router.replace(`/anime${urlStr ? `?${urlStr}` : ""}`, { scroll: false });
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && !(k === "sort" && v === "year_desc")).length;

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !initialLoading && !fetchingMore && hasMore) {
          setPage(p => p + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => { if (currentTarget) observer.unobserve(currentTarget); };
  }, [initialLoading, fetchingMore, hasMore]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
              Explore Anime
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">
              Temukan anime series & movies terbaik.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                showFilters || activeFilterCount > 0
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
              Filter
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <select
              value={filters.sort}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-2 px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">🔍 Filter Anime</h3>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs font-medium text-[var(--danger)] hover:underline">
                  Reset Semua
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Type */}
              <div>
                <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Type</label>
                <select value={filters.type} onChange={(e) => updateFilter("type", e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-2 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]">
                  <option value="">Semua</option>
                  {filterOptions?.types?.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {/* Status */}
              <div>
                <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Status</label>
                <select value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-2 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]">
                  <option value="">Semua</option>
                  {filterOptions?.statuses?.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Genre */}
              <div>
                <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Genre</label>
                <select value={filters.genre} onChange={(e) => updateFilter("genre", e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-2 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]">
                  <option value="">Semua</option>
                  {filterOptions?.genres?.map((g) => <option key={g.id || g.name || g} value={g.name || g}>{g.name || g}</option>)}
                </select>
              </div>
              {/* Year */}
              <div>
                <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Tahun</label>
                <select value={filters.year} onChange={(e) => updateFilter("year", e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-2 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]">
                  <option value="">Semua</option>
                  {filterOptions?.years?.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Active Filter Tags */}
            {activeFilterCount > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(filters).map(([k, v]) => {
                  if (!v || (k === "sort" && v === "year_desc")) return null;
                  return (
                    <span key={k} className="flex items-center gap-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]">
                      {k === "sort" ? SORT_OPTIONS.find(o => o.value === v)?.label : v}
                      <button onClick={() => updateFilter(k, k === "sort" ? "year_desc" : "")} className="ml-0.5 hover:text-white transition">✕</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Results Count */}
        {meta && (
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-6">
            <span className="text-[var(--text-primary)]">{meta.total}</span> anime ditemukan
            {searchQuery && <span> untuk &quot;<span className="text-[var(--text-primary)]">{searchQuery}</span>&quot;</span>}
          </p>
        )}

        {/* Search Extras: Studios, VAs, Characters */}
        {searchQuery && (searchExtras.studios.length > 0 || searchExtras.voiceActors.length > 0 || searchExtras.characters.length > 0) && (
          <div className="mb-8 space-y-6">
            {/* Studios */}
            {searchExtras.studios.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">🏢 Studios</h3>
                <div className="flex flex-wrap gap-2">
                  {searchExtras.studios.map(s => (
                    <button key={s.id} onClick={() => router.push(`/anime/studio/${s.id}`)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Voice Actors */}
            {searchExtras.voiceActors.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">🎙️ Voice Actors</h3>
                <div className="flex flex-wrap gap-3">
                  {searchExtras.voiceActors.map(va => (
                    <button key={va.id} onClick={() => router.push(`/anime/va/${va.id}`)}
                      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                      {va.imageUrl && <Image src={va.imageUrl} alt={va.name} width={28} height={28} className="rounded-full object-cover" />}
                      {va.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Characters */}
            {searchExtras.characters.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">👤 Characters</h3>
                <div className="flex flex-wrap gap-3">
                  {searchExtras.characters.map(ch => (
                    <button key={ch.id} onClick={() => router.push(`/anime/character/${ch.id}`)}
                      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                      {ch.imageUrl && <Image src={ch.imageUrl} alt={ch.name} width={28} height={28} className="rounded-full object-cover" />}
                      {ch.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-[var(--border)]" />
          </div>
        )}

        {/* Loading */}
        {initialLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] w-full rounded-xl bg-[var(--border-hover)]" />
                <div className="mt-3 h-4 w-3/4 rounded bg-[var(--border-hover)]" />
                <div className="mt-1.5 h-3 w-1/2 rounded bg-[var(--border-hover)]" />
              </div>
            ))}
          </div>
        ) : anime.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center max-w-md mx-auto">
            <div className="relative mb-6">
              <svg className="h-20 w-20 text-[var(--text-tertiary)] opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="absolute -bottom-2 -right-2 text-4xl">🧐</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Yah, judulnya belum ketemu...</h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Mungkin ada kesalahan ketik? Kamu juga bisa coba cari nama <b>Karakter</b>, <b>Voice Actor</b>, atau <b>Studio</b> kesukaanmu. Siapa tahu mereka sudah ada di sini!
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {activeFilterCount > 0 && (
                <button onClick={clearFilters}
                  className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition shadow-lg shadow-[var(--accent-muted)]">
                  Reset Filter
                </button>
              )}
              <button 
                onClick={() => { setSearchQuery(""); router.replace("/anime"); }}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-2.5 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition"
              >
                Cari Judul Lain
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {anime.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                onClick={() => router.push(`/anime/${item.slug}`)}
                className="group cursor-pointer flex flex-col focus:outline-none"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm transition-all duration-300 group-hover:border-[var(--accent)] group-hover:shadow-md group-hover:-translate-y-1">
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                  {item.type && (
                    <span className="absolute left-2 top-2 rounded bg-[var(--bg-primary)]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] shadow-sm backdrop-blur-md">
                      {item.type}
                    </span>
                  )}
                  {item.score && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-[var(--score)] backdrop-blur-md">
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {item.score}
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[11px] font-medium text-white">
                    <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'FINISHED' ? 'bg-[var(--info)]' : item.status === 'RELEASING' ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
                    {item.status === 'FINISHED' ? 'Completed' : item.status === 'RELEASING' ? 'Airing' : item.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-0.5">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                    <span>{item.releaseYear || "TBA"}</span>
                    {item.animeDetail?.totalEpisodes > 1 && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-[var(--text-tertiary)] opacity-50" />
                        <span>{item.animeDetail.totalEpisodes} EPS</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        {hasMore && !initialLoading && (
          <div ref={observerTarget} className="mt-8 flex justify-center py-4">
            {fetchingMore && (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--border)] border-t-[var(--accent)] mb-2"></div>
                <span className="text-sm font-medium text-[var(--text-secondary)] tracking-wider">Loading...</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AnimeBrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--border)] border-t-[var(--accent)]"></div>
      </div>
    }>
      <AnimeBrowseContent />
    </Suspense>
  );
}
