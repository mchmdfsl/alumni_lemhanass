"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, CheckCircle2, AlertCircle } from "lucide-react";

export default function PengajuanPage() {
  const [jenis, setJenis] = useState("data_update");
  const [pesan, setPesan] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

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
