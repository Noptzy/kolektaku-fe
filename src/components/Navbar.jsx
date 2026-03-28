"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import LoginModal from "@/components/LoginModal";

function NavbarContent() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchTimeoutRef = useRef(null);

  const handleSearch = (value) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed.length >= 2 || trimmed === "") {
        const params = new URLSearchParams(searchParams.toString());
        if (trimmed) params.set("q", trimmed);
        else params.delete("q");

        router.push(`/anime?${params.toString()}`);
      }
    }, 500);
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchQuery.trim()) {
      router.push(`/anime?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearchOpen(false);
    } else {
      router.push("/anime");
    }
  };

  useEffect(() => {
    setMounted(true);
    const handleOpenLoginModal = () => setIsLoginModalOpen(true);
    window.addEventListener("open-login-modal", handleOpenLoginModal);
    return () => {
      window.removeEventListener("open-login-modal", handleOpenLoginModal);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleLogout = () => {
    if (window.confirm("Apakah kamu yakin ingin keluar?")) {
      logout();
    }
  };

  const displayName = user?.username || user?.name || "Profile";

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-navbar)] px-6 py-4 backdrop-blur-xl transition-colors">
        {/* Left: Logo + Nav Links */}
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="group flex items-center gap-3"
          >
            <div className="relative h-10 w-10 overflow-hidden transition-transform group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="Kolektaku Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--accent)] hidden sm:block">
              Kolektaku
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-6">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => router.push("/anime")}
              className="text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Explore
            </button>

            <button
              type="button"
              onClick={() => router.push("/membership")}
              className="text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Membership
            </button>
          </nav>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <div className="mx-4 hidden max-w-md flex-1 lg:block">
          <form onSubmit={onSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search Anime Title, Voice Actor, Studio and Character..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 pl-11 text-sm text-[var(--text-primary)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10"
            />
            <svg
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Search icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </form>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(true)}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-2.5 text-[var(--text-primary)] transition hover:bg-[var(--border-hover)] lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <title>Open search</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-2.5 text-[var(--text-primary)] transition hover:bg-[var(--border-hover)]"
          >
            {!mounted ? (
              <svg className="h-5 w-5 opacity-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"></svg>
            ) : theme === "dark" ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <title>Light mode</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364 6.364l.707.707M6.343 6.343l.707.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <title>Dark mode</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="group flex min-h-11 items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1.5 pr-3 transition hover:border-[var(--accent)]/30 hover:bg-[var(--border-hover)]"
              >
                <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]/20">
                  {user.avatarUrl ? (
                    <Image 
                      src={user.avatarUrl} 
                      alt={displayName} 
                      fill 
                      className="object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[var(--accent)]">
                      {displayName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="hidden max-w-[7rem] truncate text-sm font-semibold text-[var(--text-primary)] sm:inline">
                  {displayName}
                </span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl p-2.5 text-[var(--text-tertiary)] transition hover:bg-red-500/10 hover:text-red-500"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <title>Logout</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent-muted)] transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-0.5"
            >
              Sign In
            </button>
          )}
        </div>

        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </header>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-[var(--bg-navbar)]/95 backdrop-blur-xl p-4 lg:hidden animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(false)}
              className="rounded-xl p-2.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)]"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <title>Back</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg font-bold text-[var(--text-primary)]">Search Anime</span>
          </div>

          <form onSubmit={onSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search Anime Title, Voice Actor, Studio and Character..."
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-input)] px-6 py-4 pl-14 text-lg text-[var(--text-primary)] transition-all focus:border-[var(--accent)] focus:outline-none"
            />
            <svg
              className="absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-[var(--text-tertiary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Search icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </form>

          <div className="mt-8">
            <h4 className="text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-4 px-2">Quick Links</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { router.push("/"); setIsMobileSearchOpen(false); }}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-input)] p-4 text-left transition hover:bg-[var(--border-hover)]"
              >
                <span className="text-xl">🏠</span>
                <span className="font-bold text-[var(--text-primary)]">Home</span>
              </button>
              <button
                type="button"
                onClick={() => { router.push("/anime"); setIsMobileSearchOpen(false); }}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-input)] p-4 text-left transition hover:bg-[var(--border-hover)]"
              >
                <span className="text-xl">📺</span>
                <span className="font-bold text-[var(--text-primary)]">Explore</span>
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}


export default function Navbar() {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-navbar)] px-6 py-4 backdrop-blur-xl h-20">
        <div className="animate-pulse flex items-center gap-8 w-full">
          <div className="h-10 w-10 bg-[var(--bg-input)] rounded-lg"></div>
          <div className="h-4 w-24 bg-[var(--bg-input)] rounded hidden md:block"></div>
          <div className="flex-1 max-w-md h-10 bg-[var(--bg-input)] rounded-xl hidden lg:block"></div>
          <div className="h-10 w-24 bg-[var(--bg-input)] rounded-xl ml-auto"></div>
        </div>
      </header>
    }>
      <NavbarContent />
    </Suspense>
  );
}
