"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ── Custom Tooltip for dark theme ─────────────────────────── */
const DarkTooltip = ({ active, payload, label, valueFormatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(15,15,25,0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
        {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: 0, fontSize: 13, fontWeight: 700, color: entry.color }}>
          {entry.name}: {valueFormatter ? valueFormatter(entry.value) : entry.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

/* ── Growth Chart Component ────────────────────────────────── */
function GrowthChart({ data, dataKey, title, color, valueFormatter }) {
  const gradientId = `grad-${dataKey}`;

  const chartData = (data || []).map(d => ({
    month: d.month ? new Date(d.month).toLocaleDateString("id-ID", { month: "short", year: "2-digit" }) : "",
    [dataKey]: d.count ?? d.totalSeconds ?? 0,
  }));

  const lastValue = chartData.length > 0 ? chartData[chartData.length - 1][dataKey] : 0;

  return (
    <div className="admin-card p-5" style={{ overflow: "hidden" }}>
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{title}</h4>
        <span className="text-lg font-extrabold" style={{ color }}>
          {valueFormatter ? valueFormatter(lastValue) : lastValue.toLocaleString("id-ID")}
        </span>
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)] mb-3">Per bulan</p>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip content={<DarkTooltip valueFormatter={valueFormatter} />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "4 4" }} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: "var(--bg-card)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Bar Chart for Top Items ───────────────────────────────── */
function TopItemsBarChart({ data, dataKey, title, color, icon }) {
  const gradientId = `bar-grad-${dataKey}`;

  return (
    <div className="admin-card p-5" style={{ overflow: "hidden" }}>
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <i className={icon} style={{ color, fontSize: 13 }}></i>
        {title}
      </h3>
      {(!data || data.length === 0) ? (
        <div className="flex items-center justify-center h-48 text-xs text-[var(--text-tertiary)]">No data yet</div>
      ) : (
        <>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 8)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barCategoryGap="20%">
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="title"
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                  interval={0}
                  tickFormatter={v => v?.length > 10 ? v.slice(0, 10) + "…" : v}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar
                  dataKey={dataKey}
                  fill={`url(#${gradientId})`}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Leaderboard list below chart */}
          <div className="mt-4 space-y-2">
            {data.slice(0, 5).map((item, i) => (
              <div key={item.id || i} className="flex items-center gap-3 p-2 rounded-lg transition-colors" style={{ border: "1px solid var(--border)" }}>
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black text-white shrink-0"
                  style={{
                    background: i === 0 ? "linear-gradient(135deg, #f59e0b, #d97706)" :
                                i === 1 ? "linear-gradient(135deg, #94a3b8, #64748b)" :
                                i === 2 ? "linear-gradient(135deg, #b45309, #92400e)" :
                                "rgba(255,255,255,0.06)",
                    color: i > 2 ? "var(--text-tertiary)" : "#fff",
                  }}
                >
                  {i + 1}
                </span>
                {item.posterUrl && <img src={item.posterUrl} alt="" className="h-10 w-7 rounded object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.title}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{item.type} {item.releaseYear ? `• ${item.releaseYear}` : ""}</p>
                </div>
                <span className="text-xs font-bold shrink-0" style={{ color }}>
                  {(item[dataKey] || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main Dashboard ────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 0, anime: 0, episodes: 0, vouchers: 0, plans: 0 });
  const [growth, setGrowth] = useState(null);
  const [topFavorited, setTopFavorited] = useState([]);
  const [topWatched, setTopWatched] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, growthRes, favRes, watchRes] = await Promise.all([
        api.get("/api/admin/stats"),
        api.get("/api/admin/analytics/growth"),
        api.get("/api/admin/analytics/top-favorited?limit=8"),
        api.get("/api/admin/analytics/top-watched?limit=8"),
      ]);
      if (statsRes.data?.success) {
        setStats({
          users: statsRes.data.data.users || 0,
          anime: statsRes.data.data.anime || 0,
          episodes: statsRes.data.data.episodes || 0,
          vouchers: statsRes.data.data.vouchers || 0,
          plans: statsRes.data.data.plans || 0,
        });
      }
      if (growthRes.data?.success) setGrowth(growthRes.data.data);
      if (favRes.data?.success) setTopFavorited(favRes.data.data || []);
      if (watchRes.data?.success) setTopWatched(watchRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const statCards = [
    { title: "Total Users", value: stats.users, icon: "fa-solid fa-users", gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
    { title: "Total Anime", value: stats.anime, icon: "fa-solid fa-film", gradient: "linear-gradient(135deg, #8b5cf6, #6d28d9)" },
    { title: "Episodes", value: stats.episodes, icon: "fa-solid fa-play-circle", gradient: "linear-gradient(135deg, #ec4899, #db2777)" },
    { title: "Vouchers", value: stats.vouchers, icon: "fa-solid fa-ticket", gradient: "linear-gradient(135deg, #10b981, #059669)" },
    { title: "Plans", value: stats.plans, icon: "fa-solid fa-credit-card", gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
  ];

  const quickLinks = [
    { title: "Manage Users", href: "/admin/users", icon: "fa-solid fa-users", color: "#3b82f6" },
    { title: "Manage Anime", href: "/admin/anime", icon: "fa-solid fa-film", color: "#8b5cf6" },
    { title: "Vouchers", href: "/admin/vouchers", icon: "fa-solid fa-ticket", color: "#10b981" },
    { title: "Schedules", href: "/admin/schedules", icon: "fa-regular fa-calendar", color: "#f59e0b" },
    { title: "Broadcasts", href: "/admin/broadcasts", icon: "fa-solid fa-bullhorn", color: "#ec4899" },
    { title: "Mappings", href: "/admin/mappings", icon: "fa-solid fa-link", color: "#6366f1" },
  ];

  const formatWatchTime = (seconds) => {
    if (!seconds) return "0s";
    if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
    if (seconds >= 60) return `${Math.round(seconds / 60)}m`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <h2>{getGreeting()}, {user?.name?.split(" ")[0] || "Admin"} 👋</h2>
        <p>Welcome back to the control panel — here&apos;s an overview of Kolektaku.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--bg-card)]" style={{ border: "1px solid var(--border)" }} />
          ))}
        </div>
      ) : (
        <>
          {/* ═══ Stat Cards ═══ */}
          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
            initial="hidden" animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
          >
            {statCards.map(stat => (
              <motion.div
                key={stat.title}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }}
                className="admin-card admin-card-interactive flex items-center gap-3.5 p-5 cursor-default"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: stat.gradient, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                >
                  <i className={stat.icon} style={{ fontSize: 16 }}></i>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{stat.title}</p>
                  <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                    {stat.value?.toLocaleString("id-ID") || 0}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ═══ Growth Charts ═══ */}
          {growth && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <GrowthChart data={growth.userGrowth} dataKey="users" title="User Growth" color="#3b82f6" />
              <GrowthChart data={growth.animeGrowth} dataKey="anime" title="Anime Collection" color="#8b5cf6" />
              <GrowthChart data={growth.episodeGrowth} dataKey="episodes" title="Episode Growth" color="#ec4899" />
              <GrowthChart data={growth.watchTimeStats} dataKey="watchTime" title="Watch Time" color="#10b981" valueFormatter={formatWatchTime} />
            </motion.div>
          )}

          {/* ═══ Top Favorited & Watched ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <TopItemsBarChart data={topFavorited} dataKey="favoriteCount" title="Top Favorited Anime" color="#ec4899" icon="fa-solid fa-heart" />
            <TopItemsBarChart data={topWatched} dataKey="watcherCount" title="Most Watched Anime" color="#f59e0b" icon="fa-solid fa-fire" />
          </motion.div>

          {/* ═══ Quick Links ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 200, damping: 20 }}
            className="admin-card p-5"
          >
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <i className="fa-solid fa-bolt" style={{ color: "var(--accent)", fontSize: 13 }}></i>
              Quick Links
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {quickLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 rounded-lg transition-all group"
                  style={{ border: "1px solid var(--border)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = link.color; e.currentTarget.style.background = `${link.color}08`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110" style={{ background: `${link.color}15`, color: link.color }}>
                    <i className={link.icon} style={{ fontSize: 14 }}></i>
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">{link.title}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
