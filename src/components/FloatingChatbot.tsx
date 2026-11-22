"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { answerLocally, type ChatHistoryMessage, type ChatLink } from "@/lib/chat/knowledge";

type ChatMessage = { role: "assistant" | "user"; text: string; links?: ChatLink[] };

export function FloatingChatbot({
  onOpenChange,
  standalone = false,
  hideLauncher = false,
}: {
  onOpenChange?: (open: boolean) => void;
  standalone?: boolean;
  hideLauncher?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "How can I help?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function sendMessage(message: string) {
    const text = message.trim();
    if (!text || loading) return;
    const history: ChatHistoryMessage[] = messages
      .slice(-4)
      .map(({ role, text }) => ({ role, content: text.slice(0, 800) }));
    setInput("");
    setMessages((current) => [...current, { role: "user", text }]);
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const result: { answer?: string; disclaimer?: string; error?: string; links?: ChatLink[] } =
        await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to get a response.");
      if (!result.answer?.trim()) throw new Error("The assistant returned an empty response.");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: `${result.answer ?? ""}\n\n${result.disclaimer ?? ""}`.trim(),
          links: result.links ?? [],
        },
      ]);
    } catch {
      const localAnswer = answerLocally(text, history);
      setMessages((current) => [
        ...current,
        { role: "assistant", text: localAnswer.answer, links: localAnswer.links },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
  }

  const closeChat = useCallback(() => {
    setOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!hideLauncher) return;
    function openFromPortalMenu() {
      setOpen(true);
      onOpenChange?.(true);
    }
    window.addEventListener("placeholder-open-assistant", openFromPortalMenu);
    return () => window.removeEventListener("placeholder-open-assistant", openFromPortalMenu);
  }, [hideLauncher, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !containerRef.current?.contains(target)) {
        closeChat();
      }
    }

    window.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePointerDown, true);
  }, [open, closeChat]);

  return (
    <div
      ref={containerRef}
      className={standalone ? "standalone-chatbot-slot" : "island-chatbot-slot"}
    >
      {open && (
        <section
          aria-label="your firm AI Assistant chat"
          className={`chatbot-panel${standalone ? " chatbot-panel-standalone" : ""} flex h-fit max-h-[min(340px,calc(100dvh_-_120px_-_env(safe-area-inset-bottom)))] w-[92vw] flex-col overflow-hidden rounded-3xl text-[var(--foreground)] sm:w-[360px]`}
        >
          <div className="chatbot-header flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="chatbot-avatar">
                <Bot size={18} aria-hidden="true" />
              </span>
              <div className="relative">
                <p className="text-sm font-semibold">your firm AI Assistant</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">Here to help</p>
                <span className="chatbot-online-dot" role="status" aria-label="Online" />
              </div>
            </div>
            <button
              type="button"
              onClick={closeChat}
              aria-label="Close chat"
              className="chatbot-close-button"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="chatbot-messages max-h-44 space-y-2 overflow-y-auto p-3"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`placeholder-chat-message max-w-[90%] whitespace-pre-wrap px-3 py-2 text-[13px] leading-5 ${
                  message.role === "user"
                    ? "chatbot-message-user ml-auto"
                    : "chatbot-message-assistant"
                }`}
              >
                <p>{message.text}</p>
                {message.links?.length ? (
                  <ul className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-2">
                    {message.links.map((link) => (
                      <li key={`${link.href}-${link.label}`}>
                        <a
                          href={link.href}
                          download={link.download ? true : undefined}
                          className="inline-flex items-start gap-1.5 text-xs font-semibold leading-5 text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent)]"
                        >
                          {link.download ? <span aria-hidden="true">↓</span> : null}
                          <span>{link.label}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
            {loading && (
              <p className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]" role="status">
                <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
                your firm AI Assistant is responding…
              </p>
            )}
          </div>

          <div className="chatbot-composer p-2.5">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <label htmlFor="assistant-message" className="sr-only">
                Message your firm AI Assistant
              </label>
              <input
                id="assistant-message"
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about the site or request a file..."
                maxLength={1000}
                className="chatbot-input min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)]"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="chatbot-send-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--button-text)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        </section>
      )}
      {!hideLauncher ? <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label={standalone ? (open ? "Close your firm AI Assistant" : "Open your firm AI Assistant") : undefined}
        className={standalone ? "standalone-chat-launcher" : "island-chat-launcher w-full xl:w-auto"}
      >
        {open ? <X size={19} aria-hidden="true" /> : <MessageCircle size={19} aria-hidden="true" />}
        {!standalone ? (
          <>
            <span className="chatbot-mobile-label">{open ? "Close chat" : "Chat"}</span>
            <span className="chatbot-desktop-label">
              {open ? "Close assistant" : "your firm AI Assistant"}
            </span>
          </>
        ) : null}
      </button> : null}
    </div>
  );
}
