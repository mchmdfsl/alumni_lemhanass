"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

type RequestItem = {
  id: number;
  email: string;
  requestType: string;
  status: string;
  createdAt: string;
  alumniId: number | null;
  nomorAlumni: string | null;
  namaAlumni: string | null;
  angkatanAlumni: string | null;
  kategoriProgramAlumni: string | null;
  nomorAngkatanAlumni: string | null;
  tahunAngkatanAlumni: number | string | null;
  submittedNama: string | null;
  submittedAngkatan: string | null;
  submittedKategoriProgram: string | null;
  submittedNomorAngkatan: string | null;
  submittedTahunAngkatan: number | string | null;
  submittedNomorHp: string | null;
  submittedNomorAlumni: string | null;
  submittedInstansi: string | null;
  submittedJabatan: string | null;
  submittedWilayah: string | null;
  submittedAlamat: string | null;
};

const display = (value: string | null | undefined) => value?.trim() || "—";

export default function PengajuanAkunPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/alumni-accounts/requests", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal memuat pengajuan.");
      setItems(result.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  async function review(item: RequestItem, status: "Disetujui" | "Ditolak") {
    let reviewNote = "";
    if (status === "Ditolak") {
      reviewNote = window.prompt("Masukkan alasan penolakan:")?.trim() ?? "";
      if (!reviewNote) return;
    } else if (!window.confirm(`Setujui pengajuan ${item.requestType} dari ${item.email}? Pastikan identitas sudah diperiksa.`)) {
      return;
    }

    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/alumni-accounts/requests/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pengajuan gagal diproses.");
      setNotice(status === "Disetujui" ? "Pengajuan berhasil disetujui." : "Pengajuan berhasil ditolak.");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <AdminSidebar />
      <div className="lg:pl-72">
        <AdminHeader />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">Administrasi Alumni</p>
                <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">Pengajuan Akun Alumni</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Periksa data pendaftaran alumni baru sebelum menyetujui pembuatan akun.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadRequests()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0b1f3a] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Muat ulang
              </button>
            </div>

            <section className="max-w-sm">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <Clock3 size={22} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pengajuan menunggu</p>
                  <p className="mt-0.5 text-2xl font-bold text-[#172033]">{items.length.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </section>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

            {loading ? (
              <div className="flex min-h-64 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
                <LoaderCircle size={20} className="animate-spin" /> Memuat pengajuan akun...
              </div>
            ) : error && items.length === 0 ? null : items.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <FileCheck2 size={26} />
                </div>
                <h2 className="mt-4 font-bold text-[#172033]">Belum ada pengajuan menunggu</h2>
                <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                  Pengajuan pendaftaran alumni baru akan muncul di sini setelah dikirim.
                </p>
                <button type="button" onClick={() => void loadRequests()} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0b1f3a] hover:underline">
                  <RefreshCw size={15} /> Periksa kembali
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const isNew = true;
                  const nama = isNew ? item.submittedNama : item.namaAlumni;
                  const kategoriProgram = isNew
                    ? item.submittedKategoriProgram || item.submittedAngkatan
                    : item.kategoriProgramAlumni || item.angkatanAlumni;
                  const nomorAngkatan = isNew ? item.submittedNomorAngkatan : item.nomorAngkatanAlumni;
                  const tahunAngkatan = isNew ? item.submittedTahunAngkatan : item.tahunAngkatanAlumni;
                  const pending = item.status === "Menunggu";
                  return (
                    <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b1f3a]/5 text-[#0b1f3a]">
                            <UserRound size={21} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="break-words font-bold text-[#172033]">{display(nama)}</h2>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">"Pendaftaran baru"</span>
                            </div>
                            <p className="mt-1 flex items-center gap-1.5 break-all text-sm text-slate-500"><Mail size={14} className="shrink-0" />{item.email}</p>
                            <p className="mt-2 text-xs text-slate-400">
                              ID pengajuan: {item.id} · {item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID") : "Tanggal tidak tersedia"}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${item.status === "Menunggu" ? "bg-amber-50 text-amber-700" : item.status === "Disetujui" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {item.status === "Menunggu" ? <Clock3 size={14} /> : item.status === "Disetujui" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {item.status}
                        </span>
                      </div>

                      <div className="space-y-4 p-5 sm:p-6">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <InfoItem label="Kategori program" value={display(kategoriProgram)} />
                          <InfoItem label="Nomor angkatan" value={display(nomorAngkatan == null ? null : String(nomorAngkatan))} />
                          <InfoItem label="Tahun angkatan" value={display(tahunAngkatan == null ? null : String(tahunAngkatan))} />
                          <InfoItem label="Nomor alumni" value={display(isNew ? item.submittedNomorAlumni : item.nomorAlumni)} />
                          {isNew && <InfoItem label="Nomor HP" value={display(item.submittedNomorHp)} icon={<Phone size={15} />} />}
                          {isNew && <InfoItem label="Instansi" value={display(item.submittedInstansi)} />}
                          {isNew && <InfoItem label="Jabatan" value={display(item.submittedJabatan)} />}
                          {isNew && <InfoItem label="Wilayah" value={display(item.submittedWilayah)} icon={<MapPin size={15} />} />}
                          {isNew && <InfoItem label="Alamat" value={display(item.submittedAlamat)} wide />}
                        </div>

                        {pending && (
                          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                            <button
                              type="button"
                              onClick={() => void review(item, "Ditolak")}
                              disabled={busyId !== null}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyId === item.id ? <LoaderCircle size={16} className="animate-spin" /> : <XCircle size={16} />}
                              Tolak pengajuan
                            </button>
                            <button
                              type="button"
                              onClick={() => void review(item, "Disetujui")}
                              disabled={busyId !== null}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#18385f] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyId === item.id ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                              Verifikasi & buat akun
                            </button>
                          </div>
                        )}
                        {pending && <p className="text-xs leading-5 text-amber-700">Pastikan identitas pemohon sudah diperiksa secara manual sebelum menyetujui pengajuan.</p>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function InfoItem({ label, value, icon, wide = false }: { label: string; value: string; icon?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 flex items-start gap-1.5 break-words text-sm font-semibold leading-6 text-[#475569]">
        {icon && <span className="mt-1 shrink-0 text-slate-400">{icon}</span>}
        <span>{value}</span>
      </p>
    </div>
  );
}
