"use client";

import { useState, useEffect, useMemo } from "react";
import animeService from "@/lib/animeApi";

const STORAGE_KEY = "kolektaku_admin_schedules_state";

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY))?.selectedDate || null; } catch { return null; }
  });

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await animeService.getAiringSchedules();
      if (res.success) {
        setSchedules(res.data || {});
      }
    } catch (err) {
      console.error("Failed to fetch schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Build sorted date list from API response
  const dateKeys = useMemo(() => {
    return Object.keys(schedules).sort();
  }, [schedules]);

  // Save selectedDate to sessionStorage
  useEffect(() => {
    if (selectedDate) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedDate }));
    }
  }, [selectedDate]);

  // Auto-select first date once loaded
  useEffect(() => {
    if (dateKeys.length > 0 && !selectedDate) {
      // Try to select today first, otherwise first available
      const today = new Date().toISOString().split("T")[0];
      setSelectedDate(dateKeys.includes(today) ? today : dateKeys[0]);
    }
  }, [dateKeys, selectedDate]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setMessage({ type: "info", text: "Syncing schedules started... Please wait." });
      const res = await animeService.triggerAiringScheduleSync();
      if (res.success) {
        setMessage({ type: "success", text: "Schedule sync triggered! Worker is processing." });
        setTimeout(fetchSchedules, 5000);
      } else {
        setMessage({ type: "error", text: res.message || "Failed to trigger sync." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error triggering sync: " + err.message });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return {
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      dayNum: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
    };
  };

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split("T")[0];
    return dateStr === today;
  };

  const currentItems = schedules[selectedDate] || [];

  // Stats
  const totalTitles = Object.values(schedules).reduce((acc, arr) => acc + (arr?.length || 0), 0);
  const totalDays = dateKeys.length;
  const scrapedCount = Object.values(schedules).reduce((acc, arr) => acc + (arr || []).filter(i => i.isScraped).length, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <h2>
            <i className="fa-regular fa-calendar mr-2" style={{ fontSize: 18, color: "var(--accent)" }}></i>
            Airing Schedules
          </h2>
          <p>Manage and monitor anime release schedules</p>
        </div>
        <button onClick={handleSync} disabled={syncing} className={`admin-btn ${syncing ? "admin-btn-ghost" : "admin-btn-primary"}`}>
          {syncing ? (
            <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 12 }}></i> Syncing...</>
          ) : (
            <><i className="fa-solid fa-arrows-rotate" style={{ fontSize: 12 }}></i> Manual Fetch Schedule</>
          )}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className="p-3 rounded-lg flex items-center gap-2.5 text-sm font-medium"
          style={{
            background: message.type === "success" ? "rgba(16,185,129,0.1)" : message.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
            color: message.type === "success" ? "#10b981" : message.type === "error" ? "#ef4444" : "#3b82f6",
            border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.2)" : message.type === "error" ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)"}`,
          }}
        >
          <i className={`fa-solid ${message.type === "success" ? "fa-check-circle" : message.type === "error" ? "fa-circle-xmark" : "fa-circle-info"}`}></i>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100 transition">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Days Covered", value: totalDays, icon: "fa-calendar-days", color: "#3b82f6" },
          { label: "Total Series", value: totalTitles, icon: "fa-film", color: "#8b5cf6" },
          { label: "Episodes Scraped", value: scrapedCount, icon: "fa-circle-check", color: "#10b981" },
        ].map((s) => (
          <div key={s.label} className="admin-card p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${s.color}15`, color: s.color }}>
              <i className={`fa-solid ${s.icon}`} style={{ fontSize: 14 }}></i>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{s.label}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="admin-card p-10 text-center text-[var(--text-tertiary)]">
          <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading schedules...
        </div>
      ) : dateKeys.length === 0 ? (
        <div className="admin-card p-10 text-center text-[var(--text-tertiary)]" style={{ borderStyle: "dashed" }}>
          <i className="fa-solid fa-inbox mr-2" style={{ fontSize: 16 }}></i> No schedules available. Try syncing first.
        </div>
      ) : (
        <>
          {/* Date Tabs */}
          <div className="admin-card p-2.5 overflow-x-auto custom-scrollbar">
            <div className="flex gap-1.5" style={{ minWidth: "max-content" }}>
              {dateKeys.map((dateStr) => {
                const d = formatDate(dateStr);
                const active = selectedDate === dateStr;
                const today = isToday(dateStr);
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className="flex flex-col items-center rounded-lg px-3 py-2 transition-all relative"
                    style={{
                      minWidth: 56,
                      background: active ? "var(--accent)" : "transparent",
                      color: active ? "white" : "var(--text-secondary)",
                      boxShadow: active ? "0 2px 8px rgba(var(--accent-rgb,236,72,153),0.3)" : "none",
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-card-hover)"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wide">{d.dayName}</span>
                    <span className="text-lg font-bold leading-tight">{d.dayNum}</span>
                    <span className="text-[9px] font-medium">{d.month}</span>
                    {today && !active && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--accent)]" style={{ boxShadow: "0 0 4px var(--accent)" }}></span>
                    )}
                    {schedules[dateStr]?.length > 0 && (
                      <span
                        className="mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: active ? "rgba(255,255,255,0.2)" : "var(--bg-input)",
                          color: active ? "white" : "var(--text-tertiary)",
                        }}
                      >
                        {schedules[dateStr].length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule Content */}
          <div className="admin-card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-input)" }}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                {selectedDate && (() => {
                  const d = new Date(selectedDate + "T00:00:00");
                  return d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase() + "'S LINEUP";
                })()}
              </h3>
              <span className="admin-badge" style={{ background: "rgba(var(--accent-rgb,236,72,153),0.1)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb,236,72,153),0.2)" }}>
                {currentItems.length} Series
              </span>
            </div>

            {currentItems.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-[var(--text-tertiary)]">
                <i className="fa-solid fa-calendar-xmark mr-1" style={{ fontSize: 14 }}></i> No schedule for this date.
              </div>
            ) : (
              <div>
                {currentItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-4 py-3 transition-colors"
                    style={{ borderBottom: idx < currentItems.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Time */}
                      <div
                        className="flex items-center justify-center rounded-lg px-2.5 py-1.5"
                        style={{ background: "var(--bg-input)", minWidth: 52 }}
                      >
                        <span className="text-xs font-mono font-bold text-[var(--accent)]">
                          {new Date(item.airingAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" })}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate" style={{ maxWidth: 350 }}>
                          {item.koleksi?.title || "Unknown Title"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.koleksi?.type && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "var(--bg-input)", color: "var(--text-tertiary)" }}>
                              {item.koleksi.type}
                            </span>
                          )}
                          <span className="text-[10px] text-[var(--text-tertiary)] font-semibold">
                            Episode {item.episodeNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className="admin-badge"
                        style={{
                          background: item.isScraped ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                          color: item.isScraped ? "#10b981" : "#f59e0b",
                          border: `1px solid ${item.isScraped ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                        }}
                      >
                        <i className={`fa-solid ${item.isScraped ? "fa-check" : "fa-clock"}`} style={{ fontSize: 8 }}></i>
                        {item.isScraped ? "Scraped" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
