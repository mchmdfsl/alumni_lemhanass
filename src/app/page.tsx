"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0b1f3a] focus:ring-4 focus:ring-[#0b1f3a]/10";

export default function AlumniSubmissionPage() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    try {
      const response = await fetch("/api/public/alumni", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pengajuan gagal dikirim.");
      setMessage({ type: "success", text: `${result.message} Simpan nomor pengajuan: ${result.data.id}.` });
      form.reset();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi." });
    } finally { setSubmitting(false); }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-800">
      <header className="relative h-36 w-full overflow-hidden sm:h-48">
        <Image src="/images/lemhannas-header.jpg" alt="Lemhannas RI" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-[#071526]/35" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-[#c9a227]" />
      </header>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
        <div className="pt-2">
          <Image src="/images/logo-lemhannas.png" alt="Logo Lemhannas RI" width={88} height={88} className="mb-6 h-20 w-20 object-contain" />
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b28b16]">LEMHANNAS RI</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#0b1f3a] sm:text-4xl">Pendataan Alumni</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">Lengkapi informasi di bawah ini untuk mengajukan pembaruan data alumni. Data yang dikirim akan diperiksa oleh administrator sebelum dinyatakan terverifikasi.</p>
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
            <strong className="text-[#0b1f3a]">Perlu diperhatikan</strong><br />Pastikan email dan informasi angkatan benar. Jangan mengirimkan kata sandi atau informasi rahasia melalui formulir ini.
          </div>
          <a href="/login" className="mt-5 inline-flex text-sm font-semibold text-[#0b1f3a] underline decoration-[#c9a227] underline-offset-4">Masuk sebagai administrator</a>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-[#0b1f3a]">Formulir Alumni</h2>
          <p className="mt-1 text-sm text-slate-500">Kolom bertanda * wajib diisi.</p>
          {message && <div role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Nama lengkap *" name="nama" required maxLength={200} placeholder="Nama sesuai identitas" />
            <Field label="Email aktif *" name="email" required type="email" maxLength={254} placeholder="nama@email.com" />
            <Field label="Angkatan / program *" name="angkatan" required maxLength={100} placeholder="Contoh: PPRA LX" />
            <Field label="Nomor HP" name="nomorHp" maxLength={50} placeholder="Nomor yang dapat dihubungi" />
            <Field label="Instansi" name="instansi" maxLength={250} placeholder="Instansi saat ini" />
            <Field label="Jabatan" name="jabatan" maxLength={200} placeholder="Jabatan saat ini" />
            <Field label="Wilayah / provinsi" name="wilayah" maxLength={150} placeholder="Contoh: Jawa Barat" />
            <div className="sm:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="alamat">Alamat</label><textarea id="alamat" name="alamat" rows={3} maxLength={3000} className={inputClass} placeholder="Alamat domisili" /></div>
          </div>
          <button disabled={submitting} className="mt-6 w-full rounded-xl bg-[#0b1f3a] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#123b68] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Mengirim pengajuan..." : "Kirim Pengajuan"}</button>
          <p className="mt-3 text-center text-xs leading-5 text-slate-400">Pengajuan akan berstatus menunggu sampai diperiksa administrator.</p>
        </form>
      </section>
      <footer className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} LEMHANNAS RI</footer>
    </main>
  );
}

function Field({ label, name, required, type = "text", maxLength, placeholder }: { label: string; name: string; required?: boolean; type?: string; maxLength?: number; placeholder?: string }) {
  return <div><label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor={name}>{label}</label><input id={name} name={name} type={type} required={required} maxLength={maxLength} placeholder={placeholder} className={inputClass} /></div>;
}
