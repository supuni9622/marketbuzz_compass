"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/auth/AuthProvider";

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url.replace(/\/$/, "");
  if (typeof window !== "undefined") return "";
  return "http://localhost:3001";
}

export default function AdminPage() {
  const { getToken } = useAuth();
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
      const data = await res.json().catch(() => ({}));
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
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
  }

  return (
    <main>
      <h1 className="text-2xl font-bold text-slate-800">Admin</h1>
      <p className="mt-2 text-slate-600">Upload Clover CSV to run ingestion.</p>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
                const f = e.target.files?.[0];
                setFile(f ?? null);
                setStatus("idle");
                setMessage("");
              }}
              className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>
          <button
            type="submit"
            disabled={status === "uploading" || !file}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600"
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

      <p className="mt-6 text-sm text-slate-500">
        <Link href="/" className="text-teal-600 hover:underline">
          ← Back to Brief
        </Link>
      </p>
    </main>
  );
}
