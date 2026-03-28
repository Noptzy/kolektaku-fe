"use client";

import { useState, useEffect } from "react";
import adminService from "@/lib/adminApi";
import membershipService from "@/lib/membershipApi";
import Swal from "sweetalert2";
import { useAdminState } from "@/lib/useStatePersistence";

export default function AdminUsersPage() {
  const { state, setState, setPage, page } = useAdminState("users", {
    page: 1,
    searchTerm: "",
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const searchTerm = state.searchTerm;

  // Modal states
  const [plans, setPlans] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [assignPlan, setAssignPlan] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers({ page, limit: 10, search: searchTerm });
      setUsers(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch users", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal memuat daftar user",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, [page]);

  const fetchPlans = async () => {
    try {
      const res = await membershipService.getPlans(); 
      setPlans(res.data || []);
    } catch(err) {
      console.error(err);
    }
  }

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setEditRole(user.roleId);
    setAssignPlan("");
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    try {
      setUpdating(true);
      // Update role if changed
      if (editRole && editRole !== selectedUser.roleId) {
        await adminService.updateUserRole(selectedUser.id, parseInt(editRole));
      }
      // Assign membership if selected
      if (assignPlan) {
        await adminService.assignMembership(selectedUser.id, assignPlan);
      }

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "User berhasil diperbarui",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
      setIsEditModalOpen(false);
      fetchUsers(); // refresh data
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Gagal memperbarui user",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const result = await Swal.fire({
        title: "Apakah Anda Yakin?",
        text: "Anda tidak akan dapat mengembalikan user ini!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Ya, Hapus!",
        cancelButtonText: "Batal",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });

      if (result.isConfirmed) {
        setLoading(true);
        await adminService.deleteUser(userId);
        Swal.fire({
          icon: "success",
          title: "Terhapus!",
          text: "User berhasil dihapus.",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
        });
        fetchUsers();
      }
    } catch (error) {
      console.error("Gagal menghapus user", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Terjadi kesalahan saat menghapus user",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setState({ searchTerm });
    setPage(1);
    fetchUsers();
  };

  const roleColors = {
    1: "bg-purple-500/10 text-purple-500", // Superadmin
    2: "bg-amber-500/10 text-amber-500", // Premium
    3: "bg-blue-500/10 text-blue-500", // Basic
  };

  const roleNames = {
    1: "Superadmin",
    2: "Premium",
    3: "Basic",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <h2><i className="fa-solid fa-users mr-2" style={{ fontSize: 18, color: 'var(--accent)' }}></i>Manage Users</h2>
          <p>Lihat dan atur daftar pengguna Kolektaku.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 max-w-sm flex gap-2">
          <div className="flex-1 relative">
            <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" style={{ fontSize: 12 }}></i>
            <input type="text" placeholder="Cari email atau nama..." value={searchTerm} onChange={(e) => setState({ searchTerm: e.target.value })} className="admin-input" style={{ paddingLeft: 34 }} />
          </div>
          <button type="submit" className="admin-btn admin-btn-primary"><i className="fa-solid fa-search" style={{ fontSize: 11 }}></i> Cari</button>
        </form>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center py-8 text-[var(--text-tertiary)]"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Memuat data...</td></tr>
              ) : users.length === 0 ? (
                 <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-[var(--text-tertiary)]">Tidak ada pengguna ditemukan.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <img src={user.avatarUrl || "https://ui-avatars.com/api/?name=" + (user.name || 'User') + "&background=random"} alt="" className="h-9 w-9 rounded-full object-cover" style={{ boxShadow: '0 0 0 2px rgba(var(--accent-rgb,236,72,153),0.2)' }} />
                        <div>
                          <p className="font-semibold text-[13px] text-[var(--text-primary)]">{user.name}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`admin-badge ${user.roleId === 1 ? '' : ''}`} style={{
                        background: user.roleId === 1 ? 'rgba(139,92,246,0.1)' : user.roleId === 2 ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                        color: user.roleId === 1 ? '#8b5cf6' : user.roleId === 2 ? '#f59e0b' : '#3b82f6',
                        border: `1px solid ${user.roleId === 1 ? 'rgba(139,92,246,0.2)' : user.roleId === 2 ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)'}`
                      }}>
                        <i className={`fa-solid ${user.roleId === 1 ? 'fa-shield-halved' : user.roleId === 2 ? 'fa-crown' : 'fa-user'}`} style={{ fontSize: 9 }}></i>
                        {roleNames[user.roleId] || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(user.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleEditClick(user)} className="admin-btn" style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(var(--accent-rgb,236,72,153),0.1)', color: 'var(--accent)' }}>
                          <i className="fa-solid fa-pen-to-square" style={{ fontSize: 10 }}></i> Edit
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="admin-btn" style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
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

      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Edit User</h3>
            
            <div className="mb-4">
               <p className="text-sm font-bold text-[var(--text-primary)]">{selectedUser.name}</p>
               <p className="text-xs text-[var(--text-tertiary)]">{selectedUser.email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                >
                  <option value={1}>Superadmin</option>
                  <option value={2}>Premium</option>
                  <option value={3}>Basic</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Assign Membership</label>
                <select
                  value={assignPlan}
                  onChange={(e) => setAssignPlan(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="">-- Jangan Ubah --</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title} ({plan.durationDays ? `${plan.durationDays} Hari` : 'Lifetime'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)]"
              >
                Batal
              </button>
              <button
                disabled={updating}
                onClick={handleSaveUser}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {updating ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
