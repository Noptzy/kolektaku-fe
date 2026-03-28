"use client";

import { useState, useEffect } from "react";
import adminService from "@/lib/adminApi";
import membershipService from "@/lib/membershipApi";
import Swal from "sweetalert2";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    durationDays: 30,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await membershipService.getPlans();
      setPlans(res.data || []);
    } catch (error) {
      console.error("Failed to fetch plans", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal memuat paket membership",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus paket ini? (User yang sudah berlangganan tidak akan terpengaruh)")) return;
    try {
      await adminService.deletePlan(id);
      setPlans(prev => prev.filter(p => p.id !== id));
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
        text: "Gagal menghapus paket",
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
        price: parseInt(formData.price),
        durationDays: parseInt(formData.durationDays),
      };

      if (editingPlan) {
        await adminService.updatePlan(editingPlan.id, payload);
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Paket berhasil diperbarui",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
        });
      } else {
        await adminService.createPlan(payload);
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Paket baru berhasil dibuat",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
        });
      }
      
      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal menyimpan paket",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingPlan(null);
    setFormData({ title: "", desc: "", price: "", durationDays: 30, isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      title: plan.title,
      desc: plan.desc || "",
      price: plan.price.toString(),
      durationDays: plan.durationDays,
      isActive: plan.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <h2><i className="fa-solid fa-credit-card mr-2" style={{ fontSize: 18, color: 'var(--accent)' }}></i>Membership Plans</h2>
          <p>Atur paket langganan premium yang tersedia.</p>
        </div>
        <button onClick={openAddModal} className="admin-btn admin-btn-primary">
          <i className="fa-solid fa-plus" style={{ fontSize: 12 }}></i> Tambah Plan
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama Paket</th>
                <th>Harga</th>
                <th>Durasi</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-8 text-[var(--text-tertiary)]"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Memuat data...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-[var(--text-tertiary)]"><i className="fa-solid fa-inbox mr-2"></i>Tidak ada paket ditemukan.</td></tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-[var(--text-primary)] text-base">{plan.title}</p>
                        <p className="text-xs text-[var(--text-tertiary)] max-w-xs truncate">{plan.desc}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-[var(--accent)]">
                       Rp {plan.price.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 font-medium">
                       {plan.durationDays ? `${plan.durationDays} Hari` : "Lifetime"}
                    </td>
                    <td className="px-6 py-4">
                       {plan.isActive !== false ? (
                         <span className="admin-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                           <i className="fa-solid fa-check-circle" style={{ fontSize: 9 }}></i> Active
                         </span>
                       ) : (
                         <span className="admin-badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                           <i className="fa-solid fa-eye-slash" style={{ fontSize: 9 }}></i> Hidden
                         </span>
                       )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEditModal(plan)} className="admin-btn" style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(var(--accent-rgb,236,72,153),0.1)', color: 'var(--accent)' }}>
                          <i className="fa-solid fa-pen-to-square" style={{ fontSize: 10 }}></i> Edit
                        </button>
                        <button onClick={() => handleDelete(plan.id)} className="admin-btn" style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                          <i className="fa-solid fa-trash" style={{ fontSize: 10 }}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit/Create Plan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
               {editingPlan ? "Edit Paket" : "Tambah Paket"}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Nama Paket</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Premium 1 Bulan"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Deskripsi</label>
                <textarea
                  rows="2"
                  value={formData.desc}
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  placeholder="Bebas iklan, akses semua konten..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Harga (Rp)</label>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={formData.price || ""}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  />
                  <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">Min. Rp 1.000 (Syarat QRIS Saweria)</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                    Durasi Aktif (Hari)
                  </label>
                   <input
                    type="number"
                    min="0"
                    value={formData.durationDays || ""}
                    onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    placeholder="0 = Lifetime"
                  />
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">Kosongkan atau isi 0 untuk paket Lifetime</p>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer mt-2 bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)]">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] bg-[var(--bg-card)] cursor-pointer"
                />
                <span className="text-sm font-bold text-[var(--text-primary)]">Active (Muncul di Halaman Membership)</span>
              </label>

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
                  {saving ? "Menyimpan..." : "Simpan Paket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
