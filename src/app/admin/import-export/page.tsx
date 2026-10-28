"use client";

import { useMemo, useState } from "react";
import { Download, FileUp, FileSpreadsheet, ShieldCheck } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

type ImportRow = {
  nomorAlumni: string;
  nama: string;
  kategoriProgram: string;
  nomorAngkatan: string;
  tahunAngkatan: string;
  instansi: string;
  jabatan: string;
  wilayah: string;
  alamat: string;
  nomorHp: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export default function ImportExportPage() {
  const [exportLimit, setExportLimit] = useState("all");
  const [exportNama, setExportNama] = useState("");
  const [exportKategori, setExportKategori] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importError, setImportError] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({ format: "csv", limit: exportLimit });
    if (exportNama.trim()) params.set("nama", exportNama.trim());
    if (exportKategori.trim()) params.set("angkatan", exportKategori.trim());
    if (exportStatus) params.set("status", exportStatus);
    return `/api/alumni/export?${params.toString()}`;
  }, [exportLimit, exportNama, exportKategori, exportStatus]);

  async function handleFileChange(selected: File | null) {
    setFile(selected);
    setImportRows([]);
    setImportError("");
    setImportStatus("");
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setImportError("Gunakan file CSV. Format Excel .xlsx belum didukung di menu ini.");
      return;
    }

    try {
      const parsed = parseCsv(await selected.text());
      if (parsed.length < 2) throw new Error("File CSV tidak memiliki baris data.");
      const headers = parsed[0].map((value) => value.trim().toLowerCase());
      const index = (...names: string[]) => headers.findIndex((header) => names.includes(header));
      const get = (row: string[], ...names: string[]) => {
        const i = index(...names);
        return i < 0 ? "" : (row[i] ?? "").trim();
      };
      const mapped = parsed.slice(1).map((row) => ({
        nomorAlumni: get(row, "nomor alumni", "nomoralumni"),
        nama: get(row, "nama"),
        kategoriProgram: get(row, "kategori program", "angkatan", "kategoriprogram"),
        nomorAngkatan: get(row, "nomor angkatan", "nomorangkatan"),
        tahunAngkatan: get(row, "tahun angkatan", "tahunangkatan"),
        instansi: get(row, "instansi"),
        jabatan: get(row, "jabatan"),
        wilayah: get(row, "wilayah"),
        alamat: get(row, "alamat"),
        nomorHp: get(row, "nomor hp", "nomorhp", "no hp", "no. hp"),
      })).filter((row) => row.nama);
      if (!mapped.length) throw new Error("Kolom Nama tidak ditemukan atau tidak ada data alumni.");
      const invalid = mapped.findIndex((row) =>
        !row.kategoriProgram ||
        !row.nomorAngkatan ||
        !/^\d{4}$/.test(row.tahunAngkatan) ||
        Number(row.tahunAngkatan) < 1900 ||
        Number(row.tahunAngkatan) > new Date().getFullYear() + 5
      );
      if (invalid >= 0) {
        throw new Error("Baris data ke-" + (invalid + 2) + " belum memiliki Kategori Program, Nomor Angkatan, atau Tahun Angkatan yang valid. Lengkapi CSV sebelum import.");
      }
      setImportRows(mapped);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "File CSV tidak bisa dibaca.");
    }
  }

  async function submitImport() {
    if (!importRows.length || busy) return;
    setBusy(true);
    setImportStatus("");
    setImportError("");
    let success = 0;
    let failed = 0;
    const issues: string[] = [];

    try {
      for (let i = 0; i < importRows.length; i++) {
        const row = importRows[i];
        const response = await fetch("/api/alumni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            nomorAlumni: row.nomorAlumni,
            nama: row.nama,
            kategoriProgram: row.kategoriProgram,
            nomorAngkatan: row.nomorAngkatan,
            tahunAngkatan: Number(row.tahunAngkatan),
            instansi: row.instansi,
            jabatan: row.jabatan,
            wilayah: row.wilayah,
            alamat: row.alamat,
            nomorHp: row.nomorHp,
          }),
        });
        if (response.ok) {
          success++;
        } else {
          failed++;
          const data = await response.json().catch(() => ({}));
          if (issues.length < 5) issues.push(`Baris ${i + 2}: ${data.error || "gagal disimpan"}`);
        }
      }
      setImportStatus(`Selesai: ${success} baris masuk ke antrean verifikasi; ${failed} baris gagal.`);
      if (issues.length) setImportError(issues.join("\n"));
      if (success) setImportRows([]);
    } catch {
      setImportError("Koneksi terputus saat mengimpor. Periksa daftar alumni sebelum mengulangi agar tidak mengirim duplikat.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <AdminSidebar />
      <div className="lg:pl-72">
        <AdminHeader />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">Pengelolaan Data</p>
              <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">Import & Export Data</h1>
              <p className="mt-1 text-sm text-slate-500">Pusat khusus untuk memasukkan data alumni dan mengunduh CSV. Hasil import masuk ke antrean verifikasi, bukan langsung terverifikasi.</p>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Download size={20} /></div>
                <div><h2 className="font-bold text-[#172033]">Export CSV</h2><p className="text-xs text-slate-500">Unduh satu, tiga, atau seluruh data, dengan filter opsional.</p></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-semibold text-slate-700">Jumlah data
                  <select value={exportLimit} onChange={(e) => setExportLimit(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                    <option value="1">1 baris pertama</option><option value="3">3 baris pertama</option><option value="all">Semua data</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Nama alumni
                  <input value={exportNama} onChange={(e) => setExportNama(e.target.value)} placeholder="Cari nama (opsional)" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Kategori angkatan
                  <input value={exportKategori} onChange={(e) => setExportKategori(e.target.value)} placeholder="Mis. PPRA" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Status
                  <select value={exportStatus} onChange={(e) => setExportStatus(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                    <option value="">Semua status</option><option value="Terverifikasi">Terverifikasi</option><option value="Menunggu">Menunggu</option><option value="Ditolak">Ditolak</option>
                  </select>
                </label>
              </div>
              <a href={exportUrl} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a365d]"><Download size={16} />Unduh CSV</a>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><FileUp size={20} /></div>
                <div><h2 className="font-bold text-[#172033]">Import CSV</h2><p className="text-xs text-slate-500">Pilih file CSV berisi data alumni untuk dimasukkan ke antrean verifikasi.</p></div>
              </div>
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5">
                <label className="block text-sm font-semibold text-slate-800">File CSV
                  <input type="file" accept=".csv,text/csv" onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)} className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0b1f3a] file:px-3 file:py-2 file:font-semibold file:text-white" />
                </label>
                <p className="mt-2 text-xs text-slate-500">Kolom minimal: Nama, Kategori Program/Angkatan, Nomor Angkatan, Tahun Angkatan. File CSV hasil ekspor dapat digunakan setelah memastikan kolom kategori dan tahun angkatan terisi benar.</p>
              </div>
              {file && <p className="mt-3 text-xs text-slate-600">File: <strong>{file.name}</strong> · {importRows.length} baris siap diperiksa</p>}
              {importRows.length > 0 && <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Nama</th><th className="p-3">Kategori</th><th className="p-3">No. Angkatan</th><th className="p-3">Tahun</th></tr></thead><tbody>{importRows.slice(0, 5).map((row, i) => <tr key={i} className="border-t border-slate-100"><td className="p-3">{row.nama}</td><td className="p-3">{row.kategoriProgram || "Belum ada"}</td><td className="p-3">{row.nomorAngkatan || "Belum ada"}</td><td className="p-3">{row.tahunAngkatan || "Belum ada"}</td></tr>)}</tbody></table>{importRows.length > 5 && <p className="p-3 text-slate-500">Pratinjau 5 dari {importRows.length} baris.</p>}</div>}
              {importStatus && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{importStatus}</p>}
              {importError && <p role="alert" className="mt-4 whitespace-pre-line rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{importError}</p>}
              <button type="button" disabled={!importRows.length || busy} onClick={() => void submitImport()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a365d] disabled:cursor-not-allowed disabled:opacity-50"><FileSpreadsheet size={16} />{busy ? "Mengimpor..." : `Import ${importRows.length} baris ke antrean`}</button>
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0" />Data yang berhasil masuk berstatus Menunggu dan tetap harus diverifikasi admin. Nomor angkatan/tahun yang tidak sesuai akan ditolak oleh validasi server.</p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
