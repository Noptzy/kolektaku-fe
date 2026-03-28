"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: "fa-solid fa-chart-pie" },
  { name: "Users", href: "/admin/users", icon: "fa-solid fa-users" },
  { name: "Anime", href: "/admin/anime", icon: "fa-solid fa-film" },
  { name: "Schedules", href: "/admin/schedules", icon: "fa-regular fa-calendar" },
  { name: "Transactions", href: "/admin/transactions", icon: "fa-solid fa-money-bill-wave" },
  { name: "Mappings", href: "/admin/mappings", icon: "fa-solid fa-link" },
  { name: "Plans", href: "/admin/plans", icon: "fa-solid fa-credit-card" },
  { name: "Vouchers", href: "/admin/vouchers", icon: "fa-solid fa-ticket" },
  { name: "Broadcasts", href: "/admin/broadcasts", icon: "fa-solid fa-bullhorn" },
  { name: "Reports", href: "/admin/reports", icon: "fa-solid fa-flag" },
  { name: "Audit Logs", href: "/admin/logs", icon: "fa-solid fa-clipboard-list" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        type="button"
        className="fixed top-3 left-3 z-50 rounded-lg bg-[var(--bg-card)] p-2.5 text-[var(--text-primary)] md:hidden"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-bars'}`} style={{ fontSize: 16 }}></i>
      </button>

      {/* Overlay */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[var(--bg-card)] transition-transform duration-300 md:relative md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ borderRight: '1px solid var(--border)', boxShadow: '2px 0 16px rgba(0,0,0,0.06)' }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center px-5 gap-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <Image src="/logo.png" alt="Kolektaku" width={28} height={28} className="rounded-md" style={{ boxShadow: '0 0 0 2px rgba(var(--accent-rgb,236,72,153),0.3)' }} />
          <h2 className="text-base font-bold" style={{ background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Kolektaku</h2>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
          <div className="px-3 mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Management</p>
          </div>
          <nav className="space-y-0.5 px-2.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all"
                  style={{
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                >
                  <i className={item.icon} style={{ width: 18, textAlign: 'center', fontSize: 14 }}></i>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User info at bottom */}
        {user && (
          <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2.5 rounded-lg p-2" style={{ background: 'var(--bg-input)' }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full object-cover shrink-0" />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>
                  {user.name?.[0] || 'A'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-[var(--text-primary)]">{user.name || 'Admin'}</p>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>Admin</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
