"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (password.length < 12) {
      setError("Password minimal 12 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Password gagal diubah.");
      setMessage(result.message || "Password berhasil diubah.");
      window.setTimeout(() => router.replace("/login"), 1800);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Atur Password Baru" subtitle="Sistem Informasi Pendataan Alumni LEMHANNAS RI">
      <div className="mb-6">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#0b1f3a]"><ShieldCheck size={24} /></div>
        <h2 className="text-lg font-bold text-slate-800">Buat Password Baru</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">Gunakan password minimal 12 karakter dan jangan bagikan kepada siapa pun.</p>
      </div>
      {!token && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Token reset tidak ditemukan. Silakan minta tautan reset yang baru.</div>}
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">Password baru</label>
          <div className="relative"><LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="password" type="password" autoComplete="new-password" required minLength={12} maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 12 karakter" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10" /></div>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700">Konfirmasi password baru</label>
          <div className="relative"><LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={1024} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Ulangi password baru" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10" /></div>
        </div>
        <button type="submit" disabled={loading || !token} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] py-3.5 text-sm font-bold text-white transition hover:bg-[#18385f] disabled:opacity-60">
          {loading && <LoaderCircle size={17} className="animate-spin" />}
          {loading ? "MENYIMPAN..." : "SIMPAN PASSWORD BARU"}
        </button>
      </form>
      <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm"><Link href="/login" className="inline-flex items-center gap-2 font-semibold text-[#0b1f3a] hover:underline"><ArrowLeft size={16} /> Kembali ke Login</Link></div>
    </AuthShell>
  );
}
