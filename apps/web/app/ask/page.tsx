"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AppHeader } from "../components/AppHeader";
import { NovaAvatar } from "../components/NovaAvatar";
import { UserAvatar } from "../components/UserAvatar";
import { useApiClient } from "@/lib/api/useApiClient";
import { useFilters } from "../hooks/useFilters";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface NovaChatResponse {
  message: string;
  tool_calls_used: number;
}

const EXAMPLE_QUESTIONS = [
  "How did gross billed change last month?",
  "Which apps drove the most revenue?",
  "How many merchants are at risk?",
  "Summarize refunds and uninstalls.",
];

export default function AskNovaPage() {
  const api = useApiClient();
  const { monthApi, compareMonthApi, appId } = useFilters();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || isLoading) return;
      setInput("");
      setError(null);
      const userMessage: ChatMessage = { role: "user", content: text };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const history = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const body: {
          messages: { role: "user" | "assistant"; content: string }[];
          month?: string;
          compare_month?: string;
          app_id?: string;
        } = { messages: history };
        if (monthApi) body.month = monthApi;
        if (compareMonthApi) body.compare_month = compareMonthApi;
        if (appId) body.app_id = appId;

        const res = await api.post<NovaChatResponse>("/nova/chat", body);
        setMessages((prev) => [...prev, { role: "assistant", content: res.message }]);
        scrollToBottom();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get response from Nova.");
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    },
    [input, isLoading, messages, api, monthApi, compareMonthApi, appId, scrollToBottom]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleExampleClick = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage]
  );

  const messageVariants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      };

  const emptyVariants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
      };

  const chipVariants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1 } };

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50/50 to-slate-50/80 dark:from-slate-900 dark:to-slate-900">
      <AppHeader />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Ask Nova</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Ask Nova about revenue, merchants, or trends. Filters: Month {monthApi || "—"}, Compare{" "}
          {compareMonthApi || "—"}, App {appId || "All"}.
        </p>

        <div className="mt-6 flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-md dark:border-slate-600 dark:bg-slate-800">
          {/* Chat transcript */}
          <div className="flex max-h-[60vh] min-h-[320px] flex-col overflow-y-auto bg-gradient-to-b from-teal-50/30 to-white p-4 dark:from-slate-800/80 dark:to-slate-800">
            <AnimatePresence initial={false}>
              {messages.length === 0 && !isLoading && (
                <motion.div
                  key="empty"
                  className="flex flex-1 flex-col items-center justify-center gap-6 py-8"
                  variants={emptyVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div variants={chipVariants}>
                    <NovaAvatar size={88} withBg className="ring-4 ring-teal-100/80 shadow-lg" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-base font-medium text-slate-700 dark:text-slate-200">
                      Hi, I&apos;m Nova. Your revenue analyst.
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Ask me about billed amount, active merchants, at-risk, refunds, or trends.
                    </p>
                  </div>
                  <motion.div
                    className="flex flex-wrap justify-center gap-2"
                    variants={reduceMotion ? undefined : { visible: { transition: { staggerChildren: 0.05 } } }}
                  >
                    {EXAMPLE_QUESTIONS.map((q) => (
                      <motion.button
                        key={q}
                        type="button"
                        variants={chipVariants}
                        onClick={() => handleExampleClick(q)}
                        disabled={isLoading}
                        className="rounded-full border border-teal-200 bg-white px-4 py-2 text-sm text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/80 hover:shadow focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50 dark:border-teal-600 dark:bg-slate-700 dark:text-teal-200 dark:hover:bg-teal-900/30"
                      >
                        {q}
                      </motion.button>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                className={`mb-4 flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.2 }}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 pt-0.5">
                    <NovaAvatar size={40} />
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="flex-shrink-0 pt-0.5">
                    <UserAvatar size={40} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-teal-600 text-white shadow-sm dark:bg-teal-500"
                      : "border border-teal-100 bg-white/90 text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    {msg.role === "user" ? "You" : "Nova"}
                  </span>
                  <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                className="mb-4 flex gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex-shrink-0 pt-0.5 nova-updating">
                  <NovaAvatar size={40} />
                </div>
                <div className="rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-2.5 text-sm text-teal-800">
                  <span className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                    Nova
                  </span>
                  <p className="mt-1 text-slate-600">Thinking…</p>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div
              className="border-t border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-slate-200 bg-slate-50/50 p-3 dark:border-slate-600 dark:bg-slate-800/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about revenue, merchants, at risk…"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder:text-slate-500"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:bg-teal-500 dark:hover:bg-teal-600 dark:focus:ring-offset-slate-800 dark:disabled:bg-slate-600"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
