"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import adminService from "@/lib/adminApi";
import Swal from "sweetalert2";

const STORAGE_KEY = "kolektaku_admin_anime_state";

export default function AdminAnimePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const stateRestored = useRef(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [hasEpisodes, setHasEpisodes] = useState("");
  const [publishStatus, setPublishStatus] = useState("");
  const [mappedStatus, setMappedStatus] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");

  // Filter options from API
  const [filterOptions, setFilterOptions] = useState({ types: [], statuses: [], years: [], genres: [] });

  // Restore state from sessionStorage on mount
  useEffect(() => {
    if (!searchParams.toString()) {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setSearchTerm(parsed.searchTerm || "");
          setHasEpisodes(parsed.hasEpisodes || "");
          setPublishStatus(parsed.publishStatus || "");
          setMappedStatus(parsed.mappedStatus || "");
          setTypeFilter(parsed.typeFilter || "");
          setStatusFilter(parsed.statusFilter || "");
          setYearFilter(parsed.yearFilter || "");
          setGenreFilter(parsed.genreFilter || "");
          setPage(parsed.page || 1);
        }
      } catch (e) {
        console.error("Failed to restore admin state:", e);
      }
    }
    // Mark state as restored so the fetch effect can run
    stateRestored.current = true;
  }, []);

  // Save state to sessionStorage whenever filters change
  useEffect(() => {
    if (!stateRestored.current) return;
    const state = { searchTerm, hasEpisodes, publishStatus, mappedStatus, typeFilter, statusFilter, yearFilter, genreFilter, page };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [searchTerm, hasEpisodes, publishStatus, mappedStatus, typeFilter, statusFilter, yearFilter, genreFilter, page]);

  useEffect(() => {
    adminService.getFilterOptions?.().then(res => {
      if (res?.data) setFilterOptions(res.data);
    }).catch(() => {});
  }, []);

  const fetchAnime = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 12 };
      if (searchTerm) params.search = searchTerm;
      if (hasEpisodes) params.hasEpisodes = hasEpisodes;
      if (publishStatus) params.publishStatus = publishStatus;
      if (mappedStatus) params.mappedStatus = mappedStatus;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (yearFilter) params.year = yearFilter;
      if (genreFilter) params.genre = genreFilter;

      const res = await adminService.getAnime(params);
      setAnimeList(res.data?.data || res.data || []);
      setTotalPages(res.data?.totalPages || res.totalPages || 1);
      setTotal(res.data?.total || res.total || 0);
    } catch (error) {
      console.error("Failed to fetch anime", error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, hasEpisodes, publishStatus, mappedStatus, typeFilter, statusFilter, yearFilter, genreFilter]);

  // Fetch whenever filters/page change, but only after state is restored
  useEffect(() => {
    if (!stateRestored.current) return;
    fetchAnime();
  }, [fetchAnime]);

  // Refetch when user navigates back (window regains focus)
  useEffect(() => {
    const handleFocus = () => { if (stateRestored.current) fetchAnime(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAnime]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchAnime(); };

  const handleToggleVisibility = async (animeId, currentStatus) => {
    const newStatus = currentStatus === "published" ? "hidden" : "published";
    try {
      await adminService.toggleAnimeVisibility(animeId, newStatus);
      setAnimeList(prev => prev.map(a => a.id === animeId ? { ...a, publishStatus: newStatus } : a));
      Swal.fire({ icon: "success", title: "Updated!", text: `Status → ${newStatus}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: "var(--bg-card)", color: "var(--text-primary)" });
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Gagal mengubah status", background: "var(--bg-card)", color: "var(--text-primary)" });
    }
  };

  const resetFilters = () => {
    setSearchTerm(""); setHasEpisodes(""); setPublishStatus(""); setMappedStatus("");
    setTypeFilter(""); setStatusFilter(""); setYearFilter(""); setGenreFilter("");
    setPage(1);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const hasActiveFilters = hasEpisodes || publishStatus || mappedStatus || typeFilter || statusFilter || yearFilter || genreFilter || searchTerm;

  const statusBadge = (s) => {
    const colors = {
      published: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.2)' },
      hidden: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
      draft: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
    };
    const c = colors[s] || colors.draft;
    return (
      <span className="admin-badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
        <i className={`fa-solid ${s === 'published' ? 'fa-check-circle' : s === 'hidden' ? 'fa-eye-slash' : 'fa-pencil'}`} style={{ fontSize: 9 }}></i>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <h2>Anime Management</h2>
          <p>Full access — manage all anime, episodes, and metadata.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={async () => {
            const { isConfirmed } = await Swal.fire({
              title: "Konfirmasi",
              text: "Jalankan worker pencarian massal 9anime di background? Proses ini memakan waktu jika antrean banyak.",
              icon: "question",
              showCancelButton: true,
              confirmButtonText: "Ya, Jalankan",
              background: "var(--bg-card)",
              color: "var(--text-primary)"
            });
            if (isConfirmed) {
              try {
                await adminService.triggerBatchMapping();
                Swal.fire({ icon: "success", title: "Worker Dijalankan", text: "Proses pencarian link 9anime secara massal sedang berjalan di background.", background: "var(--bg-card)", color: "var(--text-primary)" });
              } catch (err) {
                Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || err.message, background: "var(--bg-card)", color: "var(--text-primary)" });
              }
            }
          }} className="admin-btn admin-btn-secondary">
            <i className="fa-solid fa-rotate" style={{ fontSize: 12 }}></i>
            Batch Map 9Anime
          </button>
          <button onClick={() => router.push("/admin/anime/manual")} className="admin-btn admin-btn-primary">
            <i className="fa-solid fa-plus" style={{ fontSize: 12 }}></i>
            Add Anime
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <i className="fa-solid fa-filter" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}></i>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Filters</span>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="ml-auto text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1">
              <i className="fa-solid fa-xmark" style={{ fontSize: 10 }}></i> Reset
            </button>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" style={{ fontSize: 12 }}></i>
            <input
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, slug..."
              className="admin-input" style={{ paddingLeft: 34 }}
            />
          </div>
          <button type="submit" className="admin-btn admin-btn-primary">
            <i className="fa-solid fa-search" style={{ fontSize: 11 }}></i>
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <select value={hasEpisodes} onChange={(e) => { setHasEpisodes(e.target.value); setPage(1); }} className="admin-select">
            <option value="">All Episodes</option>
            <option value="true">Has Episodes</option>
            <option value="false">No Episodes</option>
          </select>
          <select value={publishStatus} onChange={(e) => { setPublishStatus(e.target.value); setPage(1); }} className="admin-select">
            <option value="">All Visibility</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
            <option value="draft">Draft</option>
          </select>
          <select value={mappedStatus} onChange={(e) => { setMappedStatus(e.target.value); setPage(1); }} className="admin-select">
            <option value="">All Mapping</option>
            <option value="mapped">Mapped</option>
            <option value="unmapped">Unmapped</option>
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="admin-select">
            <option value="">All Types</option>
            {filterOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="admin-select">
            <option value="">All Status</option>
            {filterOptions.statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setPage(1); }} className="admin-select">
            <option value="">All Years</option>
            {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={genreFilter} onChange={(e) => { setGenreFilter(e.target.value); setPage(1); }} className="admin-select">
            <option value="">All Genres</option>
            {filterOptions.genres.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-tertiary)]">
          <span className="font-semibold text-[var(--text-secondary)]">{total.toLocaleString()}</span> anime found
        </p>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Anime</th>
                <th>Type</th>
                <th>Year</th>
                <th>Status</th>
                <th>Mapping</th>
                <th>Visibility</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-[var(--text-tertiary)]">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading...
                </td></tr>
              ) : animeList.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-[var(--text-tertiary)]">
                  <i className="fa-solid fa-inbox mr-2" style={{ fontSize: 16 }}></i>No anime found.
                </td></tr>
              ) : (
                animeList.map((anime) => (
                  <tr key={anime.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        {anime.posterUrl ? (
                          <img src={anime.posterUrl} alt="" className="h-12 w-9 rounded-md object-cover" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} />
                        ) : (
                          <div className="h-12 w-9 rounded-md bg-[var(--bg-input)] flex items-center justify-center">
                            <i className="fa-solid fa-image text-[var(--text-tertiary)]" style={{ fontSize: 10 }}></i>
                          </div>
                        )}
                        <div style={{ maxWidth: 200 }}>
                          <p className="font-semibold text-[var(--text-primary)] text-[13px] truncate">{anime.title}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] truncate">{anime.slug}</p>
                          {anime.genres?.length > 0 && (
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate">
                              {anime.genres.map(g => g.genre?.name || g.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-[11px] font-bold uppercase text-[var(--text-tertiary)]">
                        {anime.type || anime.animeDetail?.format || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="text-[12px] text-[var(--text-secondary)]">{anime.releaseYear || '—'}</span>
                    </td>
                    <td>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] capitalize">{anime.status || '—'}</span>
                    </td>
                    <td>
                      {anime.mapping?.nineanimeId ? (
                        <span className="admin-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <i className="fa-solid fa-check" style={{ fontSize: 8 }}></i> Mapped
                        </span>
                      ) : (
                        <span className="admin-badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <i className="fa-solid fa-xmark" style={{ fontSize: 8 }}></i> None
                        </span>
                      )}
                    </td>
                    <td>{statusBadge(anime.publishStatus)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => router.push(`/admin/anime/${anime.id}`)}
                          className="admin-btn" style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(var(--accent-rgb,236,72,153),0.1)', color: 'var(--accent)' }}
                        >
                          <i className="fa-solid fa-pen-to-square" style={{ fontSize: 10 }}></i> Edit
                        </button>
                        <button
                          onClick={() => handleToggleVisibility(anime.id, anime.publishStatus)}
                          className="admin-btn" style={{
                            padding: '5px 10px', fontSize: 11,
                            background: anime.publishStatus === 'published' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            color: anime.publishStatus === 'published' ? '#ef4444' : '#10b981',
                          }}
                        >
                          <i className={`fa-solid ${anime.publishStatus === 'published' ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: 10 }}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3.5" style={{ borderTop: '1px solid var(--border)' }}>
          <button disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="admin-btn admin-btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>
            <i className="fa-solid fa-chevron-left" style={{ fontSize: 10 }}></i> Prev
          </button>
          <span className="text-xs font-medium text-[var(--text-tertiary)]">Page {page} of {Math.max(1, totalPages)}</span>
          <button disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)} className="admin-btn admin-btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>
            Next <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }}></i>
          </button>
        </div>
      </div>
    </div>
  );
}
