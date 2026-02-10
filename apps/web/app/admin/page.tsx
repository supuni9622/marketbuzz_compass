"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/auth/AuthProvider";
import { UploadStatusList } from "./UploadStatusList";

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, "") : "http://localhost:3001";
}

export default function AdminPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage("Please select a CSV file.");
      setStatus("error");
      return;
    }
    const token = getToken();
    if (!token) {
      setMessage("Not authenticated.");
      setStatus("error");
      return;
    }
    setStatus("uploading");
    setMessage("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${getBaseUrl()}/admin/upload/csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        upload_id?: string;
        rows_received?: number;
        error?: string;
      };
      if (!res.ok) {
        setMessage(data.error ?? `Upload failed (${res.status})`);
        setStatus("error");
        return;
      }
      setMessage(
        `Upload accepted. upload_id: ${data.upload_id ?? "—"}, rows: ${data.rows_received ?? "—"}. Ingestion is running in the background.`
      );
      setStatus("success");
      setFile(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "uploads"] });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50/70">
      <h1 className="text-2xl font-bold text-slate-800">Admin</h1>
      <p className="mt-2 text-slate-600">Upload Clover CSV to run ingestion.</p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-slate-800">Upload CSV</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="csv-file" className="block text-sm font-medium text-slate-700">
              Clover billing CSV
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                setFile(f ?? null);
                setStatus("idle");
                setMessage("");
              }}
              className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-600 file:px-4 file:py-2 file:text-white file:shadow-sm file:transition-all hover:file:bg-teal-700 hover:file:shadow-md"
            />
          </div>
          <button
            type="submit"
            disabled={status === "uploading" || !file}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md disabled:opacity-50 disabled:hover:bg-teal-600 disabled:hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            {status === "uploading" ? "Uploading…" : "Upload"}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 rounded-md p-3 text-sm ${
              status === "error"
                ? "bg-red-50 text-red-700"
                : status === "success"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-slate-50 text-slate-700"
            }`}
            role="alert"
          >
            {message}
          </div>
        )}
      </section>

      <UploadStatusList />

      <p className="mt-6 text-sm text-slate-500">
        <Link href="/" className="text-teal-600 transition-colors hover:text-teal-700 hover:underline">
          ← Back to Brief
        </Link>
      </p>
    </main>
  );
}
