"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTokens, isAuthenticated } from "@/lib/auth";

// ─── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ─── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    /** Fetch current user data from /api/auth/me */
    const fetchUser = useCallback(async () => {
        if (!isAuthenticated()) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await api.get("/api/auth/me");
            // Support { user: ... }, { data: ... } or direct user object
            setUser(data?.user ?? data?.data ?? data);
        } catch (error) {
            // Only clear tokens if we specifically got an unauthorized error (e.g. 401)
            // This prevents temporary network errors or backend cold-starts from logging the user out.
            if (error?.response?.status === 401) {
                setUser(null);
                clearTokens();
            } else {
                // For other errors, just set user to null so the app renders, but keep the tokens
                setUser(null);
                console.error("[AuthContext] Failed to fetch user, but keeping tokens:", error?.message);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    /** Re-fetch user data (e.g. after profile update) */
    const refreshUser = useCallback(() => {
        setLoading(true);
        return fetchUser();
    }, [fetchUser]);

    /** POST /api/auth/logout → clear tokens → redirect /login */
    const logout = useCallback(async () => {
        try {
            await api.post("/api/auth/logout");
        } catch {
            // Ignore errors — we still want to clear locally
        } finally {
            clearTokens();
            setUser(null);
            router.push("/");
        }
    }, [router]);

    return (
        <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Access auth state anywhere in the component tree.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
