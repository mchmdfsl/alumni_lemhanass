"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

type ClaimForm = { nama: string; angkatan: string; email: string; password: string; konfirmasi: string };
const initialForm: ClaimForm = { nama: "", angkatan: "", email: "", password: "", konfirmasi: "" };
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10";

export default function KlaimAkunPage() {
  const [form, setForm] = useState<ClaimForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  function updateField(event: ChangeEvent<HTMLInputElement>) {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    if (form.password.length < 12) return setMessage("Password minimal 12 karakter.");
    if (form.password !== form.konfirmasi) return setMessage("Konfirmasi password tidak cocok.");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: form.nama.trim(), angkatan: form.angkatan.trim(), email: form.email.trim(), password: form.password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pengajuan klaim akun gagal.");
      setSuccess(true);
      setMessage(result.message || "Pengajuan berhasil dikirim.");
      setForm(initialForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function Field({ label, name, type = "text", placeholder, autoComplete }:
    { label: string; name: keyof ClaimForm; type?: string; placeholder: string; autoComplete?: string }) {
    return <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      <input id={name} name={name} type={type} value={form[name]} onChange={updateField} className={inputClass}
        placeholder={placeholder} autoComplete={autoComplete || "off"} maxLength={name === "email" ? 254 : 200} required />
    </div>;
  }

  return <AuthShell title="Klaim Akun Alumni" subtitle="Aktifkan akun menggunakan data alumni yang sudah tercatat di database Lemhannas RI.">
    <p className="mb-5 text-sm leading-6 text-slate-500">Pastikan nama dan angkatan sama persis dengan data alumni. Klaim hanya dapat dilakukan untuk data yang sudah terverifikasi dan belum memiliki akun.</p>
    {message && <div role="alert" aria-live="polite" className={`mb-5 rounded-xl border p-3 text-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{message}</div>}
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nama lengkap *" name="nama" placeholder="Sesuai data alumni" autoComplete="name" />
      <Field label="Angkatan *" name="angkatan" placeholder="Masukkan angkatan alumni" />
      <Field label="Email aktif *" name="email" type="email" placeholder="nama@email.com" autoComplete="email" />
      <Field label="Buat password (minimal 12 karakter) *" name="password" type="password" placeholder="Buat password baru" autoComplete="new-password" />
      <Field label="Konfirmasi password *" name="konfirmasi" type="password" placeholder="Ulangi password" autoComplete="new-password" />
      <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] py-3.5 text-sm font-bold text-white transition hover:bg-[#18385f] disabled:opacity-60">
        {loading && <LoaderCircle size={17} className="animate-spin" />}{loading ? "Memproses klaim..." : "Klaim Akun & Buat Password"}
      </button>
    </form>
    <p className="mt-6 text-center text-sm text-slate-600">Sudah punya akun? <Link href="/login" className="font-semibold text-[#0b1f3a] hover:underline">Login</Link></p>
  </AuthShell>;
}
