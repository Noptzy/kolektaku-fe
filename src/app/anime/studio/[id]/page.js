"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function StudioAnimePage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [studio, setStudio] = useState(null);
  const [anime, setAnime] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("year_desc");
  const [meta, setMeta] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  const SORT_OPTIONS = [
    { label: "A-Z", value: "title_asc" },
    { label: "Z-A", value: "title_desc" },
    { label: "Tahun (Baru)", value: "year_desc" },
    { label: "Tahun (Lama)", value: "year_asc" },
  ];

  const fetchStudioAnime = async (pageNum = 1, currentSort = sort) => {
    if (pageNum === 1) setInitialLoading(true);
    else setFetchingMore(true);
    
    try {
      const { data } = await api.get(`/api/anime/studio/${id}?page=${pageNum}&limit=24&sort=${currentSort}`);
      if (data.data) {
        setStudio(data.data.studio || null);
        const newItems = data.data.relations || [];
        setAnime(prev => {
          const combined = pageNum === 1 ? newItems : [...prev, ...newItems];
          // Filter out duplicates based on ID
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
      }
      setMeta({ total: data.total, totalPages: data.totalPages });
      setHasMore(data.totalPages ? pageNum < data.totalPages : false);
    } catch (err) {
      console.error("Failed to fetch studio anime:", err);
    } finally {
      if (pageNum === 1) setInitialLoading(false);
      else setFetchingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setAnime([]);
    fetchStudioAnime(1, sort);
  }, [id, sort]);

  useEffect(() => {
    if (page > 1) {
      fetchStudioAnime(page, sort);
    }
  }, [page]);

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
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [initialLoading, fetchingMore, hasMore]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16">
        {/* Header & Info */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2 flex items-center gap-3">
              <svg className="h-8 w-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {studio?.name || "Studio"}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">
              Explore all works produced by {studio?.name || "this studio"}.
            </p>
          </div>
        </div>

        {/* Results metadata & Sort */}
        {meta && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              Showing <span className="text-[var(--text-primary)]">{anime.length}</span> productions
            </p>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Urutkan:</span>
              <select 
                value={sort} 
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] cursor-pointer"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Loading State */}
        {initialLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] w-full rounded-xl bg-[var(--border-hover)]" />
                <div className="mt-3 h-4 w-3/4 rounded bg-[var(--border-hover)]" />
                <div className="mt-1.5 h-3 w-1/2 rounded bg-[var(--border-hover)]" />
              </div>
            ))}
          </div>
        ) : anime.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <svg className="h-16 w-16 text-[var(--text-tertiary)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-medium text-[var(--text-primary)]">No productions found</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">This studio has no anime registered yet.</p>
          </div>
        ) : (
          /* Anime Card Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {anime.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/anime/${item.slug}`)}
                className="group cursor-pointer flex flex-col focus:outline-none"
              >
                {/* Poster Container */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm transition-all duration-300 group-hover:border-[var(--accent)] group-hover:shadow-md group-hover:-translate-y-1">
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                  
                  {/* Overlay tags */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                  
                  {/* Top Left: Format/Type */}
                  {item.type && (
                    <span className="absolute left-2 top-2 rounded bg-[var(--bg-primary)]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] shadow-sm backdrop-blur-md">
                      {item.type}
                    </span>
                  )}
                  
                  {/* Top Right: Score */}
                  {item.score && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-[var(--score)] backdrop-blur-md">
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {item.score}
                    </div>
                  )}

                  {/* Bottom: Status */}
                  <span className={`absolute bottom-2 left-2 flex items-center gap-1.5 text-[11px] font-medium text-white`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'FINISHED' ? 'bg-[var(--info)]' : item.status === 'RELEASING' ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
                    {item.status === 'FINISHED' ? 'Completed' : item.status === 'RELEASING' ? 'Airing' : item.status}
                  </span>
                </div>

                {/* Info Text */}
                <div className="mt-3 flex flex-col gap-0.5">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                    <span>{item.releaseYear || "TBA"}</span>
                    {item.animeDetail?.episodes && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-[var(--text-tertiary)] opacity-50" />
                        <span>{item.animeDetail.episodes} EPS</span>
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
