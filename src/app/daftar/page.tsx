"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

type FormState = {
  nama: string; kategoriProgram: string; nomorAngkatan: string; tahunAngkatan: string; nomorHp: string;
  instansi: string; jabatan: string; wilayah: string; alamat: string;
  email: string; password: string; konfirmasi: string; evidenceType: string;
};
const initialForm: FormState = {
  nama: "", kategoriProgram: "", nomorAngkatan: "", tahunAngkatan: "", nomorHp: "", instansi: "",
  jabatan: "", wilayah: "", alamat: "", email: "", password: "", konfirmasi: "", evidenceType: "",
};
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10";

export default function DaftarPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [nomorAngkatan, setNomorAngkatan] = useState("");
  const [cohortLoading, setCohortLoading] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [checkingRevision, setCheckingRevision] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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
      evidenceType: String(submitted.get("evidenceType") ?? ""),
    };
    setMessage("");
    setSuccess(false);
    if (!form.kategoriProgram) return setMessage("Pilih kategori program terlebih dahulu.");
    if (!form.evidenceType || !(submitted.get("buktiAlumni") instanceof File) || (submitted.get("buktiAlumni") as File).size === 0) return setMessage("Unggah bukti status alumni terlebih dahulu.");
    if ((submitted.get("buktiAlumni") as File).size > 10 * 1024 * 1024) return setMessage("Ukuran dokumen maksimal 10 MB.");
    if (cohortLoading || !form.nomorAngkatan) return setMessage("Tunggu sampai nomor angkatan berhasil ditentukan.");
    if (form.password.length < 12) return setMessage("Password minimal 12 karakter.");
    if (form.password !== form.konfirmasi) return setMessage("Konfirmasi password tidak cocok.");
    setLoading(true);
    try {
      submitted.set("nomorAngkatan", form.nomorAngkatan);
      submitted.set("action", "register");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: submitted,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pendaftaran gagal diproses.");
      setSuccess(true);
      setMessage(result.message || "Pengajuan berhasil dikirim dan menunggu pemeriksaan admin.");
      setRevisionNote("");
      formElement.reset();
      setNomorAngkatan("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckRevision() {
    const current = formRef.current;
    if (!current || checkingRevision) return;
    const values = new FormData(current);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");
    if (!email || !password) {
      setMessage("Masukkan email dan password yang digunakan saat registrasi untuk memeriksa catatan Admin.");
      return;
    }
    setCheckingRevision(true);
    setMessage("");
    setRevisionNote("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_revision", email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Catatan revisi belum dapat diperiksa.");
      setRevisionNote(result.reviewNote || "Tidak ada catatan revisi dari Admin.");
      const setField = (name: string, value: unknown) => {
        const control = current.elements.namedItem(name);
        if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
          control.value = value == null ? "" : String(value);
        }
      };
      setField("nama", result.submittedNama);
      setField("kategoriProgram", result.submittedKategoriProgram);
      setField("tahunAngkatan", result.submittedTahunAngkatan);
      setField("nomorHp", result.submittedNomorHp);
      setField("instansi", result.submittedInstansi);
      setField("jabatan", result.submittedJabatan);
      setField("wilayah", result.submittedWilayah);
      setField("alamat", result.submittedAlamat);
      setNomorAngkatan(String(result.submittedNomorAngkatan || ""));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Catatan revisi gagal dimuat.");
    } finally {
      setCheckingRevision(false);
    }
  }

  async function handleKategoriChange(category: string) {
    setNomorAngkatan("");
    setMessage("");
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
    <form ref={formRef} onSubmit={handleDaftar} className="space-y-4">
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
            <option value="TAPLAI">TAPLAI</option>
            <option value="PPNK">PPNK</option>
            <option value="PPNK KOLABORASI">PPNK KOLABORASI</option>
            <option value="TOT">TOT</option>
          </select>
        </div>
        {renderField("Tahun angkatan *", "tahunAngkatan", "number", true, 4)}
        <div><label htmlFor="nomorAngkatan" className="mb-1.5 block text-sm font-semibold text-slate-700">Nomor angkatan otomatis *</label><input id="nomorAngkatan" name="nomorAngkatan" type="text" value={nomorAngkatan} readOnly required aria-live="polite" placeholder={cohortLoading ? "Sedang mencari angkatan..." : "Pilih kategori terlebih dahulu"} className={inputClass} />{cohortLoading && <p className="mt-1 text-xs text-slate-500">Mencari nomor terakhir pada kategori ini...</p>}{!cohortLoading && nomorAngkatan && <p className="mt-1 text-xs text-emerald-700">Nomor angkatan berikutnya untuk kategori terpilih.</p>}</div>
        {renderField("Nomor HP", "nomorHp", "text", false, 50)}
        {renderField("Instansi", "instansi", "text", false, 250)}
        {renderField("Jabatan", "jabatan", "text", false, 200)}
        {renderField("Wilayah", "wilayah", "text", false, 150)}
        {renderField("Email aktif *", "email", "email", true, 254)}
      </div>
      <div><label htmlFor="alamat" className="mb-1.5 block text-sm font-semibold text-slate-700">Alamat</label>
        <textarea id="alamat" name="alamat" defaultValue={initialForm.alamat} rows={3} maxLength={5000} className={inputClass} /></div>
      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
        <p className="text-sm font-bold text-violet-950">Bukti status alumni *</p>
        <p className="mt-1 text-xs leading-5 text-violet-800">KTM tidak wajib. Jika belum memiliki KTM, unggah ijazah, sertifikat kelulusan, atau surat keterangan resmi dari Lemhannas. Dokumen akan diperiksa Admin.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="evidenceType" className="mb-1.5 block text-sm font-semibold text-slate-700">Jenis bukti *</label>
            <select id="evidenceType" name="evidenceType" required defaultValue="" className={inputClass}>
              <option value="">Pilih jenis dokumen</option>
              <option value="KTM Alumni">KTM Alumni</option>
              <option value="Ijazah">Ijazah</option>
              <option value="Sertifikat kelulusan">Sertifikat kelulusan</option>
              <option value="Surat keterangan Lemhannas">Surat keterangan Lemhannas</option>
              <option value="Dokumen pendukung lainnya">Dokumen pendukung lainnya</option>
            </select>
          </div>
          <div>
            <label htmlFor="buktiAlumni" className="mb-1.5 block text-sm font-semibold text-slate-700">Unggah dokumen *</label>
            <input id="buktiAlumni" name="buktiAlumni" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-violet-800" />
            <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, atau WebP. Maksimal 10 MB.</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderField("Password (minimal 12 karakter) *", "password", "password", true, 1024)}
        {renderField("Konfirmasi password *", "konfirmasi", "password", true, 1024)}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">Sudah pernah mengajukan dan diminta revisi?</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Masukkan email dan password yang sama, lalu periksa catatan Admin. Data pengajuan sebelumnya akan dimuat agar bisa diperbaiki.</p>
        <button type="button" onClick={() => void handleCheckRevision()} disabled={checkingRevision} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-60">
          {checkingRevision ? "Memeriksa..." : "Periksa catatan Admin"}
        </button>
        {revisionNote && <div role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-900"><strong>Catatan Admin:</strong> {revisionNote}</div>}
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
