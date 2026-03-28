"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import meService from "@/lib/meApi";
import membershipService from "@/lib/membershipApi";

function normalizePagedPayload(payload) {
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  const total = Number.isFinite(payload?.total) ? payload.total : rows.length;
  return { rows, total };
}

export default function ProfileOverviewPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [trialStatus, setTrialStatus] = useState(null);
  const [counts, setCounts] = useState({
    favorites: 0,
    watch: 0,
    read: 0,
    notifications: 0,
    unread: 0,
  });

  const isPremium = user?.roleId <= 2;
  const isSuperadmin = user?.roleId === 1;
  const roleName = isSuperadmin ? "Admin" : user?.roleId === 2 ? "Premium" : "Basic";

  const refreshSnapshot = useCallback(async () => {
    if (!user) return;
    const [trial, favResp, watchResp, readResp, notifResp, unreadResp] = await Promise.all([
      membershipService.getTrialStatus().catch(() => null),
      meService.getFavorites({ page: 1, limit: 1 }).catch(() => null),
      meService.getWatchHistory({ page: 1, limit: 1 }).catch(() => null),
      meService.getReadHistory({ page: 1, limit: 1 }).catch(() => null),
      meService.getNotifications({ page: 1, limit: 1, unreadOnly: false }).catch(() => null),
      meService.getNotifications({ page: 1, limit: 1, unreadOnly: true }).catch(() => null),
    ]);

    const favData = normalizePagedPayload(favResp);
    const watchData = normalizePagedPayload(watchResp);
    const readData = normalizePagedPayload(readResp);
    const notifData = normalizePagedPayload(notifResp);
    const unreadData = normalizePagedPayload(unreadResp);

    return {
      trialStatus: trial?.data || null,
      counts: {
        favorites: favData.total,
        watch: watchData.total,
        read: readData.total,
        notifications: notifData.total,
        unread: unreadData.total,
      },
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const result = await refreshSnapshot();
        if (!result || cancelled) return;
        setTrialStatus(result.trialStatus);
        setCounts(result.counts);
      } catch (error) {
        if (!cancelled) setCounts({ favorites: 0, watch: 0, read: 0, notifications: 0, unread: 0 });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [refreshSnapshot]);

  const handleLogout = () => {
    if (window.confirm("Apakah kamu yakin ingin keluar?")) {
      logout();
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end mb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            My <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--info)] bg-clip-text text-transparent">Profile Space</span>
          </h1>
          <p className="mt-2 text-base text-[var(--text-secondary)]">Kelola aktivitas, riwayat, dan langganan kamu.</p>
        </div>
        {isSuperadmin && (
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 px-6 py-3 text-sm font-bold text-[var(--accent)] shadow-lg hover:bg-[var(--accent)]/20"
          >
            Admin Panel
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-6">
          <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/85 p-7 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-input)] text-2xl font-bold uppercase text-[var(--accent)] ring-2 ring-[var(--accent)]/40">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.name || "User"} 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-[var(--text-primary)]">{user.name || "Anonymous"}</p>
                <p className="truncate text-sm text-[var(--text-secondary)]">{user.email}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center justify-between rounded-xl bg-[var(--bg-primary)]/70 px-4 py-3">
                <span>Level Akses</span>
                <span className="font-semibold text-[var(--text-primary)]">{roleName}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--bg-primary)]/70 px-4 py-3">
                <span>Tanggal Bergabung</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {new Date(user.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          </section>

          <section className={`group relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 ${isPremium ? "border-[var(--accent)]/40 bg-gradient-to-br from-[var(--bg-card)] to-[var(--accent)]/10 shadow-[0_0_20px_rgba(var(--accent-rgb,236,72,153),0.08)]" : "border-[var(--border)] bg-[var(--bg-card)]"}`}>
            {isPremium && (
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-500 blur-[50px] opacity-20 transition-opacity duration-500 group-hover:opacity-40" />
            )}
            
            <div className="relative z-10 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Membership Level</p>
              {isPremium && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-2.5 py-1 text-[10px] font-extrabold tracking-widest text-[var(--accent)] uppercase shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    {!isSuperadmin && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75"></span>}
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span>
                  </span>
                  {isSuperadmin ? 'SYSTEM' : 'ACTIVE'}
                </span>
              )}
            </div>
            
            <div className="relative z-10 mt-4">
              <div className="flex items-center gap-4">
                {isPremium && (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-purple-600 text-white shadow-lg shadow-[var(--accent)]/30 ring-2 ring-white/10 overflow-hidden relative">
                    <div className="absolute inset-0 bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 relative z-10">
                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <h3 className={`truncate text-xl font-black tracking-tight ${isPremium ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"}`}>
                    {isSuperadmin 
                      ? "Superadmin Access" 
                      : user?.subscription?.plan?.title 
                        ? user.subscription.plan.title 
                        : user?.premiumTrial?.isUsed 
                          ? "Premium Trial" 
                          : isPremium 
                            ? "Premium Subscription" 
                            : "Basic Plan"}
                  </h3>
                  
                  {isPremium && !isSuperadmin && (user?.subscription?.expiredAt || user?.premiumTrial?.expiresAt) && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 opacity-60">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span className="text-[var(--text-primary)]">
                        {new Date(user?.subscription?.expiredAt || user?.premiumTrial?.expiresAt).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="ml-0.5 text-[9px] opacity-50 uppercase font-mono">WIB</span>
                    </p>
                  )}

                  {isSuperadmin && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 opacity-60">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span className="text-[var(--text-primary)]">Lifetime Privilege</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {!isPremium && (
              <button
                type="button"
                onClick={() => router.push("/membership")}
                className="relative z-10 mt-5 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--accent-hover)]"
              >
                Upgrade Premium
              </button>
            )}
          </section>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/90 p-8 shadow-xl backdrop-blur-md">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Menu Navigasi</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/profile/favorites" className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:bg-[var(--bg-primary)] hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xl font-black text-[var(--text-primary)]">{counts.favorites}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">Favorites</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">Lihat anime yang telah kamu tandai sebagai favorit.</p>
              </Link>
              
              <Link href="/profile/history" className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:bg-[var(--bg-primary)] hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </div>
                  <span className="text-xl font-black text-[var(--text-primary)]">{counts.watch}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">History</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">Lanjutkan tontonan episode terakhirmu dengan cepat.</p>
              </Link>

              <Link href="/profile/notifications" className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:bg-[var(--bg-primary)] hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className={`text-xl font-black ${counts.unread > 0 ? "text-[var(--danger)] animate-pulse" : "text-[var(--text-primary)]"}`}>
                    {counts.notifications}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">Notifications</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">Pemberitahuan episode rilis dan pengumuman.</p>
              </Link>

              <Link href="/profile/billing" className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:bg-[var(--bg-primary)] hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">Billing & Invoices</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">Riwayat transaksi Premium dan status kedaluwarsa.</p>
              </Link>
              <Link href="/profile/reports" className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:bg-[var(--bg-primary)] hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a15.26 15.26 0 0 1 9.14 0l3.172.793c.392.098.682.415.802.823.11.374.013.774-.249 1.055A15.26 15.26 0 0 1 3 15Z" />
                    </svg>
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">Laporan Saya</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">Pantau status laporan episode yang kamu kirim.</p>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
