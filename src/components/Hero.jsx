"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function Hero() {
    const { user } = useAuth();

    return (
        <main className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center">
            {/* Japanese welcome badge */}
            <div className="mb-6 flex items-center justify-center gap-2">
                <span className="text-2xl">🌸</span>
                <span className="inline-block rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-300">
                    ようこそ - Selamat datang di Kolektaku
                </span>
                <span className="text-2xl">🌸</span>
            </div>

            <h1 className="text-5xl font-extrabold leading-tight tracking-tight md:text-6xl text-white">
                Koleksi anime kamu,{" "}
                <span className="bg-gradient-to-r from-red-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    satu tempat.
                </span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-white/70">
                Kelola anime & manga favoritmu dengan mudah. Catat progress, rating,
                dan catatan pribadimu — kapan saja, di mana saja.
            </p>

            {/* Decorative elements */}
            <div className="mt-8 flex items-center justify-center gap-4">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-red-500/30" />
                <span className="text-2xl">⛩️</span>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-red-500/30" />
            </div>

            {/* User card (if logged in) */}
            {user && (
                <div className="mt-10">
                    <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-xl">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-500/30 bg-gradient-to-br from-red-600/20 to-pink-600/20 text-sm font-bold uppercase">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                            ) : (
                                user.name?.[0] ?? user.email?.[0] ?? "U"
                            )}
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-white">
                                {user.name ?? "User"}
                            </p>
                            <p className="text-xs text-white/60">
                                {user.email}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
