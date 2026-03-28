"use client";

import { useState, useEffect } from "react";
import adminService from "@/lib/adminApi";
import membershipService from "@/lib/membershipApi";
import Swal from "sweetalert2";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const STORAGE_KEY = "kolektaku_admin_vouchers_state";

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY))?.page || 1; } catch { return 1; }
  });
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discountPercent: 10,
    maxUses: 100,
    planId: "",
    expiresAt: null,
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vouchersRes, plansRes] = await Promise.all([
        adminService.getVouchers({ page, limit: 10 }),
        membershipService.getPlans().catch(() => ({ data: [] }))
      ]);
      
      setVouchers(vouchersRes.data || []);
      setTotalPages(vouchersRes.totalPages || 1);
      setPlans(plansRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal memuat data voucher",
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
    fetchData();
  }, [page]);

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus voucher ini?")) return;
    try {
      await adminService.deleteVoucher(id);
      setVouchers(prev => prev.filter(v => v.id !== id));
      Swal.fire({
        icon: "success",
        title: "Terhapus",
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menghapus voucher",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      const payload = {
        ...formData,
        discountPercent: parseInt(formData.discountPercent),
        maxUses: parseInt(formData.maxUses),
        planId: formData.planId ? parseInt(formData.planId) : null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      };

      await adminService.createVoucher(payload);
      
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Voucher baru berhasil dibuat",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
      setIsModalOpen(false);
      setPage(1);
      fetchData();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal membuat voucher",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    } finally {
      setSaving(false);
    }
  };

  const isExpired = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <h2><i className="fa-solid fa-ticket mr-2" style={{ fontSize: 18, color: 'var(--accent)' }}></i>Manage Vouchers</h2>
          <p>Buat referal, promosi, dan diskon untuk membership plan.</p>
        </div>
        <button onClick={() => { setFormData({ code: "", discountPercent: 10, maxUses: 100, planId: "", expiresAt: null }); setIsModalOpen(true); }} className="admin-btn admin-btn-primary">
          <i className="fa-solid fa-plus" style={{ fontSize: 12 }}></i> Tambah Voucher
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Specific Plan</th>
                <th>Usages</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-[var(--text-tertiary)]">Memuat data...</td>
                </tr>
              ) : vouchers.length === 0 ? (
                 <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-[var(--text-tertiary)]">Tidak ada voucher ditemukan.</td>
                </tr>
              ) : (
                vouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-1 rounded">
                        {voucher.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">
                       {voucher.discountPercent}%
                    </td>
                    <td className="px-6 py-4">
                       {voucher.plan ? voucher.plan.title : "Semua Plan"}
                    </td>
                    <td className="px-6 py-4">
                       <span className={`${voucher.usedCount >= voucher.maxUses ? 'text-[var(--danger)] font-bold' : ''}`}>
                         {voucher.usedCount}
                       </span>
                       <span className="text-[var(--text-tertiary)] mx-1">/</span>
                       {voucher.maxUses}
                    </td>
                    <td className="px-6 py-4">
                       {!voucher.isActive ? (
                         <span className="admin-badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                           <i className="fa-solid fa-xmark" style={{ fontSize: 9 }}></i> Inactive
                         </span>
                       ) : isExpired(voucher.expiresAt) ? (
                         <span className="admin-badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                           <i className="fa-solid fa-clock" style={{ fontSize: 9 }}></i> Expired
                         </span>
                       ) : voucher.usedCount >= voucher.maxUses ? (
                         <span className="admin-badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                           <i className="fa-solid fa-check-double" style={{ fontSize: 9 }}></i> Fully Used
                         </span>
                       ) : (
                         <span className="admin-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                           <i className="fa-solid fa-check-circle" style={{ fontSize: 9 }}></i> Active
                         </span>
                       )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                       <button onClick={() => handleDelete(voucher.id)} className="admin-btn" style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                         <i className="fa-solid fa-trash" style={{ fontSize: 10 }}></i> Hapus
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

      {/* Modal Tambah Voucher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Tambah Voucher</h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Kode Voucher</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="KODE123"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-mono text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Diskon (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Max Usage</label>
                   <input
                    type="number"
                    min="1"
                    required
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Khusus Plan (Opsional)</label>
                <select
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="">Semua Plan Bisa Terapkan</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.title} ({plan.durationDays} Hari)</option>
                  ))}
                </select>
              </div>

               <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Tanggal Kadaluwarsa (Opsional)</label>
                <div className="relative">
                  <DatePicker
                    selected={formData.expiresAt}
                    onChange={(date) => setFormData({ ...formData, expiresAt: date })}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    timeCaption="Waktu"
                    dateFormat="dd/MM/yyyy HH:mm"
                    placeholderText="Pilih tanggal & waktu"
                    isClearable={true}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    wrapperClassName="w-full"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Buat Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
