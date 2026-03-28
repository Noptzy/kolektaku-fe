"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileLayout({ children }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Guard untuk mencegah user non-login buka profile page
  useEffect(() => {
    if (!loading && !user) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("open-login-modal"));
      }
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-30" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--accent)]/30 bg-[var(--bg-card)]">
              <span className="text-3xl font-bold text-[var(--accent)]">K</span>
            </div>
          </div>
          <p className="mt-6 text-lg font-medium text-[var(--text-primary)]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute -left-40 -top-40 h-[580px] w-[580px] rounded-full bg-[var(--accent)] blur-[130px]" />
        <div className="absolute -right-40 top-1/2 h-[480px] w-[480px] rounded-full bg-[var(--info)] blur-[130px]" />
      </div>

      <Navbar />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 md:pt-14">
        {children}
      </main>
    </div>
  );
}
