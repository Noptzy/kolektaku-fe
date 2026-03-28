"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import chatService from "@/lib/chatApi";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export default function FloatingChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);
  const isAdmin = user && user.roleId === 1;

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
    if (!isOpen) return;
    fetchMessages(true);

    pollingRef.current = setInterval(() => {
      fetchMessages(false);
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("open-login-modal"));
      }
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
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        style={{
          background: isOpen
            ? "var(--danger)"
            : "var(--accent)",
          boxShadow: isOpen
            ? "0 4px 20px rgba(239, 68, 68, 0.4)"
            : "0 4px 20px rgba(var(--accent-rgb), 0.4)",
        }}
        title={isOpen ? "Tutup Chat" : "Global Chat"}
      >
        {isOpen ? (
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-[89] flex w-[360px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl"
          style={{
            height: "min(500px, calc(100vh - 160px))",
            animation: "floatChatIn 0.25s ease-out",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-[var(--accent)]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <h3 className="text-sm font-bold text-white">Kolektaku Community</h3>
                <p className="text-[11px] font-medium text-white/70">Global Chat</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "thin" }}>
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <svg className="h-7 w-7 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-[var(--text-tertiary)]">
                <span className="text-4xl">🎭</span>
                <p className="mt-3 text-sm">Belum ada obrolan. Jadilah yang pertama!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => {
                  const isOwn = user?.id === msg.user?.id;
                  const showHeader =
                    idx === 0 ||
                    messages[idx - 1]?.user?.id !== msg.user?.id ||
                    new Date(msg.createdAt).getTime() - new Date(messages[idx - 1]?.createdAt).getTime() > 60000;

                  return (
                    <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                      {showHeader ? (
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-input)]">
                          {msg.user?.avatarUrl ? (
                            <img src={msg.user.avatarUrl} alt={msg.user.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[var(--text-tertiary)] uppercase">
                              {(msg.user?.name || "?").charAt(0)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-8 w-8 shrink-0" />
                      )}

                      <div className={`flex max-w-[75%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
                        {showHeader && (
                          <div className={`mb-0.5 flex items-center gap-1.5 px-1 text-[10px] ${isOwn ? "flex-row-reverse" : ""}`}>
                            <span className="font-semibold text-[var(--text-secondary)]">{msg.user?.name || "Anonim"}</span>
                            <span className="text-[var(--text-tertiary)]">
                              {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: id }) : ""}
                            </span>
                          </div>
                        )}

                        <div className="group relative flex items-center gap-1">
                          {(isOwn || isAdmin) && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              className={`hidden rounded p-0.5 text-[var(--text-tertiary)] transition hover:text-[var(--danger)] group-hover:block ${isOwn ? "order-first" : "order-last"}`}
                              title="Hapus"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                              isOwn
                                ? "rounded-tr-sm bg-[var(--accent)] text-white"
                                : "rounded-tl-sm border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
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
          <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] p-3">
            {user ? (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ketik pesan..."
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] transition-all placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={submitting || !newMessage.trim()}
                  className="flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--border)] p-3 text-center">
                <p className="mb-2 text-xs text-[var(--text-secondary)]">Login untuk mulai ngobrol.</p>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("open-login-modal"));
                    }
                  }}
                  className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  Login
                </button>
              </div>
            )}
          </div>

          {/* Animation keyframes */}
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes floatChatIn {
                from { opacity: 0; transform: translateY(16px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
            `
          }} />
        </div>
      )}
    </>
  );
}
