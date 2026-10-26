"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, LoaderCircle, RefreshCw, XCircle } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

type RequestRow = {
  id: number;
  alumniId: number;
  requestType: string;
  payload: Record<string, unknown> | null;
  message: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
  adminNote?: string | null;
  createdAt: string;
  nama: string;
  nomorAlumni?: string | null;
  angkatan: string;
  currentNama?: string | null;
  currentAngkatan?: string | null;
  currentJabatan?: string | null;
  currentInstansi?: string | null;
  currentWilayah?: string | null;
  currentNomorHp?: string | null;
  currentAlamat?: string | null;
};

const labels: Record<string, string> = {
  profile_update: "Perubahan profil",
  data_update: "Pembaruan data",
  delete_account: "Permintaan penonaktifan akun",
};

export default function PermintaanAlumniPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/user-requests", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal memuat permintaan.");
      setRows(result.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat permintaan alumni.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function review(row: RequestRow, status: "Disetujui" | "Ditolak") {
    let adminNote = "";
    if (status === "Ditolak") {
      adminNote = window.prompt("Masukkan alasan penolakan:")?.trim() ?? "";
      if (!adminNote) return;
    }
    setBusyId(row.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/user-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status, adminNote }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal memproses permintaan.");
      setNotice(result.message || "Permintaan berhasil diproses.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses permintaan.");
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">Layanan Alumni</p>
                <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">Permintaan Alumni</h1>
                <p className="mt-2 text-sm text-slate-500">Tinjau perubahan profil, pembaruan data, dan permintaan penonaktifan akun.</p>
              </div>
              <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0b1f3a] disabled:opacity-60">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Muat ulang
              </button>
            </div>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-500"><LoaderCircle size={20} className="animate-spin" /> Memuat permintaan...</div>
            ) : error ? null : rows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
                <CheckCircle2 size={30} className="mx-auto text-emerald-500" />
                <h2 className="mt-3 font-bold text-[#172033]">Belum ada permintaan</h2>
                <p className="mt-1 text-sm text-slate-500">Permintaan yang dikirim alumni akan tampil di halaman ini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((row) => {
                  const rawPayload = row.payload ?? {};
                  const payload = (typeof rawPayload === "string"
                    ? (() => { try { return JSON.parse(rawPayload) as Record<string, unknown>; } catch { return {}; } })()
                    : rawPayload) as Record<string, unknown>;
                  const requested = (key: string, fallbackKey?: string) => {
                    const value = payload[key] ?? (fallbackKey ? payload[fallbackKey] : undefined);
                    return value === null || value === undefined || String(value).trim() === "" ? "-" : String(value);
                  };
                  const details: Array<[string, unknown, unknown]> = [
                    ["Nama", row.currentNama ?? row.nama, requested("nama")],
                    ["Kategori program / Angkatan", row.currentAngkatan ?? row.angkatan, requested("angkatan", "kategoriProgram")],
                    ["Jabatan", row.currentJabatan, requested("jabatan")],
                    ["Instansi", row.currentInstansi, requested("instansi")],
                    ["Wilayah", row.currentWilayah, requested("wilayah")],
                    ["Nomor HP", row.currentNomorHp, requested("nomorHp", "nomor_hp")],
                    ["Alamat", row.currentAlamat, requested("alamat")],
                  ];
                  const pending = row.status === "Menunggu";
                  return (
                    <article key={row.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-bold text-[#172033]">{row.nama}</h2>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{labels[row.requestType] || row.requestType}</span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">No. Alumni: {row.nomorAlumni || "-"} · Kategori: {row.angkatan || "-"}</p>
                          <p className="mt-2 text-xs text-slate-400">{new Date(row.createdAt).toLocaleString("id-ID")}</p>
                        </div>
                        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${row.status === "Menunggu" ? "bg-amber-50 text-amber-700" : row.status === "Disetujui" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          <Clock3 size={14} /> {row.status}
                        </span>
                      </div>
                      <div className="space-y-3 p-5">
                        {row.requestType === "profile_update" ? (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-[#172033]">Perbandingan data sebelum dan sesudah</p>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full min-w-[520px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                  <tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Data saat ini</th><th className="px-4 py-3">Diajukan alumni</th></tr>
                                </thead>
                                <tbody>
                                  {details.map(([label, current, proposed]) => {
                                    const currentText = current === null || current === undefined || String(current).trim() === "" ? "-" : String(current);
                                    const proposedText = String(proposed ?? "-");
                                    const changed = currentText !== proposedText && proposedText !== "-";
                                    return <tr key={String(label)} className="border-t border-slate-100 align-top">
                                      <th className="px-4 py-3 font-medium text-slate-600">{label}</th>
                                      <td className="px-4 py-3 break-words text-slate-600">{currentText}</td>
                                      <td className={"px-4 py-3 break-words font-semibold " + (changed ? "text-amber-700" : "text-slate-800")}>{proposedText}{changed ? <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs">Berubah</span> : null}</td>
                                    </tr>;
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{row.message || "Tidak ada keterangan tambahan."}</p>
                        )}
                        {row.adminNote && <p className="text-sm text-slate-500">Catatan admin: {row.adminNote}</p>}
                        {pending && <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                          <button type="button" onClick={() => void review(row, "Ditolak")} disabled={busyId === row.id} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"><XCircle size={16} /> Tolak</button>
                          <button type="button" onClick={() => void review(row, "Disetujui")} disabled={busyId === row.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#18385f] disabled:opacity-60">{busyId === row.id ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Setujui</button>
                        </div>}
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
