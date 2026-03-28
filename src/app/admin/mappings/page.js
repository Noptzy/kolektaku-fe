"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import adminService from "@/lib/adminApi";
import { animeService } from "@/lib/animeApi";
import Swal from "sweetalert2";

const STORAGE_KEY = "kolektaku_admin_mappings_state";

export default function AdminMappingsPage() {
  const searchParams = useSearchParams();
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [connectModal, setConnectModal] = useState(false);
  const [connectId, setConnectId] = useState(null);
  const [searchQueryConnect, setSearchQueryConnect] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef(null);
  const [selectedIds, setSelectedIds] = useState([]); // Array of candidate IDs
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [detailAnime, setDetailAnime] = useState(null); // The Koleksi object for modal


  // Restore state from sessionStorage on mount
  useEffect(() => {
    if (!searchParams.toString()) {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setStatusFilter(parsed.statusFilter || "pending");
          setPage(parsed.page || 1);
          setSearch(parsed.search || "");
          setSearchQuery(parsed.searchQuery || "");
        }
      } catch (e) {
        console.error("Failed to restore mappings state:", e);
      }
    }
  }, []);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ statusFilter, page, search, searchQuery }));
  }, [statusFilter, page, search, searchQuery]);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const res = await adminService.getMappings({ page, limit: 15, status: statusFilter, search: searchQuery });
      setMappings(res.data || []);
      setTotalPages(res.totalPages || 1);
      setSelectedIds([]); // Clear selection on fetch/filter change
    } catch (error) {
      console.error("Failed to fetch mappings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMappings(); }, [page, statusFilter, searchQuery]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); setSearchQuery(search); };

  const swalOpts = { background: "var(--bg-card)", color: "var(--text-primary)" };

  const handleApprove = async (mappingId, candidateId) => {
    try {
      await adminService.approveMapping(mappingId, candidateId);
      Swal.fire({ icon: "success", title: "Approved!", toast: true, position: "top-end", showConfirmButton: false, timer: 2000, ...swalOpts });
      fetchMappings();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed", ...swalOpts });
    }
  };

  const handleIgnore = async (mappingId) => {
    const r = await Swal.fire({ title: "Ignore?", text: "Mapping ini akan diabaikan.", icon: "warning", showCancelButton: true, confirmButtonColor: "var(--accent)", cancelButtonColor: "#ef4444", confirmButtonText: "Ya, Ignore!", cancelButtonText: "Batal", ...swalOpts });
    if (!r.isConfirmed) return;
    try {
      await adminService.ignoreMapping(mappingId);
      Swal.fire({ icon: "success", title: "Ignored", toast: true, position: "top-end", showConfirmButton: false, timer: 2000, ...swalOpts });
      fetchMappings();
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to ignore", ...swalOpts });
    }
  };

  const handleManualConnectSearch = (query) => {
    setSearchQueryConnect(query);
    if (!query.trim()) { setSearchResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await animeService.searchAnime(query, 1, 10);
        setSearchResults(res.data || []);
      } catch { } finally { setIsSearching(false); }
    }, 500);
  };

  const handleManualConnectSelect = async (koleksiId) => {
    try {
      await adminService.manualConnectMapping(connectId, koleksiId);
      setConnectModal(false);
      Swal.fire({ icon: "success", title: "Connected!", toast: true, position: "top-end", showConfirmButton: false, timer: 2000, ...swalOpts });
      fetchMappings();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed", ...swalOpts });
    }
  };

  const handleBulkApprove = async () => {
    const items = selectedIds.map(id => {
      const c = mappings.find(item => item.id === id);
      return { mappingId: c.pendingMapping.id, candidateId: id };
    });

    const r = await Swal.fire({ 
      title: "Approve Selected?", 
      text: `Setujui ${selectedIds.length} mapping sekaligus?`, 
      icon: "question", 
      showCancelButton: true, 
      confirmButtonColor: "#10b981", 
      ...swalOpts 
    });
    if (!r.isConfirmed) return;

    try {
      setIsBulkLoading(true);
      await adminService.bulkApproveMapping(items);
      Swal.fire({ icon: "success", title: "Bulk Approved!", toast: true, position: "top-end", showConfirmButton: false, timer: 2000, ...swalOpts });
      fetchMappings();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: "Bulk approval failed", ...swalOpts });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkIgnore = async () => {
    const mappingIds = [...new Set(selectedIds.map(id => mappings.find(item => item.id === id).pendingMapping.id))];

    const r = await Swal.fire({ 
      title: "Ignore Selected?", 
      text: `Abaikan ${mappingIds.length} source anime sekaligus?`, 
      icon: "warning", 
      showCancelButton: true, 
      confirmButtonColor: "#ef4444", 
      ...swalOpts 
    });
    if (!r.isConfirmed) return;

    try {
      setIsBulkLoading(true);
      await adminService.bulkIgnoreMapping(mappingIds);
      Swal.fire({ icon: "success", title: "Bulk Ignored!", toast: true, position: "top-end", showConfirmButton: false, timer: 2000, ...swalOpts });
      fetchMappings();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: "Bulk ignore failed", ...swalOpts });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === mappings.length) setSelectedIds([]);
    else setSelectedIds(mappings.filter(m => m.pendingMapping?.status === 'pending').map(m => m.id));
  };

  const statusBadge = (s) => {
    const map = {
      pending: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)', icon: 'fa-clock' },
      resolved: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.2)', icon: 'fa-check-circle' },
      ignored: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)', icon: 'fa-ban' },
    };
    const c = map[s] || map.pending;
    return (
      <span className="admin-badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
        <i className={`fa-solid ${c.icon}`} style={{ fontSize: 9 }}></i> {s}
      </span>
    );
  };

  const tabBtn = (s) => (
    <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
      className="admin-btn capitalize" style={{
        fontSize: 12, padding: '6px 14px',
        background: statusFilter === s ? 'var(--accent)' : 'var(--bg-input)',
        color: statusFilter === s ? 'white' : 'var(--text-secondary)',
        boxShadow: statusFilter === s ? '0 2px 8px rgba(var(--accent-rgb,236,72,153),0.3)' : 'none',
      }}>
      {s}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <h2><i className="fa-solid fa-link mr-2" style={{ fontSize: 18, color: 'var(--accent)' }}></i>Anime Mappings</h2>
          <p>Review & approve/ignore provider mappings.</p>
        </div>
        <div className="flex gap-1.5">{["pending", "resolved", "ignored"].map(tabBtn)}</div>
      </div>

      {/* Search & Bulk Toggle */}
      <div className="flex gap-2 items-center">
        {statusFilter === "pending" && mappings.length > 0 && (
          <button onClick={toggleSelectAll} className="admin-btn admin-btn-ghost shrink-0" style={{ padding: '8px' }}>
             <i className={`fa-regular ${selectedIds.length === mappings.length ? 'fa-square-check' : 'fa-square'} text-lg`}></i>
          </button>
        )}
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" style={{ fontSize: 12 }}></i>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, slug, or title..." className="admin-input" style={{ paddingLeft: 34 }} />
          </div>
          <button type="submit" className="admin-btn admin-btn-primary">
            <i className="fa-solid fa-search" style={{ fontSize: 11 }}></i> Search
          </button>
        </form>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="admin-card px-6 py-10 text-center text-[var(--text-tertiary)]">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading...
          </div>
        ) : mappings.length === 0 ? (
          <div className="admin-card px-6 py-10 text-center text-[var(--text-tertiary)]" style={{ borderStyle: 'dashed' }}>
            <i className="fa-solid fa-inbox mr-2" style={{ fontSize: 16 }}></i>No "{statusFilter}" mappings found.
          </div>
        ) : (
          mappings.map((c) => {
            const m = c.pendingMapping || {};
            const koleksi = m.koleksi || {};

            return (
            <div key={c.id} 
                 className={`admin-card overflow-hidden transition-all border-l-4 ${selectedIds.includes(c.id) ? 'border-l-[var(--accent)] ring-1 ring-[var(--accent)]/30' : 'border-l-transparent'}`}
                 style={{ cursor: 'pointer' }}
                 onClick={() => setDetailAnime(koleksi)}
            >
               <div className="flex items-center justify-between gap-3 p-3.5">
                 
                 {/* Checkbox */}
                 {statusFilter === "pending" && (
                    <div className="shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}>
                       <i className={`fa-regular ${selectedIds.includes(c.id) ? 'fa-square-check text-[var(--accent)]' : 'fa-square text-[var(--text-tertiary)]'} text-lg`}></i>
                    </div>
                 )}

                 {/* Left side: Anilist info */}
                 <div className="flex items-center gap-3 min-w-0 flex-1">
                    {koleksi.posterUrl ? (
                        <img src={koleksi.posterUrl} alt="" className="h-10 w-7 rounded object-cover shrink-0" />
                    ) : (
                        <div className="flex h-10 w-7 shrink-0 items-center justify-center rounded bg-[var(--bg-input)]">
                           <i className="fa-solid fa-image text-[var(--text-tertiary)]" style={{ fontSize: 10 }}></i>
                        </div>
                    )}
                    <div className="min-w-0">
                       <p className="text-[10px] font-bold uppercase" style={{ color: '#10b981' }}>
                         Target {m.sourceName && `(${m.sourceName})`}
                       </p>
                       <p className="font-semibold text-[13px] text-[var(--text-primary)] truncate">
                         {koleksi.title || m.scrapedTitle || "Unknown"}
                       </p>
                    </div>
                 </div>

                 {/* Middle: Candidate info */}
                 <div className="flex flex-col min-w-0 flex-1 px-4 border-l border-[var(--border)]">
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
                       <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[8px] font-bold" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                          {c.similarityScore ? `${(parseFloat(c.similarityScore) * 100).toFixed(0)}%` : "?"}
                       </span>
                       Mapping Candidate
                    </p>
                    <p className="font-semibold text-[13px] text-[var(--text-primary)] truncate mt-0.5">
                       {c.targetTitle || "Unknown"}
                    </p>
                 </div>

                 {/* Right Side: Actions */}
                 <div className="flex items-center gap-2.5 shrink-0">
                    {m.status === "pending" && (
                       <>
                         <button onClick={(e) => { e.stopPropagation(); handleApprove(m.id, c.id); }} className="admin-btn" style={{ padding: '6px 12px', fontSize: 11, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                           <i className="fa-solid fa-check" style={{ fontSize: 10 }}></i> Approve
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); handleIgnore(m.id); }} className="admin-btn" style={{ padding: '6px 12px', fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                           <i className="fa-solid fa-ban" style={{ fontSize: 10 }}></i> Ignore
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); setConnectId(m.id); setSearchQueryConnect(""); setSearchResults([]); setConnectModal(true); }} className="admin-btn" style={{ padding: '6px 10px', fontSize: 11, background: 'rgba(var(--accent-rgb,236,72,153),0.1)', color: 'var(--accent)' }}>
                           <i className="fa-solid fa-plug" style={{ fontSize: 10 }}></i> Manual
                         </button>
                       </>
                    )}
                    {(m.status === "resolved" || m.status === "ignored") && statusBadge(m.status)}
                 </div>
               </div>
            </div>
          )})
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="admin-btn admin-btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>
          <i className="fa-solid fa-chevron-left" style={{ fontSize: 10 }}></i> Prev
        </button>
        <span className="text-xs font-medium text-[var(--text-tertiary)]">Page {page} of {Math.max(1, totalPages)}</span>
        <button disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)} className="admin-btn admin-btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>
          Next <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }}></i>
        </button>
      </div>

      {/* Manual Connect Modal */}
      {connectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg admin-card p-5 flex flex-col max-h-[80vh]" style={{ boxShadow: 'var(--admin-shadow-lg)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <i className="fa-solid fa-plug" style={{ color: 'var(--accent)', fontSize: 14 }}></i>
                Manual Connect
              </h3>
              <button onClick={() => setConnectModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
                <i className="fa-solid fa-xmark" style={{ fontSize: 16 }}></i>
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              <div className="relative">
                <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" style={{ fontSize: 12 }}></i>
                <input type="text" value={searchQueryConnect} onChange={(e) => handleManualConnectSearch(e.target.value)} placeholder="Search anime..." className="admin-input" style={{ paddingLeft: 34 }} />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {isSearching ? (
                  <p className="text-center text-[12px] text-[var(--text-tertiary)] py-4">
                    <i className="fa-solid fa-spinner fa-spin mr-1"></i>Searching...
                  </p>
                ) : searchResults.length > 0 ? (
                  searchResults.map(anime => (
                    <div key={anime.id} onClick={() => handleManualConnectSelect(anime.id)}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all"
                      style={{ border: '1px solid var(--border)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(var(--accent-rgb,236,72,153),0.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      {anime.posterUrl ? (
                        <img src={anime.posterUrl} alt="" className="w-9 h-12 object-cover rounded" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                      ) : (
                        <div className="w-9 h-12 bg-[var(--bg-input)] rounded flex items-center justify-center">
                          <i className="fa-solid fa-image text-[var(--text-tertiary)]" style={{ fontSize: 10 }}></i>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[12px] text-[var(--text-primary)] truncate">{anime.title}</p>
                        <div className="flex gap-1.5 mt-0.5">
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{anime.type}</span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{anime.status}</span>
                        </div>
                      </div>
                      <span className="admin-btn shrink-0" style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(var(--accent-rgb,236,72,153),0.1)', color: 'var(--accent)' }}>
                        <i className="fa-solid fa-plug" style={{ fontSize: 9 }}></i> Connect
                      </span>
                    </div>
                  ))
                ) : searchQueryConnect.trim() ? (
                  <p className="text-center text-[12px] text-[var(--text-tertiary)] py-4">No anime found.</p>
                ) : (
                  <p className="text-center text-[12px] text-[var(--text-tertiary)] py-4 italic">
                    <i className="fa-solid fa-keyboard mr-1" style={{ fontSize: 11 }}></i>Type to search anime in database.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-4 px-6 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent)] shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-fade-in-up">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[var(--accent)]">{selectedIds.length} Selected</span>
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Bulk Actions</span>
          </div>
          <div className="h-8 w-px bg-[var(--border)] mx-2"></div>
          <button 
            disabled={isBulkLoading}
            onClick={handleBulkApprove} 
            className="admin-btn bg-[#10b981] text-white hover:bg-[#059669]"
            style={{ padding: '8px 16px', fontSize: 12 }}
          >
            {isBulkLoading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-check-double mr-2"></i>}
            Approve All
          </button>
          <button 
            disabled={isBulkLoading}
            onClick={handleBulkIgnore} 
            className="admin-btn bg-[#ef4444] text-white hover:bg-[#dc2626]"
            style={{ padding: '8px 16px', fontSize: 12 }}
          >
            {isBulkLoading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-ban mr-2"></i>}
            Ignore All
          </button>
          <button onClick={() => setSelectedIds([])} className="admin-btn admin-btn-ghost" style={{ padding: '8px' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {detailAnime && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in" onClick={() => setDetailAnime(null)}>
          <div className="w-full max-w-2xl bg-[var(--bg-card)] rounded-3xl overflow-hidden shadow-2xl border border-[var(--border)] relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDetailAnime(null)} className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
            
            <div className="flex flex-col md:flex-row h-full overflow-y-auto custom-scrollbar">
              <div className="w-full md:w-1/3 shrink-0">
                <img src={detailAnime.posterUrl} alt="" className="w-full h-full object-cover aspect-[2/3]" />
              </div>
              <div className="p-6 md:p-8 flex-1 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--accent)]/20 text-[var(--accent)] ring-1 ring-[var(--accent)]/30">
                      {detailAnime.animeDetail?.format || "TV"}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-tertiary)] flex items-center gap-1">
                      <i className="fa-solid fa-calendar" style={{ fontSize: 10 }}></i> {detailAnime.releaseYear} {detailAnime.animeDetail?.season}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] leading-tight">{detailAnime.title}</h2>
                  {detailAnime.altTitles && (
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1 italic">
                      {Object.values(detailAnime.altTitles).filter(t => t && typeof t === 'string').join(", ")}
                    </p>
                  )}
                </div>

                {detailAnime.synopsis && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Description</h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-[6]" dangerouslySetInnerHTML={{ __html: detailAnime.synopsis }}></p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Statistics</h4>
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-[var(--text-primary)] flex justify-between">
                         <span className="text-[var(--text-secondary)]">Total:</span> 
                         <span className="font-bold">{detailAnime.animeDetail?.totalEpisodes || "?"} Eps</span>
                      </div>
                      <div className="text-xs text-[var(--text-primary)] flex justify-between">
                         <span className="text-[var(--text-secondary)]">In DB:</span> 
                         <span className="font-bold text-[var(--accent)]">{detailAnime.animeDetail?._count?.episodes || 0} Eps</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Studios</h4>
                    <div className="flex flex-wrap gap-1">
                      {detailAnime.studios?.map(s => (
                        <span key={s.studio.id} className="text-xs font-semibold text-[var(--text-primary)]">{s.studio.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Genres</h4>
                    <div className="flex flex-wrap gap-1">
                      {detailAnime.genres?.map(g => (
                        <span key={g.genre.id} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-secondary)]">{g.genre.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
