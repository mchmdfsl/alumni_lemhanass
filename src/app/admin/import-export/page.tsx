"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, FileSpreadsheet, ShieldCheck } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

type ImportRow = {
  rowKey: string;
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
  const router = useRouter();
  const [roleChecked, setRoleChecked] = useState(false);
  const [exportScope, setExportScope] = useState("all");
  const [exportNama, setExportNama] = useState("");
  const [exportKategori, setExportKategori] = useState("");
  const [exportNomorAngkatan, setExportNomorAngkatan] = useState("");
  const [exportTahun, setExportTahun] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [alumniSearch, setAlumniSearch] = useState("");
  const [alumniResults, setAlumniResults] = useState<Array<{ id: number | string; nama: string; nomorAlumni?: string; kategoriProgram?: string; nomorAngkatan?: string; tahunAngkatan?: number | string }>>([]);
  const [selectedAlumni, setSelectedAlumni] = useState("");
  const [searchingAlumni, setSearchingAlumni] = useState(false);
  const [searchAlumniError, setSearchAlumniError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importScope, setImportScope] = useState<"single" | "cohort" | "category" | "all">("all");
  const [importSearch, setImportSearch] = useState("");
  const [importCategory, setImportCategory] = useState("");
  const [importCohortNumber, setImportCohortNumber] = useState("");
  const [selectedImportKey, setSelectedImportKey] = useState("");
  const [importError, setImportError] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const singleImportMatches = useMemo(() => {
    const term = importSearch.trim().toLocaleLowerCase("id-ID");
    return importRows.filter((row) => !term || [row.nama, row.nomorAlumni, row.kategoriProgram, row.nomorAngkatan].some((value) => value.toLocaleLowerCase("id-ID").includes(term)));
  }, [importRows, importSearch]);

  const rowsToImport = useMemo(() => {
    if (importScope === "single") return importRows.filter((row) => row.rowKey === selectedImportKey);
    if (importScope === "cohort") {
      if (!importCohortNumber.trim()) return [];
      return importRows.filter((row) =>
        (!importCategory || row.kategoriProgram.toLocaleLowerCase("id-ID") === importCategory.toLocaleLowerCase("id-ID")) &&
        row.nomorAngkatan.trim() === importCohortNumber.trim()
      );
    }
    if (importScope === "category") {
      if (!importCategory) return [];
      return importRows.filter((row) => row.kategoriProgram.toLocaleLowerCase("id-ID") === importCategory.toLocaleLowerCase("id-ID"));
    }
    return importRows;
  }, [importRows, importScope, selectedImportKey, importCategory, importCohortNumber]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !["admin", "super_admin"].includes(result.user?.role)) {
          router.replace("/login");
          return;
        }
        if (!cancelled) setRoleChecked(true);
      })
      .catch(() => router.replace("/login"));
    return () => { cancelled = true; };
  }, [router]);

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({ format: "csv" });
    if (exportScope === "single" && selectedAlumni) params.set("alumniId", selectedAlumni);
    if (exportScope === "single" && selectedAlumni) params.set("limit", "1");
    if (exportScope === "cohort") {
      if (exportKategori) params.set("kategoriProgram", exportKategori);
      if (exportNomorAngkatan.trim()) params.set("nomorAngkatan", exportNomorAngkatan.trim());
    }
    if (exportScope === "category" && exportKategori) params.set("kategoriProgram", exportKategori);
    if (exportScope === "year" && exportTahun.trim()) params.set("tahunAngkatan", exportTahun.trim());
    if (exportNama.trim()) params.set("nama", exportNama.trim());
    if (exportStatus) params.set("status", exportStatus);
    return `/api/alumni/export?${params.toString()}`;
  }, [exportScope, selectedAlumni, exportKategori, exportNomorAngkatan, exportTahun, exportNama, exportStatus]);

  async function searchAlumni() {
    const term = alumniSearch.trim();
    if (term.length < 2) {
      setSearchAlumniError("Masukkan minimal 2 karakter nama atau nomor alumni.");
      setAlumniResults([]);
      return;
    }
    setSearchingAlumni(true);
    setSearchAlumniError("");
    try {
      const response = await fetch(`/api/alumni?search=${encodeURIComponent(term)}&limit=10`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pencarian alumni gagal.");
      setAlumniResults(Array.isArray(result.data) ? result.data : []);
      setSelectedAlumni("");
      if (!result.data?.length) setSearchAlumniError("Alumni tidak ditemukan. Coba nama atau nomor alumni lain.");
    } catch (error) {
      setSearchAlumniError(error instanceof Error ? error.message : "Pencarian alumni gagal.");
    } finally {
      setSearchingAlumni(false);
    }
  }

  async function handleFileChange(selected: File | null) {
    setFile(selected);
    setImportRows([]);
    setImportSearch("");
    setImportCategory("");
    setImportCohortNumber("");
    setSelectedImportKey("");
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
      const mapped = parsed.slice(1).map((row, rowIndex) => ({
        rowKey: String(rowIndex),
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
    if (!rowsToImport.length || busy) return;
    const confirmed = window.confirm(
      "Konfirmasi import " + rowsToImport.length + " baris dengan cakupan " +
      (importScope === "single" ? "satu alumni" : importScope === "cohort" ? "angkatan terpilih" : importScope === "category" ? "kategori terpilih" : "semua baris file") +
      ". Data akan dikirim ke antrean verifikasi. Lanjutkan?"
    );
    if (!confirmed) return;
    setBusy(true);
    setImportStatus("");
    setImportError("");
    let success = 0;
    let failed = 0;
    const issues: string[] = [];
    const successfulRows: ImportRow[] = [];
    const selectedRows = rowsToImport;

    try {
      for (let i = 0; i < selectedRows.length; i++) {
        const row = selectedRows[i];
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
          successfulRows.push(row);
        } else {
          failed++;
          const data = await response.json().catch(() => ({}));
          if (issues.length < 5) issues.push(`Baris ${i + 2}: ${data.error || "gagal disimpan"}`);
        }
      }
      setImportStatus(`Selesai: ${success} baris masuk ke antrean verifikasi; ${failed} baris gagal. Baris yang gagal tetap tersedia untuk diperiksa.`);
      if (issues.length) setImportError(issues.join("\n"));
      if (successfulRows.length) {
        setImportRows((current) => current.filter((row) => !successfulRows.includes(row)));
        setSelectedImportKey("");
      }
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
              <p className="mt-1 text-sm text-slate-500">Pusat khusus administrator untuk memasukkan data alumni dan mengunduh CSV berdasarkan cakupan yang dipilih. Hasil import masuk ke antrean verifikasi.</p>
            </div>

            {!roleChecked ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Memeriksa akses administrator...</div>
            ) : <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Download size={20} /></div>
                <div><h2 className="font-bold text-[#172033]">Export CSV</h2><p className="text-xs text-slate-500">Pilih cakupan data alumni yang ingin diunduh.</p></div>
              </div>
              <label className="block text-xs font-semibold text-slate-700">Cakupan export
                <select value={exportScope} onChange={(e) => { setExportScope(e.target.value); setSelectedAlumni(""); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal sm:max-w-md">
                  <option value="single">Satu alumni</option><option value="cohort">Angkatan tertentu</option><option value="category">Kategori program</option><option value="year">Tahun angkatan</option><option value="all">Semua data alumni</option>
                </select>
              </label>
              {exportScope === "single" && <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Cari alumni berdasarkan nama atau nomor alumni
                  <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                    <input value={alumniSearch} onChange={(e) => setAlumniSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void searchAlumni(); } }} placeholder="Masukkan nama / nomor alumni" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
                    <button type="button" onClick={() => void searchAlumni()} disabled={searchingAlumni} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0b1f3a] disabled:opacity-50">{searchingAlumni ? "Mencari..." : "Cari alumni"}</button>
                  </div>
                </label>
                {searchAlumniError && <p role="status" className="text-sm text-rose-600">{searchAlumniError}</p>}
                {alumniResults.length > 0 && <label className="block text-xs font-semibold text-slate-700">Pilih satu alumni
                  <select value={selectedAlumni} onChange={(e) => setSelectedAlumni(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                    <option value="">Pilih hasil pencarian...</option>
                    {alumniResults.map((alumni) => <option key={alumni.id} value={String(alumni.id)}>{alumni.nama}{alumni.nomorAlumni ? ` · ${alumni.nomorAlumni}` : ""}{alumni.kategoriProgram ? ` · ${alumni.kategoriProgram}` : ""}{alumni.nomorAngkatan ? ` Angkatan ${alumni.nomorAngkatan}` : ""}</option>)}
                  </select>
                </label>}
              </div>}
              {(exportScope === "cohort" || exportScope === "category") && <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Kategori program
                  <select value={exportKategori} onChange={(e) => setExportKategori(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                    <option value="">Pilih kategori...</option><option>KRA</option><option>PPRA</option><option>P4N</option><option>KSA</option><option>PPSA</option><option>P3N</option><option>PPNK</option><option value="PPNK KOLABORASI">PPNK Kolaborasi</option><option>TOT</option>
                  </select>
                </label>
                {exportScope === "cohort" && <label className="text-xs font-semibold text-slate-700">Nomor angkatan
                  <input value={exportNomorAngkatan} onChange={(e) => setExportNomorAngkatan(e.target.value)} placeholder="Mis. 1" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
                </label>}
              </div>}
              {exportScope === "year" && <label className="mt-4 block text-xs font-semibold text-slate-700">Tahun angkatan
                <input inputMode="numeric" value={exportTahun} onChange={(e) => setExportTahun(e.target.value)} placeholder="Mis. 2024" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal sm:max-w-xs" />
              </label>}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Filter nama tambahan (opsional)
                  <input value={exportNama} onChange={(e) => setExportNama(e.target.value)} placeholder="Cari nama" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Status (opsional)
                  <select value={exportStatus} onChange={(e) => setExportStatus(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                    <option value="">Semua status</option><option value="Terverifikasi">Terverifikasi</option><option value="Menunggu">Menunggu</option><option value="Ditolak">Ditolak</option>
                  </select>
                </label>
              </div>
              {(() => {
                const invalid = (exportScope === "single" && !selectedAlumni) ||
                  (exportScope === "cohort" && (!exportKategori || !exportNomorAngkatan.trim())) ||
                  (exportScope === "category" && !exportKategori) ||
                  (exportScope === "year" && !/^\\d{4}$/.test(exportTahun.trim()));
                return <a href={invalid ? undefined : exportUrl} onClick={(e) => { if (invalid) e.preventDefault(); }} aria-disabled={invalid} className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${invalid ? "cursor-not-allowed bg-slate-400" : "bg-[#0b1f3a] hover:bg-[#1a365d]"}`}><Download size={16} />Unduh CSV</a>;
              })()}
            </section>}

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
              {file && <p className="mt-3 text-xs text-slate-600">File: <strong>{file.name}</strong> · {importRows.length} baris tersisa untuk diperiksa</p>}
              {importRows.length > 0 && <>
                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f3a]/5 text-[#0b1f3a]"><ShieldCheck size={18} /></div><div><h3 className="text-sm font-bold text-[#172033]">Tentukan cakupan import</h3><p className="text-xs text-slate-500">Saring data dahulu, lalu tinjau hasil sebelum konfirmasi.</p></div></div>
                  <label className="block text-xs font-semibold text-slate-700">Import berdasarkan
                    <select value={importScope} onChange={(e) => { setImportScope(e.target.value as typeof importScope); setSelectedImportKey(""); setImportError(""); setImportStatus(""); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                      <option value="single">Satu alumni</option><option value="cohort">Satu angkatan</option><option value="category">Satu kategori</option><option value="all">Semua baris dalam file</option>
                    </select>
                  </label>
                  {importScope === "single" && <div className="mt-3 space-y-3">
                    <label className="block text-xs font-semibold text-slate-700">Cari nama atau nomor alumni
                      <input value={importSearch} onChange={(e) => setImportSearch(e.target.value)} placeholder="Ketik nama / nomor alumni..." className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">Pilih satu baris alumni
                      <select value={selectedImportKey} onChange={(e) => setSelectedImportKey(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                        <option value="">Pilih alumni...</option>{singleImportMatches.map((row) => <option key={row.rowKey} value={row.rowKey}>{row.nama}{row.nomorAlumni ? " · " + row.nomorAlumni : ""} · {row.kategoriProgram} · Angkatan {row.nomorAngkatan}</option>)}
                      </select>
                    </label>
                  </div>}
                  {importScope === "cohort" && <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-700">Kategori program (opsional)
                      <select value={importCategory} onChange={(e) => setImportCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Semua kategori</option><option>KRA</option><option>PPRA</option><option>P4N</option><option>KSA</option><option>PPSA</option><option>P3N</option><option>PPNK</option><option value="PPNK KOLABORASI">PPNK Kolaborasi</option><option>TOT</option></select>
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">Nomor angkatan (wajib)
                      <input value={importCohortNumber} onChange={(e) => setImportCohortNumber(e.target.value)} placeholder="Mis. 1" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
                    </label>
                  </div>}
                  {importScope === "category" && <label className="mt-3 block text-xs font-semibold text-slate-700">Kategori program (wajib)
                    <select value={importCategory} onChange={(e) => setImportCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Pilih kategori...</option><option>KRA</option><option>PPRA</option><option>P4N</option><option>KSA</option><option>PPSA</option><option>P3N</option><option>PPNK</option><option value="PPNK KOLABORASI">PPNK Kolaborasi</option><option>TOT</option></select>
                  </label>}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-600">Hasil filter</span><strong className="text-sm text-[#0b1f3a]">{rowsToImport.length} baris dipilih dari {importRows.length}</strong></div>
                  {importScope === "cohort" && !importCohortNumber.trim() && <p className="mt-2 text-xs text-amber-700">Masukkan nomor angkatan agar tidak mengimpor seluruh file tanpa sengaja.</p>}
                  {importScope === "category" && !importCategory && <p className="mt-2 text-xs text-amber-700">Pilih kategori yang ingin diimpor.</p>}
                </div>
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Nama</th><th className="p-3">Kategori</th><th className="p-3">No. Angkatan</th><th className="p-3">Tahun</th></tr></thead><tbody>{rowsToImport.slice(0, 10).map((row) => <tr key={row.rowKey} className="border-t border-slate-100"><td className="p-3">{row.nama}</td><td className="p-3">{row.kategoriProgram || "Belum ada"}</td><td className="p-3">{row.nomorAngkatan || "Belum ada"}</td><td className="p-3">{row.tahunAngkatan || "Belum ada"}</td></tr>)}</tbody></table>
                  {rowsToImport.length > 10 && <p className="p-3 text-slate-500">Pratinjau 10 dari {rowsToImport.length} baris terpilih.</p>}
                  {rowsToImport.length === 0 && <p className="p-4 text-sm text-slate-500">Belum ada baris yang cocok. Periksa filter atau pilih alumni.</p>}
                </div>
              </>}
              {importStatus && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{importStatus}</p>}
              {importError && <p role="alert" className="mt-4 whitespace-pre-line rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{importError}</p>}
              <button type="button" disabled={!rowsToImport.length || busy} onClick={() => void submitImport()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a365d] disabled:cursor-not-allowed disabled:opacity-50"><FileSpreadsheet size={16} />{busy ? "Mengimpor..." : `Tinjau & import ${rowsToImport.length} baris`}</button>
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0" />Data yang berhasil masuk berstatus Menunggu dan tetap harus diverifikasi admin. Nomor angkatan/tahun yang tidak sesuai akan ditolak oleh validasi server.</p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
