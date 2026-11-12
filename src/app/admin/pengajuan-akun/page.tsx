"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2, Clock3, Eye, FileCheck2, FileText, LoaderCircle, Mail, MapPin, MessageSquareText,
  Phone, RefreshCw, UserRound, X, XCircle,
} from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

type RequestStatus = "Menunggu" | "Disetujui" | "Ditolak";

type RequestItem = {
  id: number;
  email: string;
  requestType: string;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  revisionRequestedAt?: string | null;
  submittedBuktiUrl?: string | null;
  submittedBuktiNama?: string | null;
  submittedBuktiJenis?: string | null;
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
  const [statusFilter, setStatusFilter] = useState<RequestStatus>("Menunggu");
  const [statusCounts, setStatusCounts] = useState<Record<RequestStatus, number>>({
    Menunggu: 0, Disetujui: 0, Ditolak: 0,
  });
  const [selectedItem, setSelectedItem] = useState<RequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/alumni-accounts/requests?status=${encodeURIComponent(statusFilter)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal memuat pengajuan.");
      setItems(result.data ?? []);
      setStatusCounts(result.statusCounts ?? { Menunggu: 0, Disetujui: 0, Ditolak: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  async function review(item: RequestItem, status: "Disetujui" | "Ditolak" | "PerluPerbaikan") {
    let reviewNote = "";
    if (status === "Ditolak") {
      reviewNote = window.prompt("Masukkan alasan penolakan:")?.trim() ?? "";
      if (!reviewNote) return;
    } else if (status === "PerluPerbaikan") {
      reviewNote = window.prompt("Tuliskan catatan data atau dokumen yang perlu diperbaiki oleh pendaftar:")?.trim() ?? "";
      if (!reviewNote) return;
    } else if (!window.confirm(`Setujui pengajuan dari ${item.email}? Pastikan identitas sudah diperiksa.`)) {
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
      setSelectedItem(null);
      await loadRequests();
      setNotice(status === "Disetujui" ? "Pengajuan berhasil disetujui dan akun alumni telah diproses." : status === "PerluPerbaikan" ? "Catatan perbaikan berhasil dikirim kepada pendaftar." : "Pengajuan berhasil ditolak.");
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
                  Pilih pengajuan untuk memeriksa data lengkap sebelum menerima atau menolaknya.
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="tablist" aria-label="Filter status pengajuan">
              {([
                { status: "Menunggu" as const, label: "Menunggu", icon: Clock3 },
                { status: "Disetujui" as const, label: "Diterima", icon: CheckCircle2 },
                { status: "Ditolak" as const, label: "Ditolak", icon: XCircle },
              ]).map((tab) => {
                const active = statusFilter === tab.status;
                return (
                  <button
                    key={tab.status}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => { setStatusFilter(tab.status); setSelectedItem(null); }}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-sm transition ${active ? "border-[#0b1f3a] bg-[#0b1f3a] text-white" : "border-slate-200 bg-white text-[#172033] hover:border-slate-300"}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <tab.icon size={18} /> Pengajuan {tab.label.toLowerCase()}
                    </span>
                    <span className={`rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>
                      {statusCounts[tab.status].toLocaleString("id-ID")}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

            {loading ? (
              <div className="flex min-h-64 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
                <LoaderCircle size={20} className="animate-spin" /> Memuat pengajuan akun...
              </div>
            ) : error && items.length === 0 ? null : items.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><FileCheck2 size={26} /></div>
                <h2 className="mt-4 font-bold text-[#172033]">Belum ada pengajuan {statusFilter.toLowerCase()}</h2>
                <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">Daftar pengajuan dengan status ini masih kosong.</p>
                <button type="button" onClick={() => void loadRequests()} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0b1f3a] hover:underline">
                  <RefreshCw size={15} /> Periksa kembali
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const nama = item.submittedNama || item.namaAlumni;
                  const kategori = item.submittedKategoriProgram || item.submittedAngkatan || item.kategoriProgramAlumni || item.angkatanAlumni;
                  const pending = item.status === "Menunggu";
                  return (
                    <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b1f3a]/5 text-[#0b1f3a]"><UserRound size={21} /></div>
                        <div className="min-w-0">
                          <h2 className="break-words font-bold text-[#172033]">{display(nama)}</h2>
                          <p className="mt-1 flex items-center gap-1.5 break-all text-sm text-slate-500"><Mail size={14} className="shrink-0" />{item.email}</p>
                          <p className="mt-1 text-xs text-slate-500">{display(kategori)} · Nomor alumni: {display(item.submittedNomorAlumni || item.nomorAlumni)}</p>
                          <p className="mt-1 text-xs text-slate-400">Diajukan: {item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID") : "Tanggal tidak tersedia"}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${pending ? "bg-amber-50 text-amber-700" : item.status === "Disetujui" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {pending ? <Clock3 size={14} /> : item.status === "Disetujui" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {pending && item.revisionRequestedAt ? "Perlu perbaikan" : item.status === "Disetujui" ? "Diterima" : item.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0b1f3a] transition hover:bg-slate-50"
                        >
                          <Eye size={16} /> Lihat detail
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && busyId === null) setSelectedItem(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="request-detail-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b28b16]">Detail pendaftaran alumni</p>
                <h2 id="request-detail-title" className="mt-1 text-xl font-bold text-[#0b1f3a]">{display(selectedItem.submittedNama || selectedItem.namaAlumni)}</h2>
                <p className="mt-1 break-all text-sm text-slate-500">{selectedItem.email}</p>
              </div>
              <button type="button" aria-label="Tutup detail" disabled={busyId !== null} onClick={() => setSelectedItem(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedItem.status === "Menunggu" ? "bg-amber-50 text-amber-700" : selectedItem.status === "Disetujui" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{selectedItem.status === "Disetujui" ? "Diterima" : selectedItem.status}</span>
                <span className="text-xs text-slate-400">ID pengajuan: {selectedItem.id}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoItem label="Nama lengkap" value={display(selectedItem.submittedNama || selectedItem.namaAlumni)} />
                <InfoItem label="Email" value={display(selectedItem.email)} icon={<Mail size={15} />} />
                <InfoItem label="Nomor HP" value={display(selectedItem.submittedNomorHp)} icon={<Phone size={15} />} />
                <InfoItem label="Nomor alumni" value={display(selectedItem.submittedNomorAlumni || selectedItem.nomorAlumni)} />
                <InfoItem label="Kategori program" value={display(selectedItem.submittedKategoriProgram || selectedItem.submittedAngkatan || selectedItem.kategoriProgramAlumni || selectedItem.angkatanAlumni)} />
                <InfoItem label="Nomor angkatan" value={display(selectedItem.submittedNomorAngkatan == null ? selectedItem.nomorAngkatanAlumni : String(selectedItem.submittedNomorAngkatan))} />
                <InfoItem label="Tahun angkatan" value={display(selectedItem.submittedTahunAngkatan == null ? (selectedItem.tahunAngkatanAlumni == null ? null : String(selectedItem.tahunAngkatanAlumni)) : String(selectedItem.submittedTahunAngkatan))} />
                <InfoItem label="Instansi" value={display(selectedItem.submittedInstansi)} />
                <InfoItem label="Jabatan" value={display(selectedItem.submittedJabatan)} />
                <InfoItem label="Wilayah" value={display(selectedItem.submittedWilayah)} icon={<MapPin size={15} />} />
                <InfoItem label="Alamat" value={display(selectedItem.submittedAlamat)} wide />
                <InfoItem label="Tanggal pengajuan" value={selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString("id-ID") : "—"} wide />
              </div>
              <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">Bukti status alumni</p>
                {selectedItem.submittedBuktiUrl ? (
                  <a href={selectedItem.submittedBuktiUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-violet-800 underline">
                    <FileText size={16} /> {display(selectedItem.submittedBuktiNama || selectedItem.submittedBuktiJenis || "Lihat dokumen bukti")}
                  </a>
                ) : <p className="mt-1 text-sm text-red-700">Dokumen bukti belum tersedia.</p>}
                {selectedItem.submittedBuktiJenis && <p className="mt-1 text-xs text-violet-700">Jenis dokumen: {selectedItem.submittedBuktiJenis}</p>}
              </div>
              {selectedItem.status === "Menunggu" && selectedItem.revisionRequestedAt && selectedItem.reviewNote && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-semibold">Catatan revisi terakhir</p><p className="mt-1">{selectedItem.reviewNote}</p>
                </div>
              )}
              {selectedItem.status === "Ditolak" && selectedItem.reviewNote && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-semibold">Alasan penolakan</p><p className="mt-1">{selectedItem.reviewNote}</p>
                </div>
              )}
              {selectedItem.status === "Menunggu" && (
                <>
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">Periksa kecocokan identitas dan data pemohon sebelum mengambil keputusan. Jika diterima, data alumni dan akun akan dibuat/diaktifkan melalui proses persetujuan ini.</p>
                  <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => void review(selectedItem, "PerluPerbaikan")} disabled={busyId !== null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-60">
                      {busyId === selectedItem.id ? <LoaderCircle size={16} className="animate-spin" /> : <MessageSquareText size={16} />} Minta perbaikan
                    </button>
                    <button type="button" onClick={() => void review(selectedItem, "Ditolak")} disabled={busyId !== null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                      {busyId === selectedItem.id ? <LoaderCircle size={16} className="animate-spin" /> : <XCircle size={16} />} Tolak pengajuan
                    </button>
                    <button type="button" onClick={() => void review(selectedItem, "Disetujui")} disabled={busyId !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#18385f] disabled:opacity-60">
                      {busyId === selectedItem.id ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Terima & buat akun
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, icon, wide = false }: { label: string; value: string; icon?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 flex items-start gap-1.5 break-words text-sm font-semibold leading-6 text-[#475569]">
        {icon && <span className="mt-1 shrink-0 text-slate-400">{icon}</span>}<span>{value}</span>
      </p>
    </div>
  );
}
