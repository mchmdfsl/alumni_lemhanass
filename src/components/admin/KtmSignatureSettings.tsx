"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { FileImage, Save, LoaderCircle, CheckCircle2, AlertCircle } from "lucide-react";

const ALL_CATEGORIES = ["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "TAPLAI", "PPNK", "PPNK KOLABORASI", "TOT"];
type Setting = { kategoriProgram: string; namaDeputi: string; jabatanDeputi: string; signatureUrl: string | null; formatTtd: "standard" | "tot_white" };

export default function KtmSignatureSettings() {
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const current = useMemo(() => settings[selected] ?? {
    kategoriProgram: selected, namaDeputi: "", jabatanDeputi: "Deputi",
    signatureUrl: null, formatTtd: selected === "TOT" ? "tot_white" as const : "standard" as const,
  }, [settings, selected]);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/ktm-signature", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "Gagal memuat pengaturan KTM.");
        if (!active) return;
        const available = Array.isArray(d.categories) ? d.categories : ALL_CATEGORIES;
        setCategories(available);
        setSelected(available[0] || "");
        const mapped: Record<string, Setting> = {};
        for (const row of (d.data || []) as Setting[]) mapped[row.kategoriProgram] = row;
        setSettings(mapped);
      })
      .catch((e) => { if (active) setNotice({ ok: false, text: e instanceof Error ? e.message : "Gagal memuat pengaturan." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function update(field: keyof Setting, value: string) {
    setSettings((old) => ({ ...old, [selected]: { ...current, [field]: value } }));
    setNotice(null);
  }

  async function save() {
    setSaving(true); setNotice(null);
    try {
      const response = await fetch("/api/admin/ktm-signature", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ kategoriProgram: selected, namaDeputi: current.namaDeputi, jabatanDeputi: current.jabatanDeputi, formatTtd: current.formatTtd }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Gagal menyimpan.");
      setSettings((old) => ({ ...old, [selected]: { ...current, ...result.data } }));
      setNotice({ ok: true, text: result.message || "Pengaturan berhasil disimpan." });
    } catch (e) { setNotice({ ok: false, text: e instanceof Error ? e.message : "Gagal menyimpan." }); }
    finally { setSaving(false); }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setNotice({ ok: false, text: "Ukuran gambar maksimal 3 MB." }); return; }
    setUploading(true); setNotice(null);
    try {
      const form = new FormData(); form.append("kategoriProgram", selected); form.append("signature", file);
      const response = await fetch("/api/admin/ktm-signature", { method: "POST", body: form, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Gagal mengunggah tanda tangan.");
      setSettings((old) => ({ ...old, [selected]: { ...current, signatureUrl: result.data.signatureUrl } }));
      setNotice({ ok: true, text: result.message || "Tanda tangan berhasil diunggah." });
    } catch (e) { setNotice({ ok: false, text: e instanceof Error ? e.message : "Gagal mengunggah." }); }
    finally { setUploading(false); }
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b28b16]">Kartu Tanda Alumni</p>
        <h2 className="mt-1 text-lg font-bold text-[#172033]">Identitas Deputi & Tanda Tangan</h2>
        <p className="mt-1 text-sm text-slate-500">Admin hanya dapat mengubah pengaturan kategori yang menjadi tanggung jawabnya. Super Admin dapat mengatur seluruh kategori.</p>
      </div>
      {loading ? <div className="p-8 text-center text-sm text-slate-500"><LoaderCircle className="mr-2 inline animate-spin" size={17} />Memuat pengaturan...</div> : categories.length === 0 ? <p className="p-6 text-sm text-slate-500">Tidak ada kategori yang dapat dikelola oleh akun ini.</p> : (
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Kategori Program</label>
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800">
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nama Deputi</label>
              <input value={current.namaDeputi} onChange={(e) => update("namaDeputi", e.target.value)} maxLength={200} placeholder="Masukkan nama Deputi" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#0b1f3a]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Jabatan</label>
              <input value={current.jabatanDeputi} onChange={(e) => update("jabatanDeputi", e.target.value)} maxLength={200} placeholder="Contoh: Deputi Bidang ..." className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#0b1f3a]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Gambar Tanda Tangan</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                {uploading ? <LoaderCircle className="animate-spin" size={17} /> : <FileImage size={17} />}
                {uploading ? "Mengunggah..." : "Upload tanda tangan (PNG/JPG/WebP, maks. 3 MB)"}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={uploading} className="hidden" />
              </label>
              {current.signatureUrl && <div className={`mt-3 flex min-h-24 items-center justify-center rounded-xl p-4 ${selected === "TOT" ? "bg-white border border-slate-200" : "bg-slate-50"}`}><Image src={current.signatureUrl} alt="Pratinjau tanda tangan Deputi" width={260} height={100} unoptimized className="max-h-24 w-auto object-contain" /></div>}
            </div>
            {selected === "TOT" && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Format khusus TOT: area tanda tangan menggunakan latar putih.</p>}
            <button type="button" onClick={() => void save()} disabled={saving || uploading || !selected} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#18385f] disabled:opacity-50">
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} Simpan Pengaturan
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-[#f8f7fb] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pratinjau blok tanda tangan</p>
            <div className={`mt-8 flex min-h-44 flex-col items-center justify-center rounded-xl p-5 text-center ${selected === "TOT" ? "border border-slate-200 bg-white" : "bg-white"}`}>
              {current.signatureUrl ? <Image src={current.signatureUrl} alt="Tanda tangan" width={220} height={90} unoptimized className="max-h-20 w-auto object-contain" /> : <span className="text-xs text-slate-400">Gambar tanda tangan belum diunggah</span>}
              <p className="mt-3 text-sm font-bold text-slate-800">{current.namaDeputi || "Nama Deputi"}</p>
              <p className="text-xs text-slate-500">{current.jabatanDeputi || "Deputi"}</p>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Jika pejabat berganti, cukup perbarui nama dan unggah gambar tanda tangan baru. Pengaturan ini akan digunakan pada KTM alumni di kategori terpilih.</p>
          </div>
        </div>
      )}
      {notice && <div role="status" className={`mx-5 mb-5 flex items-start gap-2 rounded-xl border p-3 text-sm sm:mx-6 ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.ok ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}{notice.text}</div>}
    </section>
  );
}
