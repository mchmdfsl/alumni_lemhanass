"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Permintaan tidak dapat diproses.");
      setMessage(result.message || "Jika email terdaftar, tautan pemulihan akan dikirim.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Pemulihan Akun" subtitle="Sistem Informasi Pendataan Alumni LEMHANNAS RI">
      <div className="mb-6">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#0b1f3a]"><ShieldCheck size={24} /></div>
        <h2 className="text-lg font-bold text-slate-800">Lupa Password?</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">Masukkan email yang sudah tersimpan di akun alumni. Kami akan mengirim tautan untuk membuat password baru.</p>
      </div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Email terdaftar</label>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] py-3.5 text-sm font-bold text-white transition hover:bg-[#18385f] disabled:opacity-60">
          {loading && <LoaderCircle size={17} className="animate-spin" />}
          {loading ? "MENGIRIM..." : "KIRIM TAUTAN RESET"}
        </button>
      </form>
      <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm">
        <Link href="/login" className="inline-flex items-center gap-2 font-semibold text-[#0b1f3a] hover:underline"><ArrowLeft size={16} /> Kembali ke Login</Link>
      </div>
    </AuthShell>
  );
}
