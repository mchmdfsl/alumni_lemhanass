"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

type FormState = {
  nama: string; kategoriProgram: string; nomorAngkatan: string; tahunAngkatan: string; nomorHp: string;
  instansi: string; jabatan: string; wilayah: string; alamat: string;
  email: string; password: string; konfirmasi: string;
};
const initialForm: FormState = {
  nama: "", kategoriProgram: "", nomorAngkatan: "", tahunAngkatan: "", nomorHp: "", instansi: "",
  jabatan: "", wilayah: "", alamat: "", email: "", password: "", konfirmasi: "",
};
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10";

export default function DaftarPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [nomorAngkatan, setNomorAngkatan] = useState("");
  const [cohortLoading, setCohortLoading] = useState(false);

  async function handleDaftar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const submitted = new FormData(formElement);
    const form: FormState = {
      nama: String(submitted.get("nama") ?? "").trim(),
      kategoriProgram: String(submitted.get("kategoriProgram") ?? "").trim().toLocaleUpperCase("id-ID"),
      nomorAngkatan: nomorAngkatan.trim(),
      tahunAngkatan: String(submitted.get("tahunAngkatan") ?? "").trim(),
      nomorHp: String(submitted.get("nomorHp") ?? "").trim(),
      instansi: String(submitted.get("instansi") ?? "").trim(),
      jabatan: String(submitted.get("jabatan") ?? "").trim(),
      wilayah: String(submitted.get("wilayah") ?? "").trim(),
      alamat: String(submitted.get("alamat") ?? "").trim(),
      email: String(submitted.get("email") ?? "").trim(),
      password: String(submitted.get("password") ?? ""),
      konfirmasi: String(submitted.get("konfirmasi") ?? ""),
    };
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
          nama: form.nama, kategoriProgram: form.kategoriProgram, nomorAngkatan: form.nomorAngkatan, tahunAngkatan: form.tahunAngkatan, nomorHp: form.nomorHp,
          instansi: form.instansi, jabatan: form.jabatan,
          wilayah: form.wilayah, alamat: form.alamat, email: form.email, password: form.password,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pendaftaran gagal diproses.");
      setSuccess(true);
      setMessage(result.message || "Pengajuan berhasil dikirim dan menunggu pemeriksaan admin.");
      formElement.reset();
      setNomorAngkatan("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleKategoriChange(category: string) {
    setNomorAngkatan("");
    if (!category) return;
    setCohortLoading(true);
    try {
      const response = await fetch(`/api/auth/next-cohort?kategori=${encodeURIComponent(category)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nomor angkatan belum dapat ditentukan.");
      setNomorAngkatan(String(result.nomorAngkatan));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menentukan nomor angkatan.");
    } finally {
      setCohortLoading(false);
    }
  }

  const renderField = (label: string, name: keyof FormState, type = "text", required = false, maxLength?: number) => (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      <input id={name} name={name} type={type} defaultValue={initialForm[name]} required={required}
        maxLength={maxLength} autoComplete={name === "email" ? "email" : name === "password" || name === "konfirmasi" ? "new-password" : "off"} className={inputClass} />
    </div>
  );

  return <AuthShell title="Pendaftaran Alumni" subtitle="Buat pengajuan akun baru untuk Sistem Informasi Pendataan Alumni Lemhannas RI.">
    <p className="mb-5 text-sm leading-6 text-slate-500">Gunakan formulir ini jika data Anda belum tersedia di database alumni. Data akan diperiksa administrator.</p>
    {message && <div role="alert" className={`mb-5 rounded-xl border p-3 text-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{message}</div>}
    <form onSubmit={handleDaftar} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderField("Nama lengkap *", "nama", "text", true, 200)}
        <div>
          <label htmlFor="kategoriProgram" className="mb-1.5 block text-sm font-semibold text-slate-700">Kategori program *</label>
          <select id="kategoriProgram" name="kategoriProgram" defaultValue={initialForm.kategoriProgram} required onChange={(event) => void handleKategoriChange(event.target.value)} className={inputClass}>
            <option value="">Pilih kategori program</option>
            <option value="KRA">KRA</option>
            <option value="PPRA">PPRA</option>
            <option value="P4N">P4N</option>
            <option value="KSA">KSA</option>
            <option value="PPSA">PPSA</option>
            <option value="P3N">P3N</option>
            <option value="PPNK">PPNK</option>
            <option value="PPNK KOLABORASI">PPNK KOLABORASI</option>
            <option value="TOT">TOT</option>
          </select>
        </div>
        <div><label htmlFor="nomorAngkatan" className="mb-1.5 block text-sm font-semibold text-slate-700">Nomor angkatan *</label><input id="nomorAngkatan" name="nomorAngkatan" type="text" value={nomorAngkatan} readOnly required placeholder={cohortLoading ? "Menentukan nomor angkatan..." : "Pilih kategori terlebih dahulu"} className={inputClass} />{cohortLoading && <p className="mt-1 text-xs text-slate-500">Menentukan nomor berikutnya...</p>}</div>
        {renderField("Tahun angkatan *", "tahunAngkatan", "number", true, 4)}
        {renderField("Nomor HP", "nomorHp", "text", false, 50)}
        {renderField("Instansi", "instansi", "text", false, 250)}
        {renderField("Jabatan", "jabatan", "text", false, 200)}
        {renderField("Wilayah", "wilayah", "text", false, 150)}
        {renderField("Email aktif *", "email", "email", true, 254)}
      </div>
      <div><label htmlFor="alamat" className="mb-1.5 block text-sm font-semibold text-slate-700">Alamat</label>
        <textarea id="alamat" name="alamat" defaultValue={initialForm.alamat} rows={3} maxLength={5000} className={inputClass} /></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderField("Password (minimal 12 karakter) *", "password", "password", true, 1024)}
        {renderField("Konfirmasi password *", "konfirmasi", "password", true, 1024)}
      </div>
      <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] py-3.5 text-sm font-bold text-white transition hover:bg-[#18385f] disabled:opacity-60">
        {loading && <LoaderCircle size={17} className="animate-spin" />}{loading ? "Mengirim pengajuan..." : "Ajukan Pendaftaran"}
      </button>
    </form>
    <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
      <p>Sudah punya akun? <Link href="/login" className="font-semibold text-[#0b1f3a] hover:underline">Login</Link></p>
    </div>
  </AuthShell>;
}
