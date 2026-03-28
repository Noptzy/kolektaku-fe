"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import adminService from "@/lib/adminApi";
import Swal from "sweetalert2";

export default function AdminAnimeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("info"); // 'info' | 'episodes'
  const [scrapeLog, setScrapeLog] = useState([]);
  const [manualUrl, setManualUrl] = useState("");
  const [savingMapping, setSavingMapping] = useState(false);
  const [previewFullUrl, setPreviewFullUrl] = useState(null);

  // Metadata form
  const [form, setForm] = useState({ title: "", altTitles: "", synopsis: "", posterUrl: "", landscapePosterUrl: "", releaseYear: "", status: "", type: "" });

  // Episode modal
  const [epModal, setEpModal] = useState(false);
  const [editingEp, setEditingEp] = useState(null);
  const [epForm, setEpForm] = useState({ episodeNumber: "", title: "" });

  // Source modal
  const [srcModal, setSrcModal] = useState(false);
  const [srcEpisodeId, setSrcEpisodeId] = useState(null);
  const [editingSrc, setEditingSrc] = useState(null);
  const [srcForm, setSrcForm] = useState({ serverName: "", audio: "sub", streamType: "hls", urlSource: "", externalId: "" });

  const fetchAnime = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getAnimeById(id);
      const data = res.data;
      setAnime(data);
      setForm({
        title: data.title || "",
        altTitles: data.altTitles ? data.altTitles.join(", ") : "",
        synopsis: data.synopsis || "",
        posterUrl: data.posterUrl || "",
        landscapePosterUrl: data.landscapePosterUrl || "",
        releaseYear: data.releaseYear?.toString() || "",
        status: data.status || "",
        type: data.type || "",
      });
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Anime tidak ditemukan", background: "var(--bg-card)", color: "var(--text-primary)" });
      router.push("/admin/anime");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchAnime(); }, [fetchAnime]);

  const handleManualMapping = async () => {
    if (!manualUrl) return;
    setSavingMapping(true);
    try {
      const match = manualUrl.match(/\/watch\/[^\/]+-([a-zA-Z0-9]+)(\?|$)/);
      if (!match) throw new Error("Format URL 9anime tidak valid. Harus mengandung /watch/judul-id");
      
      const nineanimeId = match[1];

      await adminService.connectMapping(anime.id, {
        anilistId: anime.mapping?.anilistId || null,
        nineanimeId
      });
      setManualUrl("");
      await fetchAnime();

      const { isConfirmed } = await Swal.fire({
        title: "Berhasil",
        text: "Mapping 9anime berhasil disimpan! Ingin scrape episode sekarang?",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Ya, Scrape",
        cancelButtonText: "Nanti",
        background: "var(--bg-card)",
        color: "var(--text-primary)"
      });

      if (isConfirmed) {
        handleScrape('episodes');
      }
    } catch (error) {
      Swal.fire({ icon: "error", title: "Gagal", text: error.response?.data?.message || error.message, background: "var(--bg-card)", color: "var(--text-primary)" });
    } finally {
      setSavingMapping(false);
    }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        releaseYear: form.releaseYear ? parseInt(form.releaseYear) : null,
        altTitles: form.altTitles ? form.altTitles.split(",").map(t => t.trim()).filter(Boolean) : []
      };
      await adminService.updateAnime(id, payload);
      Swal.fire({ icon: "success", title: "Tersimpan", toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: "var(--bg-card)", color: "var(--text-primary)" });
      fetchAnime();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal menyimpan", background: "var(--bg-card)", color: "var(--text-primary)" });
    } finally { setSaving(false); }
  };

  const handleScrape = async (type) => {
    try {
      const typeLabel = type === 'detail' ? 'Data Detail (AniList)' : 'Link Episode (9anime)';
      const isConfirm = await Swal.fire({
        title: `Konfirmasi Scrape`,
        text: `Jalankan worker pencarian ${typeLabel} secara asinkronus?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Jalankan',
        background: "var(--bg-card)",
        color: "var(--text-primary)"
      });
      if (!isConfirm.isConfirmed) return;

      const ts = () => new Date().toLocaleTimeString('id-ID');
      setScrapeLog(prev => [...prev, { time: ts(), msg: `⏳ Mengirim job ${typeLabel}...`, type: 'info' }]);
      
      await adminService.triggerScrape(id, type);
      setScrapeLog(prev => [...prev, { time: ts(), msg: `✅ Job ${typeLabel} berhasil dikirim ke antrian (queue).`, type: 'success' }]);
      setScrapeLog(prev => [...prev, { time: ts(), msg: `ℹ️  Pastikan worker berjalan: cd scraper_anime_manga && npm run worker`, type: 'warn' }]);
      setScrapeLog(prev => [...prev, { time: ts(), msg: `📋 Tercatat di Audit Logs.`, type: 'info' }]);
    } catch (err) {
      const ts = () => new Date().toLocaleTimeString('id-ID');
      setScrapeLog(prev => [...prev, { time: ts(), msg: `❌ Gagal: ${err.response?.data?.message || err.message}`, type: 'error' }]);
      Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal trigger scrape", background: "var(--bg-card)", color: "var(--text-primary)" });
    }
  };

  // ─── Episode CRUD ───
  const openAddEp = () => { setEditingEp(null); setEpForm({ episodeNumber: "", title: "" }); setEpModal(true); };
  const openEditEp = (ep) => { setEditingEp(ep); setEpForm({ episodeNumber: ep.episodeNumber?.toString() || "", title: ep.title || "" }); setEpModal(true); };

  const saveEp = async (e) => {
    e.preventDefault();
    try {
      if (editingEp) {
        await adminService.updateEpisode(editingEp.id, epForm);
      } else {
        await adminService.createEpisode(anime.animeDetail.id, epForm);
      }
      setEpModal(false);
      fetchAnime();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Error", background: "var(--bg-card)", color: "var(--text-primary)" });
    }
  };

  const deleteEp = async (epId) => {
    if (!window.confirm("Hapus episode ini?")) return;
    try { await adminService.deleteEpisode(epId); fetchAnime(); } catch { /* ignore */ }
  };

  const handleDeleteAllEpisodes = async () => {
    const { isConfirmed } = await Swal.fire({
      title: "Hapus Semua Episode?",
      text: "Seluruh episode dan source streaming akan dihapus permanen. Tindakan ini tidak bisa dibatalkan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus Semua!",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
      background: "var(--bg-card)",
      color: "var(--text-primary)"
    });

    if (isConfirmed) {
      try {
        await adminService.deleteAllEpisodes(anime.animeDetail.id);
        Swal.fire({ icon: "success", title: "Berhasil", text: "Semua episode telah dihapus", background: "var(--bg-card)", color: "var(--text-primary)" });
        fetchAnime();
      } catch (err) {
        Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal menghapus semua episode", background: "var(--bg-card)", color: "var(--text-primary)" });
      }
    }
  };

  // ─── Source CRUD ───
  const openAddSrc = (episodeId) => { setSrcEpisodeId(episodeId); setEditingSrc(null); setSrcForm({ serverName: "", audio: "sub", streamType: "hls", urlSource: "", externalId: "" }); setSrcModal(true); };
  const openEditSrc = (src) => { setSrcEpisodeId(null); setEditingSrc(src); setSrcForm({ serverName: src.serverName || "", audio: src.audio || "sub", streamType: src.streamType || "hls", urlSource: src.urlSource || "", externalId: src.externalId || "" }); setSrcModal(true); };

  const saveSrc = async (e) => {
    e.preventDefault();
    try {
      if (editingSrc) {
        await adminService.updateEpisodeSource(editingSrc.id, srcForm);
      } else {
        await adminService.createEpisodeSource(srcEpisodeId, srcForm);
      }
      setSrcModal(false);
      fetchAnime();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Error", background: "var(--bg-card)", color: "var(--text-primary)" });
    }
  };

  const deleteSrc = async (srcId) => {
    if (!window.confirm("Hapus source ini?")) return;
    try { await adminService.deleteEpisodeSource(srcId); fetchAnime(); } catch { /* ignore */ }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-[var(--text-tertiary)]">Memuat...</div>;
  if (!anime) return null;

  const episodes = anime.animeDetail?.episodes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin/anime")} className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{anime.title}</h2>
            <p className="text-sm text-[var(--text-tertiary)]">ID: {anime.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleScrape('detail')} className="rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-500 hover:bg-blue-500/20 transition backdrop-blur-sm">
            Scrape Detail
          </button>
          <button 
            onClick={() => handleScrape('episodes')} 
            disabled={!anime?.mapping?.nineanimeId}
            title={!anime?.mapping?.nineanimeId ? "Hubungkan link 9anime dulu di bagian bawah" : ""}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition backdrop-blur-sm ${
              anime?.mapping?.nineanimeId 
                ? "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20" 
                : "bg-gray-500/10 text-gray-500 cursor-not-allowed opacity-50"
            }`}
          >
            Scrape Episode
          </button>
        </div>
      </div>

      {/* Scrape Terminal Log */}
      {scrapeLog.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[#0d1117] p-4 font-mono text-xs overflow-auto max-h-48">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-400 font-bold text-[10px] uppercase tracking-widest">● Scrape Log</span>
            <button onClick={() => setScrapeLog([])} className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--danger)] transition">Clear</button>
          </div>
          {scrapeLog.map((log, i) => (
            <div key={i} className={`py-0.5 ${
              log.type === 'success' ? 'text-green-400' :
              log.type === 'error' ? 'text-red-400' :
              log.type === 'warn' ? 'text-yellow-400' :
              'text-gray-400'
            }`}>
              <span className="text-gray-600 mr-2">[{log.time}]</span>{log.msg}
            </div>
          ))}
        </div>
      )}

      {/* Manual Mapping Section */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-4 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full space-y-1">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              Manual 9anime Mapping URL
            </label>
            {anime?.mapping?.nineanimeId ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20">
                ✔ Terkoneksi (ID: {anime.mapping.nineanimeId})
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                ⚠ Belum Terkoneksi
              </span>
            )}
          </div>
          <input
            type="text"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            placeholder="https://9animetv.to/watch/eighty-six-2nd-season-17760"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
          />
        </div>
        <button
          onClick={handleManualMapping}
          disabled={savingMapping || !manualUrl}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap h-[38px]"
        >
          {savingMapping ? "Menyimpan..." : "Connect Link"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-[var(--bg-input)] p-1">
        {["info", "episodes"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition capitalize ${tab === t ? "bg-[var(--accent)] text-white shadow" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
            {t === "info" ? "Metadata" : `Episodes (${episodes.length})`}
          </button>
        ))}
      </div>

      {/* TAB: Info */}
      {tab === "info" && (
        <form onSubmit={handleSaveInfo} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField label="Judul" value={form.title} onChange={v => setForm({...form, title: v})} required />
            <InputField label="Tahun Rilis" type="number" value={form.releaseYear} onChange={v => setForm({...form, releaseYear: v})} />
          </div>
          <InputField label="Alternative Titles" value={form.altTitles} onChange={v => setForm({...form, altTitles: v})} placeholder="Pisahkan dengan koma (contoh: Attack on Titan, Shingeki no Kyojin)" />
          <InputField label="Synopsis" value={form.synopsis} onChange={v => setForm({...form, synopsis: v})} textarea />
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField label="Poster URL" value={form.posterUrl} onChange={v => setForm({...form, posterUrl: v})} previewImage onPreviewClick={setPreviewFullUrl} />
            <InputField label="Landscape Poster URL" value={form.landscapePosterUrl} onChange={v => setForm({...form, landscapePosterUrl: v})} previewImage onPreviewClick={setPreviewFullUrl} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField label="Status" value={form.status} onChange={v => setForm({...form, status: v})} placeholder="FINISHED / RELEASING" />
            <InputField label="Type" value={form.type} onChange={v => setForm({...form, type: v})} placeholder="anime / manga" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="rounded-xl bg-[var(--accent)] px-6 py-2.5 font-bold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      )}

      {/* TAB: Episodes */}
      {tab === "episodes" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button onClick={handleDeleteAllEpisodes} className="rounded-xl border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-2 text-sm font-bold text-[var(--danger)] transition hover:bg-[var(--danger)]/20">Hapus Semua</button>
            <button onClick={openAddEp} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--accent-hover)]">+ Tambah Episode</button>
          </div>

          {episodes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--text-tertiary)]">Belum ada episode.</div>
          ) : (
            <div className="space-y-3">
              {episodes.map(ep => (
                <div key={ep.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition hover:border-[var(--accent)]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-sm font-bold text-[var(--accent)]">
                        {ep.episodeNumber != null ? String(parseFloat(ep.episodeNumber)) : "?"}
                      </span>
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">Episode {ep.episodeNumber != null ? parseFloat(ep.episodeNumber) : "?"}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{ep.title || "Untitled"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditEp(ep)} className="text-xs font-bold text-[var(--accent)] hover:underline">Edit</button>
                      <button onClick={() => deleteEp(ep.id)} className="text-xs font-bold text-[var(--danger)] hover:underline">Hapus</button>
                    </div>
                  </div>

                  {/* Sources */}
                  <div className="mt-3 ml-13 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Sources ({ep.sources?.length || 0})</p>
                      <button onClick={() => openAddSrc(ep.id)} className="text-xs font-bold text-[var(--accent)] hover:underline">+ Tambah Source</button>
                    </div>
                    {ep.sources?.map(src => (
                      <div key={src.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[var(--text-primary)]">{src.serverName || "Default"}</span>
                          <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 font-bold uppercase text-[var(--accent)]">{src.audio}</span>
                          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-bold uppercase text-blue-500">{src.streamType}</span>
                          <span className="max-w-[200px] truncate text-[var(--text-tertiary)]">{src.urlSource}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEditSrc(src)} className="font-bold text-[var(--accent)] hover:underline">Edit</button>
                          <button onClick={() => deleteSrc(src.id)} className="font-bold text-[var(--danger)] hover:underline">Hapus</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Episode Modal */}
      {epModal && (
        <Modal title={editingEp ? "Edit Episode" : "Tambah Episode"} onClose={() => setEpModal(false)}>
          <form onSubmit={saveEp} className="space-y-4">
            <InputField label="Nomor Episode" type="number" value={epForm.episodeNumber} onChange={v => setEpForm({...epForm, episodeNumber: v})} required />
            <InputField label="Judul Episode" value={epForm.title} onChange={v => setEpForm({...epForm, title: v})} />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setEpModal(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-input)]">Batal</button>
              <button type="submit" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--accent-hover)]">Simpan</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Source Modal */}
      {srcModal && (
        <Modal title={editingSrc ? "Edit Source" : "Tambah Source"} onClose={() => setSrcModal(false)}>
          <form onSubmit={saveSrc} className="space-y-4">
            <InputField label="Server Name" value={srcForm.serverName} onChange={v => setSrcForm({...srcForm, serverName: v})} placeholder="e.g. Server 1" />
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Audio" value={srcForm.audio} onChange={v => setSrcForm({...srcForm, audio: v})} options={["sub", "dub", "raw"]} />
              <SelectField label="Stream Type" value={srcForm.streamType} onChange={v => setSrcForm({...srcForm, streamType: v})} options={["hls", "mp4", "iframe", "embed"]} />
            </div>
            <InputField label="URL Source" value={srcForm.urlSource} onChange={v => setSrcForm({...srcForm, urlSource: v})} required placeholder="https://..." />
            <InputField label="External ID" value={srcForm.externalId} onChange={v => setSrcForm({...srcForm, externalId: v})} placeholder="Optional" />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setSrcModal(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-input)]">Batal</button>
              <button type="submit" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--accent-hover)]">Simpan</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Fullscreen Image Preview */}
      {previewFullUrl && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setPreviewFullUrl(null)}
        >
          <img 
            src={previewFullUrl} 
            alt="Full Preview" 
            className="max-h-full max-w-full rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
          />
          <button 
            type="button"
            className="absolute top-6 right-6 p-2 rounded-full bg-black/20 text-white/50 hover:text-white hover:bg-black/40 transition"
            onClick={(e) => { e.stopPropagation(); setPreviewFullUrl(null); }}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Reusable Components ───
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", textarea, required, placeholder, previewImage, onPreviewClick }) {
  const cls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]";
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
      <div className={previewImage ? "flex gap-3 items-center" : ""}>
        {textarea ? (
          <textarea rows="3" value={value} onChange={e => onChange(e.target.value)} className={cls + " resize-none"} placeholder={placeholder} />
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)} className={cls} required={required} placeholder={placeholder} />
        )}
        {previewImage && value && (
          <button 
            type="button"
            onClick={() => onPreviewClick?.(value)}
            className="h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-[var(--border)] bg-black/20 flex items-center justify-center hover:opacity-80 transition cursor-zoom-in"
            title="Klik untuk lihat full"
          >
             <img src={value} alt="Preview" className="h-full w-full object-cover" onError={(e) => e.target.style.display = 'none'} />
          </button>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]">
        {options.map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
      </select>
    </div>
  );
}
