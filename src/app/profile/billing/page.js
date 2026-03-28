"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import meService from "@/lib/meApi";

export default function BillingPage() {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    meService.getBilling({ page: 1, limit: 30 })
      .then(res => setBilling(res.data))
      .catch(err => console.error("Failed to load billing", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-[var(--accent)]"></i>
        <p className="mt-4 text-[var(--text-secondary)] animate-pulse">Memuat riwayat tagihan...</p>
      </div>
    );
  }

  const transactions = billing?.transactions || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="mb-2">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent)] hover:underline">
          &larr; Back to Profile
        </Link>
      </div>

      <div className="border-b border-[var(--border)] pb-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Billing & Invoices</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Kelola riwayat pembayaran dan status keanggotaan Premium milikmu.</p>
      </div>

      <div className="space-y-4">
        {transactions.length === 0 ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-primary)]/50 py-12 text-center text-[var(--text-tertiary)] shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto mb-3 block h-8 w-8 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            Belum ada riwayat transaksi.
          </div>
        ) : (
          <div className="grid gap-4">
            {transactions.map(trx => (
              <div key={trx.id} className="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--bg-primary)] sm:flex-row sm:items-center sm:justify-between shadow-sm">
                
                {/* Kiri: Tanggal & ID */}
                <div className="flex-1">
                  <div className="font-semibold text-[var(--text-primary)]">
                    {new Date(trx.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric'})}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="truncate max-w-[120px] sm:max-w-[200px] text-[11px] font-mono text-[var(--text-tertiary)]" title={trx.id}>{trx.id}</span>
                  </div>
                </div>

                {/* Tengah: Paket & Metode */}
                <div className="flex-1 sm:text-center">
                  <div className="font-bold text-[var(--text-primary)]">{trx.plan?.title || "Premium Subscription"}</div>
                  <div className="mt-0.5 text-xs text-[var(--text-secondary)] capitalize">{trx.paymentMethod.replace('_', ' ')}</div>
                </div>

                {/* Kanan: Status & Harga */}
                <div className="flex flex-row items-center justify-between sm:flex-col sm:items-end gap-2 border-t border-[var(--border)] pt-4 sm:border-0 sm:pt-0">
                  <div className="font-black text-emerald-400 text-base">
                    Rp {trx.amount?.toLocaleString("id-ID") || 0}
                  </div>
                  <div>
                    {trx.status === 'success' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-500 border border-emerald-500/20 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" /></svg> LUNAS
                      </span>
                    ) : trx.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500 border border-rose-500/20 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" /></svg> GAGAL / EXPIRED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-500 border border-amber-500/20 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" /></svg> {trx.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
