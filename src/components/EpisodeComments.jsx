import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import commentService from '@/lib/commentApi';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export default function EpisodeComments({ episodeId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const isPremium = user && user.roleId <= 2;
  const isAdmin = user && user.roleId === 1;

  useEffect(() => {
    if (episodeId) {
      loadComments(1);
    }
  }, [episodeId]);

  const loadComments = async (pageNumber) => {
    try {
      if (pageNumber === 1) setLoading(true);
      const res = await commentService.getComments(episodeId, { page: pageNumber, limit: 10 });
      
      if (res.success && res.data) {
        if (pageNumber === 1) {
          setComments(res.data.comments || []);
        } else {
          setComments((prev) => [...prev, ...(res.data.comments || [])]);
        }
        setTotal(res.total || 0);
        setHasMore(pageNumber < (res.totalPages || 1));
        setPage(pageNumber);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      if (pageNumber === 1) setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-login-modal'));
      }
      return;
    }
    
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await commentService.addComment(episodeId, newComment);
      if (res.success && res.data) {
        setComments((prev) => [res.data, ...prev]);
        setTotal((prev) => prev + 1);
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      const msg = error?.response?.data?.message || 'Gagal mengirim komentar';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Hapus komentar ini?')) return;
    
    try {
      await commentService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotal((prev) => prev - 1);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert(error?.response?.data?.message || 'Gagal menghapus komentar');
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        <svg className="h-8 w-8 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <h3 className="mb-6 flex items-center gap-2 text-lg font-bold">
        <span className="text-xl">💬</span>
        Komentar Episode <span className="ml-1 text-sm font-normal text-[var(--text-tertiary)]">({total})</span>
      </h3>

      <div className="mb-8">
        {!user ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
            <p className="mb-3 text-[var(--text-secondary)]">Kamu harus login untuk berkomentar.</p>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-login-modal'));
                }
              }}
              className="rounded-lg bg-[var(--accent)] px-6 py-2 font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            >
              Login Sekarang
            </button>
          </div>
        ) : !isPremium ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--accent)]/30 bg-[var(--accent)]/5 p-6 text-center">
            <span className="mb-3 text-4xl">💎</span>
            <p className="font-semibold text-[var(--text-primary)]">Fitur Premium</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Hanya member premium yang bisa berkomentar di episode.</p>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/membership';
                }
              }}
              className="mt-4 rounded-lg bg-[var(--accent)] px-6 py-2 font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            >
              Upgrade ke Premium
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-full sm:block">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--accent)] text-lg font-bold text-white uppercase">
                  {(user.name || user.email || '?').charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Tulis pendapatmu tentang episode ini..."
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                rows="2"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:bg-[var(--accent)]/50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Mengirim...' : 'Kirim'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-5">
        {comments.length === 0 ? (
          <div className="py-8 text-center text-[var(--text-tertiary)]">
            <span className="text-4xl text-[var(--bg-input)]">🗨️</span>
            <p className="mt-3">Belum ada komentar. Jadilah yang pertama!</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <div key={comment.id} className="group flex gap-4">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-input)]">
                  {comment.user?.avatarUrl ? (
                    <img src={comment.user.avatarUrl} alt={comment.user.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[var(--text-tertiary)] uppercase">
                      {(comment.user?.name || '?').charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{comment.user?.name || 'Anonim'}</span>
                      {comment.user?.id === user?.id && (
                        <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">Kamu</span>
                      )}
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: id }) : ''}
                      </span>
                    </div>
                    
                    {(user?.id === comment.user?.id || isAdmin) && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="invisible p-1 text-[var(--text-tertiary)] transition hover:text-[var(--danger)] group-hover:visible"
                        title="Hapus komentar"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{comment.content}</p>
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => loadComments(page + 1)}
                  className="text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
                >
                  Muat lebih banyak
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
