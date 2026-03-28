"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminSidebar from "@/components/admin/Sidebar";

export default function AdminLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.roleId !== 1)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user || user.roleId !== 1) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      {/* Poppins Font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      {/* FontAwesome 6 */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />

      <style jsx global>{`
        .admin-shell, .admin-shell * {
          font-family: 'Poppins', sans-serif;
        }
        .admin-shell {
          --admin-shadow: 0 2px 12px rgba(0,0,0,0.15);
          --admin-shadow-lg: 0 8px 32px rgba(0,0,0,0.2);
          --admin-shadow-card: 0 1px 3px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08);
          --admin-radius: 14px;
          --admin-radius-sm: 10px;
          --admin-radius-xs: 8px;
          --accent-rgb: 99,102,241;
        }
        [data-theme="light"] .admin-shell {
          --accent-rgb: 79,70,229;
        }
        .admin-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--admin-radius);
          box-shadow: var(--admin-shadow-card);
          transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
        }
        .admin-card:hover {
          box-shadow: var(--admin-shadow);
        }
        .admin-card-interactive:hover {
          box-shadow: var(--admin-shadow-lg);
          transform: translateY(-2px);
          border-color: var(--accent);
        }
        .admin-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .admin-input {
          width: 100%;
          border-radius: var(--admin-radius-sm);
          border: 1px solid var(--border);
          background: var(--bg-input);
          padding: 10px 14px;
          font-size: 13px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: 'Poppins', sans-serif;
        }
        .admin-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(var(--accent-rgb, 236,72,153), 0.15);
        }
        .admin-select {
          border-radius: var(--admin-radius-xs);
          border: 1px solid var(--border);
          background: var(--bg-input);
          padding: 8px 12px;
          font-size: 12px;
          color: var(--text-primary);
          outline: none;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .admin-select:focus {
          border-color: var(--accent);
        }
        .admin-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--admin-radius-xs);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-family: 'Poppins', sans-serif;
        }
        .admin-btn-primary {
          background: var(--accent);
          color: white;
          box-shadow: 0 2px 8px rgba(var(--accent-rgb, 236,72,153), 0.3);
        }
        .admin-btn-primary:hover {
          filter: brightness(1.1);
          box-shadow: 0 4px 16px rgba(var(--accent-rgb, 236,72,153), 0.4);
        }
        .admin-btn-ghost {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border);
        }
        .admin-btn-ghost:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .admin-table {
          width: 100%;
          text-align: left;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .admin-table thead {
          background: var(--bg-input);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
        }
        .admin-table th {
          padding: 12px 16px;
          font-weight: 600;
        }
        .admin-table td {
          padding: 12px 16px;
        }
        .admin-table tbody tr {
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .admin-table tbody tr:hover {
          background: var(--bg-card-hover);
        }
        .admin-table tbody tr:last-child {
          border-bottom: none;
        }
        .admin-page-header {
          margin-bottom: 24px;
        }
        .admin-page-header h2 {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .admin-page-header p {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 4px 0 0 0;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 50px; }
      `}</style>

      <div className="admin-shell flex min-h-screen bg-[var(--bg-primary)]">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center border-b border-[var(--border)] bg-[var(--bg-card)] px-6 md:px-8" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h1 className="text-base font-bold text-[var(--text-primary)] md:hidden pl-10">Admin</h1>
            <div className="ml-auto flex items-center gap-3 relative">
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
                style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} style={{ fontSize: 13 }}></i>
              </button>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 focus:outline-none"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full object-cover" style={{ boxShadow: '0 0 0 2px rgba(var(--accent-rgb,236,72,153),0.3)' }} />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs" style={{ background: 'rgba(var(--accent-rgb,236,72,153),0.15)', color: 'var(--accent)' }}>
                    {user?.name?.[0] || 'A'}
                  </div>
                )}
                <i className="fa-solid fa-chevron-down text-[10px] text-[var(--text-tertiary)]"></i>
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                  <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-[var(--border)]">
                      <p className="truncate text-sm font-bold text-[var(--text-primary)]">{user?.name || 'Admin'}</p>
                      <p className="truncate text-[10px] text-[var(--text-tertiary)]">{user?.email}</p>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => { setIsDropdownOpen(false); window.location.href = "/"; }}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition"
                      >
                        <i className="fa-solid fa-arrow-left text-[var(--accent)] w-3 text-center"></i>
                        Kembali ke Website
                      </button>
                      <button
                        onClick={() => { setIsDropdownOpen(false); if (window.confirm("Sign out?")) logout(); }}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger)] hover:bg-opacity-10 transition"
                      >
                        <i className="fa-solid fa-right-from-bracket w-3 text-center"></i>
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
