"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import membershipService from "@/lib/membershipApi";

import { QRCodeSVG } from "qrcode.react";
import { createPayment, checkPaymentStatus } from "@/lib/paymentApi";

function MembershipContent() {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [plans, setPlans] = useState([]);
  const [activeVouchers, setActiveVouchers] = useState([]);
  const [voucherCode, setVoucherCode] = useState(searchParams.get("voucher") || "");
  const [voucherResult, setVoucherResult] = useState(null);
  const [trialStatus, setTrialStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [trialActivating, setTrialActivating] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [claimingVoucherId, setClaimingVoucherId] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [processingPlanId, setProcessingPlanId] = useState(null);
  const pollInterval = useRef(null);

  const isPremium = user?.roleId <= 2;

  const fetchPlans = useCallback(async () => {
    try {
      const response = await membershipService.getPlans();
      setPlans(response.data || []);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      setPlans([]);
    }
  }, []);

  const fetchActiveVouchers = useCallback(async () => {
    try {
      const response = await membershipService.getActiveVouchers();
      setActiveVouchers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch vouchers:", error);
      setActiveVouchers([]);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!user) {
      setTrialStatus(null);
      return;
    }
    try {
      const trial = await membershipService
        .getTrialStatus()
        .catch(() => ({ data: null }));
      setTrialStatus(trial.data || trial);
    } catch (error) {
      console.error("Failed to fetch user membership status:", error);
      setTrialStatus(null);
    }
  }, [user]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPlans(), fetchActiveVouchers(), fetchUserData()]);
    setLoading(false);
  }, [fetchPlans, fetchActiveVouchers, fetchUserData]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const handleActivateTrial = async () => {
    try {
      setTrialActivating(true);
      await membershipService.activateTrial();
      await fetchUserData();
      Swal.fire({
        icon: "success",
        title: "Trial Diaktifkan",
        text: "Nikmati Premium 7 hari gratis.",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        confirmButtonColor: "var(--accent)",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error?.response?.data?.message || "Gagal mengaktifkan trial",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        confirmButtonColor: "var(--accent)",
      });
    } finally {
      setTrialActivating(false);
    }
  };

  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) return;
    try {
      setVoucherLoading(true);
      const response = await membershipService.validateVoucher(voucherCode.trim());
      setVoucherResult(response.data || response);
    } catch (error) {
      setVoucherResult({
        valid: false,
        message: error?.response?.data?.message || "Kode voucher tidak valid",
      });
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleClaimVoucher = async (voucherId) => {
    try {
      setClaimingVoucherId(voucherId);
      setVoucherResult({
        valid: true,
        message: "Voucher siap digunakan"
      });
      Swal.fire({
        icon: "success",
        title: "Voucher Dipilih",
        text: "Voucher akan otomatis diaplikasikan saat proses Checkout",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        confirmButtonColor: "var(--accent)",
        timer: 3000,
        toast: true,
        position: 'top-end',
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal menggunakan voucher",
        text: error?.response?.data?.message || "Silakan coba lagi",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        confirmButtonColor: "var(--accent)",
      });
    } finally {
      setClaimingVoucherId(null);
    }
  };

  const handleSubscribe = async (plan) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-login-modal"));
      return;
    }
    
    setProcessingPlanId(plan.id);
    try {
      const code = voucherResult?.valid ? voucherCode.trim() : "";
      
      // Check if voucher is restricted to a specific plan
      if (voucherResult?.valid && voucherResult.plan && voucherResult.plan.id !== plan.id) {
        Swal.fire({
          icon: "warning",
          title: "Voucher Tidak Cocok",
          text: `Voucher ini hanya berlaku untuk paket: ${voucherResult.plan.title}. Silakan gunakan paket yang sesuai atau hapus kode voucher.`,
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          confirmButtonColor: "var(--accent)",
        });
        setProcessingPlanId(null);
        return;
      }

      const res = await createPayment(plan.id, code);
      const data = res.data || res;
      
      if (data.qr_string) {
        setPaymentData({
            qrString: data.qr_string,
            amount: data.amount_raw,
            snapId: data.snapId,
            status: "PENDING"
        });
        setPaymentModalOpen(true);
      } else {
        throw new Error("Gagal mendapatkan QR Code dari server pembayaran");
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Gagal membuat checkout",
        text: error?.response?.data?.message || "Silakan coba lagi beberapa saat",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        confirmButtonColor: "var(--accent)",
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  useEffect(() => {
    if (!paymentModalOpen || !paymentData?.snapId || paymentData.status === "SUCCESS") return;
    
    const checkStatus = async () => {
      try {
        const res = await checkPaymentStatus(paymentData.snapId);
        const currentStatus = res.data?.status || res.status;
        if (currentStatus === "success") {
          setPaymentData(prev => ({ ...prev, status: "SUCCESS" }));
          clearInterval(pollInterval.current);
          
          await refreshUser();
          await fetchUserData();
          
          Swal.fire({
              icon: 'success',
              title: 'Pembayaran Berhasil!',
              text: 'Terima kasih, akun Anda telah di-upgrade ke premium.',
              background: '#1e1e24',
              color: '#fff',
              confirmButtonColor: '#f39c12',
          }).then(() => {
              setPaymentModalOpen(false);
          });
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    pollInterval.current = setInterval(checkStatus, 5000);
    return () => {
        if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [paymentModalOpen, paymentData, refreshUser, fetchUserData]);

  const featureRows = useMemo(
    () => [
      { feature: "Kolektaku AI Subtitle Indonesia", basic: true, premium: true },
      { feature: "Resolusi Streaming", basic: "720p", premium: "1080p" },
      { feature: "Limit History Anime", basic: "30 Judul", premium: "Unlimited" },
      { feature: "Limit Favorit Anime", basic: "10 Judul", premium: "Unlimited" },
      { feature: "Tanpa Iklan", basic: false, premium: true },
      { feature: "Unlimited Streaming", basic: false, premium: true },
      { feature: "Notifikasi update anime favorit", basic: true, premium: true },
      { feature: "Priority support", basic: false, premium: true },
    ],
    [],
  );

  const hasTrialButton = user && trialStatus && !trialStatus.hasTrial && trialStatus.eligible && !isPremium;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6">
        <header className="mb-8 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--accent)]/10 p-6 shadow-xl md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">Membership</p>
              <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Upgrade experience kamu</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)] md:text-base">
                Nikmati streaming tanpa batas, kualitas lebih tinggi, dan fitur premium lain untuk pengalaman nonton yang lebih nyaman.
              </p>
              {isPremium && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400 font-semibold shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                  <i className="fa-solid fa-circle-info"></i>
                  <span>
                    Sisa hari langganan akan otomatis diakumulasi jika Anda memperpanjang Paket.
                  </span>
                </div>
              )}
            </div>

            {hasTrialButton && (
              <button
                type="button"
                onClick={handleActivateTrial}
                disabled={trialActivating}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
              >
                {trialActivating ? "Mengaktifkan..." : "🎁 Coba Premium 7 Hari"}
              </button>
            )}
          </div>

          {trialStatus?.hasTrial && !trialStatus.isExpired && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
              <span>✅</span>
              <span>
                Trial aktif sampai {new Date(trialStatus.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          )}
        </header>

        <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {loading
            ? [1, 2, 3].map((item) => (
                <div key={item} className="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]" />
              ))
            : plans.map((plan) => (
                <article key={plan.id} className={`relative rounded-2xl border bg-[var(--bg-card)] p-6 shadow-lg transition-all ${voucherResult?.valid && voucherResult.plan?.id === plan.id ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50' : 'border-[var(--border)]'}`}>
                  {voucherResult?.valid && voucherResult.plan?.id === plan.id && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                      Voucher Cocok ✨
                    </div>
                  )}
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">Plan</p>
                      <h2 className="text-2xl font-bold">{plan.title || "Premium"}</h2>
                    </div>
                    <span className="rounded-full bg-[var(--accent)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
                      {(plan.durationDays === null || plan.durationDays >= 999) ? "Lifetime" : `${plan.durationDays} hari`}
                    </span>
                  </div>

                  <p className="mb-4 text-sm text-[var(--text-secondary)]">{plan.desc || "Akses fitur premium Kolektaku."}</p>

                  <p className="mb-5 text-3xl font-extrabold">
                    Rp {Number(plan.price || 0).toLocaleString("id-ID")}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleSubscribe(plan)}
                    disabled={!user || processingPlanId === plan.id}
                    className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${voucherResult?.valid && voucherResult.plan?.id === plan.id ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'}`}
                  >
                    {!user ? "Login untuk Berlangganan" : processingPlanId === plan.id ? "Memproses..." : isPremium ? "Perpanjang Premium" : "Lanjut Checkout"}
                  </button>
                </article>
              ))}
        </section>

        <section className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-lg font-bold">Voucher Code</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Punya kode voucher? Cek validitas dan diskonnya di sini.</p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={voucherCode}
                onChange={(event) => setVoucherCode(event.target.value.toUpperCase())}
                placeholder="Masukkan kode voucher"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm outline-none transition uppercase tracking-widest font-mono focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={handleValidateVoucher}
                disabled={voucherLoading || !voucherCode.trim()}
                className="rounded-xl border border-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/10 disabled:opacity-50"
              >
                {voucherLoading ? "Checking..." : "Validate"}
              </button>
            </div>

            {voucherResult && (
              <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${voucherResult.valid ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]"}`}>
                <div className="flex items-center justify-between">
                  <span>{voucherResult.message || (voucherResult.valid ? "Voucher valid" : "Voucher invalid")}</span>
                  {voucherResult.valid && voucherResult.plan && (
                    <span className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase ring-1 ring-emerald-500/30">
                      Khusus Paket: {voucherResult.plan.title}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-lg font-bold">Active Vouchers</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Klaim voucher aktif untuk diskon membership plan.</p>

            <div className="mt-4 space-y-3">
              {activeVouchers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">
                  Belum ada voucher aktif saat ini.
                </div>
              ) : (
                activeVouchers.slice(0, 5).map((voucher) => (
                  <article key={voucher.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{voucher.code}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-[var(--text-secondary)]">Diskon {voucher.discountPercent}%</p>
                          {voucher.plan && (
                            <span className="text-[9px] font-bold uppercase text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded border border-[var(--accent)]/20">
                              {voucher.plan.title} Only
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!user || claimingVoucherId === voucher.id}
                        onClick={() => {
                          setVoucherCode(voucher.code);
                          handleClaimVoucher(voucher.id);
                        }}
                        className="rounded-lg border border-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/10 disabled:opacity-50"
                      >
                        {claimingVoucherId === voucher.id ? "Memproses..." : voucherCode === voucher.code ? "Terpilih ✓" : "Gunakan"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="border-b border-[var(--border)] p-6">
            <h3 className="text-lg font-bold">Perbandingan Paket</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Lihat perbedaan fitur Basic vs Premium secara cepat.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-left font-semibold text-[var(--text-tertiary)]">Fitur</th>
                  <th className="px-6 py-4 text-center font-semibold text-[var(--text-tertiary)]">Basic</th>
                  <th className="px-6 py-4 text-center font-semibold text-[var(--accent)]">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {featureRows.map((row) => (
                  <tr key={row.feature} className="transition-colors hover:bg-[var(--bg-card-hover)]">
                    <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {row.basic === true ? (
                        <span className="text-emerald-400">✓</span>
                      ) : row.basic === false ? (
                        <span className="text-red-400">✗</span>
                      ) : (
                        <span className="text-[var(--text-secondary)]">{row.basic}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.premium === true ? (
                        <span className="font-bold text-emerald-400">✓</span>
                      ) : row.premium === false ? (
                        <span className="text-red-400">✗</span>
                      ) : (
                        <span className="font-bold text-[var(--accent)]">{row.premium}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {paymentModalOpen && paymentData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[var(--bg-card)] p-8 rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.15)] max-w-md w-full text-center relative border border-[var(--border)] animate-fade-in-up">
              <button 
                onClick={() => setPaymentModalOpen(false)}
                className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white transition"
              >
                ✕
              </button>

              <h2 className="text-2xl font-bold mb-2 text-[var(--accent)]">Scan QRIS</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">Bayar melalui aplikasi bank atau e-Wallet kesayanganmu</p>

              <div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-lg shadow-white/5">
                {paymentData.qrString ? (
                  <QRCodeSVG 
                    value={paymentData.qrString} 
                    size={220}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"H"}
                    imageSettings={{
                      src: "/logo.png",
                      excavate: true,
                      width: 40,
                      height: 40
                    }}
                  />
                ) : (
                  <div className="w-[220px] h-[220px] bg-gray-200 animate-pulse rounded-lg" />
                )}
              </div>

              <div className="space-y-1 mb-6">
                <p className="text-[var(--text-tertiary)] text-sm uppercase tracking-wider">Total Tagihan</p>
                <p className="text-4xl font-bold font-mono text-[var(--accent)]">
                  Rp {paymentData.amount.toLocaleString('id-ID')}
                </p>
                {voucherResult?.valid && voucherCode && (
                  <p className="text-xs text-emerald-500 italic mt-2">Voucher [{voucherCode}] diterapkan!</p>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 bg-[var(--bg-input)] w-fit mx-auto px-6 py-3 rounded-full border border-[var(--border)]">
                {paymentData.status === "PENDING" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-[var(--accent)] font-medium">Menunggu Pembayaran...</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs">✓</div>
                    <span className="text-sm text-emerald-500 font-bold">Pembayaran Dikonfirmasi!</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function MembershipPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Loading membership...</p>
          </div>
        </div>
      }
    >
      <MembershipContent />
    </Suspense>
  );
}
