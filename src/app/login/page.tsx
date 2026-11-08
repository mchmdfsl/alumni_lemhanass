"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, LoaderCircle } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReactivation, setShowReactivation] = useState(false);
  const [reactivationReason, setReactivationReason] = useState("");
  const [reactivationLoading, setReactivationLoading] = useState(false);
  const [reactivationNotice, setReactivationNotice] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login gagal. Periksa kembali data Anda.");
      router.replace(data.role === "admin" || data.role === "super_admin" ? "/admin" : "/user");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivationRequest() {
    if (!identifier.trim() || !password || reactivationReason.trim().length < 5) {
      setError("Isi email/nomor alumni, password akun lama, dan alasan minimal 5 karakter.");
      return;
    }
    setError("");
    setReactivationNotice("");
    setReactivationLoading(true);
    try {
      const response = await fetch("/api/auth/reactivation-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ identifier: identifier.trim(), password, reason: reactivationReason.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pengajuan aktivasi kembali gagal.");
      setReactivationNotice(result.message || "Pengajuan berhasil dikirim untuk ditinjau Admin.");
      setReactivationReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pengajuan aktivasi kembali gagal.");
    } finally {
      setReactivationLoading(false);
    }
  }
  const inputClass = "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10";

  return (
    <AuthShell title="Pendataan Alumni" subtitle="Sistem Informasi Pendataan Alumni Lembaga Ketahanan Nasional Republik Indonesia">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800">Selamat Datang</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">Silakan masuk untuk mengakses sistem pendataan alumni LEMHANNAS RI.</p>
      </div>
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {reactivationNotice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{reactivationNotice}</div>}
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="identifier" className="mb-2 block text-sm font-semibold text-slate-700">Email atau Nomor Alumni</label>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="identifier" name="identifier" type="text" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Masukkan email atau nomor alumni" required className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
          <div className="relative">
            <LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan password" required className={inputClass} />
          </div>
          <div className="mt-2 text-right text-sm"><Link href="/lupa-password" className="text-slate-500 hover:text-[#0b1f3a]">Lupa password?</Link></div>
        </div>
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] py-3.5 text-sm font-bold tracking-wide text-white transition hover:bg-[#18385f] disabled:cursor-not-allowed disabled:opacity-60">
          {loading && <LoaderCircle size={17} className="animate-spin" />}
          {loading ? "MEMPROSES..." : "MASUK"}
        </button>        <div className="border-t border-slate-100 pt-4">
          <button type="button" onClick={() => { setShowReactivation((value) => !value); setError(""); setReactivationNotice(""); }} className="w-full text-center text-sm font-semibold text-[#0b1f3a] hover:underline">
            {showReactivation ? "Tutup pengajuan aktivasi kembali" : "Akun dinonaktifkan? Ajukan aktivasi kembali"}
          </button>
          {showReactivation && (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs leading-5 text-slate-600">Gunakan email/nomor alumni dan password akun lama untuk membuktikan kepemilikan akun. Pengajuan akan ditinjau Admin sebelum akun diaktifkan kembali.</p>
              <div>
                <label htmlFor="reactivationReason" className="mb-1.5 block text-sm font-semibold text-slate-700">Alasan meminta aktivasi kembali</label>
                <textarea id="reactivationReason" value={reactivationReason} onChange={(event) => setReactivationReason(event.target.value)} rows={3} maxLength={2000} placeholder="Jelaskan alasan akun perlu diaktifkan kembali..." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10" />
              </div>
              <button type="button" onClick={() => void handleReactivationRequest()} disabled={reactivationLoading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0b1f3a] bg-white py-3 text-sm font-bold text-[#0b1f3a] transition hover:bg-slate-100 disabled:opacity-60">
                {reactivationLoading && <LoaderCircle size={16} className="animate-spin" />}
                {reactivationLoading ? "MENGIRIM..." : "KIRIM PENGAJUAN"}
              </button>
            </div>
          )}
        </div>
      </form>
      <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
        <p>Belum punya akun? <Link href="/daftar" className="font-semibold text-[#0b1f3a] hover:underline">Daftar alumni</Link></p>
      </div>
    </AuthShell>
  );
}
