"use client";

import { useState, useEffect } from "react";
import adminService from "@/lib/adminApi";
import Swal from "sweetalert2";

const STORAGE_KEY = "kolektaku_admin_transactions_state";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY))?.page || 1; } catch { return 1; }
  });
  const [totalPages, setTotalPages] = useState(1);

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const res = await adminService.getTransactions({ page, limit: 15 });
      setTransactions(res.data?.transactions || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal memuat riwayat transaksi",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ page: currentPage }));
  }, [currentPage]);

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <h2><i className="fa-solid fa-money-bill-wave mr-2" style={{ fontSize: 18, color: 'var(--accent)' }}></i>Riwayat Transaksi</h2>
          <p>Daftar pembelian keanggotaan premium di platform Kolektaku.</p>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID Transaksi</th>
                <th>User / Email</th>
                <th>Paket Dasar</th>
                <th>Jumlah Bayar</th>
                <th>Reference (Voucher)</th>
                <th>Status</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-[var(--text-tertiary)]"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Memuat transaksi...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-[var(--text-tertiary)]"><i className="fa-solid fa-inbox mr-2"></i>Belum ada riwayat pembayaran.</td></tr>
              ) : (
                transactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-[var(--accent)]">
                      {trx.id}
                      <br />
                      <span className="text-[10px] text-[var(--text-tertiary)]">{trx.paymentMethod}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-sm text-[var(--text-primary)]">{trx.user?.name || "Unknown"}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{trx.user?.email || "-"}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-[var(--text-primary)]">
                       {trx.plan?.title || `Plan ID ${trx.planId}`}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400">
                       Rp {trx.amount?.toLocaleString("id-ID") || 0}
                    </td>
                    <td className="px-6 py-4">
                       {trx.referenceId ? (
                         <span className="text-xs rounded border border-purple-500/30 bg-purple-500/10 text-purple-400 px-2 py-1 font-mono">
                           {trx.referenceId.slice(0, 8)}...
                         </span>
                       ) : <span className="text-[var(--text-tertiary)]">-</span>}
                    </td>
                    <td className="px-6 py-4">
                       {trx.status === "success" ? (
                         <span className="admin-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                           <i className="fa-solid fa-check-circle" style={{ fontSize: 9 }}></i> Sukses
                         </span>
                       ) : (
                         <span className="admin-badge" style={{ background: 'rgba(239,165,68,0.1)', color: '#eab308', border: '1px solid rgba(239,165,68,0.2)' }}>
                           <i className="fa-solid fa-clock" style={{ fontSize: 9 }}></i> {trx.status}
                         </span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {trx.createdAt ? new Date(trx.createdAt).toLocaleString("id-ID", {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      }) : <span className="text-[var(--text-tertiary)] italic">N/A</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] p-4">
            <span className="text-sm text-[var(--text-secondary)]">Hal {currentPage} dari {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="admin-btn admin-btn-ghost rounded px-3 py-1 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="admin-btn admin-btn-ghost rounded px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
