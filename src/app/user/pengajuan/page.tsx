"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, CheckCircle2, AlertCircle, Clock3, RefreshCw, BellRing, XCircle } from "lucide-react";

type RequestHistory = { id: number; requestType: string; message: string; status: "Menunggu" | "Disetujui" | "Ditolak"; adminNote?: string | null; createdAt: string; reviewedAt?: string | null };
const requestLabels: Record<string, string> = { profile_update: "Perubahan profil", data_update: "Pembaruan data", delete_account: "Penonaktifan akun" };

export default function PengajuanPage() {
  const [jenis, setJenis] = useState("data_update");
  const [pesan, setPesan] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true); setHistoryError("");
    try { const response = await fetch("/api/user/requests", { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.message || "Gagal memuat notifikasi."); setHistory(result.data ?? []); }
    catch (error) { setHistoryError(error instanceof Error ? error.message : "Gagal memuat notifikasi."); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setLoading(true);
    try {
      const response = await fetch("/api/user/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ type: jenis, message: pesan.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Pengajuan gagal dikirim.");
      setNotice({ ok: true, message: result.message || "Pengajuan berhasil dikirim ke admin." });
      setPesan("");
      await loadHistory();
    } catch (error) {
      setNotice({ ok: false, message: error instanceof Error ? error.message : "Terjadi kesalahan saat mengirim pengajuan." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">Layanan Alumni</p>
        <h1 className="text-2xl font-bold text-[#0b1f3a]">Pengajuan Alumni</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Kirim permintaan pembaruan data atau penonaktifan akun. Pengajuan akan masuk ke admin untuk ditinjau.</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1f3a]/5 text-[#0b1f3a]"><BellRing size={20} /></div><div><h2 className="font-bold text-[#172033]">Notifikasi & Riwayat Pengajuan</h2><p className="text-sm text-slate-500">Hasil persetujuan atau penolakan beserta alasan dari admin.</p></div></div>
          <button type="button" onClick={() => void loadHistory()} disabled={historyLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"><RefreshCw size={15} className={historyLoading ? "animate-spin" : ""}/> Muat ulang</button>
        </div>
        {historyError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{historyError}</div>}
        {historyLoading ? <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin"/> Memuat notifikasi...</div> : history.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada riwayat pengajuan.</p> : <div className="space-y-3">{history.map((item) => { const approved = item.status === "Disetujui"; const rejected = item.status === "Ditolak"; return <article key={item.id} className={`rounded-xl border p-4 ${approved ? "border-emerald-200 bg-emerald-50/60" : rejected ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60"}`}><div className="flex items-start gap-3">{approved ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={20}/> : rejected ? <XCircle className="mt-0.5 shrink-0 text-red-700" size={20}/> : <Clock3 className="mt-0.5 shrink-0 text-amber-700" size={20}/>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{approved ? "Pengajuan disetujui" : rejected ? "Pengajuan ditolak" : "Pengajuan sedang ditinjau"}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${approved ? "bg-emerald-100 text-emerald-800" : rejected ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{item.status}</span></div><p className="mt-1 text-sm text-slate-600">{requestLabels[item.requestType] || item.requestType} · {new Date(item.createdAt).toLocaleString("id-ID")}</p>{rejected && <div className="mt-3 rounded-lg border border-red-200 bg-white p-3"><p className="text-xs font-bold uppercase tracking-wide text-red-700">Alasan penolakan dari admin</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{item.adminNote || "Admin belum mencantumkan alasan penolakan."}</p></div>}{approved && <p className="mt-2 text-sm text-emerald-900">{item.adminNote ? `Catatan admin: ${item.adminNote}` : "Permintaan kamu telah disetujui oleh admin."}</p>}{!approved && !rejected && <p className="mt-2 text-sm text-amber-900">Hasil dan catatan admin akan muncul di sini setelah permintaan diproses.</p>}</div></div></article>; })}</div>}
      </section>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {notice && <div role={notice.ok ? "status" : "alert"} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {notice.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
          <span>{notice.message}</span>
        </div>}
        <div>
          <label htmlFor="jenis" className="mb-2 block text-sm font-semibold text-slate-700">Jenis Pengajuan</label>
          <select id="jenis" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10" value={jenis} onChange={(event) => setJenis(event.target.value)}>
            <option value="data_update">Permohonan pembaruan data</option>
            <option value="delete_account">Permohonan penonaktifan akun</option>
          </select>
        </div>
        <div>
          <label htmlFor="pesan" className="mb-2 block text-sm font-semibold text-slate-700">Keterangan / Alasan</label>
          <textarea id="pesan" rows={5} maxLength={2000} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10" placeholder="Tuliskan detail permintaan Anda..." value={pesan} required onChange={(event) => setPesan(event.target.value)} />
          <p className="mt-1 text-right text-xs text-slate-400">{pesan.length}/2000 karakter</p>
        </div>
        <button type="submit" disabled={loading || !pesan.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#18385f] disabled:cursor-not-allowed disabled:opacity-60">
          {loading && <LoaderCircle size={17} className="animate-spin" />}
          {loading ? "Mengirim pengajuan..." : "Kirim Pengajuan"}
        </button>
      </form>
    </div>
  );
}
