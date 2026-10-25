"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

type FormState = {
  nama: string; angkatan: string; nomorHp: string; nomorAlumni: string;
  instansi: string; jabatan: string; wilayah: string; alamat: string;
  email: string; password: string; konfirmasi: string;
};
const initialForm: FormState = {
  nama: "", angkatan: "", nomorHp: "", nomorAlumni: "", instansi: "",
  jabatan: "", wilayah: "", alamat: "", email: "", password: "", konfirmasi: "",
};
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10";

export default function DaftarPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  function updateField(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  }

  async function handleDaftar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    if (form.password.length < 12) return setMessage("Password minimal 12 karakter.");
    if (form.password !== form.konfirmasi) return setMessage("Konfirmasi password tidak cocok.");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama, angkatan: form.angkatan, nomorHp: form.nomorHp,
          nomorAlumni: form.nomorAlumni, instansi: form.instansi, jabatan: form.jabatan,
          wilayah: form.wilayah, alamat: form.alamat, email: form.email, password: form.password,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pendaftaran gagal diproses.");
      setSuccess(true);
      setMessage(result.message || "Pengajuan berhasil dikirim dan menunggu pemeriksaan admin.");
      setForm(initialForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  function Field({ label, name, type = "text", required = false, maxLength }:
    { label: string; name: keyof FormState; type?: string; required?: boolean; maxLength?: number }) {
    return <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      <input id={name} name={name} type={type} value={form[name]} onChange={updateField} required={required}
        maxLength={maxLength} autoComplete={name === "email" ? "email" : name === "password" || name === "konfirmasi" ? "new-password" : "off"} className={inputClass} />
    </div>;
  }

  return <AuthShell title="Pendaftaran Alumni" subtitle="Buat pengajuan akun baru untuk Sistem Informasi Pendataan Alumni Lemhannas RI.">
    <p className="mb-5 text-sm leading-6 text-slate-500">Gunakan formulir ini jika data Anda belum tersedia di database alumni. Data akan diperiksa administrator.</p>
    {message && <div role="alert" className={`mb-5 rounded-xl border p-3 text-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{message}</div>}
    <form onSubmit={handleDaftar} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nama lengkap *" name="nama" required maxLength={200} />
        <Field label="Angkatan *" name="angkatan" required maxLength={100} />
        <Field label="Nomor HP" name="nomorHp" maxLength={50} />
        <Field label="Nomor alumni (jika ada)" name="nomorAlumni" maxLength={80} />
        <Field label="Instansi" name="instansi" maxLength={250} />
        <Field label="Jabatan" name="jabatan" maxLength={200} />
        <Field label="Wilayah" name="wilayah" maxLength={150} />
        <Field label="Email aktif *" name="email" type="email" required maxLength={254} />
      </div>
      <div><label htmlFor="alamat" className="mb-1.5 block text-sm font-semibold text-slate-700">Alamat</label>
        <textarea id="alamat" name="alamat" value={form.alamat} onChange={updateField} rows={3} maxLength={5000} className={inputClass} /></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Password (minimal 12 karakter) *" name="password" type="password" required maxLength={1024} />
        <Field label="Konfirmasi password *" name="konfirmasi" type="password" required maxLength={1024} />
      </div>
      <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] py-3.5 text-sm font-bold text-white transition hover:bg-[#18385f] disabled:opacity-60">
        {loading && <LoaderCircle size={17} className="animate-spin" />}{loading ? "Mengirim pengajuan..." : "Ajukan Pendaftaran"}
      </button>
    </form>
    <div className="mt-6 space-y-2 text-center text-sm text-slate-600">
      <p>Data Anda sudah ada? <Link href="/klaim-akun" className="font-semibold text-[#0b1f3a] hover:underline">Klaim akun</Link></p>
      <p>Sudah punya akun? <Link href="/login" className="font-semibold text-[#0b1f3a] hover:underline">Login</Link></p>
    </div>
  </AuthShell>;
}
