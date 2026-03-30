"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import meService from "@/lib/meApi";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import ReportModal from "@/components/ReportModal";
import EpisodeComments from "@/components/EpisodeComments";
import Swal from "sweetalert2";

const Player = dynamic(() => import("@/components/Player"), { ssr: false });

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || "http://localhost:3002";
const TRANSLATE_URL = process.env.NEXT_PUBLIC_TRANSLATE_URL || "http://localhost:3002";
const WINDOW_SIZE = 300; // 5 min translation windows

function parseTime(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  if (parts.length === 3) {
    const sec = parts[2].split(".");
    return (
      parseInt(parts[0], 10) * 3600 +
      parseInt(parts[1], 10) * 60 +
      parseInt(sec[0] || "0", 10)
    );
  }
  if (parts.length === 2) {
    const sec = parts[1].split(".");
    return parseInt(parts[0], 10) * 60 + parseInt(sec[0] || "0", 10);
  }
  return 0;
}

function generateVTTString(cuesList) {
  let output = "WEBVTT\n\n";
  cuesList.forEach((c, idx) => {
    output += `${idx + 1}\n${c.timestamp}\n${c.text.join(" ")}\n\n`;
  });
  return output;
}

function formatResumeTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getWatchHistoryRows(response) {
  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

function getTotalPages(response, fallbackPage) {
  const totalPages = Number(response?.data?.totalPages);
  if (Number.isFinite(totalPages) && totalPages > 0) {
    return totalPages;
  }

  const total = Number(response?.data?.total);
  const limit = Number(response?.data?.limit);
  if (Number.isFinite(total) && Number.isFinite(limit) && limit > 0) {
    return Math.max(1, Math.ceil(total / limit));
  }

  return fallbackPage;
}

export default function EpisodeWatchPage({ params }) {
  const { slug, episodeNumber } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isPremium = user?.roleId <= 2;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationReady, setTranslationReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [startAtSeconds, setStartAtSeconds] = useState(0);
  const [resumeCandidateSeconds, setResumeCandidateSeconds] = useState(0);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    setStartAtSeconds(0);
    setResumeCandidateSeconds(0);
    setShowResumeModal(false);

    const episodeId = data?.episode?.id;
    if (!episodeId || !user?.id) {
      return;
    }

    let cancelled = false;

    const checkResumeProgress = async () => {
      try {
        const response = await meService.getWatchHistoryByEpisode(episodeId);
        const watchHistory = response?.data;

        if (cancelled || !watchHistory) {
          return;
        }

        const rawResumeSeconds = Number(watchHistory.watchTimeSeconds || 0);
        const resumeSeconds = Number.isFinite(rawResumeSeconds)
          ? Math.max(0, Math.floor(rawResumeSeconds))
          : 0;

        // Don't show resume modal if watched less than 30s or already completed
        if (resumeSeconds <= 30 || watchHistory.isCompleted) {
          return;
        }

        setResumeCandidateSeconds(resumeSeconds);
        setShowResumeModal(true);
      } catch (historyError) {
        console.error("Failed to check watch history for resume modal:", historyError);
      }
    };

    void checkResumeProgress();

    return () => {
      cancelled = true;
    };
  }, [data?.episode?.id, user?.id]);

  const handleResumeFromLastMinute = useCallback(() => {
    setStartAtSeconds(resumeCandidateSeconds);
    setShowResumeModal(false);
  }, [resumeCandidateSeconds]);

  const handleStartFromBeginning = useCallback(() => {
    setStartAtSeconds(0);
    setShowResumeModal(false);
  }, []);

  // Expanded Episode List States
  const [episodeRange, setEpisodeRange] = useState(0);
  const [sortOrder, setSortOrder] = useState("desc"); // match detail page default

  // Set initial episode range based on current episode
  useEffect(() => {
    if (episodes.length > 0 && typeof episodeNumber !== "undefined") {
      const epNum = parseFloat(episodeNumber);
      const chunkIndex = Math.floor((epNum - 1) / 50);
      if (chunkIndex >= 0 && chunkIndex < Math.ceil(episodes.length / 50)) {
        setEpisodeRange(chunkIndex);
      }
    }
  }, [episodeNumber, episodes]);

  // Translation refs
  const translationStartedRef = useRef(false);
  const currentCuesRef = useRef([]);
  const translatedCueIndicesRef = useRef(new Set());
  const translatingWindowRef = useRef(-1);
  const lastHandledWindowRef = useRef(-1);
  const currentTranslateControllerRef = useRef(null);
  const nextWindowRef = useRef(0);
  const watchHistoryRef = useRef({
    lastTickSecond: -1,
    lastSavedSecond: -1,
    inFlight: false,
    queuedPayload: null,
  });

  // ─── On-demand windowed translation ───────────────────────────
  const translateOnDemand = useCallback(async (currentTime) => {
    if (!translationStartedRef.current) return;

    const cues = currentCuesRef.current;
    if (!cues || cues.length === 0) return;

    nextWindowRef.current = Math.floor(currentTime / WINDOW_SIZE) * WINDOW_SIZE;
    const windowStart = nextWindowRef.current;
    const windowEnd = windowStart + WINDOW_SIZE;

    const cuesToTranslateIndices = [];
    for (let i = 0; i < cues.length; i++) {
      const cueTime = parseTime(cues[i].timestamp.split(" --> ")[0]);
      if (
        cueTime >= windowStart &&
        cueTime < windowEnd &&
        !translatedCueIndicesRef.current.has(i)
      ) {
        cuesToTranslateIndices.push(i);
      }
    }

    if (cuesToTranslateIndices.length === 0) {
      nextWindowRef.current = windowEnd;
      setTranslationReady(true);
      const hasMore = cues.some(
        (c) => parseTime(c.timestamp.split(" --> ")[0]) >= windowEnd,
      );
      if (hasMore) setTimeout(() => translateOnDemand(windowEnd), 100);
      return;
    }

    translatingWindowRef.current = windowStart;
    setIsTranslating(true);

    const abortController = new AbortController();
    currentTranslateControllerRef.current = abortController;

    const batchData = cuesToTranslateIndices.map((i) => ({
      index: i,
      text: cues[i].text,
    }));
    const stripHtml = (str) => str.replace(/<[^>]*>/g, "").trim();
    const textBlock = batchData
      .map((c, idx) => `[${idx}] ${stripHtml(c.text.join(" "))}`)
      .join("\n");

    try {
      const response = await fetch(`${TRANSLATE_URL}/translate-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textBlock, from: "en", to: "id" }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        setIsTranslating(false);
        return;
      }

      const resData = await response.json();
      const translatedLines = resData.text
        .split("\n")
        .filter((l) => l.trim() !== "");

      let updatedCount = 0;
      batchData.forEach((item, idx) => {
        let match = translatedLines.find((l) => l.includes(`[${idx}]`));
        if (!match && translatedLines[idx]) match = translatedLines[idx];

        if (match) {
          let transText = match.replace(/\[\d+\]\s*/, "").trim();
          if (transText.startsWith(".") || transText.startsWith("-")) {
            transText = transText.replace(/^[.\-\s]+/, "");
          }
          if (transText && transText !== item.text.join(" ")) {
            cues[item.index].text = [transText];
            translatedCueIndicesRef.current.add(item.index);
            updatedCount++;
          }
        }
      });

      if (updatedCount > 0) {
        const newBlob = new Blob([generateVTTString(cues)], {
          type: "text/vtt",
        });
        const newUrl = URL.createObjectURL(newBlob);

        setTracks((prev) => {
          const others = prev.filter((t) => !t.label.includes("Kolektaku AI"));
          return [
            ...others,
            {
              file: newUrl,
              label: "Indonesian (Kolektaku AI)",
              kind: "subtitles",
              default: true,
            },
          ];
        });
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      console.error("Translation error:", e);
    }

    if (translatingWindowRef.current === windowStart)
      translatingWindowRef.current = -1;
    if (currentTranslateControllerRef.current === abortController) {
      currentTranslateControllerRef.current = null;
    }

    setIsTranslating(false);
    setTranslationReady(true);
    nextWindowRef.current = windowEnd;

    // Pre-fetch next window
    const hasMoreCues = cues.some(
      (c) => parseTime(c.timestamp.split(" --> ")[0]) >= windowEnd,
    );
    if (hasMoreCues) {
      setTimeout(() => translateOnDemand(windowEnd), 200);
    }
  }, []);

  const persistWatchHistory = useCallback(
    async (watchTimeSeconds, isCompleted = false, force = false) => {
      const episodeId = data?.episode?.id;
      if (!episodeId || !user) return;

      const second = Math.max(0, Math.floor(watchTimeSeconds));
      const state = watchHistoryRef.current;

      if (!force && second === state.lastSavedSecond) return;

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
        if (saveError.response?.status === 403) {
          if (!window._historyLimitShown) {
            window._historyLimitShown = true;
            Swal.fire({
              icon: "warning",
              title: "Limit History Tercapai",
              text: saveError.response.data.message || "Silakan upgrade ke Premium untuk menonton lebih dari 30 judul anime.",
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
          }
        } else {
          console.error("Failed to save watch history:", saveError);
        }
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
    [data?.episode?.id, router],
  );

  // ─── Time update handler (called from Player) ────────────────
  const handleTimeUpdate = useCallback(
    (time, duration) => {
      const currentSecond = Math.max(0, Math.floor(time));
      if (currentSecond !== watchHistoryRef.current.lastTickSecond) {
        watchHistoryRef.current.lastTickSecond = currentSecond;
        const isCompleted = Number.isFinite(duration) && duration > 0
          ? currentSecond >= Math.floor(duration) - 1
          : false;
        void persistWatchHistory(currentSecond, isCompleted, isCompleted);
      }

      if (!translationStartedRef.current) return;

      const currentWindow = Math.floor(time / WINDOW_SIZE) * WINDOW_SIZE;
      const cues = currentCuesRef.current;
      if (!cues || cues.length === 0) return;
      if (lastHandledWindowRef.current === currentWindow) return;

      let needsTranslation = false;
      for (let i = 0; i < cues.length; i++) {
        const cueTime = parseTime(cues[i].timestamp.split(" --> ")[0]);
        if (
          cueTime >= currentWindow &&
          cueTime < currentWindow + WINDOW_SIZE &&
          !translatedCueIndicesRef.current.has(i)
        ) {
          needsTranslation = true;
          break;
        }
      }

      if (!needsTranslation) {
        lastHandledWindowRef.current = currentWindow;
        setTranslationReady(true);
        return;
      }

      if (translatingWindowRef.current === currentWindow) return;

      // Abort old translation & prioritize current window
      if (currentTranslateControllerRef.current) {
        currentTranslateControllerRef.current.abort();
        currentTranslateControllerRef.current = null;
      }

      lastHandledWindowRef.current = currentWindow;
      setTranslationReady(false);
      translateOnDemand(time);
    },
    [translateOnDemand, persistWatchHistory],
  );

  const handlePlaybackEnded = useCallback(
    (time, duration) => {
      const fallbackSecond = watchHistoryRef.current.lastTickSecond;
      const finalSecond = Math.max(
        fallbackSecond,
        Math.floor(Number.isFinite(duration) ? duration : Number.isFinite(time) ? time : 0),
      );
      void persistWatchHistory(finalSecond, true, true);
    },
    [persistWatchHistory],
  );

  // ─── Prepare translation (parse VTT, start first window) ─────
  const prepareTranslation = useCallback(
    async (vttUrl) => {
      try {
        const response = await fetch(vttUrl);
        const text = await response.text();

        const lines = text.split("\n");
        const cues = [];
        let currentCue = null;
        const timestampRegex =
          /(?:\d{2}:)?\d{2}:\d{2}\.\d{3} --> (?:\d{2}:)?\d{2}:\d{2}\.\d{3}/;

        lines.forEach((line) => {
          const trimLine = line.trim();
          if (trimLine.match(timestampRegex)) {
            if (currentCue) cues.push(currentCue);
            currentCue = { timestamp: trimLine, text: [] };
          } else if (
            currentCue &&
            trimLine &&
            !trimLine.match(/^\d+$/) &&
            trimLine !== "WEBVTT"
          ) {
            currentCue.text.push(trimLine);
          }
        });
        if (currentCue) cues.push(currentCue);

        currentCuesRef.current = JSON.parse(JSON.stringify(cues));
        translatedCueIndicesRef.current = new Set();

        // Create initial track with English content
        const initialBlob = new Blob(
          [generateVTTString(currentCuesRef.current)],
          { type: "text/vtt" },
        );
        const initialUrl = URL.createObjectURL(initialBlob);
        setTracks((prev) => {
          const others = prev.filter((t) => !t.label.includes("Indonesian"));
          return [
            ...others,
            {
              file: initialUrl,
              label: "Indonesian (Kolektaku AI)",
              kind: "subtitles",
              default: true,
            },
          ];
        });

        translationStartedRef.current = true;
        setTranslationReady(false);
        await translateOnDemand(0);
        setTranslationReady(true);
      } catch (e) {
        console.error("Subtitle prep failed:", e);
        setTranslationReady(true);
      }
    },
    [translateOnDemand],
  );

  // ─── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      translationStartedRef.current = false;
      if (currentTranslateControllerRef.current) {
        currentTranslateControllerRef.current.abort();
      }
    };
  }, []);

  // ─── Fetch episode data ──────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      // Reset translation state
      translationStartedRef.current = false;
      currentCuesRef.current = [];
      translatedCueIndicesRef.current = new Set();
      translatingWindowRef.current = -1;
      lastHandledWindowRef.current = -1;
      nextWindowRef.current = 0;
      watchHistoryRef.current.lastTickSecond = -1;
      watchHistoryRef.current.lastSavedSecond = -1;
      watchHistoryRef.current.queuedPayload = null;

      try {
        const [streamRes, epsRes] = await Promise.all([
          api.get(`/api/anime/${slug}/eps/${episodeNumber}`),
          api.get(`/api/anime/${slug}/eps`),
        ]);

        const epData = streamRes.data.data;
        setData(epData);
        setEpisodes(epsRes.data.data || []);

        // Setup tracks
        const streamInfo = epData?.stream?.data || epData?.stream;
        let rawTracks = streamInfo?.tracks || [];

        // Check if Indonesian subtitle exists, if so set it as default
        let hasIndonesian = false;
        rawTracks = rawTracks.map((t) => {
          const isIndo = Boolean(
            t.label &&
            (t.label.toLowerCase().includes("indone") ||
              t.label.toLowerCase().includes("bahasa")),
          );
          if (isIndo) hasIndonesian = true;
          return {
            ...t,
            default: isIndo,
          };
        });

        setTracks(rawTracks);

        // If not found, trigger translation from English
        if (!hasIndonesian) {
          const englishTrack = rawTracks.find(
            (t) =>
              t.label &&
              (t.label.toLowerCase().includes("english") ||
                t.label.toLowerCase().includes("eng")),
          );
          if (englishTrack) {
            prepareTranslation(englishTrack.file);
          } else {
            // No subtitle to translate — unblock the player
            setTranslationReady(true);
          }
        } else {
          // Native Indonesian subtitle found — no translation needed, unblock
          setTranslationReady(true);
        }
      } catch (err) {
        console.error("Failed to fetch episode:", err);
        setError("Failed to load episode");
        setTranslationReady(true); // Unblock player on error
      } finally {
        setLoading(false);
      }
    }
    
    if (!authLoading) {
      fetchData();
    }
  }, [slug, episodeNumber, prepareTranslation, authLoading]);

  // ─── Derived state ───────────────────────────────────────────
  const streamInfo = data?.stream?.data || data?.stream;
  const hlsUrl = streamInfo?.sources?.find((s) => s.type === "hls")?.file;
  const intro = streamInfo?.intro;
  const outro = streamInfo?.outro;
  const episodeTitle = data?.episode?.title;
  const currentEpNum = parseFloat(episodeNumber);

  const sortedEps = [...episodes].sort(
    (a, b) => parseFloat(a.episodeNumber) - parseFloat(b.episodeNumber),
  );
  const currentIdx = sortedEps.findIndex(
    (e) => parseFloat(e.episodeNumber) === currentEpNum,
  );
  const prevEp = currentIdx > 0 ? sortedEps[currentIdx - 1] : null;
  const nextEp =
    currentIdx >= 0 && currentIdx < sortedEps.length - 1
      ? sortedEps[currentIdx + 1]
      : null;

  const goToEpisode = (epNum) => router.push(`/anime/${slug}/eps/${epNum}`);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 pb-16">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <button
            type="button"
            onClick={() => router.push("/anime")}
            className="hover:text-[var(--accent)] transition"
          >
            Anime
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => router.push(`/anime/${slug}`)}
            className="hover:text-[var(--accent)] transition truncate max-w-[200px]"
          >
            {slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-medium">
            Episode {episodeNumber}
          </span>
        </nav>

        {/* Loading */}
        {(loading || authLoading) && (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              {authLoading ? "Memeriksa sesi..." : "Loading stream..."}
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-40 text-center">
            <svg
              aria-hidden="true"
              className="h-16 w-16 text-[var(--danger)] mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-[var(--text-primary)] font-medium">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition"
            >
              Try again
            </button>
          </div>
        )}

        {/* Player + Info */}
        {!loading && !authLoading && !error && data && (
          <>
            {/* Episode Title & Actions */}
            <div className="mb-4 flex items-start justify-between">
              <h1 className="text-xl md:text-2xl font-bold flex items-center flex-wrap gap-2 text-[var(--text-primary)]">
                <span className="text-[var(--accent)]">EP {episodeNumber}</span>
                {episodeTitle || `Episode ${episodeNumber}`}
              </h1>
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent('open-login-modal'));
                      }
                      return;
                    }
                    setShowReportModal(true);
                  }}
                  className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-1.5 text-xs font-bold text-[var(--danger)] transition hover:bg-[var(--danger)]/20 flex items-center gap-1 shrink-0"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  Lapor
                </button>
              </div>
            </div>

            {/* Video Player */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl border border-[var(--border)] bg-[#000]">
              {hlsUrl ? (
                <Player
                  src={hlsUrl}
                  tracks={tracks}
                  intro={intro}
                  outro={outro}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handlePlaybackEnded}
                  waitingForTranslation={!translationReady}
                  onNextEpisode={
                    nextEp ? () => goToEpisode(nextEp.episodeNumber) : undefined
                  }
                  isPremium={isPremium}
                  startAtSeconds={startAtSeconds}
                />
              ) : (
                <div className="w-full aspect-video flex flex-col items-center justify-center bg-[var(--bg-card)]">
                  <svg
                    aria-hidden="true"
                    className="h-12 w-12 text-[var(--text-tertiary)] mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <p className="text-[var(--text-secondary)] text-sm font-medium">
                    {data?.stream?.error
                      ? data.stream.message
                      : "Stream not available"}
                  </p>
                </div>
              )}

              {showResumeModal && hlsUrl && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                  <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl" style={{ animation: 'bounceIn 0.3s ease' }}>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">Lanjut Nonton</p>
                    <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">Mau lanjut dari menit terakhir?</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Episode ini terakhir kamu tonton di <span className="font-semibold text-[var(--text-primary)]">{formatResumeTime(resumeCandidateSeconds)}</span>.
                    </p>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleResumeFromLastMinute}
                        className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
                      >
                        Lanjutkan dari {formatResumeTime(resumeCandidateSeconds)}
                      </button>
                      <button
                        type="button"
                        onClick={handleStartFromBeginning}
                        className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)]"
                      >
                        Mulai dari awal
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex w-full md:w-auto gap-4">
                {prevEp ? (
                  <button
                    type="button"
                    onClick={() => goToEpisode(prevEp.episodeNumber)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    EP {prevEp.episodeNumber}
                  </button>
                ) : (
                  <div className="flex-1 md:flex-none" />
                )}

                {nextEp ? (
                  <button
                    type="button"
                    onClick={() => goToEpisode(nextEp.episodeNumber)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--accent-muted)] transition hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)]"
                  >
                    Next EP
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ) : (
                  <div className="flex-1 md:flex-none" />
                )}
              </div>
            </div>

            {/* Mobile Subtitle Notice */}
            {isMobile && (
              <div className="mt-8 flex items-center justify-center">
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-3 shadow-lg">
                  <span className="text-xl">📱</span>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Masuk mode{" "}
                    <span className="text-[var(--accent)]">Fullscreen</span>{" "}
                    untuk mengatur pilihan subtitle
                  </p>
                </div>
              </div>
            )}

            {/* Episode Selector (Detailed List) */}
            <div className="mt-12 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  Episodes
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--text-secondary)] font-medium">
                    {episodes.length} Episodes
                  </span>
                  {episodes.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSortOrder((s) => (s === "asc" ? "desc" : "asc"))
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                    >
                      <svg
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      {sortOrder === "desc" ? "Newest" : "Oldest"}
                    </button>
                  )}
                </div>
              </div>

              {/* Episode chunks calc */}
              {(() => {
                const CHUNK_SIZE = 50;
                const sortedEpsForList = [...episodes].sort((a, b) =>
                  sortOrder === "asc"
                    ? parseFloat(a.episodeNumber) - parseFloat(b.episodeNumber)
                    : parseFloat(b.episodeNumber) - parseFloat(a.episodeNumber),
                );
                const totalChunks = Math.ceil(episodes.length / CHUNK_SIZE);
                const episodeChunks = Array.from(
                  { length: totalChunks },
                  (_, i) => {
                    const start = i * CHUNK_SIZE + 1;
                    const end = Math.min((i + 1) * CHUNK_SIZE, episodes.length);
                    return { label: `${start}-${end}`, start, end };
                  },
                );
                const currentChunk =
                  episodeChunks[episodeRange] || episodeChunks[0];
                const displayedEps = currentChunk
                  ? sortedEpsForList.filter(
                      (ep) =>
                        parseFloat(ep.episodeNumber) >= currentChunk.start &&
                        parseFloat(ep.episodeNumber) <= currentChunk.end,
                    )
                  : sortedEpsForList;

                return (
                  <>
                    {/* Episode Range Tabs */}
                    {totalChunks > 1 && (
                      <div className="flex items-center gap-2 mb-4 relative w-full">
                        <button type="button" className="ep-prev-btn shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all disabled:opacity-30 z-10">
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
                              <SwiperSlide key={chunk.label} className="!w-auto">
                                <button
                                  type="button"
                                  onClick={() => setEpisodeRange(idx)}
                                  className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                    episodeRange === idx
                                      ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-muted)]"
                                      : "border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                                  }`}
                                >
                                  {chunk.label}
                                </button>
                              </SwiperSlide>
                            ))}
                          </Swiper>
                        </div>
          
                        <button type="button" className="ep-next-btn shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all disabled:opacity-30 z-10">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                    )}

                    {/* List */}
                    <div
                      key={`${episodeRange}-${sortOrder}`}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border)] overflow-hidden animate-fade-in-up"
                    >
                      {displayedEps.map((ep) => {
                        const isActive =
                          parseFloat(ep.episodeNumber) === currentEpNum;
                        return (
                          <button
                            type="button"
                            key={ep.episodeNumber}
                            onClick={() =>
                              !isActive && goToEpisode(ep.episodeNumber)
                            }
                            className={`group w-full flex items-center gap-4 px-4 py-3 text-left transition-all hover:bg-[var(--bg-card-hover)] ${isActive ? "bg-[var(--bg-card-hover)]" : ""}`}
                          >
                            {/* Episode number badge */}
                            <span
                              className={`shrink-0 flex items-center justify-center h-9 w-14 rounded-lg text-xs font-bold transition-colors ${isActive ? "bg-[var(--accent)] text-white" : "bg-[var(--accent-muted)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white"}`}
                            >
                              EP {ep.episodeNumber}
                            </span>

                            {/* Title */}
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <p
                                className={`text-sm font-medium truncate transition-colors ${isActive ? "text-[var(--accent)]" : "text-[var(--text-primary)] group-hover:text-[var(--accent)]"}`}
                              >
                                {ep.title || `Episode ${ep.episodeNumber}`}
                              </p>
                              {isActive && (
                                <span className="shrink-0 flex items-center h-5 px-2 rounded-full bg-[var(--accent)]/20 text-[10px] uppercase font-bold text-[var(--accent)]">
                                  Playing
                                </span>
                              )}
                            </div>

                            {/* Sub badge */}
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                              Sub
                            </span>

                            {/* Play icon */}
                            <svg
                              aria-hidden="true"
                              className={`shrink-0 h-4 w-4 transition-colors ${isActive ? "text-[var(--accent)] animate-pulse" : "text-[var(--text-tertiary)] group-hover:text-[var(--accent)]"}`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Episode Comments */}
            {data?.episode?.id && (
              <div className="mt-12">
                <EpisodeComments episodeId={data.episode.id} />
              </div>
            )}
            
            {/* Report Modal */}
            {data?.episode?.id && (
              <ReportModal
                isOpen={showReportModal}
                episodeId={data.episode.id}
                episodeTitle={`EP ${episodeNumber} - ${episodeTitle || ''}`}
                onClose={() => setShowReportModal(false)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
