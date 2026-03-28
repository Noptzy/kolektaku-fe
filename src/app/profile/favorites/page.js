"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import meService from "@/lib/meApi";

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)]/70 p-8 text-center">
      <p className="text-base font-semibold text-[var(--text-primary)]">Belum ada anime favorit</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Tambahkan anime favorit agar dapat notifikasi update episode terbaru.</p>
    </div>
  );
}

export default function ProfileFavoritesPage() {
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const response = await meService.getFavorites({ page: 1, limit: 24 });
      setFavorites(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch favorites", error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const removeFavorite = async (koleksiId) => {
    try {
      await meService.removeFavorite(koleksiId);
      setFavorites((prev) => prev.filter((item) => item.koleksiId !== koleksiId));
    } catch (error) {
      console.error("Failed to remove favorite", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-2xl bg-[var(--bg-primary)]/70" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="mb-2">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent)] hover:underline">
          &larr; Back to Profile
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">My Favorites</h2>
      </div>

      {!favorites.length ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {favorites.map((item) => (
            <article
              key={`${item.userId}-${item.koleksiId}`}
              className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]"
            >
              <div className="relative h-44 w-full bg-[var(--bg-input)]">
                {item.koleksi?.posterUrl ? (
                  <img src={item.koleksi.posterUrl} alt={item.koleksi?.title || "Poster"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">🎬</div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                  Anime Favorite
                </span>
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <p className="text-sm text-[var(--text-tertiary)]">{item.koleksi?.koleksiType || "anime"}</p>
                  <h4 className="text-base font-bold text-[var(--text-primary)]">{item.koleksi?.title || "Untitled"}</h4>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
                  <span>
                    Added {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFavorite(item.koleksiId)}
                    className="rounded-lg border border-[var(--danger)]/30 px-2.5 py-1.5 font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/10"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
