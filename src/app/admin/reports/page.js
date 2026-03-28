"use client";

import { useState, useEffect } from "react";
import reportService from "@/lib/reportApi";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = async (currentPage = 1) => {
    setLoading(true);
    try {
      const res = await reportService.getReports({ page: currentPage, limit: 15, status: filter === "ALL" ? "" : filter });
      if (res.success) {
        setReports(res.data.reports || []);
        setTotalPages(res.data.totalPages || 1);
        setPage(currentPage);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(1);
  }, [filter]);

  const handleAction = async (reportId, action) => {
    let confirmMsg = `Yakin ingin mengubah status laporan menjadi ${action}?`;
    if (action === "DELETE") {
      confirmMsg = "Yakin ingin MENGHAPUS secara permanen laporan ini?";
    }
    if (!window.confirm(confirmMsg)) return;
    
    setActionLoading(reportId);
    try {
      if (action === "RESOLVED") {
        await reportService.resolveReport(reportId);
      } else if (action === "DISMISSED") {
        await reportService.dismissReport(reportId);
      } else if (action === "DELETE") {
        await reportService.deleteReport(reportId);
      }
      // Close modal if open
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(null);
      }
      // Refresh list
      fetchReports(page);
    } catch (error) {
      console.error(`Failed to ${action} report:`, error);
      alert(error?.response?.data?.message || `Gagal memproses laporan`);
    } finally {
      setActionLoading(null);
    }
  };

  const getCategoryLabel = (cat) => {
    const categories = {
      'wrong_episode': 'Salah Episode',
      'broken_video': 'Video Rusak',
      'wrong_subtitle': 'Subtitle Salah',
      'missing_subtitle': 'Subtitle Hilang',
      'other': 'Lainnya'
    };
    return categories[cat] || cat;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return <span className="admin-badge bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">Pending</span>;
      case "RESOLVED":
        return <span className="admin-badge bg-green-500/10 text-green-600 border border-green-500/20">Selesai</span>;
      case "DISMISSED":
        return <span className="admin-badge bg-gray-500/10 text-gray-500 border border-gray-500/20">Diabaikan</span>;
      default:
        return <span className="admin-badge bg-blue-500/10 text-blue-500 border border-blue-500/20">{status}</span>;
    }
  };

  return (
    <div className="admin-page animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="admin-page-header flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2>User Reports</h2>
          <p>Kelola laporan masalah dari user terkait episode</p>
        </div>
        <div className="flex bg-[var(--bg-input)] p-1 rounded-lg border border-[var(--border)] overflow-x-auto custom-scrollbar">
          {["PENDING", "RESOLVED", "DISMISSED", "ALL"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                filter === status
                  ? "bg-[var(--bg-card)] text-[var(--accent)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {status === "ALL" ? "Semua" : status}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="admin-table whitespace-nowrap">
            <thead>
              <tr>
                <th>Pelapor</th>
                <th>Episode</th>
                <th>Kategori</th>
                <th>Pesan</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent"></div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-[var(--text-tertiary)]">
                    <i className="fa-solid fa-inbox text-2xl mb-2 block"></i>
                    Belum ada laporan {filter !== "ALL" ? "dengan status ini" : ""}
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--text-primary)]">{report.user?.name || '-'}</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">{report.user?.email || '-'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--text-primary)] max-w-[200px] truncate" title={report.episode?.title || `Episode ${report.episode?.number}`}>
                          {report.episode?.title || `Episode ${report.episode?.number}`}
                        </span>
                        {report.episode?.anime && (
                          <Link href={`/anime/${report.episode.anime.slug}`} className="text-[11px] text-[var(--accent)] hover:underline truncate max-w-[200px]">
                            {report.episode.anime.title}
                          </Link>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-input)] px-2 py-1 rounded border border-[var(--border)]">
                        {getCategoryLabel(report.category)}
                      </span>
                    </td>
                    <td>
                      <div className="max-w-[200px] truncate text-xs text-[var(--text-secondary)]" title={report.message}>
                        {report.message || <span className="italic opacity-50">Tidak ada pesan</span>}
                      </div>
                    </td>
                    <td>{getStatusBadge(report.status)}</td>
                    <td>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: id }) : '-'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-3">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchReports(page - 1)}
                disabled={page === 1}
                className="admin-btn admin-btn-ghost py-1.5 px-3 text-xs opacity-[0.85] disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() => fetchReports(page + 1)}
                disabled={page === totalPages}
                className="admin-btn admin-btn-ghost py-1.5 px-3 text-xs opacity-[0.85] disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--bg-secondary)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Detail Laporan</h3>
              <button 
                onClick={() => setSelectedReport(null)}
                className="rounded-full p-2 text-[var(--text-tertiary)] transition hover:bg-[var(--bg-input)] hover:text-[var(--danger)]"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Anime & Episode Info */}
              <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/20 text-[var(--accent)]">
                    <i className="fa-solid fa-film text-xl"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--text-primary)]">
                      {selectedReport.episode?.anime?.koleksi?.title || selectedReport.episode?.anime?.title || "Unknown Anime"}
                    </h4>
                    <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                      Episode {selectedReport.episode?.number} {selectedReport.episode?.title ? `- ${selectedReport.episode.title}` : ''}
                    </p>
                    
                    {selectedReport.episode?.anime?.koleksiId && (
                      <Link 
                        href={`/admin/anime/${selectedReport.episode.anime.koleksiId}`}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--accent-hover)]"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square"></i>
                        Buka Halaman Anime (Scrape Ulang)
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Report Context */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Pelapor</p>
                  <p className="mt-1 truncate font-medium text-[var(--text-primary)]" title={selectedReport.user?.email}>
                    {selectedReport.user?.name || "Anonim"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Waktu Dilaporkan</p>
                  <p className="mt-1 font-medium text-[var(--text-primary)]">
                    {selectedReport.createdAt ? formatDistanceToNow(new Date(selectedReport.createdAt), { addSuffix: true, locale: id }) : '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-3 col-span-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Kategori & Status</p>
                    <p className="mt-1 font-medium text-[var(--text-primary)]">
                      {getCategoryLabel(selectedReport.category)}
                    </p>
                  </div>
                  {getStatusBadge(selectedReport.status)}
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Pesan dari User :</p>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-4 text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap min-h-[100px]">
                  {selectedReport.message || <span className="italic opacity-50">Tidak ada pesan tambahan dari user.</span>}
                </div>
              </div>

            </div>

            {/* Actions Footer */}
            <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-4 flex items-center justify-between gap-3">
              <button
                onClick={() => handleAction(selectedReport.id, "DELETE")}
                disabled={actionLoading === selectedReport.id}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 transition disabled:opacity-50"
              >
                Hapus Laporan
              </button>

              {selectedReport.status === "PENDING" && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAction(selectedReport.id, "DISMISSED")}
                    disabled={actionLoading === selectedReport.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)] transition hover:bg-[var(--border-hover)] hover:text-white disabled:opacity-50"
                  >
                    {actionLoading === selectedReport.id ? "Memproses..." : "Abaikan"}
                  </button>
                  <button
                    onClick={() => handleAction(selectedReport.id, "RESOLVED")}
                    disabled={actionLoading === selectedReport.id}
                    className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-check"></i>
                    {actionLoading === selectedReport.id ? "Memproses..." : "Tandai Selesai"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
