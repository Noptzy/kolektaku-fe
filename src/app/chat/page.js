"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import chatService from "@/lib/chatApi";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  
  // Polling interval reference
  const pollingRef = useRef(null);

  const fetchMessages = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const res = await chatService.getMessages({ limit: 100 });
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true);

    // Setup polling every 5 seconds for basic "real-time" sync
    pollingRef.current = setInterval(() => {
      fetchMessages(false);
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change initially or when user adds a new message
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      document.dispatchEvent(new CustomEvent("open-login-modal"));
      return;
    }

    if (!newMessage.trim()) return;

    setSubmitting(true);
    try {
      const res = await chatService.sendMessage(newMessage);
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      alert(error?.response?.data?.message || "Gagal mengirim pesan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm("Hapus pesan ini?")) return;

    try {
      await chatService.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error("Failed to delete message:", error);
      alert(error?.response?.data?.message || "Gagal menghapus pesan");
    }
  };

  const isAdmin = user?.role?.permissions?.includes("MANAGE_CHAT");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-2xl">
            💬
          </div>
          <div>
            <h1 className="text-2xl font-bold">Global Chat</h1>
            <p className="text-sm text-[var(--text-tertiary)]">Ngobrol bareng Wibu Anime lainnya real-time (hampir).</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-lg shadow-[var(--accent)]/5">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <svg className="h-8 w-8 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-[var(--text-tertiary)]">
                <span className="text-6xl text-[var(--bg-input)]">🎭</span>
                <p className="mt-4">Belum ada obrolan. Jadilah yang pertama!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => {
                  const isOwn = user?.id === msg.user?.id;
                  const showHeader =
                    idx === 0 || messages[idx - 1]?.user?.id !== msg.user?.id ||
                    new Date(msg.createdAt).getTime() - new Date(messages[idx - 1]?.createdAt).getTime() > 60000;

                  return (
                    <div key={msg.id} className={`group flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                      {showHeader ? (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-input)]">
                          {msg.user?.avatarUrl ? (
                            <img src={msg.user.avatarUrl} alt={msg.user.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[var(--text-tertiary)] uppercase">
                              {(msg.user?.name || "?").charAt(0)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-10 w-10 shrink-0" />
                      )}

                      <div className={`flex max-w-[80%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
                        {showHeader && (
                          <div className={`mb-1 flex items-center gap-2 px-1 text-xs ${isOwn ? "flex-row-reverse" : ""}`}>
                            <span className="font-semibold text-[var(--text-secondary)]">{msg.user?.name || "Anonim"}</span>
                            {isOwn && (
                              <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 font-bold text-[var(--accent)]">Kamu</span>
                            )}
                            <span className="text-[var(--text-tertiary)]">
                              {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: id }) : ""}
                            </span>
                          </div>
                        )}

                        <div className="group relative flex items-center gap-2">
                          {isOwn && (isOwn || isAdmin) && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              className="absolute right-full mr-2 hidden rounded p-1 text-[var(--text-tertiary)] transition hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] group-hover:block"
                              title="Hapus"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm ${
                              isOwn
                                ? "rounded-tr-sm bg-[var(--accent)] text-white"
                                : "rounded-tl-sm border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>

                          {!isOwn && isAdmin && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              className="absolute left-full ml-2 hidden rounded p-1 text-[var(--text-tertiary)] transition hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] group-hover:block"
                              title="Hapus"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            {user ? (
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ketik pesan..."
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] transition-all placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={submitting || !newMessage.trim()}
                  className="flex items-center justify-center rounded-xl bg-[var(--accent)] px-6 px-4 py-3 font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--accent)]/50 sm:px-8"
                >
                  {submitting ? (
                    <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] p-4 text-center">
                <p className="mb-3 text-[var(--text-secondary)]">Login untuk mulai ngobrol di Global Chat.</p>
                <button
                  onClick={() => document.dispatchEvent(new CustomEvent("open-login-modal"))}
                  className="rounded-lg bg-[var(--accent)] px-6 py-2 font-semibold text-white transition hover:bg-[var(--accent-hover)]"
                >
                  Login Sekarang
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--bg-secondary)] py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-[var(--text-tertiary)]">
          <p>© 2026 Kolektaku. Made with ❤️ for anime lovers</p>
        </div>
      </footer>
    </div>
  );
}
