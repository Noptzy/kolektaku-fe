"use client";

import { useState, useEffect } from "react";
import adminService from "@/lib/adminApi";
import Swal from "sweetalert2";

const STORAGE_KEY = "kolektaku_admin_logs_state";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY))?.page || 1; } catch { return 1; }
  });
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await adminService.getAuditLogs({ page, limit: 15 });
      setLogs(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch logs", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal memuat audit logs",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ page }));
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const getActionColor = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes("create")) return "text-emerald-500 bg-emerald-500/10";
    if (actionLower.includes("update") || actionLower.includes("edit")) return "text-blue-500 bg-blue-500/10";
    if (actionLower.includes("delete") || actionLower.includes("remove")) return "text-red-500 bg-red-500/10";
    if (actionLower.includes("login") || actionLower.includes("auth")) return "text-purple-500 bg-purple-500/10";
    return "text-amber-500 bg-amber-500/10";
  };

  return (
    <div className="space-y-5">
      <div className="admin-page-header" style={{ marginBottom: 0 }}>
        <h2><i className="fa-solid fa-clipboard-list mr-2" style={{ fontSize: 18, color: 'var(--accent)' }}></i>Audit Logs</h2>
        <p>Pantau aktivitas dan perubahan yang dilakukan oleh Admin lain.</p>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Admin</th>
                <th>Aksi</th>
                <th>Target / Tabel</th>
                <th style={{ textAlign: 'right' }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-[var(--text-tertiary)]">Memuat data...</td>
                </tr>
              ) : logs.length === 0 ? (
                 <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-[var(--text-tertiary)]">Tidak ada log ditemukan.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="text-[var(--text-primary)] font-medium">
                         {new Date(log.createdAt).toLocaleDateString("id-ID", { month: "short", day: "numeric", year: "numeric" })}
                       </span>
                       <br />
                       <span className="text-xs text-[var(--text-tertiary)]">
                         {new Date(log.createdAt).toLocaleTimeString("id-ID")}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-xs font-bold uppercase">
                          {log.admin?.name?.[0] || log.admin?.email?.[0] || "?"}
                        </div>
                        <div>
                           <p className="text-[var(--text-primary)] font-medium text-xs">{log.admin?.name || "Unknown Admin"}</p>
                           <p className="text-[var(--text-tertiary)] text-[10px]">{log.admin?.email || "Unknown Email"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${getActionColor(log.action)}`}>
                         {log.action}
                       </span>
                    </td>
                    <td className="px-6 py-4 font-medium uppercase text-xs">
                       {log.entityType || "Sistem"} {log.entityId && <span className="text-[var(--text-tertiary)] ml-1">#{log.entityId.substring(0, 8)}...</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                       <button onClick={() => setSelectedLog(log)} className="admin-btn" style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(var(--accent-rgb,236,72,153),0.1)', color: 'var(--accent)' }}>
                         <i className="fa-solid fa-eye" style={{ fontSize: 10 }}></i> Detail
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */ }
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

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                 <i className="fa-solid fa-file-lines" style={{ color: 'var(--accent)', fontSize: 14 }}></i>
                 Audit Log Detail
               </h3>
               <button onClick={() => setSelectedLog(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition">
                 <i className="fa-solid fa-xmark" style={{ fontSize: 16 }}></i>
               </button>
            </div>
            
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="rounded-xl bg-[var(--bg-input)] p-4 border border-[var(--border)]">
                    <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Admin</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{selectedLog.admin?.name || "Unknown Admin"}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{selectedLog.admin?.email || "Unknown Email"}</p>
                 </div>
                 <div className="rounded-xl bg-[var(--bg-input)] p-4 border border-[var(--border)]">
                    <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Waktu</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {new Date(selectedLog.createdAt).toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {new Date(selectedLog.createdAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                    </p>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="rounded-xl bg-[var(--bg-input)] p-4 border border-[var(--border)]">
                    <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Aksi</p>
                    <span className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-bold uppercase ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                 </div>
                 <div className="rounded-xl bg-[var(--bg-input)] p-4 border border-[var(--border)]">
                    <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Target / Tabel</p>
                    <p className="text-sm font-medium text-[var(--text-primary)] uppercase">{selectedLog.entityType || "Sistem"}</p>
                    {selectedLog.entityId && <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">ID: {selectedLog.entityId}</p>}
                 </div>
               </div>

               {selectedLog.changes && (
                 <div className="rounded-xl bg-[var(--bg-input)] p-0 border border-[var(--border)] overflow-hidden">
                    <div className="bg-[var(--bg-card)] px-4 py-2 border-b border-[var(--border)]">
                      <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Perubahan Data (Changes)</p>
                    </div>
                    <div className="p-4 max-h-[300px] overflow-auto">
                      <pre className="text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.changes, null, 2)}
                      </pre>
                    </div>
                 </div>
               )}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="rounded-xl bg-[var(--bg-input)] px-6 py-2.5 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--border)]">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
