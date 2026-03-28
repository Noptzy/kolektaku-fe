"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import adminService from "@/lib/adminApi";
import Swal from "sweetalert2";

export default function ManualAddAnimePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    anilistUrl: "",
    nineanimeUrl: "",
    malUrl: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.anilistUrl) {
      return Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Link AniList wajib diisi",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    }

    try {
      setLoading(true);
      const res = await adminService.manualAddAnime(formData);
      
      if (res.status === 'warning') {
        const result = await Swal.fire({
          icon: "warning",
          title: "Sudah Ada",
          text: res.message,
          showCancelButton: true,
          confirmButtonText: "Ya, Tetap Update",
          cancelButtonText: "Batal",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
        });

        if (result.isConfirmed) {
          setLoading(true);
          await adminService.manualAddAnime({ ...formData, force: true });
          Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: "Job update data telah dimasukkan ke antrian.",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
          });
          router.push("/admin/anime");
        }
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Job untuk menambahkan anime telah dimasukkan ke antrian. Proses scraping metadata dan episode akan berjalan di background.",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });

      router.push("/admin/anime");
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal mengirim permintaan manual add",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7 7l-7-7 7-7"/></svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Manual Add Anime</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Tambahkan anime baru atau perbarui data yang sudah ada via link.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AniList */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              1. AniList URL <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              type="url"
              required
              placeholder="Contoh: https://anilist.co/anime/103572/..."
              value={formData.anilistUrl}
              onChange={(e) => setFormData({ ...formData, anilistUrl: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-muted)]"
            />
            <p className="text-xs text-[var(--text-tertiary)]">Wajib. Digunakan untuk mengambil metadata (Judul, Poster, Genre, Character, VA).</p>
          </div>

          {/* 9Anime */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              2. 9Anime URL (Streaming Source)
            </label>
            <input
              type="url"
              placeholder="Contoh: https://9animetv.to/watch/the-quintessential-quintuplets-1368"
              value={formData.nineanimeUrl}
              onChange={(e) => setFormData({ ...formData, nineanimeUrl: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-muted)]"
            />
            <p className="text-xs text-[var(--text-tertiary)]">Opsional. Digunakan untuk mengambil daftar episode dan sumber video streaming.</p>
          </div>

          {/* MyAnimeList */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              3. MyAnimeList URL (Optional Override)
            </label>
            <input
              type="url"
              placeholder="Contoh: https://myanimelist.net/anime/39783/..."
              value={formData.malUrl}
              onChange={(e) => setFormData({ ...formData, malUrl: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-muted)]"
            />
            <p className="text-xs text-[var(--text-tertiary)]">Gunakan jika AniList memiliki ID MAL yang salah, atau untuk memastikan Season 2 tidak bentrok.</p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--accent)] py-4 text-sm font-bold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent)]/20"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Memproses Antrian...
                </div>
              ) : (
                "Kirim ke Scraper Worker"
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
        <div className="flex gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm text-blue-600 dark:text-blue-400">
            <p className="font-bold">Tips Anti-Bentrok:</p>
            <p className="mt-1">Sistem sekarang otomatis memisahkan Season 1 & 2 meskipun judulnya sama. Link yang kamu masukkan akan diproses sesuai domainnya secara otomatis.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
