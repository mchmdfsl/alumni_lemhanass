"use client";

import { useState } from "react";
import Link from "next/link";

type FormState = {
  nama: string; angkatan: string; nomorHp: string; nomorAlumni: string;
  instansi: string; jabatan: string; wilayah: string; alamat: string;
  email: string; password: string; konfirmasi: string;
};

const initialForm: FormState = {
  nama: "", angkatan: "", nomorHp: "", nomorAlumni: "",
  instansi: "", jabatan: "", wilayah: "", alamat: "",
  email: "", password: "", konfirmasi: "",
};

export default function DaftarPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  function updateField(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleDaftar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSuccess(false);

    if (form.password.length < 12) {
      setMessage("Password minimal 12 karakter.");
      return;
    }
    if (form.password !== form.konfirmasi) {
      setMessage("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama, angkatan: form.angkatan, nomorHp: form.nomorHp,
          nomorAlumni: form.nomorAlumni, instansi: form.instansi,
          jabatan: form.jabatan, wilayah: form.wilayah, alamat: form.alamat,
          email: form.email, password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registrasi gagal diproses.");

      setSuccess(true);
      setMessage(data.message || "Pengajuan menunggu pemeriksaan admin.");
      setForm(initialForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-100";

  function Field({ label, name, type = "text", required = false, maxLength, minLength }:
    { label: string; name: keyof FormState; type?: string; required?: boolean; maxLength?: number; minLength?: number }) {
    return <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input id={name} name={name} type={type} value={form[name]} onChange={updateField}
        required={required} maxLength={maxLength} minLength={minLength}
        autoComplete={name === "email" ? "email" : name === "password" || name === "konfirmasi" ? "new-password" : "off"}
        className={inputClass} />
    </div>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <header className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-800">Alumni Lemhannas</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Pendaftaran Alumni Baru</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Gunakan formulir ini jika data Anda belum ada di database. Admin akan memeriksa identitas sebelum data dan akun dibuat.
          </p>
        </header>

        {message && <p role="alert" className={`mb-5 rounded-lg p-3 text-sm ${success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message}</p>}

        <form onSubmit={handleDaftar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama lengkap" name="nama" required maxLength={200} />
            <Field label="Angkatan" name="angkatan" required maxLength={100} />
            <Field label="Nomor HP" name="nomorHp" maxLength={50} />
            <Field label="Nomor alumni (jika ada)" name="nomorAlumni" maxLength={80} />
            <Field label="Instansi" name="instansi" maxLength={250} />
            <Field label="Jabatan" name="jabatan" maxLength={200} />
            <Field label="Wilayah" name="wilayah" maxLength={150} />
            <Field label="Email aktif" name="email" type="email" required maxLength={254} />
          </div>
          <div>
            <label htmlFor="alamat" className="mb-1 block text-sm font-medium text-slate-700">Alamat</label>
            <textarea id="alamat" name="alamat" value={form.alamat} onChange={updateField} rows={3} maxLength={5000} className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password (minimal 12 karakter)" name="password" type="password" required minLength={12} maxLength={1024} />
            <Field label="Konfirmasi password" name="konfirmasi" type="password" required minLength={12} maxLength={1024} />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#0b1f3a] py-3 font-semibold text-white hover:bg-[#0b1f3a]/90 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Mengirim pengajuan..." : "Ajukan Pendaftaran"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Data Anda sudah ada? <Link href="/klaim-akun" className="font-semibold text-blue-800 hover:underline">Klaim akun di sini</Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sudah punya akun? <Link href="/login" className="font-semibold text-blue-800 hover:underline">Login</Link>
        </p>
      </section>
    </main>
  );
}
