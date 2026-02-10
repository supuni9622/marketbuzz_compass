"use client";

import { useCallback, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { NovaAvatar } from "../components/NovaAvatar";
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

export default function AskMarketBuzzPage() {
  const api = useApiClient();
  const { monthApi, compareMonthApi, appId } = useFilters();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
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
  }, [input, isLoading, messages, api, monthApi, compareMonthApi, appId, scrollToBottom]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <main className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-xl font-semibold text-slate-800">Ask MarketBuzz</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ask Nova about revenue, merchants, or trends. Current filters: Month {monthApi || "—"}, Compare {compareMonthApi || "—"}, App {appId || "All"}.
        </p>

        <div className="mt-6 flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex max-h-[60vh] min-h-[280px] flex-col overflow-y-auto p-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-1 items-center justify-center text-slate-500">
                <p className="text-sm">Ask a question, e.g. &quot;How did gross billed change last month?&quot;</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-4 flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0">
                    <NovaAvatar />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <span className="font-medium">{msg.role === "user" ? "You" : "Nova"}</span>
                  <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
                </div>
                {msg.role === "user" && <div className="w-9 flex-shrink-0" />}
              </div>
            ))}
            {isLoading && (
              <div className="mb-4 flex gap-3">
                <div className="flex-shrink-0">
                  <NovaAvatar />
                </div>
                <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">
                  Nova is thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="border-t border-slate-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="flex gap-2 border-t border-slate-200 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about revenue, merchants, at risk…"
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
