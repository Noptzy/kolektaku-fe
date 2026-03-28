"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function StaffAnimePage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [staff, setStaff] = useState(null);
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

  const fetchStaffAnime = async (pageNum = 1, currentSort = sort) => {
    if (pageNum === 1) setInitialLoading(true);
    else setFetchingMore(true);

    try {
      const { data } = await api.get(`/api/anime/staff/${id}?page=${pageNum}&limit=24&sort=${currentSort}`);
      if (data.data) {
        setStaff(data.data.staff || null);
        const newItems = data.data.relations || [];
        setAnime(prev => {
          const combined = pageNum === 1 ? newItems : [...prev, ...newItems];
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
      }
      setMeta({ total: data.total, totalPages: data.totalPages });
      setHasMore(data.totalPages ? pageNum < data.totalPages : false);
    } catch (err) {
      console.error("Failed to fetch staff anime:", err);
    } finally {
      if (pageNum === 1) setInitialLoading(false);
      else setFetchingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setAnime([]);
    fetchStaffAnime(1, sort);
  }, [id, sort]);

  useEffect(() => {
    if (page > 1) {
      fetchStaffAnime(page, sort);
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
        {/* Header with Staff Image */}
        <div className="mb-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          {/* Staff Avatar */}
          <div className="relative h-32 w-32 shrink-0 rounded-full overflow-hidden border-4 border-[var(--border)] bg-[var(--bg-card)] shadow-lg">
            {staff?.imageUrl ? (
              <Image src={staff.imageUrl} alt={staff.name} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[var(--text-tertiary)] bg-[var(--border-hover)]">
                {staff?.name?.[0] || "?"}
              </div>
            )}
          </div>

          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
              {staff?.name || "Staff"}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">
              Production Staff · {meta?.total || 0} works
            </p>
          </div>
        </div>

        {/* Results & Sort */}
        {meta && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              Showing <span className="text-[var(--text-primary)]">{anime.length}</span> works
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-lg font-medium text-[var(--text-primary)]">No works found</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">This staff member has no anime registered yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {anime.map((item) => (
              <div
                key={item.id}
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
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                  {item.type && (
                    <span className="absolute left-2 top-2 rounded bg-[var(--bg-primary)]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] shadow-sm backdrop-blur-md">
                      {item.type}
                    </span>
                  )}
                  <span className={`absolute bottom-2 left-2 flex items-center gap-1.5 text-[11px] font-medium text-white`}>
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        {hasMore && (
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
