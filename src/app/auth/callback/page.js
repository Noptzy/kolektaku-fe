"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setTokens } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (accessToken && refreshToken) {
      setTokens({ accessToken, refreshToken });
      
      // Update global auth state before redirecting
      refreshUser().then(() => {
        router.replace("/");
      }).catch(() => {
        router.replace("/");
      });
    } else {
      // No tokens → something went wrong, go to home
      router.replace("/");
    }
  }, [searchParams, router, refreshUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-violet-500" />
        <p className="text-zinc-400 text-sm tracking-wide">
          Menyelesaikan login…
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-violet-500" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
