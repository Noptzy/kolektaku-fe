"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import ReportModal from "@/components/ReportModal";
import EpisodeComments from "@/components/EpisodeComments";
import { useAuth } from "@/contexts/AuthContext";
import animeService from "@/lib/animeApi";
import meService from "@/lib/meApi";

const Player = dynamic(() => import("@/components/Player"), { ssr: false });
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || "http://localhost:3002";
const TRANSLATE_URL = process.env.NEXT_PUBLIC_TRANSLATE_URL || "http://localhost:3002";

function isIndonesianTrack(track) {
  const label = (track?.label || "").toLowerCase();
  const lang = (track?.lang || "").toLowerCase();
  return (
    label.includes("indo") ||
    label.includes("indonesia") ||
    label.includes("bahasa") ||
    lang === "id" ||
    lang === "in" ||
    lang.startsWith("id-")
  );
}

function isEnglishTrack(track) {
  const label = (track?.label || "").toLowerCase();
  const lang = (track?.lang || "").toLowerCase();
  return (
    label.includes("english") ||
    label.includes("eng") ||
    lang === "en" ||
    lang.startsWith("en-")
  );
}

const WATCH_STORAGE_KEY = "kolektaku_watch_state";

function parseVttToCues(vtt) {
  const blocks = vtt.replace(/\r\n/g, "\n").split("\n\n");
  const cues = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const timeline = lines.find((line) => line.includes("-->"));
    if (!timeline) continue;

    const startIndex = lines.indexOf(timeline);
    const textLines = lines.slice(startIndex + 1).filter((line) => !/^\d+$/.test(line));
    if (!textLines.length) continue;

    cues.push({
      timestamp: timeline,
      text: textLines,
    });
  }

  return cues;
}

function buildVttFromCues(cues) {
  let out = "WEBVTT\n\n";
  cues.forEach((cue, index) => {
    out += `${index + 1}\n${cue.timestamp}\n${cue.text.join(" ")}\n\n`;
  });
  return out;
}

function normalizeSubtitleTracks(rawTracks = []) {
  return rawTracks.map((sub, index) => ({
    file: sub.file || sub.url,
    label: sub.label || sub.lang || `Track ${index + 1}`,
    lang: sub.lang || "",
    kind: sub.kind || "subtitles",
    default: Boolean(sub.default || index === 0),
  }));
}

export default function WatchEpisodePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const slug = params?.slug;
  const episodeNumber = params?.episodeNumber;
  const isPremium = true; // user?.roleId <= 2;

  const [episode, setEpisode] = useState(null);
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastWatchedEp, setLastWatchedEp] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const [playerTracks, setPlayerTracks] = useState([]);
  const [translationReady, setTranslationReady] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);

  const generatedTrackUrlsRef = useRef([]);
  const persistStateRef = useRef({
    lastTickSecond: -1,
    lastSavedSecond: -1,
    inFlight: false,
    queuedPayload: null,
  });

  // Restore last watched episode from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(WATCH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.slug === slug) {
          setLastWatchedEp(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to restore watch state:", e);
    }
  }, [slug]);

  // Save watch state to sessionStorage
  const saveWatchState = useCallback((epNum, progress = 0, quality = "auto") => {
    try {
      const state = {
        slug,
        episodeNumber: epNum,
        animeTitle: anime?.title,
        progress,
        quality,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify(state));
      setLastWatchedEp(state);
    } catch (e) {
      console.error("Failed to save watch state:", e);
    }
  }, [slug, anime]);

  const cleanupGeneratedTrackUrls = useCallback(() => {
    generatedTrackUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    generatedTrackUrlsRef.current = [];
  }, []);

  const fetchEpisode = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [result, animeResult] = await Promise.all([
        animeService.getEpisodeStream(slug, episodeNumber),
        animeService.getAnimeBySlug(slug),
      ]);
      setEpisode(result.data || result);
      setAnime(animeResult.data || animeResult);
      persistStateRef.current.lastTickSecond = -1;
      persistStateRef.current.lastSavedSecond = -1;
      persistStateRef.current.queuedPayload = null;
    } catch (fetchError) {
      console.error("Failed to fetch episode:", fetchError);
      setError("Gagal memuat episode. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [slug, episodeNumber]);

  useEffect(() => {
    if (slug && episodeNumber && !authLoading) {
      fetchEpisode();
    }
  }, [slug, episodeNumber, fetchEpisode, authLoading]);

  useEffect(() => {
    return () => {
      cleanupGeneratedTrackUrls();
    };
  }, [cleanupGeneratedTrackUrls]);

  const generateAiIndonesianTrack = useCallback(async (sourceTrackFile) => {
    try {
      const sourceUrl = sourceTrackFile.startsWith("http")
        ? `${PROXY_URL}/proxy?url=${encodeURIComponent(sourceTrackFile)}`
        : sourceTrackFile;

      const subtitleResponse = await fetch(sourceUrl);
      if (!subtitleResponse.ok) {
        return null;
      }

      const subtitleText = await subtitleResponse.text();
      const cues = parseVttToCues(subtitleText);
      if (!cues.length) {
        return null;
      }

      const translatedCues = [...cues];
      const batchSize = 40;

      for (let offset = 0; offset < translatedCues.length; offset += batchSize) {
        const batch = translatedCues.slice(offset, offset + batchSize);
        const textBlock = batch
          .map((cue, index) => `[${index}] ${cue.text.join(" ").replace(/<[^>]*>/g, "").trim()}`)
          .join("\n");

        const translateResponse = await fetch(`${TRANSLATE_URL}/translate-google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textBlock, from: "en", to: "id" }),
        });

        if (!translateResponse.ok) {
          continue;
        }

        const translateData = await translateResponse.json();
        const translatedLines = (translateData?.text || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        batch.forEach((cue, index) => {
          let match = translatedLines.find((line) => line.includes(`[${index}]`));
          if (!match && translatedLines[index]) {
            match = translatedLines[index];
          }

          if (!match) {
            return;
          }

          const translated = match.replace(/\[\d+\]\s*/, "").trim();
          if (!translated) {
            return;
          }

          translatedCues[offset + index] = {
            ...cue,
            text: [translated],
          };
        });
      }

      const aiVtt = buildVttFromCues(translatedCues);
      const aiBlob = new Blob([aiVtt], { type: "text/vtt" });
      const aiUrl = URL.createObjectURL(aiBlob);
      generatedTrackUrlsRef.current.push(aiUrl);

      return {
        file: aiUrl,
        label: "Indonesian (Kolektaku AI)",
        lang: "id",
        kind: "subtitles",
        default: true,
      };
    } catch (translationError) {
      console.error("Failed to generate AI Indonesian subtitle:", translationError);
      return null;
    }
  }, []);

  useEffect(() => {
    const streamInfo = episode?.stream?.data || episode?.stream || null;
    const rawTracks = streamInfo?.tracks || episode?.subtitles || episode?.tracks || [];
    const baseTracks = normalizeSubtitleTracks(rawTracks);
    cleanupGeneratedTrackUrls();

    if (!baseTracks.length) {
      setPlayerTracks([]);
      setTranslationReady(true);
      setIsTranslating(false);
      return;
    }

    let cancelled = false;
    const withDefaultOrdering = (tracks, defaultIndex = 0) =>
      tracks.map((track, index) => ({
        ...track,
        default: index === defaultIndex,
      }));

    const setupTracks = async () => {
      const nativeIndoIndex = baseTracks.findIndex(isIndonesianTrack);
      if (nativeIndoIndex >= 0) {
        setPlayerTracks(withDefaultOrdering(baseTracks, nativeIndoIndex));
        setTranslationReady(true);
        setIsTranslating(false);
        return;
      }

      const englishTrack = baseTracks.find(isEnglishTrack);
      if (!englishTrack?.file) {
        setPlayerTracks(withDefaultOrdering(baseTracks, 0));
        setTranslationReady(true);
        setIsTranslating(false);
        return;
      }

      setPlayerTracks(withDefaultOrdering(baseTracks, 0));
      setTranslationReady(false);
      setIsTranslating(true);

      const aiTrack = await generateAiIndonesianTrack(englishTrack.file);
      if (cancelled) {
        return;
      }

      if (aiTrack) {
        setPlayerTracks(withDefaultOrdering([aiTrack, ...baseTracks], 0));
      }

      setTranslationReady(true);
      setIsTranslating(false);
    };

    setupTracks();
    return () => {
      cancelled = true;
    };
  }, [episode, cleanupGeneratedTrackUrls, generateAiIndonesianTrack]);

  const persistWatchHistory = useCallback(
    async (watchTimeSeconds, isCompleted = false, force = false) => {
      const episodeId = episode?.episode?.id || episode?.id;
      if (!episodeId || !user) {
        return;
      }

      const second = Math.max(0, Math.floor(watchTimeSeconds));
      const state = persistStateRef.current;

      // Save to sessionStorage for quick restore
      saveWatchState(parseFloat(episodeNumber), second);

      if (!force && second === state.lastSavedSecond) {
        return;
      }

      const payload = {
        episodeId,
        watchTimeSeconds: second,
        isCompleted: Boolean(isCompleted),
      };

      if (state.inFlight) {
        state.queuedPayload = payload;
        return;
      }

      state.inFlight = true;
      state.lastSavedSecond = second;

      try {
        await meService.saveWatchHistory(payload);
      } catch (saveError) {
        console.error("Failed to save watch history:", saveError);
      } finally {
        state.inFlight = false;
        const queued = state.queuedPayload;
        state.queuedPayload = null;

        if (queued) {
          const shouldForce = queued.isCompleted || queued.watchTimeSeconds > state.lastSavedSecond;
          setTimeout(() => {
            void persistWatchHistory(queued.watchTimeSeconds, queued.isCompleted, shouldForce);
          }, 0);
        }
      }
    },
    [episode, episodeNumber, saveWatchState],
  );

  const handlePlayerTimeUpdate = useCallback(
    (time, duration) => {
      const second = Math.max(0, Math.floor(time));
      if (second === persistStateRef.current.lastTickSecond) {
        return;
      }

      persistStateRef.current.lastTickSecond = second;
      const isCompleted = Number.isFinite(duration) && duration > 0
        ? second >= Math.floor(duration) - 1
        : false;

      void persistWatchHistory(second, isCompleted, isCompleted);
    },
    [persistWatchHistory],
  );

  const handlePlayerEnded = useCallback(
    (time) => {
      const second = Math.max(
        persistStateRef.current.lastTickSecond,
        Math.floor(Number.isFinite(time) ? time : 0),
      );
      void persistWatchHistory(second, true, true);
    },
    [persistWatchHistory],
  );

  const handleNextEpisode = useCallback(() => {
    const nextEp = parseFloat(episodeNumber) + 1;
    router.push(`/anime/${slug}/watch/${nextEp}`);
  }, [router, slug, episodeNumber]);

  const streamInfo = useMemo(() => episode?.stream?.data || episode?.stream || null, [episode]);
  const streamSources = useMemo(() => {
    const rawSources = streamInfo?.sources || episode?.streams || episode?.sources || [];
    return rawSources.map((source) => ({
      ...source,
      type: source.type || source.streamType || null,
      url: source.url || source.file || source.urlSource || null,
      iframe: source.iframe || null,
    }));
  }, [streamInfo, episode]);
  const hlsSource = streamSources.find(
    (source) => source.url && (source.url.includes(".m3u8") || source.type === "hls"),
  );
  const videoSource = hlsSource || streamSources[0];

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-30" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--accent)]/30 bg-[var(--bg-card)]">
              <span className="text-3xl">🔒</span>
            </div>
          </div>
          <p className="mt-6 text-lg font-medium text-[var(--text-primary)]">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-30" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--accent)]/30 bg-[var(--bg-card)]">
              <span className="text-3xl">🎬</span>
            </div>
          </div>
          <p className="mt-6 text-lg font-medium text-[var(--text-primary)]">Loading episode...</p>
        </div>
      </div>
    );
  }

  if (error || (!episode && streamSources.length === 0)) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <Navbar />
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6">
          <div className="max-w-md rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-8 text-center backdrop-blur-xl">
            <span className="text-5xl">😔</span>
            <p className="mt-4 text-lg font-medium text-[var(--danger)]">{error || "Episode tidak ditemukan"}</p>
            <button
              type="button"
              onClick={() => router.push(`/anime/${slug}`)}
              className="mt-6 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            >
              ← Kembali ke Detail Anime
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push(`/anime/${slug}`)}
            className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <title>Back icon</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Detail Anime
          </button>

          {/* Last Watched Button */}
          {lastWatchedEp && lastWatchedEp.episodeNumber !== parseFloat(episodeNumber) && (
            <button
              type="button"
              onClick={() => router.push(`/anime/${slug}/watch/${lastWatchedEp.episodeNumber}`)}
              className="flex items-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent)]/20"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Last: Ep {lastWatchedEp.episodeNumber}
              {lastWatchedEp.progress > 0 && (
                <span className="text-xs opacity-70">({Math.floor(lastWatchedEp.progress / 60)}m {Math.round(lastWatchedEp.progress % 60)}s)</span>
              )}
            </button>
          )}
        </div>

        <div className="relative mb-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          {videoSource?.url ? (
            <Player
              src={videoSource.url}
              tracks={playerTracks}
              intro={streamInfo?.intro || episode?.intro}
              outro={streamInfo?.outro || episode?.outro}
              onTimeUpdate={handlePlayerTimeUpdate}
              onEnded={handlePlayerEnded}
              waitingForTranslation={!translationReady || isTranslating}
              onNextEpisode={handleNextEpisode}
              isPremium={isPremium}
            />
          ) : videoSource?.iframe ? (
            <div className="aspect-video w-full">
              <iframe
                src={videoSource.iframe}
                className="h-full w-full"
                frameBorder="0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title="Episode Player"
              />
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-[var(--bg-input)]">
              <div className="text-center">
                <span className="text-6xl">🎬</span>
                <p className="mt-4 text-lg text-[var(--text-tertiary)]">No video source available</p>
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold">
                  <span className="text-[var(--accent)]">Episode {episodeNumber}</span>
                  {(episode?.episode?.title || episode?.title) && (
                    <span className="ml-2 text-[var(--text-secondary)]">- {episode?.episode?.title || episode?.title}</span>
                  )}
                </h1>
                {anime && (
                  <p className="mt-1 text-sm text-[var(--text-tertiary)]">{anime.title}</p>
                )}
              </div>

              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      document.dispatchEvent(new CustomEvent('open-login-modal'));
                      return;
                    }
                    setShowReportModal(true);
                  }}
                  className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-1.5 text-xs font-bold text-[var(--danger)] transition hover:bg-[var(--danger)]/20 flex items-center gap-1"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  Lapor
                </button>
                <div
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    isPremium
                      ? "border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-tertiary)]"
                  }`}
                >
                  {isPremium ? "💎 1080p" : "🎞 720p Max"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
              <button
                type="button"
                onClick={() => {
                  const prevEp = parseFloat(episodeNumber) - 1;
                  if (prevEp > 0) router.push(`/anime/${slug}/watch/${prevEp}`);
                }}
                disabled={parseFloat(episodeNumber) <= 1}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/5 hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <title>Previous icon</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <button
                type="button"
                onClick={() => router.push(`/anime/${slug}`)}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-hover)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <title>List icon</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Episode List
              </button>

              <button
                type="button"
                onClick={handleNextEpisode}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/5 hover:text-[var(--accent)]"
              >
                Next
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <title>Next icon</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <span className="text-xl">📺</span>
            Tentang Episode Ini
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard icon="🎬" label="Episode" value={`#${episodeNumber}`} />
            <InfoCard icon="📀" label="Kualitas" value={isPremium ? "FHD 1080p" : "HD 720p"} />
            <InfoCard icon="🧭" label="Subtitle" value="Bahasa Indonesia otomatis" />
          </div>
        </div>

        <div className="mt-8">
          <EpisodeComments episodeId={episode?.episode?.id || episode?.id} />
        </div>
      </main>

      <footer className="mt-12 border-t border-[var(--border)] bg-[var(--bg-secondary)] py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-[var(--text-tertiary)]">
          <p>© 2026 Kolektaku. Made with ❤️ for anime lovers</p>
        </div>
      </footer>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        episodeId={episode?.episode?.id || episode?.id}
        episodeTitle={(episode?.episode?.title || episode?.title) || `Episode ${episodeNumber}`}
      />
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-4 transition-colors hover:border-[var(--accent)]/20 hover:bg-[var(--accent)]/5">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">{label}</p>
        <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}
