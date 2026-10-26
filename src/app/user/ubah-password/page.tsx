"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, LockKeyhole, LoaderCircle, ShieldCheck } from "lucide-react";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10";

export default function UbahPasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword.length < 12) return setError("Password baru minimal 12 karakter.");
    if (newPassword !== confirmPassword) return setError("Konfirmasi password baru tidak cocok.");
    setLoading(true);
    try {
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Password gagal diganti.");
      setSuccess(result.message || "Password berhasil diganti.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(() => router.replace("/user/profil"), 1800);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">Keamanan Akun</p>
        <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">Ganti Password</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">Ganti password akun alumni kapan saja. Password lama diperlukan untuk memastikan akun tetap aman.</p>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0b1f3a] text-white"><ShieldCheck size={23} /></div>
          <div><h2 className="font-bold text-[#172033]">Perbarui kredensial</h2><p className="mt-1 text-sm text-slate-500">Gunakan password unik minimal 12 karakter.</p></div>
        </div>
        {error && <div role="alert" className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6">{error}</div>}
        {success && <div role="status" className="mx-5 mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 sm:mx-6"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{success}</div>}
        <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
          <div><label htmlFor="currentPassword" className="mb-2 block text-sm font-semibold text-slate-700">Password saat ini</label><div className="relative"><LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="currentPassword" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} placeholder="Masukkan password saat ini" /></div></div>
          <div><label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-slate-700">Password baru</label><div className="relative"><LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={1024} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} placeholder="Minimal 12 karakter" /></div></div>
          <div><label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700">Konfirmasi password baru</label><div className="relative"><LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={1024} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} placeholder="Ulangi password baru" /></div></div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"><strong>Tips keamanan:</strong> jangan gunakan password yang sama dengan akun lain dan jangan bagikan password kepada siapa pun.</div>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
            <Link href="/user/profil" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"><ArrowLeft size={16} /> Kembali ke Profil</Link>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18385f] disabled:cursor-not-allowed disabled:opacity-60">{loading && <LoaderCircle size={17} className="animate-spin" />}{loading ? "Menyimpan..." : "Ganti Password"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
