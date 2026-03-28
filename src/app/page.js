"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import animeService from "@/lib/animeApi";
import AiringSchedule from "@/components/AiringSchedule";

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [updatedAnime, setUpdatedAnime] = useState([]);
  const [mostWatched, setMostWatched] = useState([]);
  const [randomAnime, setRandomAnime] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState({ totalAnime: 0, totalEpisodes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [resUpdated, resMostWatched, resRandom, resStats] = await Promise.all([
          animeService.getRecentlyUpdated(12),
          animeService.getMostWatched(12),
          animeService.getRandomAnime(2),
          animeService.getGlobalStats()
        ]);
        setUpdatedAnime(resUpdated.data || []);
        setMostWatched(resMostWatched.data || []);
        setRandomAnime(resRandom.data || []);
        if (resStats.success) {
          setStats(resStats.data);
        }
      } catch (err) {
        console.error("Failed to fetch anime:", err);
        setError("Failed to load anime collection.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchRecommendations() {
      if (user?.id) {
        try {
          const res = await animeService.getRecommendations(12);
          if (res.success) {
            setRecommendations(res.data || []);
          }
        } catch (err) {
          console.error("Failed to fetch recommendations:", err);
        }
      }
    }
    fetchRecommendations();
  }, [user?.id]);

  const AnimeCard = ({ item }) => (
    <div
      onClick={() => router.push(`/anime/${item.slug}`)}
      className="group cursor-pointer flex flex-col focus:outline-none min-w-[140px] sm:min-w-[160px] md:min-w-[180px] lg:min-w-[200px]"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm transition-all duration-300 group-hover:border-[var(--accent)] group-hover:shadow-md group-hover:-translate-y-1">
        <Image
          src={item.posterUrl}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, (max-width: 1024px) 180px, 200px"
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
        <span className={`absolute bottom-2 left-2 flex items-center gap-1.5 text-[11px] font-medium text-white`}>
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
  );

  const stripHtml = (str) => str?.replace(/<[^>]*>?/gm, '') || '';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* ═══════════ Hero Banner ═══════════ */}
        <section className="relative mt-4 md:mt-8 overflow-hidden rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl">
          {updatedAnime.length > 0 ? (
            <Swiper
              modules={[Autoplay, EffectFade]}
              effect="fade"
              speed={1000}
              autoplay={{ delay: 6000, disableOnInteraction: false }}
              grabCursor={true}
              simulateTouch={true}
              className="w-full h-[420px] md:h-[520px] hero-swiper"
            >
              {updatedAnime.slice(0, 5).map((anime) => {
                const synopsis = stripHtml(anime.synopsis);
                return (
                  <SwiperSlide key={anime.id}>
                    <div className="relative w-full h-full">
                      {/* Background Image */}
                      <Image
                        src={anime.landscapePosterUrl || anime.posterUrl}
                        alt={anime.title}
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                      />
                      {/* Overlays for readability */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/85 to-[var(--bg-primary)]/20" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-[var(--bg-primary)]/30" />
                      
                      {/* Content */}
                      <div className="absolute inset-0 flex flex-col justify-end pb-16 md:pb-20 px-8 md:px-16 lg:w-3/5">
                        {/* Meta badges */}
                        <div className="flex items-center gap-3 mb-4">
                          {anime.score && (
                            <span className="flex items-center gap-1.5 rounded-full bg-[var(--score)]/15 border border-[var(--score)]/30 px-3 py-1 text-xs font-bold text-[var(--score)]">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {anime.score}
                            </span>
                          )}
                          {anime.type && (
                            <span className="rounded-full bg-[var(--accent-muted)] border border-[var(--accent)]/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                              {anime.type}
                            </span>
                          )}
                          {anime.status === 'RELEASING' && (
                            <span className="flex items-center gap-1.5 rounded-full bg-[var(--success)]/15 border border-[var(--success)]/30 px-3 py-1 text-xs font-bold text-[var(--success)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                              Airing
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.08] line-clamp-2">
                          {anime.title}
                        </h1>
                        
                        {/* Synopsis */}
                        {synopsis ? (
                          <p className="mt-4 text-[var(--text-secondary)] leading-relaxed max-w-lg line-clamp-2 text-sm md:text-base">
                            {synopsis}
                          </p>
                        ) : (
                          <p className="mt-4 text-[var(--text-secondary)] leading-relaxed max-w-lg text-sm md:text-base">
                            {anime.releaseYear || ''} {anime.animeDetail?.totalEpisodes > 1 ? `• ${anime.animeDetail.totalEpisodes} Episodes` : ''}
                          </p>
                        )}
                        
                        {/* CTA Buttons */}
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          <button 
                            onClick={() => router.push(`/anime/${anime.slug}`)}
                            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--accent-muted)] transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-0.5 hover:shadow-xl"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Watch Now
                          </button>
                          <button 
                            onClick={() => router.push(`/anime`)}
                            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/50 backdrop-blur-md px-7 py-3 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--border-hover)] hover:-translate-y-0.5"
                          >
                            Explore All
                          </button>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          ) : (
            <div className="min-h-[420px] flex items-center justify-center">
               <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
            </div>
          )}
        </section>

        {/* ═══════════ Quick Stats Bar ═══════════ */}
        <section className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { 
              icon: "🎬", 
              label: "Anime Collection", 
              value: stats.totalAnime ? stats.totalAnime.toLocaleString() : "—", 
              sub: "Titles Available" 
            },
            { 
              icon: "🎞️", 
              label: "Total Episodes", 
              value: stats.totalEpisodes ? stats.totalEpisodes.toLocaleString() : "—", 
              sub: "Watchable Now" 
            },
            { icon: "🌐", label: "AI Subtitles", value: "Auto", sub: "Indonesian Translation" },
            { icon: "📱", label: "Any Device", value: "HD → FHD", sub: "Up to 1080p (Premium)" },
          ].map((stat, i) => (
            <div key={i} className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--accent)]/30 hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{stat.label}</span>
              </div>
              <p className="text-2xl font-extrabold text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </section>

        {loading ? (
          <div className="mt-20 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
          </div>
        ) : error ? (
          <div className="mt-20 text-center text-[var(--danger)]">
            {error}
          </div>
        ) : (
          <>
            {/* ═══════════ Recommendations Anime (Login Only) ═══════════ */}
            {user && recommendations.length > 0 && (
              <section className="mt-14">
                <div className="mb-6 flex items-end justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">✨ Rekomendasi Kolektaku AI</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Anime pilihan spesial dari Kolektaku AI khusus buat kamu</p>
                  </div>
                </div>
                
                <Swiper
                  modules={[Autoplay, Mousewheel]}
                  spaceBetween={16}
                  slidesPerView={2}
                  grabCursor={true}
                  simulateTouch={true}
                  mousewheel={{ forceToAxis: true }}
                  watchSlidesProgress={true}
                  threshold={5}
                  breakpoints={{
                    480: { slidesPerView: 3, spaceBetween: 16 },
                    640: { slidesPerView: 4, spaceBetween: 20 },
                    768: { slidesPerView: 4, spaceBetween: 20 },
                    1024: { slidesPerView: 5, spaceBetween: 24 },
                    1280: { slidesPerView: 6, spaceBetween: 24 },
                  }}
                  className="homepage-swiper pb-4"
                >
                  {recommendations.map(item => (
                    <SwiperSlide key={item.id}>
                      <AnimeCard item={item} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </section>
            )}

            {/* ═══════════ Recently Updated Anime ═══════════ */}
            <section className="mt-14">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">🕒 Recently Updated Anime </h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Anime dengan episode terbaru yang baru saja di-update</p>
                </div>
                <button onClick={() => router.push("/anime")} className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition">
                  View All →
                </button>
              </div>
              
              <Swiper
                modules={[Autoplay, Mousewheel]}
                spaceBetween={16}
                slidesPerView={2}
                grabCursor={true}
                simulateTouch={true}
                mousewheel={{ forceToAxis: true }}
                watchSlidesProgress={true}
                threshold={5}
                autoplay={{ delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
                breakpoints={{
                  480: { slidesPerView: 3, spaceBetween: 16 },
                  640: { slidesPerView: 4, spaceBetween: 20 },
                  768: { slidesPerView: 4, spaceBetween: 20 },
                  1024: { slidesPerView: 5, spaceBetween: 24 },
                  1280: { slidesPerView: 6, spaceBetween: 24 },
                }}
                className="homepage-swiper pb-4"
              >
                {updatedAnime.map(item => (
                  <SwiperSlide key={item.id}>
                    <AnimeCard item={item} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </section>

            {/* ═══════════ Most Watched Anime ═══════════ */}
            {mostWatched.length > 0 && (
              <section className="mt-14">
                <div className="mb-6 flex items-end justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">🔥 Most Watched Anime</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Anime yang paling banyak ditonton oleh komunitas Kolektaku</p>
                  </div>
                </div>
                
                <Swiper
                  modules={[Mousewheel]}
                  spaceBetween={16}
                  slidesPerView={2}
                  grabCursor={true}
                  simulateTouch={true}
                  mousewheel={{ forceToAxis: true }}
                  watchSlidesProgress={true}
                  threshold={5}
                  breakpoints={{
                    480: { slidesPerView: 3, spaceBetween: 16 },
                    640: { slidesPerView: 4, spaceBetween: 20 },
                    768: { slidesPerView: 4, spaceBetween: 20 },
                    1024: { slidesPerView: 5, spaceBetween: 24 },
                    1280: { slidesPerView: 6, spaceBetween: 24 },
                  }}
                  className="homepage-swiper pb-4"
                >
                  {mostWatched.map(item => (
                    <SwiperSlide key={item.id}>
                      <AnimeCard item={item} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </section>
            )}

            {/* ═══════════ Featured Spotlight ═══════════ */}
            {randomAnime.length > 0 && (
              <section className="mt-16">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-6">Randoms Anime</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {randomAnime.map((anime) => (
                    <div
                      key={anime.id}
                      onClick={() => router.push(`/anime/${anime.slug}`)}
                      className="group relative h-[240px] md:h-[280px] rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] cursor-pointer transition-all hover:border-[var(--accent)]/30 hover:shadow-xl"
                    >
                      <Image
                        src={anime.landscapePosterUrl || anime.posterUrl}
                        alt={anime.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center gap-2 mb-2">
                          {anime.score && (
                            <span className="flex items-center gap-1 text-xs font-bold text-[var(--score)]">
                              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {anime.score}
                            </span>
                          )}
                          <span className="text-xs text-white/60">{anime.releaseYear}</span>
                          {anime.type && (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white/80">{anime.type}</span>
                          )}
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-white line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                          {anime.title}
                        </h3>
                        {anime.synopsis && (
                          <p className="mt-2 text-sm text-white/70 line-clamp-2 leading-relaxed">
                            {stripHtml(anime.synopsis)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ═══════════ Airing Schedule Section ═══════════ */}
            <AiringSchedule />

            {/* ═══════════ CTA Banner ═══════════ */}
            <section className="mt-6 mb-16 rounded-3xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent-muted)] via-[var(--bg-card)] to-[var(--bg-card)] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  Upgrade ke Premium 💎
                </h2>
                <p className="mt-2 text-[var(--text-secondary)] max-w-md leading-relaxed">
                  Nikmati streaming anime tanpa iklan, resolusi 1080p, dan coba 7 hari gratis untuk member baru.
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => router.push("/membership")}
                  className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent-muted)] transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Lihat Plans
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => router.push("/anime")}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/50 backdrop-blur-md px-8 py-3.5 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--border-hover)] hover:-translate-y-0.5"
                >
                  Browse Library
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {/* ═══════════ Footer ═══════════ */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-10 w-10">
                  <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Kolektaku</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm">
                Platform streaming anime dengan terjemahan subtitle Indonesia yang didukung oleh AI. Nikmati ribuan judul anime favoritmu dengan membership premium.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] mb-4">Quick Links</h4>
              <ul className="space-y-3">
                {[
                  { label: "Home", path: "/" },
                  { label: "Explore Anime", path: "/anime" },
                  { label: "Membership", path: "/membership" },
                  { label: "Profile", path: "/profile" },
                ].map((link) => (
                  <li key={link.path}>
                    <button onClick={() => router.push(link.path)} className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition">
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] mb-4">Features</h4>
              <ul className="space-y-3">
                {[
                  "AI Subtitle Translation",
                  "HD → FHD Streaming",
                  "Premium Free Trial 7 Hari",
                  "Tanpa Iklan (Premium)",
                ].map((feature) => (
                  <li key={feature} className="text-sm text-[var(--text-secondary)]">
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[var(--text-tertiary)]">
              © 2026 Kolektaku. Made with ❤️ for anime fans everywhere.
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Powered by Kolektaku AI subtitle engine
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
