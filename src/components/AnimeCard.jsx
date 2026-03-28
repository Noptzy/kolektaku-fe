"use client";

import { useRouter } from "next/navigation";

export default function AnimeCard({ anime }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/anime/${anime.slug}`);
  };

  const defaultImage = "https://via.placeholder.com/300x450/1a1a2e/ffffff?text=No+Image";

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-red-500/30 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]"
    >
      {/* Image Container */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={anime.coverImage || anime.image || defaultImage}
          alt={anime.title || "Anime"}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            e.target.src = defaultImage;
          }}
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

        {/* Score badge */}
        {(anime.score || anime.rating) && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/90 px-2 py-1 text-xs font-bold text-yellow-900 backdrop-blur-sm">
            <span>⭐</span>
            <span>{anime.score || anime.rating}</span>
          </div>
        )}

        {/* Type badge */}
        {anime.type && (
          <div className="absolute left-2 top-2 rounded-full border border-purple-500/30 bg-purple-500/90 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {anime.type}
          </div>
        )}

        {/* Hover play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/50 bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <svg
              className="ml-1 h-6 w-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 p-3">
        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-red-400">
          {anime.title || "Unknown Title"}
        </h3>

        {/* Additional info */}
        <div className="flex items-center justify-between text-xs text-white/60">
          {anime.year && (
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {anime.year}
            </span>
          )}
          {anime.season && (
            <span className="capitalize">{anime.season}</span>
          )}
        </div>

        {/* Genres */}
        {anime.genres && anime.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {anime.genres.slice(0, 2).map((genre, index) => {
              // Handle both string and object genres
              const genreName = typeof genre === "string" ? genre : genre?.genre || genre?.name || "Unknown";
              return (
                <span
                  key={index}
                  className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300"
                >
                  {genreName}
                </span>
              );
            })}
            {anime.genres.length > 2 && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
                +{anime.genres.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Episodes count */}
        {anime.episodes && (
          <div className="flex items-center gap-1 text-xs text-white/60">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
            <span>{anime.episodes} eps</span>
          </div>
        )}
      </div>
    </div>
  );
}
