"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({
    koleksi: [],
    studios: [],
    voiceActors: [],
    characters: [],
  });

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        if (!q) {
          setResults({
            koleksi: [],
            studios: [],
            voiceActors: [],
            characters: [],
          });
          return;
        }
        const res = await api.get(
          `/api/search?q=${encodeURIComponent(q)}&limit=10`,
        );
        setResults(res.data.data);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q]);

  const isEmpty =
    results.koleksi.length === 0 &&
    results.studios.length === 0 &&
    results.voiceActors.length === 0 &&
    results.characters.length === 0;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-[var(--text-tertiary)]">
          Mencari hasil untuk &quot;{q}&quot;...
        </p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-6 py-12 max-w-5xl">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">
        Hasil Pencarian untuk &quot;
        <span className="text-[var(--accent)]">{q}</span>&quot;
      </h1>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-[var(--bg-input)] p-6">
            <svg
              className="h-12 w-12 text-[var(--text-tertiary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Tidak ada hasil
          </h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Coba gunakan kata kunci pencarian yang berbeda.
          </p>
        </div>
      )}

      {!isEmpty && (
        <div className="space-y-12">
          {/* Koleksi (Anime/Manga) */}
          {results.koleksi.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span className="h-6 w-1 rounded bg-[var(--accent)]"></span>
                Anime & Manga
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {results.koleksi.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => router.push(`/anime/${item.slug}`)}
                    className="group relative flex flex-col text-left overflow-hidden rounded-xl bg-[var(--bg-card)] border border-[var(--border)] transition hover:border-[var(--accent)]/50 hover:shadow-lg"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--bg-input)]">
                      {item.posterUrl ? (
                        <Image
                          src={item.posterUrl}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-[var(--text-tertiary)]">
                          No Image
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        <span className="rounded bg-[var(--accent)]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm backdrop-blur-md">
                          {item.type || "ANIME"}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="line-clamp-2 text-sm font-bold text-[var(--text-primary)] transition group-hover:text-[var(--accent)]">
                        {item.title}
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Studios */}
          {results.studios.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span className="h-6 w-1 rounded bg-purple-500"></span>
                Studios
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {results.studios.map((studio) => (
                  <div
                    key={studio.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] clamp-1">
                        {studio.name}
                      </h3>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Studio
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Staff / Voice Actors */}
          {(results.voiceActors.length > 0 ||
            results.characters.length > 0) && (
            <div className="grid md:grid-cols-2 gap-8">
              {results.voiceActors.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <span className="h-6 w-1 rounded bg-blue-500"></span>
                    Voice Actors
                  </h2>
                  <div className="space-y-3">
                    {results.voiceActors.map((va) => (
                      <div
                        key={va.id}
                        className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--bg-input)]">
                          {va.imageUrl ? (
                            <Image
                              src={va.imageUrl}
                              alt={va.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px]">
                              No Img
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            {va.name}
                          </h3>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            Voice Actor
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {results.characters.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <span className="h-6 w-1 rounded bg-pink-500"></span>
                    Characters
                  </h2>
                  <div className="space-y-3">
                    {results.characters.map((char) => (
                      <div
                        key={char.id}
                        className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--bg-input)]">
                          {char.imageUrl ? (
                            <Image
                              src={char.imageUrl}
                              alt={char.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px]">
                              No Img
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            {char.name}
                          </h3>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            Character
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--accent)]"></div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
