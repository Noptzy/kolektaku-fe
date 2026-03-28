"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function AboutPage() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 bg-violet-700/10 blur-[150px] rounded-full"
      />

      {/* Navbar */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/5 bg-zinc-950/60 px-6 py-4 backdrop-blur-xl">
        <Link
          href="/"
          className="rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 px-3 py-1 text-xs font-bold tracking-widest uppercase hover:opacity-90 transition-opacity"
        >
          Kolektaku
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-white/10 px-4 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
        >
          Kembali ke Home
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-20 pb-40">
        <div className="space-y-12">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Tentang Kolektaku
            </h1>
            <p className="mt-4 text-lg text-zinc-400">
              Tempat terbaik untuk mencatat perjalanan animanga kamu.
            </p>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Feature 1 */}
          <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 mb-6 border border-violet-500/20">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-3">
              Satu Koleksi, Semua Media
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              Mulai dari Anime musiman yang sedang tayang, hingga Manga yang
              baru terbit. Kolektaku membantu kamu melacak semuanya tanpa ribet.
              Tidak perlu lagi lupa episode berapa yang terakhir ditonton.
            </p>
          </section>

          {/* Feature 2 */}
          <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 mb-6 border border-indigo-500/20">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-3">
              Rating & Review Pribadi
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              Buat catatan pribadi dan beri rating untuk setiap tontonan atau
              bacaan. Kami percaya opini paling penting adalah opinimu sendiri,
              jadikan Kolektaku jurnal pribadimu.
            </p>
          </section>

          {/* Future Plans */}
          <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-6">Akan Datang</h2>
            <ul className="space-y-4 text-zinc-400">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                  1
                </span>
                <span>Notifikasi rilis episode anime favoritmu</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                  2
                </span>
                <span>Statistik preferensi tontonan (Genre Insight)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                  3
                </span>
                <span>Rekomendasi engine berbasis AI</span>
              </li>
            </ul>
          </section>

          {/* Footer CTA */}
          {!user && (
            <div className="mt-16 text-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-500"
              >
                Mulai Gunakan Kolektaku Sekarang
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
