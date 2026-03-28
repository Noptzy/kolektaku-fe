"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import meService from "@/lib/meApi";

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)]/70 p-8 text-center">
      <p className="text-base font-semibold text-[var(--text-primary)]">Belum ada notifikasi</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Update episode favorit dan pengumuman admin akan muncul di sini.</p>
    </div>
  );
}

export default function ProfileNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busyNotificationId, setBusyNotificationId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [allResp, unreadResp] = await Promise.all([
        meService.getNotifications({ page: 1, limit: 50, unreadOnly: false }),
        meService.getNotifications({ page: 1, limit: 1, unreadOnly: true }),
      ]);

      const allRows = Array.isArray(allResp?.data) ? allResp.data : [];
      const unreadTotal = Number.isFinite(unreadResp?.total)
        ? unreadResp.total
        : Array.isArray(unreadResp?.data)
          ? unreadResp.data.length
          : 0;

      setNotifications(allRows);
      setUnreadCount(unreadTotal);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markOneAsRead = async (notificationId) => {
    setBusyNotificationId(notificationId);
    try {
      await meService.markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                isRead: true,
              }
            : item,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification", error);
    } finally {
      setBusyNotificationId(null);
    }
  };

  const markAllAsRead = async () => {
    setBusyNotificationId("all");
    try {
      await meService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications", error);
    } finally {
      setBusyNotificationId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-2xl bg-[var(--bg-primary)]/70" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="mb-2">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent)] hover:underline">
          &larr; Back to Profile
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Notifications</h2>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)]/60 p-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Unread Notifications</p>
          <p className="text-xs text-[var(--text-secondary)]">{unreadCount} belum dibaca</p>
        </div>
        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || busyNotificationId === "all"}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyNotificationId === "all" ? "Updating..." : "Mark all as read"}
        </button>
      </div>

      {!notifications.length ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <article key={item.id} className={`rounded-2xl border p-4 ${item.isRead ? "border-[var(--border)] bg-[var(--bg-card)]" : "border-[var(--accent)]/30 bg-[var(--accent)]/5"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{item.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.message}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
                    <span className="rounded-full bg-[var(--bg-input)] px-2 py-1">{item.type === "adminBroadcast" ? "Admin Broadcast" : "Episode Update"}</span>
                    {item.broadcast?.level ? (
                      <span className="rounded-full bg-[var(--bg-input)] px-2 py-1 uppercase">{item.broadcast.level}</span>
                    ) : null}
                    <span>{new Date(item.createdAt).toLocaleString("id-ID")}</span>
                  </div>
                </div>

                {!item.isRead ? (
                  <button
                    type="button"
                    onClick={() => markOneAsRead(item.id)}
                    disabled={busyNotificationId === item.id}
                    className="rounded-lg border border-[var(--accent)]/30 px-2.5 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyNotificationId === item.id ? "Saving..." : "Mark read"}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
