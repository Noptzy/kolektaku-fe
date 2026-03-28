import { useState } from 'react';
import reportService from '@/lib/reportApi';

export default function ReportModal({ isOpen, onClose, episodeId, episodeTitle }) {
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!category) {
      setError('Pilih kategori laporan.');
      return;
    }

    setLoading(true);
    try {
      await reportService.submitReport(episodeId, category, message);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCategory('');
        setMessage('');
      }, 2000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal mengirim laporan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Laporkan Episode</h2>
          <button
            title="Tutup"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]"
            disabled={loading || success}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Laporan Terkirim</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Terima kasih atas laporan Anda! Admin akan segera memeriksanya.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {episodeTitle && (
                <div className="mb-6 rounded-lg bg-[var(--bg-input)] p-3 text-sm">
                  <span className="text-[var(--text-tertiary)]">Episode: </span>
                  <span className="font-semibold text-[var(--text-secondary)]">{episodeTitle}</span>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-lg bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Kategori (Wajib)</label>
                <div className="space-y-2">
                  {[
                    { id: 'wrong_episode', label: 'Salah Episode/Tertukar' },
                    { id: 'broken_video', label: 'Video Rusak/Tidak Bisa Diputar' },
                    { id: 'wrong_subtitle', label: 'Subtitle Salah/Terjemahan Buruk' },
                    { id: 'missing_subtitle', label: 'Subtitle Hilang/Telat' },
                    { id: 'other', label: 'Lainnya' },
                  ].map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        category === cat.id
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                          : 'border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportCategory"
                        value={cat.id}
                        checked={category === cat.id}
                        onChange={(e) => setCategory(e.target.value)}
                        className="hidden"
                      />
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          category === cat.id ? 'border-[var(--accent)]' : 'border-[var(--text-tertiary)]'
                        }`}
                      >
                        {category === cat.id && <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
                      </div>
                      <span className="text-sm">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="message" className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Detail Tambahan (Opsional)
                </label>
                <textarea
                  id="message"
                  rows="3"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Ceritakan detail masalahnya..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-primary)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--danger)]/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Kirim Laporan'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
