"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import meService from "@/lib/meApi";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import Swal from "sweetalert2";

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

export default function AnimeDetailPage({ params }) {
  const { slug } = use(params);
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [episodeRange, setEpisodeRange] = useState(0);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [searchContext, setSearchContext] = useState(null);

  // Get search context from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("kolektaku_anime_search_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSearchContext(parsed);
      }
    } catch (e) {
      console.error("Failed to get search context:", e);
    }
  }, []);

  const handleBack = () => {
    if (searchContext?.query || searchContext?.filters) {
      const params = new URLSearchParams();
      if (searchContext.query) params.set("q", searchContext.query);
      if (searchContext.filters) {
        Object.entries(searchContext.filters).forEach(([k, v]) => {
          if (v && v !== "year_desc") params.set(k, v);
        });
      }
      const urlStr = params.toString();
      router.push(`/anime${urlStr ? `?${urlStr}` : ""}`);
    } else {
      router.push("/anime");
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const detailRes = await api.get(`/api/anime/${slug}`);
        setAnime(detailRes.data.data);

        try {
          const epsRes = await api.get(`/api/anime/${slug}/eps`);
          setEpisodes(epsRes.data.data || []);
        } catch (epsErr) {
          console.warn("Failed to fetch episodes:", epsErr);
          setEpisodes([]);
        }
      } catch (err) {
        console.error("Failed to fetch anime:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function fetchFavoriteState() {
      if (!user || !anime?.id) {
        setIsFavorite(false);
        return;
      }

      try {
        const response = await meService.getFavorites({ page: 1, limit: 500 });
        const rows = Array.isArray(response?.data) ? response.data : [];
        const exists = rows.some((item) => item?.koleksiId === anime.id);
        if (!cancelled) setIsFavorite(exists);
      } catch (error) {
        if (!cancelled) setIsFavorite(false);
      }
    }

    fetchFavoriteState();
    return () => {
      cancelled = true;
    };
  }, [user, anime?.id]);

  const toggleFavorite = async () => {
    if (!user) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("open-login-modal"));
      }
      return;
    }

    if (!anime?.id || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await meService.removeFavorite(anime.id);
        setIsFavorite(false);
      } else {
        await meService.addFavorite(anime.id);
        setIsFavorite(true);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        Swal.fire({
          icon: "warning",
          title: "Limit Favorit Tercapai",
          text: error.response.data.message || "Silakan upgrade ke Premium untuk menyimpan lebih dari 10 anime favorit.",
          showCancelButton: true,
          confirmButtonText: "Upgrade Sekarang",
          cancelButtonText: "Nanti Saja",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          confirmButtonColor: "var(--accent)",
        }).then((result) => {
          if (result.isConfirmed) {
            router.push("/membership");
          }
        });
      } else {
        console.error("Failed to toggle favorite", error);
      }
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <Navbar />
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 text-center">
          <svg className="h-20 w-20 text-[var(--text-tertiary)] mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Anime not found</h2>
          <button onClick={() => router.push("/anime")} className="mt-6 rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]">
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const detail = anime.animeDetail;
  const genres = anime.genres?.map((g) => g.genre) || [];
  const mainStudios = anime.studios?.filter(s => s.isMain).map(s => s.studio) || [];
  const otherStudios = anime.studios?.filter(s => !s.isMain).map(s => s.studio) || [];
  const staff = anime.staff || [];
  const characters = anime.characters?.map((c) => ({
    char: c.character,
    va: c.voiceActor
  })) || [];
  const relations = anime.relations || [];
  const externalLinks = detail?.externalLinks || [];

  // Episode chunking logic
  const CHUNK_SIZE = 50;
  const sortedEpisodes = [...episodes].sort((a, b) =>
    sortOrder === 'asc' ? a.episodeNumber - b.episodeNumber : b.episodeNumber - a.episodeNumber
  );
  const totalChunks = Math.ceil(episodes.length / CHUNK_SIZE);
  const episodeChunks = Array.from({ length: totalChunks }, (_, i) => {
    const start = i * CHUNK_SIZE + 1;
    const end = Math.min((i + 1) * CHUNK_SIZE, episodes.length);
    return { label: `${start}-${end}`, start, end };
  });
  const currentChunk = episodeChunks[episodeRange] || episodeChunks[0];
  const displayedEps = currentChunk
    ? sortedEpisodes.filter(
        ep => ep.episodeNumber >= currentChunk.start && ep.episodeNumber <= currentChunk.end
      )
    : sortedEpisodes;
  const statusColor = detail?.status === "FINISHED" ? "text-[var(--info)] bg-[var(--info)]/10" : detail?.status === "RELEASING" ? "text-[var(--success)] bg-[var(--success)]/10" : "text-[var(--text-secondary)] bg-[var(--badge-bg)]";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 pb-20">
      <Navbar />

      {/* Hero Background Banner */}
      <div className="relative h-[30vh] md:h-[45vh] w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src={anime.landscapePosterUrl || anime.posterUrl}
            alt="Banner"
            fill
            className="object-cover opacity-40 blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-[var(--bg-primary)]/20" />
        </div>
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]/90 backdrop-blur-md px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Back
          {searchContext?.query && (
            <span className="hidden sm:inline text-xs opacity-70">to &quot;{searchContext.query.slice(0, 20)}{searchContext.query.length > 20 ? '...' : ''}&quot;</span>
          )}
        </button>
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 -mt-32 md:-mt-48">
        
        {/* Main Hero Info */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          
          {/* Left Column: Poster & Actions */}
          <div className="flex flex-col items-center md:items-start shrink-0">
            <div className="relative w-[220px] md:w-[260px] aspect-[3/4] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl">
              <Image
                src={anime.posterUrl}
                alt={anime.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 220px, 260px"
                priority
              />
            </div>

            {/* Actions */}
            <div className="w-full mt-6 flex flex-col gap-3">
              <div className="flex gap-3">
                {episodes.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("open-login-modal"));
                        }
                        return;
                      }
                      router.push(`/anime/${slug}/eps/${episodes[episodes.length - 1]?.episodeNumber}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-3 font-semibold text-white shadow-lg shadow-[var(--accent-muted)] transition hover:bg-[var(--accent-hover)] hover:-translate-y-0.5"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Watch Episode 1
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--badge-bg)] py-3 font-semibold text-[var(--text-secondary)] cursor-not-allowed"
                  >
                    Episodes Coming Soon
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleFavorite}
                  disabled={favoriteLoading}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  className={`flex h-12 w-12 items-center justify-center rounded-lg border transition ${
                    isFavorite
                      ? "border-[var(--danger)] text-[var(--danger)] bg-red-500/10"
                      : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)] hover:bg-red-500/10"
                  } ${favoriteLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Details & Metadata */}
          <div className="flex-1 mt-4 md:mt-12">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {anime.title}
            </h1>
            
            {anime.altTitles?.length > 0 && (
              <p className="mt-2 text-lg text-[var(--text-secondary)] font-medium">
                {anime.altTitles.find(t => t.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/)) || anime.altTitles[0]}
                <span className="ml-2 text-sm text-[var(--text-tertiary)]">{anime.title}</span>
              </p>
            )}

            {/* Quick Stats Row */}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              {anime.score && (
                <div className="flex items-center gap-1.5 text-lg font-bold">
                  <span className="text-[var(--score)] text-xl">★</span>
                  <span>{anime.score}</span>
                </div>
              )}
              
              <div className="flex items-center gap-3 text-sm">
                {detail?.status && detail.status !== "Unknown" && (
                  <span className={`px-2.5 py-1 rounded-md font-semibold ${statusColor}`}>
                    {detail.status === 'FINISHED' ? 'Completed' : detail.status === 'RELEASING' ? 'Airing' : detail.status}
                  </span>
                )}
                {detail?.totalEpisodes && (
                  <span className="text-[var(--text-secondary)]">{detail.totalEpisodes} Episodes</span>
                )}
                {detail?.duration && (
                  <span className="text-[var(--text-secondary)]">{detail.duration} min per ep</span>
                )}
                {anime.releaseYear && (
                  <span className="text-[var(--text-secondary)]">{detail?.season ? `${detail.season} ` : ''}{anime.releaseYear}</span>
                )}
              </div>
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {genres.map((g) => (
                  <span
                    key={g.id}
                    onClick={() => router.push(`/anime/genre/${encodeURIComponent(g.name)}`)}
                    className="rounded-full border border-[var(--border)] bg-[var(--badge-bg)] px-3.5 py-1 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--border-hover)] cursor-pointer"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Synopsis */}
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-3">Synopsis</h3>
              <div 
                className={`text-[var(--text-secondary)] leading-relaxed text-sm md:text-base ${!isExpanded ? 'line-clamp-4' : ''}`}
                dangerouslySetInnerHTML={{ __html: anime.synopsis || "No synopsis available." }} 
              />
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition"
              >
                {isExpanded ? "Show Less" : "Read More"}
              </button>
            </div>
            
            {/* Info Grid Expanded */}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Source</p>
                <p className="text-sm font-medium capitalize">{detail?.source?.toLowerCase() || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Format</p>
                <p className="text-sm font-medium">{detail?.format || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Rating</p>
                <p className="text-sm font-medium">{anime.contentRating || (detail?.isAdult ? "18+ Adult" : "13+ Teens")}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Premiered</p>
                <p className="text-sm font-medium">
                  {detail?.startDate ? new Date(detail.startDate).toLocaleDateString() : "-"}
                </p>
              </div>
            </div>

            {/* External Links */}
            {externalLinks.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-3 uppercase tracking-wider">External Links</p>
                <div className="flex flex-wrap gap-2">
                  {externalLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--border-hover)] hover:text-[var(--text-primary)]"
                    >
                      {link.icon ? (
                        <Image src={link.icon} alt="" width={14} height={14} className={`rounded-sm ${theme === 'light' ? 'brightness-0' : ''}`} />
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                      {link.site}
                    </a>
                  ))}
                  {detail?.trailerUrl && (
                    <a
                      href={detail.trailerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-1.5 text-xs font-bold text-[var(--danger)] transition hover:bg-[var(--danger)]/20"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Trailer
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trailer */}
        {detail?.trailerUrl && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <svg className="h-6 w-6 text-[var(--danger)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Trailer
            </h2>
            <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden border border-[var(--border)] bg-black shadow-[0_0_30px_rgba(255,0,0,0.1)]">
              <iframe
                src={`${detail.trailerUrl.replace("watch?v=", "embed/")}?autoplay=1&mute=0&loop=1&playlist=${detail.trailerUrl.split("v=")[1]}`}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full"
              ></iframe>
            </div>
          </div>
        )}

        {/* Episodes Section */}
        <div id="episodes" className="mt-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Episodes</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-secondary)] font-medium">{episodes.length} Episodes</span>
              {episodes.length > 1 && (
                <button
                  onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                >
                  <svg className={`h-3.5 w-3.5 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                </button>
              )}
            </div>
          </div>

          {/* Episode Range Tabs */}
          {totalChunks > 1 && (
            <div className="flex items-center gap-2 mb-4 relative w-full">
              <button className="ep-prev-btn shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all disabled:opacity-30 z-10">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>

              <div className="flex-1 min-w-0 overflow-hidden">
                <Swiper
                  modules={[FreeMode, Mousewheel, Navigation]}
                  spaceBetween={8}
                  slidesPerView={'auto'}
                  freeMode={true}
                  mousewheel={{ forceToAxis: true }}
                  grabCursor={true}
                  navigation={{ prevEl: '.ep-prev-btn', nextEl: '.ep-next-btn' }}
                  className="!overflow-visible"
                >
                  {episodeChunks.map((chunk, idx) => (
                    <SwiperSlide key={idx} className="!w-auto">
                      <button
                        onClick={() => setEpisodeRange(idx)}
                        className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          episodeRange === idx
                            ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-muted)]'
                            : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {chunk.label}
                      </button>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>

              <button className="ep-next-btn shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all disabled:opacity-30 z-10">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}

          {episodes.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
              <span className="text-3xl mb-3 block">📺</span>
              <p className="text-[var(--text-secondary)] text-sm">Episodes not available yet</p>
            </div>
          ) : (
            <div 
              key={`${episodeRange}-${sortOrder}`} 
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border)] overflow-hidden animate-fade-in-up"
            >
              {displayedEps.map((ep) => (
                <button
                  key={ep.episodeNumber}
                  onClick={() => {
                    if (!user) {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("open-login-modal"));
                      }
                      return;
                    }
                    router.push(`/anime/${slug}/eps/${ep.episodeNumber}`);
                  }}
                  className="group w-full flex items-center gap-4 px-4 py-3 text-left transition-all hover:bg-[var(--bg-card-hover)]"
                >
                  {/* Episode number badge */}
                  <span className="shrink-0 flex items-center justify-center h-9 w-14 rounded-lg bg-[var(--accent-muted)] text-xs font-bold text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                    EP {ep.episodeNumber}
                  </span>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                      {ep.title || `Episode ${ep.episodeNumber}`}
                    </p>
                  </div>

                  {/* Sub badge */}
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                    Sub
                  </span>

                  {/* Play icon */}
                  <svg className="shrink-0 h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Relations */}
        {relations.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Relations Media</h2>
            <Swiper
              modules={[Navigation, FreeMode]}
              spaceBetween={16}
              slidesPerView={2.5}
              freeMode={true}
              navigation={true}
              breakpoints={{
                640: { slidesPerView: 3.5 },
                768: { slidesPerView: 4.5 },
                1024: { slidesPerView: 5.5 },
              }}
              className="detail-swiper"
            >
              {relations.map((rel) => {
                const isClickable = !!rel.targetAnime?.slug;
                return (
                  <SwiperSlide key={rel.id}>
                    <div 
                      onClick={() => isClickable && router.push(`/anime/${rel.targetAnime.slug}`)}
                      className={`flex flex-col group ${isClickable ? 'cursor-pointer' : ''}`}
                    >
                      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] shadow-sm transition-transform group-hover:border-[var(--accent)] group-hover:-translate-y-1">
                        {rel.targetAnime?.posterUrl ? (
                          <Image src={rel.targetAnime.posterUrl} alt={rel.targetAnime?.title || 'Related'} fill className="object-cover transition-transform group-hover:scale-105" sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 15vw"/>
                        ) : (
                          <div className="w-full h-full bg-[var(--bg-card-hover)] flex items-center justify-center text-[var(--text-tertiary)] p-4 text-center text-xs">No Image</div>
                        )}
                        <div className="absolute top-2 left-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-md">
                          {rel.relationType} 
                        </div>
                      </div>
                      <p className={`mt-2 text-sm font-semibold text-[var(--text-primary)] transition-colors line-clamp-2 leading-tight ${isClickable ? 'group-hover:text-[var(--accent)]' : ''}`}>
                        {rel.targetAnime?.title || `AniList ID: ${rel.targetAnilistId}`}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-tertiary)] capitalize">{rel.targetAnime?.type?.toLowerCase() || "Media"}</p>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        )}

        {/* Characters & Voice Actors */}
        {characters.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Characters & Voice Actors</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.slice(0, 9).map((c, idx) => (
                <div key={idx} className="group flex h-20 overflow-hidden rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                  {/* Character */}
                  <div 
                    onClick={() => router.push(`/anime/character/${c.char.id}`)}
                    className="relative w-16 shrink-0 h-full cursor-pointer transition-opacity group-hover:opacity-90"
                  >
                    {c.char?.imageUrl ? (
                      <Image 
                        src={c.char.imageUrl} 
                        alt={c.char.name} 
                        fill 
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--border-hover)]" />
                    )}
                  </div>
                  <div 
                    onClick={() => router.push(`/anime/character/${c.char.id}`)}
                    className="flex flex-col justify-center p-2 px-3 flex-1 min-w-0 cursor-pointer transition-colors group-hover:text-[var(--accent)]"
                  >
                    <p className="font-semibold text-xs sm:text-sm truncate">{c.char?.name}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Main</p>
                  </div>
                  
                  {/* Voice Actor */}
                  {c.va && (
                    <>
                      <div 
                        onClick={() => router.push(`/anime/va/${c.va.id}`)}
                        className="flex flex-col justify-center items-end p-2 px-3 flex-1 min-w-0 text-right cursor-pointer transition-colors group-hover:text-[var(--accent)] border-l border-[var(--border)]/30"
                      >
                        <p className="font-semibold text-xs sm:text-sm truncate">{c.va.name}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Japanese</p>
                      </div>
                      <div 
                        onClick={() => router.push(`/anime/va/${c.va.id}`)}
                        className="relative w-16 shrink-0 h-full cursor-pointer transition-opacity group-hover:opacity-90"
                      >
                        {c.va.imageUrl ? (
                          <Image 
                            src={c.va.imageUrl} 
                            alt={c.va.name} 
                            fill 
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full bg-[var(--border-hover)]" />
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staff */}
        {staff.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Production Staff</h2>
            <Swiper
              modules={[Navigation, FreeMode]}
              spaceBetween={16}
              slidesPerView={3.5}
              freeMode={true}
              navigation={true}
              breakpoints={{
                640: { slidesPerView: 4.5 },
                768: { slidesPerView: 5.5 },
                1024: { slidesPerView: 7 },
              }}
              className="detail-swiper"
            >
              {staff.slice(0, 15).map((s, idx) => (
                <SwiperSlide key={idx}>
                  <div 
                    onClick={() => router.push(`/anime/staff/${s.staff.id}`)}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-[var(--bg-card)] shadow-md transition-transform group-hover:border-[var(--accent)] group-hover:scale-105">
                      {s.staff?.imageUrl ? (
                        <Image src={s.staff.imageUrl} alt={s.staff.name} fill className="object-cover" sizes="96px" unoptimized/>
                      ) : (
                        <div className="w-full h-full bg-[var(--border-hover)] flex items-center justify-center text-xl text-[var(--text-tertiary)] font-bold">{s.staff.name[0]}</div>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-center line-clamp-2 leading-tight group-hover:text-[var(--accent)] transition-colors">{s.staff.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)] text-center line-clamp-1">{s.role}</p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}

        {/* Studios */}
        {(mainStudios.length > 0 || otherStudios.length > 0) && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Studios & Producers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Main Studios */}
              {mainStudios.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-4">Main Studio</p>
                  <div className="flex flex-wrap gap-3">
                    {mainStudios.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => router.push(`/anime/studio/${s.id}`)}
                        className="flex items-center gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-5 py-3 transition hover:bg-[var(--accent)]/10 hover:shadow-md group"
                      >
                        <span className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{s.name}</span>
                        <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">Studio</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Producers */}
              {otherStudios.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-4">Producers</p>
                  <div className="flex flex-wrap gap-3">
                    {otherStudios.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => router.push(`/anime/studio/${s.id}`)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 transition hover:border-[var(--text-tertiary)] hover:bg-[var(--bg-card-hover)] group"
                      >
                        <span className="text-sm font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* End of Main Content */}
      </main>
    </div>
  );
}
