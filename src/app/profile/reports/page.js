"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import reportService from "@/lib/reportApi";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)]/50 p-10 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-card)] text-3xl shadow-sm text-[var(--accent)]">
        <i className="fa-solid fa-flag"></i>
      </div>
      <p className="text-lg font-bold text-[var(--text-primary)]">Belum ada laporan</p>
      <p className="mt-2 max-w-sm text-sm text-[var(--text-secondary)]">Kamu belum pernah mengirim laporan masalah episode.</p>
    </div>
  );
}

export default function UserReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await reportService.getUserReports();
        if (res.success) {
          setReports(res.data || []);
        }
      } catch (error) {
        console.error("Failed to load reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const getCategoryLabel = (cat) => {
    const categories = {
      'wrong_episode': 'Salah Episode',
      'broken_video': 'Video Rusak',
      'wrong_subtitle': 'Subtitle Salah',
      'missing_subtitle': 'Subtitle Hilang',
      'other': 'Lainnya'
    };
    return categories[cat] || cat;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return <span className="rounded bg-yellow-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-600 border border-yellow-500/20">Pending</span>;
      case "RESOLVED":
        return <span className="rounded bg-green-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-600 border border-green-500/20">Selesai</span>;
      case "DISMISSED":
        return <span className="rounded bg-gray-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 border border-gray-500/20">Diabaikan</span>;
      default:
        return <span className="rounded bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-500 border border-blue-500/20">{status}</span>;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in mt-4 fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-2">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent)] hover:underline">
          &larr; Back to Profile
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-[var(--text-primary)] relative inline-block">
          Laporan Saya
          <div className="absolute -bottom-2 left-0 h-1 w-1/3 rounded-full bg-[var(--accent)]"></div>
        </h1>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Pantau status laporan error pada episode yang telah kamu kirimkan ke admin.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--bg-primary)]/70 border border-[var(--border)]" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <div key={report.id} className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-all hover:border-[var(--accent)]/50 hover:shadow-xl sm:flex">
              {/* Poster */}
              <div className="relative h-32 w-full flex-shrink-0 overflow-hidden sm:h-auto sm:w-28 border-r border-[var(--border)]">
                <Image
                  src={report.episode?.anime?.koleksi?.posterUrl || "/placeholder.jpg"}
                  alt={report.episode?.anime?.koleksi?.title || "Anime"}
                  fill
                  className="object-cover opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500"
                />
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="line-clamp-1 font-bold text-[var(--text-primary)]">
                        {report.episode?.anime?.koleksi?.title || report.episode?.anime?.title}
                      </h4>
                      <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
                        Episode {report.episode?.number} {report.episode?.title ? `- ${report.episode?.title}` : ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {getStatusBadge(report.status)}
                      <p className="mt-1.5 text-[10px] font-medium text-[var(--text-tertiary)]">
                        {report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: id }) : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-[var(--bg-input)] p-3 border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Kategori:</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{getCategoryLabel(report.category)}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                    {report.message ? `"${report.message}"` : <span className="italic opacity-60">Tidak ada deskripsi tambahan.</span>}
                  </p>
                </div>
                
                {report.episode?.anime?.koleksi?.slug && (
                   <div className="mt-4 flex justify-end">
                      <Link 
                        href={`/anime/${report.episode.anime.koleksi.slug}/eps/${report.episode.number}`}
                        className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1.5"
                      >
                         Cek Episode <i className="fa-solid fa-arrow-right"></i>
                      </Link>
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
