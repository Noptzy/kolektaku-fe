"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function GenreAnimePage({ params }) {
  const { genre } = use(params);
  const router = useRouter();

  const [anime, setAnime] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  const fetchGenreAnime = async (pageNum = 1) => {
    if (pageNum === 1) setInitialLoading(true);
    else setFetchingMore(true);

    try {
      const { data } = await api.get(`/api/anime/genre/${encodeURIComponent(genre)}?page=${pageNum}&limit=24`);
      if (data.data) {
        setAnime(prev => pageNum === 1 ? data.data : [...prev, ...data.data]);
      }
      setMeta({ total: data.total, totalPages: data.totalPages });
      setHasMore(data.totalPages ? pageNum < data.totalPages : false);
    } catch (err) {
      console.error("Failed to fetch anime by genre:", err);
    } finally {
      if (pageNum === 1) setInitialLoading(false);
      else setFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchGenreAnime(page);
  }, [genre, page]);

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
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
            {decodeURIComponent(genre)} Anime
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Discover the best anime in the {decodeURIComponent(genre)} genre
          </p>
        </div>

        {/* Results metadata */}
        {meta && (
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-6">
            Found <span className="text-[var(--text-primary)]">{meta.total}</span> works
          </p>
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
            <p className="mt-1 text-sm text-[var(--text-secondary)]">There are no anime labeled with this genre.</p>
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
