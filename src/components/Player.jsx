"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || "http://localhost:3002";
const SUBTITLE_STYLE_KEY = "kolektaku_subtitle_style";
const SUBTITLE_LANG_KEY = "kolektaku_subtitle_lang";

const DEFAULT_SUBTITLE_STYLE = {
  fontSize: "26",
  mobileFontSize: "16",
  color: "#ffffff",
  fontFamily: "Inter, sans-serif",
  fontWeight: "800",
  outlineStrength: "strong",
  bgOpacity: "0",
};

const FONT_OPTIONS = [
  { label: "Inter (Default)", value: "Inter, sans-serif" },
  { label: "Outfit", value: "Outfit, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Poppins", value: "Poppins, sans-serif" },
  { label: "Noto Sans", value: "'Noto Sans', sans-serif" },
  { label: "Monospace", value: "monospace" },
];

const OUTLINE_PRESETS = {
  none: "none",
  soft: "-1px -1px 0 rgba(0,0,0,0.5), 1px -1px 0 rgba(0,0,0,0.5), -1px 1px 0 rgba(0,0,0,0.5), 1px 1px 0 rgba(0,0,0,0.5)",
  strong: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0px 2px 10px rgba(0,0,0,0.8), 0px 4px 16px rgba(0,0,0,0.8)",
};

function loadSubtitleStyle() {
  if (typeof window === "undefined") return DEFAULT_SUBTITLE_STYLE;
  try {
    const saved = localStorage.getItem(SUBTITLE_STYLE_KEY);
    return saved ? { ...DEFAULT_SUBTITLE_STYLE, ...JSON.parse(saved) } : DEFAULT_SUBTITLE_STYLE;
  } catch {
    return DEFAULT_SUBTITLE_STYLE;
  }
}

function saveSubtitleStyle(style) {
  try { localStorage.setItem(SUBTITLE_STYLE_KEY, JSON.stringify(style)); } catch { }
}

function loadPreferredLang() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SUBTITLE_LANG_KEY);
}

function savePreferredLang(label) {
  if (typeof window === "undefined") return;
  if (label) localStorage.setItem(SUBTITLE_LANG_KEY, label);
  else localStorage.removeItem(SUBTITLE_LANG_KEY);
}

function buildSubtitleCSS(style, isMobile = false) {
  const bgOpacity = parseInt(style.bgOpacity || "0");
  const baseSize = isMobile ? (style.mobileFontSize || 16) : (style.fontSize || 26);

  return {
    color: style.color || "#ffffff",
    fontSize: `${baseSize}px`,
    fontFamily: style.fontFamily || "Inter, sans-serif",
    fontWeight: style.fontWeight || "800",
    textShadow: OUTLINE_PRESETS[style.outlineStrength] || OUTLINE_PRESETS.strong,
    lineHeight: "1.3",
    letterSpacing: "0.5px",
    textAlign: "center",
    backgroundColor: bgOpacity > 0 ? `rgba(0,0,0,${bgOpacity / 100})` : "transparent",
    padding: bgOpacity > 0 ? "2px 8px" : "0",
    borderRadius: bgOpacity > 0 ? "4px" : "0",
  };
}

const CDN_REFERER_MAP = [
  { pattern: /rapid-cloud\.co|rabbitstream\.net/, referer: "https://rapid-cloud.co/" },
  { pattern: /megacloud\.tv|megacloud\.blog/, referer: "https://megacloud.tv/" },
  { pattern: /cloudflarestorage|bunnycdn/, referer: "https://megacloud.tv/" },
  // Dynamic CDN hostnames from rapid-cloud ecosystem
  // These are wildcard subdomains: xxx123.live, xxx123.xyz, etc.
  { pattern: /\.\w+\d*\.(live|online|xyz|wiki|pro)/, referer: "https://rapid-cloud.co/" },
  // Fallback for direct CDN domains (haildrop77.pro, frostshine12.wiki, etc.)
  { pattern: /\.(live|online|xyz|wiki|pro)$/, referer: "https://rapid-cloud.co/" },
];

function getRefererForUrl(url) {
  for (const { pattern, referer } of CDN_REFERER_MAP) {
    if (pattern.test(url)) return referer;
  }
  return "https://megacloud.tv/"; // Default to megacloud instead of null
}

const IS_PRODUCTION = typeof window !== "undefined" && !window.location.hostname.includes("localhost");

/** Route all HLS requests through proxy server (VPS with Indonesian IPs). */
class ProxyLoader extends Hls.DefaultConfig.loader {
  constructor(config) {
    super(config);
    this._config = config;
  }

  load(context, config, callbacks) {
    const url = context.url;

    // YouTube: skip (breaks signed URLs)
    if (url.includes("googlevideo.com") || url.includes("youtube.com")) {
      super.load(context, config, callbacks);
      return;
    }

    // Route ALL requests (m3u8 + ts segments) through proxy server
    // The proxy server handles Referer injection + free proxy rotation
    const proxyUrl = `${PROXY_URL}/proxy?url=${encodeURIComponent(url)}`;
    const newContext = { ...context, url: proxyUrl };

    const newCallbacks = {
      ...callbacks,
      onSuccess: (response, stats, ctx) => {
        response.url = url;
        if (ctx) ctx.url = url;
        callbacks.onSuccess(response, stats, ctx);
      },
      onError: callbacks.onError,
      onTimeout: callbacks.onTimeout,
      onProgress: callbacks.onProgress,
    };

    super.load(newContext, config, newCallbacks);
  }
}

/** Parse VTT subtitle text into cue array */
function parseVTT(text) {
  const cues = [];
  const blocks = text.replace(/\r\n/g, "\n").split("\n\n");
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;
    const [startStr, endStr] = timeLine.split("-->");
    const start = parseTimestamp(startStr.trim());
    const end = parseTimestamp(endStr.trim());
    const textIdx = lines.indexOf(timeLine);
    const content = lines.slice(textIdx + 1).join("\n").trim();
    if (content && !isNaN(start) && !isNaN(end)) {
      cues.push({ start, end, text: content });
    }
  }
  return cues;
}

function parseTimestamp(ts) {
  const parts = ts.split(":");
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s.replace(",", "."));
  } else if (parts.length === 2) {
    const [m, s] = parts;
    return parseFloat(m) * 60 + parseFloat(s.replace(",", "."));
  }
  return parseFloat(ts.replace(",", "."));
}

function formatTime(s) {
  if (isNaN(s) || !isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
    : `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function Player({
  src,
  tracks = [],
  intro,
  outro,
  onTimeUpdate,
  onEnded,
  waitingForTranslation = false,
  onNextEpisode,
  isPremium = false,
  startAtSeconds = 0,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const hideTimerRef = useRef(null);
  const seekingRef = useRef(false);
  const waitingRef = useRef(waitingForTranslation);
  const lastClickTimeRef = useRef(0);
  const clickTimerRef = useRef(null);
  const lastAppliedStartAtRef = useRef(-1);

  // State
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Quality
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Subtitles
  const [subStyle, setSubStyle] = useState(DEFAULT_SUBTITLE_STYLE);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [activeSub, setActiveSub] = useState(null);
  const [subCues, setSubCues] = useState([]);
  const [currentCueText, setCurrentCueText] = useState("");
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [isSubtitleLoading, setIsSubtitleLoading] = useState(false);

  // Skip
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);

  // Persistence wrapper
  const handleActiveSubChange = useCallback((sub) => {
    setActiveSub(sub);
    if (sub?.label) savePreferredLang(sub.label);
    else savePreferredLang(null);
  }, []);

  // Load subtitle style from localStorage
  useEffect(() => { setSubStyle(loadSubtitleStyle()); }, []);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Keep ref in sync
  useEffect(() => { waitingRef.current = waitingForTranslation; }, [waitingForTranslation]);

  const updateStyle = useCallback((key, value) => {
    setSubStyle((prev) => {
      const next = { ...prev, [key]: value };
      saveSubtitleStyle(next);
      return next;
    });
  }, []);

  // ─── HLS Init ───────────────────────────────────────────
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (!src) {
      // No src passed — show placeholder
      console.warn("[Player] No src provided");
      return;
    }

    let hls;

    lastAppliedStartAtRef.current = -1;

    if (src.includes(".m3u8") && Hls.isSupported()) {
      console.log("[Player] HLS init with src:", src.substring(0, 80));
      hls = new Hls({
        loader: ProxyLoader,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("[Player] MANIFEST_PARSED");
        const MAX_HEIGHT = isPremium ? Infinity : 720;

        // Filter levels based on premium status
        const q = hls.levels
          .map((level, index) => ({
            label: level.height + "P",
            level: index,
            height: level.height,
          }))
          .filter((q) => q.height <= MAX_HEIGHT);

        q.unshift({ label: "Auto", level: -1 });
        setQualities(q);

        // Enforce capping for auto-resolution
        if (!isPremium) {
          const maxLevelIndex = hls.levels.reduce((acc, level, index) => {
            return level.height <= 720 ? index : acc;
          }, -1);
          hls.autoLevelCapping = maxLevelIndex;
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
        } else {
          console.warn("HLS non-fatal error:", data.details);
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      video.src = src;
    }

    return () => {
      if (hls) hls.destroy();
      hlsRef.current = null;
    };
  }, [src, isPremium]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const parsedStart = Number(startAtSeconds);
    const targetSecond = Number.isFinite(parsedStart) ? Math.max(0, Math.floor(parsedStart)) : 0;

    if (targetSecond === lastAppliedStartAtRef.current) {
      return;
    }

    const applyStartAt = () => {
      const mediaDuration = Number.isFinite(video.duration) ? Math.floor(video.duration) : 0;
      const safeSecond = mediaDuration > 0
        ? Math.min(targetSecond, Math.max(0, mediaDuration - 1))
        : targetSecond;

      video.currentTime = safeSecond;
      setCurrentTime(safeSecond);
      lastAppliedStartAtRef.current = targetSecond;
    };

    if (video.readyState >= 1) {
      applyStartAt();
      return;
    }

    video.addEventListener("loadedmetadata", applyStartAt, { once: true });
    return () => {
      video.removeEventListener("loadedmetadata", applyStartAt);
    };
  }, [src, startAtSeconds]);

  // ─── Subtitle fetch and parse ────────────────────────────
  useEffect(() => {
    if (!activeSub?.file) {
      setSubCues([]);
      setCurrentCueText("");
      return;
    }

    const isIndo = activeSub.label?.toLowerCase().includes("indo") ||
      activeSub.label?.toLowerCase().includes("indonesia");

    let cancelled = false;
    let retryCount = 0;
    const maxRetries = isIndo ? 3 : 0;

    const loadSub = async () => {
      try {
        if (isIndo) setIsSubtitleLoading(true);

        const url = activeSub.file.startsWith("http")
          ? `${PROXY_URL}/proxy?url=${encodeURIComponent(activeSub.file)}`
          : activeSub.file;

        const res = await fetch(url);
        const text = await res.text();

        // If it's AI translation, it might return empty or "translating" status if not ready
        const cues = parseVTT(text);

        if (cues.length === 0 && retryCount < maxRetries && !cancelled) {
          retryCount++;
          setTimeout(loadSub, 2000); // Wait 2s and retry
          return;
        }

        if (!cancelled) {
          setSubCues(cues);
          setIsSubtitleLoading(false);
        }
      } catch (err) {
        console.error("Failed to load subtitle:", err);
        if (!cancelled) setIsSubtitleLoading(false);
      }
    };

    loadSub();
    return () => { cancelled = true; };
  }, [activeSub]);

  // Auto-select subtitle based on preference or Indonesian default
  useEffect(() => {
    if (tracks.length > 0 && !activeSub) {
      const preferredLabel = loadPreferredLang();
      let selected = null;

      if (preferredLabel) {
        selected = tracks.find((t) => (t.label || t.lang) === preferredLabel);
      }

      if (!selected) {
        // Fallback: Indonesian
        selected = tracks.find((t) =>
        (t.label?.toLowerCase().includes("indo") ||
          t.label?.toLowerCase().includes("indonesia") ||
          t.lang?.toLowerCase().includes("id") ||
          t.lang?.toLowerCase().includes("in"))
        );
      }

      const def = selected || tracks.find((t) => t.default) || tracks[0];
      setActiveSub(def);
    }
  }, [tracks, activeSub]);

  // ─── Video event listeners ──────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = 1; // Force 100% volume on load

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeupdate = () => {
      const t = video.currentTime;
      setCurrentTime(t);
      if (onTimeUpdate) onTimeUpdate(t, video.duration);

      // Update current cue
      const cue = subCues.find((c) => t >= c.start && t <= c.end);
      setCurrentCueText(cue ? cue.text : "");

      // Intro/outro skip buttons
      if (intro && t >= intro.start && t <= intro.end) {
        setShowSkipIntro(true);
        setShowSkipOutro(false);
      } else if (outro && t >= outro.start && t <= outro.end) {
        setShowSkipIntro(false);
        setShowSkipOutro(true);
      } else {
        setShowSkipIntro(false);
        setShowSkipOutro(false);
      }
    };
    const onDurationChange = () => setDuration(video.duration);
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    const onWaiting = () => setIsBuffering(true);
    const onSeeking = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);
    const onSeeked = () => setIsBuffering(false);
    const onEndedEvent = () => {
      setPlaying(false);
      if (onEnded) onEnded(video.currentTime, video.duration);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeupdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("progress", onProgress);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("ended", onEndedEvent);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeupdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("ended", onEndedEvent);
    };
  }, [subCues, intro, outro, onTimeUpdate, onEnded]);

  // Translation gating
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (waitingForTranslation || isSubtitleLoading) {
      video.pause();
    } else if (video.paused && playing) {
      video.play().catch(() => { });
    }
  }, [waitingForTranslation, isSubtitleLoading, playing]);

  // ─── Controls auto-hide ──────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);

    const hideDelay = isMobile ? 2000 : 0;

    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 5000 + hideDelay);
  }, [isMobile]);

  useEffect(() => { resetHideTimer(); return () => clearTimeout(hideTimerRef.current); }, [resetHideTimer]);

  // ─── Actions ──────────────────────────────────────────────
  const togglePlay = () => {
    if (waitingRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => { });
    else video.pause();
  };

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoRef.current) videoRef.current.currentTime = pct * duration;
  };

  const changeVolume = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoRef.current) {
      videoRef.current.volume = pct;
      videoRef.current.muted = false;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    try {
      if (document.fullscreenElement) {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await el.requestFullscreen();
        setIsFullscreen(true);

        // Auto-rotate to landscape on mobile
        if (isMobile && screen.orientation && screen.orientation.lock) {
          try {
            await screen.orientation.lock("landscape");
          } catch (e) {
            console.warn("Orientation lock failed:", e);
          }
        }
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  };

  const handleQualityChange = (level) => {
    if (hlsRef.current) hlsRef.current.currentLevel = level;
    setCurrentQuality(level);
    setShowQualityMenu(false);
  };

  const handleSpeedChange = (rate) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  const closeAllMenus = () => {
    setShowQualityMenu(false);
    setShowSpeedMenu(false);
    setShowSubMenu(false);
  };

  const skipForward = () => { if (videoRef.current) videoRef.current.currentTime += 10; };
  const skipBackward = () => { if (videoRef.current) videoRef.current.currentTime -= 10; };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "SELECT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowRight": e.preventDefault(); skipForward(); break;
        case "ArrowLeft": e.preventDefault(); skipBackward(); break;
        case "ArrowUp": e.preventDefault(); if (videoRef.current) videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1); break;
        case "ArrowDown": e.preventDefault(); if (videoRef.current) videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1); break;
        case "f": e.preventDefault(); toggleFullscreen(); break;
        case "m": e.preventDefault(); toggleMute(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration]);

  // Fullscreen change detection
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const subCSS = buildSubtitleCSS(subStyle, isMobile);
  const currentQualityLabel = qualities.find((q) => q.level === currentQuality)?.label || "Auto";

  // Hanya tampilkan kontrol ekstra di PC atau HP pas mode Fullscreen
  const showAdvancedControls = !isMobile || isFullscreen;

  return (
    <div
      ref={containerRef}
      className="kol-player"
      onMouseMove={!isMobile ? resetHideTimer : undefined}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={(e) => {
        if (e.target !== e.currentTarget && e.target !== videoRef.current) return;

        const now = Date.now();
        const delta = now - lastClickTimeRef.current;
        lastClickTimeRef.current = now;

        if (isMobile) {
          if (delta < 300) {
            // Double tap: play/pause
            clearTimeout(clickTimerRef.current);
            togglePlay();
            closeAllMenus();
          } else {
            // Single tap: toggle menu & auto-hide
            clickTimerRef.current = setTimeout(() => {
              if (showControls) {
                setShowControls(false);
                clearTimeout(hideTimerRef.current);
              } else {
                resetHideTimer();
              }
              closeAllMenus();
            }, 300);
          }
        } else {
          // Desktop behavior
          togglePlay();
          closeAllMenus();
        }
      }}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        background: "#000",
        borderRadius: isFullscreen ? 0 : "12px",
        overflow: "hidden",
        cursor: showControls ? "default" : "none",
        userSelect: "none",
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        playsInline
        preload="auto"
      />

      {/* Custom Subtitles */}
      {currentCueText && !waitingForTranslation && (
        <div
          style={{
            position: "absolute",
            bottom: showControls ? "72px" : "24px",
            left: 0, right: 0,
            display: "flex", justifyContent: "center",
            padding: "0 24px",
            transition: "bottom 0.3s ease",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          <span
            style={subCSS}
            dangerouslySetInnerHTML={{ __html: currentCueText.replace(/\n/g, "<br/>") }}
          />
        </div>
      )}

      {/* Skip Intro Button */}
      {showSkipIntro && (
        <button
          onClick={(e) => { e.stopPropagation(); if (videoRef.current && intro) videoRef.current.currentTime = intro.end; }}
          style={{
            position: "absolute", bottom: showControls ? "80px" : "30px", right: "20px",
            zIndex: 60, padding: "8px 20px", borderRadius: "8px",
            background: "rgba(236,72,153,0.85)", backdropFilter: "blur(8px)",
            color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
            fontSize: "13px", fontWeight: 700, cursor: "pointer",
            transition: "all 0.3s ease", animation: "fadeInRight 0.3s ease",
          }}
        >
          Skip Intro ⏭
        </button>
      )}

      {/* Skip Outro / Next Episode Button */}
      {showSkipOutro && (
        <button
          onClick={(e) => { e.stopPropagation(); if (onNextEpisode) onNextEpisode(); }}
          style={{
            position: "absolute", bottom: showControls ? "80px" : "30px", right: "20px",
            zIndex: 60, padding: "8px 20px", borderRadius: "8px",
            background: "rgba(99,102,241,0.85)", backdropFilter: "blur(8px)",
            color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
            fontSize: "13px", fontWeight: 700, cursor: "pointer",
            transition: "all 0.3s ease", animation: "fadeInRight 0.3s ease",
          }}
        >
          Next Episode ⏭
        </button>
      )}

      {/* Premium Translation Overlay */}
      {(waitingForTranslation || isSubtitleLoading) && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 999,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", gap: "24px",
          transition: "all 0.4s ease",
        }}>
          <div style={{ position: "relative", width: "100px", height: "100px" }}>
            {/* Outer Glow */}
            <div style={{
              position: "absolute", inset: "-15px", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)",
              animation: "pulse 2s infinite ease-in-out"
            }} />

            {/* Rotating Rings */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: "3px solid transparent", borderTopColor: "#ec4899",
              animation: "spin 1s linear infinite"
            }} />
            <div style={{
              position: "absolute", inset: "10px", borderRadius: "50%",
              border: "2px solid transparent", borderBottomColor: "#6366f1",
              animation: "spin 1.5s linear infinite reverse"
            }} />

            {/* Center Logo/Icon */}
            <div style={{
              position: "absolute", inset: "25px", borderRadius: "50%",
              background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)",
              animation: "pulse 1.5s infinite"
            }}>
              <span style={{ fontSize: "28px", filter: "drop-shadow(0 0 10px rgba(236,72,153,0.5))" }}>🤖</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", textAlign: "center" }}>
            <h3 style={{
              margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: "24px", fontWeight: 800,
              background: "linear-gradient(to right, #ec4899, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "0.1em", textTransform: "uppercase"
            }}>
              Kolektaku AI
            </h3>
            <p style={{
              margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.05em", fontWeight: 500,
              display: "flex", alignItems: "center", gap: "8px"
            }}>
              <span className="dot-animate">●</span>
              {isSubtitleLoading ? "Menyiapkan Terjemahan Indonesia..." : "Menyeleraskan Alur Video..."}
              <span className="dot-animate" style={{ animationDelay: "0.2s" }}>●</span>
            </p>
          </div>

          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
            @keyframes dotMove { 0% { opacity: 0.2; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } 100% { opacity: 0.2; transform: translateY(0); } }
            .dot-animate { display: inline-block; color: #ec4899; animation: dotMove 1s infinite; }
          `}} />
        </div>
      )}

      {/* ═══ Controls Layer ═══ */}
      <div
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
          padding: "40px 16px 12px",
          opacity: showControls ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: showControls ? "auto" : "none",
          zIndex: 50,
        }}
      >
        {/* Progress Bar */}
        <div
          onClick={seek}
          style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.15)", borderRadius: "3px", cursor: "pointer", marginBottom: "10px", position: "relative" }}
        >
          {/* Intro Marker */}
          {intro && duration > 0 && (
            <div style={{
              position: "absolute",
              left: `${(intro.start / duration) * 100}%`,
              width: `${((intro.end - intro.start) / duration) * 100}%`,
              height: "100%",
              background: "rgba(236, 72, 153, 0.4)",
              borderRadius: "3px",
              zIndex: 1
            }} />
          )}
          {/* Outro Marker */}
          {outro && duration > 0 && (
            <div style={{
              position: "absolute",
              left: `${(outro.start / duration) * 100}%`,
              width: `${((outro.end - outro.start) / duration) * 100}%`,
              height: "100%",
              background: "rgba(99, 102, 241, 0.4)",
              borderRadius: "3px",
              zIndex: 1
            }} />
          )}
          {/* Buffered */}
          <div style={{ position: "absolute", height: "100%", borderRadius: "3px", background: "rgba(255,255,255,0.2)", width: `${bufferedPct}%` }} />
          {/* Progress */}
          <div style={{ position: "absolute", height: "100%", borderRadius: "3px", background: "linear-gradient(90deg, #ec4899, #6366f1)", width: `${progressPct}%`, transition: "width 0.1s linear", zIndex: 2 }}>
            <div style={{
              position: "absolute", right: "-6px", top: "-3px",
              width: "12px", height: "12px", borderRadius: "50%",
              background: "#ec4899", border: "2px solid #fff",
              boxShadow: "0 0 8px rgba(236,72,153,0.6)",
            }} />
          </div>
        </div>

        {/* Controls Row */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "4px" : "8px" }}>
          {/* Play/Pause */}
          <button onClick={togglePlay} style={{ ...iconBtnStyle, width: isMobile ? "36px" : "40px", height: isMobile ? "36px" : "40px" }} title={playing ? "Pause (K)" : "Play (K)"}>
            {playing ? (
              <svg width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="white"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
            ) : (
              <svg width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>

          {/* Skip Back */}
          {showAdvancedControls && (
            <button onClick={skipBackward} style={iconBtnStyle} title="Rewind 10s (←)">
              <svg width={isMobile ? "16" : "18"} height={isMobile ? "16" : "18"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /><text x="12" y="15.5" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">10</text></svg>
            </button>
          )}

          {/* Skip Forward */}
          {showAdvancedControls && (
            <button onClick={skipForward} style={iconBtnStyle} title="Forward 10s (→)">
              <svg width={isMobile ? "16" : "18"} height={isMobile ? "16" : "18"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /><text x="12" y="15.5" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">10</text></svg>
            </button>
          )}

          {/* Volume */}
          {!isMobile && (
            <>
              <button onClick={toggleMute} style={iconBtnStyle} title="Mute (M)">
                {muted || volume === 0 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></svg>
                )}
              </button>
              <div
                onClick={changeVolume}
                style={{ width: "60px", height: "4px", background: "rgba(255,255,255,0.2)", borderRadius: "2px", cursor: "pointer", position: "relative" }}
              >
                <div style={{ height: "100%", borderRadius: "2px", background: "#ec4899", width: `${(muted ? 0 : volume) * 100}%` }} />
              </div>
            </>
          )}

          {/* Time */}
          <span style={{ fontSize: isMobile ? "10px" : "12px", color: "rgba(255,255,255,0.7)", fontFamily: "monospace", marginLeft: "4px", whiteSpace: "nowrap" }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Subtitle Menu */}
          <div style={{ position: "relative" }}>
            <button onClick={() => {
              const next = !showSubMenu;
              closeAllMenus();
              setShowSubMenu(next);
              setShowStylePanel(false);
            }} style={iconBtnStyle} title="Subtitles">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeSub ? "#ec4899" : "white"} strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 12h4M14 12h4M6 16h8" /></svg>
            </button>
            {showSubMenu && (
              <div style={menuStyle}>
                <div style={menuTitleStyle}>Subtitle</div>
                <div style={{ maxHeight: isMobile ? "120px" : "200px", overflowY: "auto" }}>
                  <button onClick={() => { handleActiveSubChange(null); setShowSubMenu(false); }} style={menuItemStyle(activeSub === null)}>Off</button>
                  {tracks.map((t, i) => (
                    <button key={i} onClick={() => { handleActiveSubChange(t); setShowSubMenu(false); }} style={menuItemStyle(activeSub?.file === t.file)}>
                      {t.label || `Track ${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subtitle Style */}
          {showAdvancedControls && (
            <button onClick={() => {
              const next = !showStylePanel;
              closeAllMenus();
              setShowStylePanel(next);
            }} style={iconBtnStyle} title="Subtitle Style">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 6h16M4 12h10M4 18h6" /></svg>
            </button>
          )}

          {/* Quality Menu */}
          {qualities.length > 0 && (
            <div style={{ position: "relative" }}>
              <button onClick={() => {
                const next = !showQualityMenu;
                closeAllMenus();
                setShowQualityMenu(next);
                setShowStylePanel(false);
              }} style={{ ...iconBtnStyle, fontSize: "11px", fontWeight: 700, color: "#ec4899" }} title="Quality">
                {currentQualityLabel}
              </button>
              {showQualityMenu && (
                <div style={menuStyle}>
                  <div style={menuTitleStyle}>Quality {isPremium ? '💎' : '🔒'}</div>
                  <div style={{ maxHeight: isMobile ? "120px" : "200px", overflowY: "auto" }}>
                    {qualities.map((q) => (
                      <button key={q.level} onClick={() => handleQualityChange(q.level)} style={menuItemStyle(currentQuality === q.level)}>
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Speed Menu */}
          {showAdvancedControls && (
            <div style={{ position: "relative" }}>
              <button onClick={() => {
                const next = !showSpeedMenu;
                closeAllMenus();
                setShowSpeedMenu(next);
                setShowStylePanel(false);
              }} style={{ ...iconBtnStyle, fontSize: "11px", fontWeight: 700, color: playbackRate !== 1 ? "#ec4899" : "#fff" }} title="Playback Speed">
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <div style={menuStyle}>
                  <div style={menuTitleStyle}>Speed</div>
                  <div style={{ maxHeight: isMobile ? "120px" : "200px", overflowY: "auto" }}>
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                      <button key={r} onClick={() => handleSpeedChange(r)} style={menuItemStyle(playbackRate === r)}>
                        {r}x {r === 1 ? "(Normal)" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} style={iconBtnStyle} title="Fullscreen (F)">
            {isFullscreen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* ═══ Subtitle Style Panel ═══ */}
      {showStylePanel && !waitingForTranslation && showAdvancedControls && (
        <div style={{
          position: "absolute",
          bottom: isFullscreen ? "90px" : "70px",
          right: isFullscreen ? "24px" : "12px",
          zIndex: 200,
          background: "rgba(10,10,20,0.95)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "12px", padding: "16px",
          width: isMobile ? "240px" : "270px",
          maxHeight: isFullscreen ? "calc(100vh - 120px)" : "calc(100% - 80px)",
          overflowY: "auto",
          paddingBottom: "24px",
          backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
          color: "#fff", fontFamily: "Inter, sans-serif",
        }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontWeight: 700, fontSize: "13px", letterSpacing: "0.05em" }}>⚙️ Subtitle Style</span>
            <button onClick={() => setShowStylePanel(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>✕</button>
          </div>

          {/* Font Size Desktop */}
          {!isMobile && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
                <span>Ukuran Font (PC)</span>
                <span style={{ color: "#ec4899", fontWeight: 600 }}>{subStyle.fontSize}px</span>
              </div>
              <input type="range" min="14" max="48" step="2" value={subStyle.fontSize}
                onChange={(e) => updateStyle("fontSize", e.target.value)}
                style={{ width: "100%", accentColor: "#ec4899" }} />
            </div>
          )}

          {/* Font Size Mobile */}
          {isMobile && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
                <span>Ukuran Font (HP)</span>
                <span style={{ color: "#ec4899", fontWeight: 600 }}>{subStyle.mobileFontSize || 16}px</span>
              </div>
              <input type="range" min="10" max="24" step="1" value={subStyle.mobileFontSize || 16}
                onChange={(e) => updateStyle("mobileFontSize", e.target.value)}
                style={{ width: "100%", accentColor: "#ec4899" }} />
            </div>
          )}

          {/* Text Color */}
          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>Warna Teks</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {["#ffffff", "#ffeb3b", "#00e5ff", "#69ff47", "#ff4081"].map((c) => (
                <button key={c} onClick={() => updateStyle("color", c)}
                  style={{ width: "20px", height: "20px", borderRadius: "50%", background: c, border: subStyle.color === c ? "2px solid #ec4899" : "2px solid transparent", cursor: "pointer", flexShrink: 0 }} />
              ))}
              <input type="color" value={subStyle.color}
                onChange={(e) => updateStyle("color", e.target.value)}
                style={{ width: "24px", height: "24px", borderRadius: "4px", border: "none", cursor: "pointer", padding: 0, background: "none" }} />
            </div>
          </div>

          {/* Font Family */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>Font</div>
            <select value={subStyle.fontFamily}
              onChange={(e) => updateStyle("fontFamily", e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#fff", fontSize: "12px", padding: "5px 8px", cursor: "pointer" }}>
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={{ background: "#1a1a2e" }}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Outline Strength */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>Gaya Outline</div>
            <div style={{ display: "flex", gap: "6px" }}>
              {[["none", "Tidak Ada"], ["soft", "Lembut"], ["strong", "Tebal"]].map(([v, l]) => (
                <button key={v} onClick={() => updateStyle("outlineStrength", v)}
                  style={{
                    flex: 1, padding: "5px 0", borderRadius: "6px", fontSize: "11px", border: "1px solid",
                    borderColor: subStyle.outlineStrength === v ? "#ec4899" : "rgba(255,255,255,0.12)",
                    background: subStyle.outlineStrength === v ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.05)",
                    color: subStyle.outlineStrength === v ? "#ec4899" : "rgba(255,255,255,0.6)",
                    cursor: "pointer", fontWeight: 600,
                  }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Background Opacity */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
              <span>Latar Belakang</span>
              <span style={{ color: "#ec4899", fontWeight: 600 }}>{subStyle.bgOpacity}%</span>
            </div>
            <input type="range" min="0" max="80" step="10" value={subStyle.bgOpacity}
              onChange={(e) => updateStyle("bgOpacity", e.target.value)}
              style={{ width: "100%", accentColor: "#ec4899" }} />
          </div>

          {/* Reset */}
          <button
            onClick={() => { saveSubtitleStyle(DEFAULT_SUBTITLE_STYLE); setSubStyle(DEFAULT_SUBTITLE_STYLE); }}
            style={{ marginTop: "10px", width: "100%", padding: "6px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: "12px", cursor: "pointer" }}>
            Reset ke Default
          </button>
        </div>
      )}

      {/* Big center play button when paused */}
      {!playing && !waitingForTranslation && (
        <div onClick={togglePlay} style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 15, cursor: "pointer",
        }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "rgba(236,72,153,0.8)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 30px rgba(236,72,153,0.4)",
            transition: "transform 0.2s ease",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .kol-player:fullscreen { border-radius: 0; }
        .kol-player video::-webkit-media-controls { display: none !important; }
      `}</style>
    </div>
  );
}

// Shared styles
const iconBtnStyle = {
  background: "none", border: "none", color: "#fff",
  cursor: "pointer", padding: "4px", display: "flex",
  alignItems: "center", justifyContent: "center",
  borderRadius: "4px", transition: "background 0.2s",
};

const menuStyle = {
  position: "absolute", bottom: "36px", right: 0,
  background: "rgba(10,10,20,0.95)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px", padding: "6px",
  minWidth: "140px",
  maxWidth: "200px",
  backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
  zIndex: 100,
};

const menuTitleStyle = {
  fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.4)",
  padding: "4px 10px", textTransform: "uppercase", letterSpacing: "0.1em",
};

const menuItemStyle = (active) => ({
  display: "block", width: "100%", textAlign: "left",
  padding: "6px 10px", borderRadius: "6px", border: "none",
  background: active ? "rgba(236,72,153,0.2)" : "transparent",
  color: active ? "#ec4899" : "#fff",
  fontSize: "12px", fontWeight: active ? 700 : 500,
  cursor: "pointer", transition: "background 0.15s",
});
