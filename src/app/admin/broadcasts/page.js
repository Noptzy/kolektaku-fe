"use client";

import { useCallback, useEffect, useState } from "react";
import adminService from "@/lib/adminApi";

const initialForm = {
  level: "info",
  title: "",
  message: "",
  isActive: true,
};

function normalizePagedPayload(payload) {
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  return {
    rows,
    totalPages: payload?.totalPages || 1,
  };
}

const STORAGE_KEY = "kolektaku_admin_broadcasts_state";

export default function AdminBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [page, setPage] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY))?.page || 1; } catch { return 1; }
  });
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(initialForm);

  const fetchBroadcasts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await adminService.getBroadcasts({ page, limit: 10 });
      const normalized = normalizePagedPayload(response);
      setBroadcasts(normalized.rows);
      setTotalPages(normalized.totalPages);
    } catch (fetchError) {
      console.error("Failed to fetch broadcasts", fetchError);
      setError("Gagal memuat data broadcast.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ page }));
  }, [page]);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      await adminService.createBroadcast({
        level: formData.level,
        title: formData.title.trim(),
        message: formData.message.trim(),
        isActive: formData.isActive,
      });
      setFormData(initialForm);
      setPage(1);
      await fetchBroadcasts();
    } catch (submitError) {
      console.error("Failed to create broadcast", submitError);
      setError(submitError?.response?.data?.message || "Gagal membuat broadcast.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="admin-page-header">
        <h2><i className="fa-solid fa-bullhorn mr-2" style={{ fontSize: 18, color: 'var(--accent)' }}></i>Broadcast Center</h2>
        <p>Kirim pengumuman cepat ke semua user dengan level <span className="font-semibold">Maintenance</span> atau <span className="font-semibold">Info</span>.</p>
      </div>

      <section className="admin-card p-5">
        <h3 className="mb-4 text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <i className="fa-solid fa-pen-fancy" style={{ color: 'var(--accent)', fontSize: 13 }}></i> Create Broadcast
        </h3>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="level" className="text-sm font-medium text-[var(--text-secondary)]">
              Level
            </label>
            <select id="level" name="level" value={formData.level} onChange={handleChange} className="admin-select" style={{ width: '100%', padding: '10px 14px' }}>
              <option value="info">Info</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium text-[var(--text-secondary)]">
              Title
            </label>
            <input id="title" name="title" value={formData.title} onChange={handleChange} required maxLength={140} placeholder="Contoh: Maintenance server malam ini" className="admin-input" />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="message" className="text-sm font-medium text-[var(--text-secondary)]">
              Message
            </label>
            <textarea id="message" name="message" rows={4} value={formData.message} onChange={handleChange} required maxLength={800} placeholder="Tulis detail pengumuman untuk pengguna" className="admin-input" style={{ resize: 'vertical' }} />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] md:col-span-2">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            Active broadcast
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={submitting} className="admin-btn admin-btn-primary">
              <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} style={{ fontSize: 12 }}></i>
              {submitting ? "Publishing..." : "Publish Broadcast"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <i className="fa-solid fa-list" style={{ color: 'var(--accent)', fontSize: 13 }}></i> Recent Broadcasts
          </h3>
          <button type="button" onClick={fetchBroadcasts} className="admin-btn admin-btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }}>
            <i className="fa-solid fa-arrows-rotate" style={{ fontSize: 10 }}></i> Refresh
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-xl bg-[var(--bg-input)]" />
            ))}
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
            Belum ada broadcast yang dipublish.
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((item) => (
              <article key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="admin-badge" style={{
                    background: item.level === 'maintenance' ? 'rgba(245,158,11,0.1)' : 'rgba(14,165,233,0.1)',
                    color: item.level === 'maintenance' ? '#f59e0b' : '#0ea5e9',
                    border: `1px solid ${item.level === 'maintenance' ? 'rgba(245,158,11,0.2)' : 'rgba(14,165,233,0.2)'}`
                  }}>
                    <i className={`fa-solid ${item.level === 'maintenance' ? 'fa-wrench' : 'fa-circle-info'}`} style={{ fontSize: 9 }}></i>
                    {item.level}
                  </span>
                  <span className="admin-badge" style={{
                    background: item.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(113,113,122,0.1)',
                    color: item.isActive ? '#10b981' : '#71717a',
                    border: `1px solid ${item.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(113,113,122,0.2)'}`
                  }}>
                    <i className={`fa-solid ${item.isActive ? 'fa-check' : 'fa-pause'}`} style={{ fontSize: 9 }}></i>
                    {item.isActive ? "active" : "inactive"}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {new Date(item.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
                <h4 className="mt-2 text-base font-bold text-[var(--text-primary)]">{item.title}</h4>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.message}</p>
                <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                  By {item.admin?.name || item.admin?.email || "Admin"}
                </p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="admin-btn admin-btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>
            <i className="fa-solid fa-chevron-left" style={{ fontSize: 10 }}></i> Prev
          </button>
          <span className="text-xs font-medium text-[var(--text-tertiary)]">Page {page} of {Math.max(1, totalPages)}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((prev) => prev + 1)} className="admin-btn admin-btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>
            Next <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }}></i>
          </button>
        </div>
      </section>
    </div>
  );
}
