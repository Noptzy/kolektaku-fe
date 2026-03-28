"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import animeService from "@/lib/animeApi";

export default function EpisodeList({ slug }) {
  const router = useRouter();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEpisodes();
  }, [slug]);

  const fetchEpisodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await animeService.getEpisodeList(slug);
      setEpisodes(result.data || result || []);
    } catch (err) {
      console.error("Failed to fetch episodes:", err);
      setError("Gagal memuat daftar episode.");
    } finally {
      setLoading(false);
    }
  };

  const handleWatchEpisode = (episodeNumber, episodeId) => {
    router.push(`/anime/${slug}/watch/${episodeNumber}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="relative mx-auto h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-br from-red-500/30 to-pink-500/30" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-red-500/30 bg-slate-900">
              <span className="text-2xl">🎬</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/60">Loading episodes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center backdrop-blur-xl">
        <span className="text-4xl">😔</span>
        <p className="mt-3 text-red-300">{error}</p>
      </div>
    );
  }

  if (!episodes || episodes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
        <span className="text-5xl">🍃</span>
        <p className="mt-4 text-lg font-medium text-white/80">Belum ada episode</p>
        <p className="mt-2 text-sm text-white/60">Episode akan segera hadir</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📺</span>
          <div>
            <h3 className="text-lg font-semibold text-white">Daftar Episode</h3>
            <p className="text-sm text-white/60">{episodes.length} episode tersedia</p>
          </div>
        </div>
      </div>

      {/* Episode Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {episodes.map((episode, index) => {
          const episodeNumber = episode.number || episode.episodeNumber || index + 1;
          const episodeTitle = episode.title || `Episode ${episodeNumber}`;
          const episodeImage = episode.image || episode.thumbnail;

          return (
            <button
              key={episode.id || episodeNumber}
              onClick={() => handleWatchEpisode(episodeNumber, episode.id)}
              className="group flex items-center gap-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            >
              {/* Thumbnail */}
              <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                {episodeImage ? (
                  <img
                    src={episodeImage}
                    alt={episodeTitle}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/160x90/1a1a2e/ffffff?text=EP+" + episodeNumber;
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-600/20 to-pink-600/20">
                    <span className="text-2xl font-bold text-white/40">{episodeNumber}</span>
                  </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/80 backdrop-blur-sm">
                    <svg className="ml-1 h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  Episode {episodeNumber}
                </p>
                <h4 className="mt-1 line-clamp-2 text-sm font-medium text-white group-hover:text-red-300">
                  {episodeTitle}
                </h4>
                {episode.duration && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-white/50">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {episode.duration}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <svg
                className="h-5 w-5 shrink-0 text-white/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
