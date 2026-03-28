"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import meService from "@/lib/meApi";

/**
 * Helper: Konversi detik ke format menit/detik yang cakep
 */
const formatWatchTime = (totalSeconds) => {
  const seconds = totalSeconds || 0;
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

/**
 * Component: Tampilan saat history kosong
 */
function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)]/50 p-10 text-center">
      <p className="text-lg font-bold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

export default function ProfileHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rawWatchHistory, setRawWatchHistory] = useState([]);
  const [readHistory, setReadHistory] = useState([]);
  const [page, setPage] = useState(1);

  /**
   * LOGIC: Grouping History
   * Kita cuma ambil episode TERBARU dari tiap judul anime biar UI nggak cluttered.
   */
  const watchHistory = useMemo(() => {
    const grouped = rawWatchHistory.reduce((acc, item) => {
      const slug = item?.episode?.anime?.koleksi?.slug;
      if (!slug) return acc;

      // Ambil yang paling baru berdasarkan updatedAt
      if (!acc[slug] || new Date(item.updatedAt) > new Date(acc[slug].updatedAt)) {
        acc[slug] = item;
      }
      return acc;
    }, {});

    return Object.values(grouped).sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }, [rawWatchHistory]);

  const paginatedHistory = useMemo(() => {
    const start = (page - 1) * 10;
    const end = start + 10;
    return watchHistory.slice(start, end);
  }, [watchHistory, page]);

  const openWatchFromHistory = useCallback((item) => {
    const slug = item?.episode?.anime?.koleksi?.slug;
    const epNum = item?.episode?.episodeNumber;

    if (!slug || !epNum) return;

    router.push(`/anime/${slug}/eps/${epNum}`);
  }, [router]);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const [watchResp, readResp] = await Promise.all([
        meService.getWatchHistory({ page: 1, limit: 100 }), // Limit agak gede buat grouping
        meService.getReadHistory({ page: 1, limit: 30 }),
      ]);

      setRawWatchHistory(Array.isArray(watchResp?.data) ? watchResp.data : []);
      setReadHistory(Array.isArray(readResp?.data) ? readResp.data : []);
    } catch (error) {
      console.error("Gagal ambil history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--bg-primary)]/70" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="mb-2">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent)] hover:underline">
          &larr; Back to Profile
        </Link>
      </div>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍿</span>
            <h3 className="text-xl font-black tracking-tight text-[var(--text-primary)]">
              Continue Watching
            </h3>
          </div>
          <span className="text-xs font-medium text-[var(--text-tertiary)]">
            {watchHistory.length} Judul
          </span>
        </div>

        {!watchHistory.length ? (
          <EmptyState 
            title="Belum ada tontonan" 
            subtitle="Anime yang kamu tonton bakal muncul di sini." 
          />
        ) : (
          <div className="grid gap-4">
            {paginatedHistory.map((item) => {
              const koleksi = item.episode?.anime?.koleksi;
              const isCompleted = item.isCompleted;
              
              // Anggap durasi rata-rata 24 menit (1440s) kalau API gak sedia totalDuration
              // Ini cuma buat simulasi Progress Bar
              const estimatedDuration = 1440; 
              const progress = isCompleted ? 100 : Math.min(95, (item.watchTimeSeconds / estimatedDuration) * 100);

              return (
                <button
                  type="button"
                  key={`${item.userId}-${item.episodeId}`}
                  onClick={() => openWatchFromHistory(item)}
                  className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-all hover:border-[var(--accent)]/50 hover:shadow-xl sm:flex-row"
                >
                  {/* Poster Section */}
                  <div className="relative h-40 w-full flex-shrink-0 overflow-hidden sm:h-auto sm:w-32">
                    <Image
                      src={koleksi?.posterUrl || "/placeholder.jpg"}
                      alt={koleksi?.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:hidden" />
                  </div>

                  {/* Info Section */}
                  <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="line-clamp-1 text-base font-bold text-[var(--text-primary)] sm:text-lg">
                          {koleksi?.title}
                        </h4>
                        <span className={`flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                          isCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {isCompleted ? "TAMAT" : "LANJUT"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Episode {item.episode?.episodeNumber} • {item.episode?.title || "No Title"}
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {/* Progress Bar */}
                      {!isCompleted && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-primary)]">
                          <div 
                            className="h-full bg-[var(--accent)] transition-all duration-700" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-tertiary)]">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <span className="opacity-70">⏱️</span> {formatWatchTime(item.watchTimeSeconds)}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="opacity-70">📅</span> {new Date(item.updatedAt).toLocaleDateString("id-ID")}
                          </span>
                        </div>
                        <span className="font-bold text-[var(--accent)] group-hover:translate-x-1 transition-transform">
                          PLAY NOW →
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && watchHistory.length > 10 && (
          <div className="mt-8 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-4">
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Halaman {page} dari {Math.ceil(watchHistory.length / 10)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2 text-sm font-bold text-[var(--text-secondary)] transition hover:bg-[var(--accent)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * 10 >= watchHistory.length}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2 text-sm font-bold text-[var(--text-secondary)] transition hover:bg-[var(--accent)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Read History (Masih disabled/hidden) */}
      {readHistory.length > 0 && (
        <section className="opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0">
           <h3 className="mb-4 text-lg font-bold text-[var(--text-primary)]">Recent Reading (Coming Soon)</h3>
           {/* Logic mapping buat manga bisa ditaruh sini nanti */}
        </section>
      )}
    </div>
  );
}
