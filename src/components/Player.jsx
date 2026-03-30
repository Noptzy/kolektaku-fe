"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";
import Hls from "hls.js";
import Plyr from "plyr";
import PuffLoader from "react-spinners/PuffLoader";
import "plyr/dist/plyr.css";

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
  { pattern: /\.\w+\d*\.(live|online|xyz|wiki|pro)/, referer: "https://rapid-cloud.co/" },
  { pattern: /\.(live|online|xyz|wiki|pro)$/, referer: "https://rapid-cloud.co/" },
];

function getRefererForUrl(url) {
  for (const { pattern, referer } of CDN_REFERER_MAP) {
    if (pattern.test(url)) return referer;
  }
  return "https://megacloud.tv/";
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

    if (url.includes("googlevideo.com") || url.includes("youtube.com")) {
      super.load(context, config, callbacks);
      return;
    }

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
  const playerId = useId();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const plyrRef = useRef(null);
  const tracksRef = useRef(tracks);
  const waitingRef = useRef(waitingForTranslation);
  const lastAppliedStartAtRef = useRef(-1);
  const dummyVttUrlRef = useRef(null);
  const subInitializedRef = useRef(false);
  const isProgrammaticChangeRef = useRef(false);
  const userManuallyChangedSubRef = useRef(false);
  const systemPauseRef = useRef(false);
  const isRebuildingTracksRef = useRef(false);

  // State
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Subtitles
  const [subStyle, setSubStyle] = useState(DEFAULT_SUBTITLE_STYLE);
  const [activeSub, setActiveSub] = useState(null);
  const [subCues, setSubCues] = useState([]);
  const [currentCueText, setCurrentCueText] = useState("");
  const [isSubtitleLoading, setIsSubtitleLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // Skip
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);

  // Controls visibility (tracked from Plyr)
  const [showControls, setShowControls] = useState(true);

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

  // Keep refs in sync
  useEffect(() => { waitingRef.current = waitingForTranslation; }, [waitingForTranslation]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  // ─── Inject <track> elements into video DOM for Plyr ─────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Remove existing tracks
    const existing = video.querySelectorAll('track');
    existing.forEach((t) => t.remove());

    if (tracks.length === 0) return;

    // Create a minimal valid VTT blob (Plyr needs valid src to detect tracks)
    if (!dummyVttUrlRef.current) {
      const vtt = 'WEBVTT\n\n00:00:00.000 --> 00:00:00.001\n \n';
      const blob = new Blob([vtt], { type: 'text/vtt' });
      dummyVttUrlRef.current = URL.createObjectURL(blob);
    }

    // Determine the best track to select natively BEFORE Plymouth processes DOM
    let bestIndex = 0;
    let fallbackTrack = null;

    if (!userManuallyChangedSubRef.current) {
      // 1. Try to find Indonesian track (Primary Focus)
      fallbackTrack = tracks.find((t) =>
        t.label?.toLowerCase().includes("indo") ||
        t.label?.toLowerCase().includes("indonesia") ||
        t.lang?.toLowerCase().includes("id") ||
        t.lang?.toLowerCase().includes("in")
      );

      // 2. Fallback to user preferred language from localStorage
      if (!fallbackTrack) {
        const preferredLabel = loadPreferredLang();
        if (preferredLabel) {
          fallbackTrack = tracks.find((t) => (t.label || t.lang) === preferredLabel);
        }
      }

      // Resolve the index
      if (fallbackTrack) {
        const foundIdx = tracks.findIndex((t) => t.file === fallbackTrack.file);
        if (foundIdx !== -1) bestIndex = foundIdx;
      }
    } else if (activeSub) {
      // Retain the user's manual choice even across track mutations
      const foundIdx = tracks.findIndex((t) => t.file === activeSub.file);
      if (foundIdx !== -1) bestIndex = foundIdx;
    }

    tracks.forEach((t, i) => {
      const trackEl = document.createElement('track');
      trackEl.kind = 'captions';
      trackEl.label = t.label || `Track ${i + 1}`;
      trackEl.srclang = t.lang || `lang${i}`;
      trackEl.src = dummyVttUrlRef.current;
      trackEl.default = (i === bestIndex); // Native HTML5 marker for Plymouth initialization
      video.appendChild(trackEl);
    });

    // If Plyr is already initialized, force captions update securely
    if (plyrRef.current) {
      try {
        isRebuildingTracksRef.current = true;
        // Cycle Plymouth's interface to register new tracks, then force the track selection once fully initialized
        plyrRef.current.captions.active = false;
        setTimeout(() => {
          if (plyrRef.current) {
            plyrRef.current.captions.active = true;
            
            // Allow Plymouth native event loop to clear before we forcefully assign our track
            setTimeout(() => {
              if (plyrRef.current) {
                plyrRef.current.currentTrack = bestIndex;
                handleActiveSubChange(tracks[bestIndex]); // Sync custom UI state
              }
              isRebuildingTracksRef.current = false;
            }, 100);
          } else {
            isRebuildingTracksRef.current = false;
          }
        }, 50);
      } catch (e) {
        isRebuildingTracksRef.current = false;
        console.warn('[Player] Failed to refresh Plyr captions:', e);
      }
    } else {
      // Player is not yet fully instantiated. The activeSub will be hooked properly by initial default track selection.
      handleActiveSubChange(tracks[bestIndex]);
    }

    return () => {
      // Don't revoke dummyVttUrl here — it's shared and cleaned up on unmount
    };
  }, [tracks]);

  // Cleanup dummy VTT blob on unmount
  useEffect(() => {
    return () => {
      if (dummyVttUrlRef.current) {
        URL.revokeObjectURL(dummyVttUrlRef.current);
        dummyVttUrlRef.current = null;
      }
    };
  }, []);

  // ─── HLS + Plyr Init ───────────────────────────────────────────
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (!src) {
      console.warn("[Player] No src provided");
      return;
    }

    let hls;
    let player;

    lastAppliedStartAtRef.current = -1;

    // Destroy previous Plyr instance
    if (plyrRef.current) {
      plyrRef.current.destroy();
      plyrRef.current = null;
    }

    const MAX_HEIGHT = isPremium ? Infinity : 720;

    const initPlyr = (qualityOptions = [], defaultQuality = 720) => {
      // Ensure track elements are present on video before Plyr init
      const currentTracks = tracksRef.current || [];
      if (currentTracks.length > 0 && !video.querySelector('track')) {
        if (!dummyVttUrlRef.current) {
          const vtt = 'WEBVTT\n\n00:00:00.000 --> 00:00:00.001\n \n';
          const blob = new Blob([vtt], { type: 'text/vtt' });
          dummyVttUrlRef.current = URL.createObjectURL(blob);
        }
        currentTracks.forEach((t, i) => {
          const trackEl = document.createElement('track');
          trackEl.kind = 'captions';
          trackEl.label = t.label || `Track ${i + 1}`;
          trackEl.srclang = t.lang || `lang${i}`;
          trackEl.src = dummyVttUrlRef.current;
          if (i === 0) trackEl.default = true;
          video.appendChild(trackEl);
        });
      }

      player = new Plyr(video, {
        controls: [
          'play-large',
          'rewind',
          'play',
          'fast-forward',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'settings',
          'fullscreen',
        ],
        settings: ['captions', 'quality', 'speed'],
        seekTime: 10,
        speed: {
          selected: 1,
          options: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
        },
        quality: qualityOptions.length > 0 ? {
          default: defaultQuality,
          options: qualityOptions,
          forced: true,
          onChange: (quality) => {
            if (hlsRef.current) {
              if (quality === 0) {
                // Auto
                hlsRef.current.currentLevel = -1;
              } else {
                hlsRef.current.levels.forEach((level, index) => {
                  if (level.height === quality) {
                    hlsRef.current.currentLevel = index;
                  }
                });
              }
            }
          },
        } : {},
        keyboard: { focused: true, global: true },
        tooltips: { controls: true, seek: true },
        captions: { active: true, language: 'auto', update: true },
        fullscreen: { enabled: true, fallback: true, iosNative: false, container: `#kol-player-${playerId.replace(/:/g, '')}` },
        clickToPlay: true,
        hideControls: true,
        disableContextMenu: true,
        ratio: '16:9',
        storage: { enabled: true, key: 'kolektaku_plyr' },
      });

      plyrRef.current = player;

      // Plyr events
      player.on('play', () => { setPlaying(true); setIsVideoLoading(false); });
      player.on('playing', () => setIsVideoLoading(false));
      player.on('waiting', () => setIsVideoLoading(true));
      player.on('canplay', () => setIsVideoLoading(false));
      player.on('error', () => setIsVideoLoading(false));
      player.on('pause', () => {
        if (systemPauseRef.current) {
          systemPauseRef.current = false;
        } else {
          setPlaying(false);
        }
      });
      player.on('ended', () => {
        setPlaying(false);
        if (onEnded) onEnded(video.currentTime, video.duration);
      });
      player.on('timeupdate', () => {
        const t = video.currentTime;
        setCurrentTime(t);
        setDuration(video.duration || 0);
        if (onTimeUpdate) onTimeUpdate(t, video.duration);

        // Update current subtitle cue
        // We use the latest subCues from the ref-like state
        // but since this is in the init, we rely on the separate effect below
      });
      player.on('enterfullscreen', () => setIsFullscreen(true));
      player.on('exitfullscreen', () => setIsFullscreen(false));
      player.on('controlsshown', () => setShowControls(true));
      player.on('controlshidden', () => setShowControls(false));

      // Sync Plyr caption selection → our custom subtitle system
      player.on('languagechange', () => {
        if (isRebuildingTracksRef.current) return;

        if (!isProgrammaticChangeRef.current) {
          userManuallyChangedSubRef.current = true;
        } else {
          isProgrammaticChangeRef.current = false;
        }

        const currentTracks = tracksRef.current;
        const idx = player.currentTrack;
        if (idx === -1 || !currentTracks || idx >= currentTracks.length) {
          // Captions turned off
          handleActiveSubChange(null);
        } else {
          handleActiveSubChange(currentTracks[idx]);
        }
      });

      player.on('captionsenabled', () => {
        if (isRebuildingTracksRef.current) return;
        const currentTracks = tracksRef.current;
        const idx = player.currentTrack;
        if (idx >= 0 && currentTracks && idx < currentTracks.length) {
          handleActiveSubChange(currentTracks[idx]);
        }
      });

      player.on('captionsdisabled', () => {
        if (isRebuildingTracksRef.current) return;
        handleActiveSubChange(null);
      });
    };

    if (src.includes(".m3u8") && Hls.isSupported()) {
      console.log("[Player] HLS + Plyr init with src:", src.substring(0, 80));
      hls = new Hls({
        loader: ProxyLoader,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferHole: 0.5,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("[Player] MANIFEST_PARSED");

        // Get available qualities filtered by premium
        const qualityOptions = hls.levels
          .map((level) => level.height)
          .filter((h) => h <= MAX_HEIGHT)
          .filter((v, i, a) => a.indexOf(v) === i) // unique
          .sort((a, b) => b - a); // descending

        // Add "Auto" as 0
        qualityOptions.push(0);

        // Enforce capping for non-premium
        if (!isPremium) {
          const maxLevelIndex = hls.levels.reduce((acc, level, index) => {
            return level.height <= 720 ? index : acc;
          }, -1);
          hls.autoLevelCapping = maxLevelIndex;
        }

        const defaultQuality = qualityOptions.includes(720) ? 720 : qualityOptions[0];
        initPlyr(qualityOptions, defaultQuality);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try to recover network error
              console.log("fatal network error encountered, try to recover");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("fatal media error encountered, try to recover");
              hls.recoverMediaError();
              break;
            default:
              // Cannot recover
              hls.destroy();
              break;
          }
        } else {
          // Suppress benign bufferStalledError from cluttering console, 
          // HLS.js handles this internally and recovers automatically.
          if (data.details !== Hls.ErrorDetails.BUFFER_STALLED_ERROR && data.details !== 'bufferStalledError') {
            console.warn("HLS non-fatal error:", data.details);
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari)
      video.src = src;
      initPlyr();
    } else {
      video.src = src;
      initPlyr();
    }

    return () => {
      if (hls) hls.destroy();
      hlsRef.current = null;
      if (player) player.destroy();
      plyrRef.current = null;
    };
  }, [src, isPremium]);

  // ─── Start at specific time ──────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const parsedStart = Number(startAtSeconds);
    const targetSecond = Number.isFinite(parsedStart) ? Math.max(0, Math.floor(parsedStart)) : 0;

    if (targetSecond === lastAppliedStartAtRef.current) return;

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

        const cues = parseVTT(text);

        if (cues.length === 0 && retryCount < maxRetries && !cancelled) {
          retryCount++;
          setTimeout(loadSub, 2000);
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



  // ─── Subtitle cue sync (runs on timeupdate via interval) ──────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || subCues.length === 0) {
      setCurrentCueText("");
      return;
    }

    const interval = setInterval(() => {
      const t = video.currentTime;
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
    }, 250);

    return () => clearInterval(interval);
  }, [subCues, intro, outro]);

  // ─── Intro/outro tracking (when no subtitles) ───────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || subCues.length > 0) return; // handled above
    if (!intro && !outro) return;

    const interval = setInterval(() => {
      const t = video.currentTime;
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
    }, 250);

    return () => clearInterval(interval);
  }, [intro, outro, subCues.length]);

  // Render Intro/Outro regions on timeline
  useEffect(() => {
    if (!duration || !containerRef.current) return;

    const progressEl = containerRef.current.querySelector('.plyr__progress');
    if (!progressEl) return;

    // Remove existing custom highlights
    progressEl.querySelectorAll('.kol-timeline-region').forEach(e => e.remove());

    const addRegion = (start, end, type) => {
      if (typeof start !== 'number' || typeof end !== 'number' || end <= start) return;
      
      const leftPct = Math.max(0, Math.min(100, (start / duration) * 100));
      const widthPct = Math.max(0, Math.min(100 - leftPct, ((end - start) / duration) * 100));

      const el = document.createElement('div');
      el.className = `kol-timeline-region kol-region-${type}`;

      el.style.position = 'absolute';
      el.style.top = '50%';
      el.style.transform = 'translateY(-50%)';
      el.style.height = '14px'; // Cover the track area natively
      el.style.left = `${leftPct}%`;
      el.style.width = `${widthPct}%`;
      el.style.backgroundColor = 'rgba(236, 72, 153, 0.4)'; // Theme pink with opacity
      el.style.borderLeft = '2px solid #ec4899';
      el.style.borderRight = '2px solid #ec4899';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '2';
      el.style.borderRadius = '2px';
      el.title = `Langsung skip ${type}`;
      
      progressEl.appendChild(el);
    };

    if (intro) addRegion(intro.start, intro.end, 'intro');
    if (outro) addRegion(outro.start, outro.end, 'outro');

    // Elevate the range input thumb so it stays visible/clickable over the highlights
    const rangeInput = progressEl.querySelector('input[type="range"]');
    if (rangeInput) {
      rangeInput.style.zIndex = '3';
      rangeInput.style.position = 'relative';
    }
  }, [duration, intro, outro]);

  // Translation gating
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (waitingForTranslation) {
      if (!video.paused) {
        systemPauseRef.current = true;
        video.pause();
      }
    } else if (video.paused && playing) {
      video.play().catch(() => { });
    }
  }, [waitingForTranslation, isSubtitleLoading, playing]);

  // Fullscreen change detection
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const subCSS = buildSubtitleCSS(subStyle, isMobile);

  return (
    <div
      ref={containerRef}
      id={`kol-player-${playerId.replace(/:/g, '')}`}
      className={`kol-player-wrapper ${isMobile && !isFullscreen ? 'kol-hide-settings' : ''} ${isVideoLoading && !waitingForTranslation ? 'kol-video-loading' : ''}`}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        background: "#000",
        borderRadius: isFullscreen ? 0 : "12px",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Video Element - Plyr wraps this */}
      <video
        ref={videoRef}
        playsInline
        preload="auto"
      />

      {/* Video Loading Indicator (Library) */}
      {isVideoLoading && !waitingForTranslation && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", 
          transform: "translate(-50%, -50%)",
          zIndex: 5, pointerEvents: "none"
        }}>
          <PuffLoader color="var(--accent, #ec4899)" size={100} />
        </div>
      )}

      {/* Custom Subtitles Overlay (on top of Plyr) */}
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
            zIndex: 100,
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
            zIndex: 110, padding: "8px 20px", borderRadius: "8px",
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
            zIndex: 110, padding: "8px 20px", borderRadius: "8px",
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
      {waitingForTranslation && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 999,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", gap: "24px",
          transition: "all 0.4s ease",
        }}>
          <PuffLoader color="var(--accent, #ec4899)" size={100} />

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
            @keyframes dotMove { 0% { opacity: 0.2; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } 100% { opacity: 0.2; transform: translateY(0); } }
            .dot-animate { display: inline-block; color: #ec4899; animation: dotMove 1s infinite; }
          `}} />
        </div>
      )}



      {/* CSS Animations & Plyr Theme Override */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* Blur ONLY the video wrapper, not the controls */
        .kol-player-wrapper.kol-video-loading .plyr__video-wrapper {
          filter: blur(4px) brightness(0.6);
          transition: filter 0.3s ease;
        }

        /* ═══ Plyr Kolektaku Theme ═══ */
        .kol-player-wrapper .plyr {
          --plyr-color-main: var(--accent);
          --plyr-video-background: #000;
          --plyr-menu-background: var(--bg-card);
          --plyr-menu-color: var(--text-primary);
          --plyr-menu-border-color: var(--border);
          --plyr-menu-radius: 10px;
          --plyr-menu-shadow: var(--shadow-xl);
          --plyr-badge-background: var(--accent);
          --plyr-badge-text-color: #fff;
          --plyr-badge-border-radius: 4px;
          --plyr-control-icon-size: 18px;
          --plyr-control-spacing: 10px;
          --plyr-font-size-base: 15px;
          --plyr-font-size-small: 13px;
          --plyr-font-size-large: 18px;
          --plyr-font-size-xlarge: 21px;
          --plyr-font-size-time: 13px;
          --plyr-font-weight-bold: 700;
          --plyr-font-weight-regular: 500;
          --plyr-tooltip-background: var(--bg-card);
          --plyr-tooltip-color: var(--text-primary);
          --plyr-tooltip-radius: 6px;
          --plyr-tooltip-shadow: var(--shadow-md);
          --plyr-font-family: Inter, sans-serif;
          --plyr-range-fill-background: linear-gradient(90deg, var(--accent), var(--accent-hover, #6366f1));
          --plyr-video-control-background-hover: var(--accent-muted, rgba(236,72,153,0.15));
          --plyr-video-controls-background: linear-gradient(transparent, rgba(0,0,0,0.85));
          border-radius: inherit;
          overflow: hidden;
          z-index: 0;
          position: relative;
        }

        .kol-player-wrapper .plyr__control--overlaid {
          background: var(--accent) !important;
          backdrop-filter: blur(8px);
          box-shadow: 0 0 30px var(--accent-muted, rgba(236,72,153,0.4));
          border: none;
        }

        .kol-player-wrapper .plyr__control--overlaid:hover {
          background: var(--accent-hover, #ec4899) !important;
        }

        /* Responsive Controls layout tweaking */
        .kol-player-wrapper .plyr__controls {
          padding-bottom: 15px;
        }

        /* Menu layout for mobile */
        .kol-player-wrapper .plyr__menu__container [id*="captions"] {
          max-height: 50vh;
          overflow-y: auto;
        }

        /* Hide setting button on mobile unless fullscreen */
        .kol-player-wrapper.kol-hide-settings .plyr__controls [data-plyr="settings"] {
          display: none !important;
        }

        /* Hide TRACK badges in captions menu */
        .kol-player-wrapper .plyr__menu__container .plyr__menu__value {
          display: none !important;
        }

        .kol-player-wrapper .plyr__menu__container .plyr__control[role="menuitemradio"]::before {
          background: var(--accent);
        }

        .kol-player-wrapper .plyr__control.plyr__tab-focus,
        .kol-player-wrapper .plyr__control:hover {
          background: var(--bg-card-hover, rgba(236,72,153,0.15)) !important;
          color: var(--text-primary) !important;
        }

        .kol-player-wrapper .plyr--fullscreen-fallback { border-radius: 0; }
        .kol-player-wrapper .plyr:fullscreen { border-radius: 0; }
        .kol-player-wrapper .plyr video::-webkit-media-controls { display: none !important; }

        /* Fullscreen: wrapper is the fullscreen container, so ensure overlays are visible */
        .kol-player-wrapper:fullscreen,
        .kol-player-wrapper.plyr--fullscreen-active {
          background: #000;
        }
        .kol-player-wrapper:fullscreen .plyr,
        .kol-player-wrapper.plyr--fullscreen-active .plyr {
          height: 100%;
          width: 100%;
        }

        /* Hide Plyr's native captions since we handle subtitles custom */
        .kol-player-wrapper .plyr__captions { display: none !important; }
      `}</style>
    </div>
  );
}


