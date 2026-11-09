"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, FileSpreadsheet, ShieldCheck, KeyRound, UserRoundPlus } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { parseXlsxFile } from "@/lib/xlsx-parser";

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
  status: string;
};

async function parseApiResponse(response: Response): Promise<Record<string, any>> {
  const body = await response.text();
  if (!body) return {};
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed && typeof parsed === "object" ? parsed as Record<string, any> : {};
  } catch {
    throw new Error(`Server tidak mengirim JSON (HTTP ${response.status}). ${body.slice(0, 240)}`);
  }
}

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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState("");
  const [accountListLoading, setAccountListLoading] = useState(false);
  const [accountListStatus, setAccountListStatus] = useState("");
  const [accountListError, setAccountListError] = useState("");
  const [accountListDownload, setAccountListDownload] = useState<{ url: string; filename: string } | null>(null);
  const [accountStats, setAccountStats] = useState<Record<string, number> | null>(null);
  const [accountStatsError, setAccountStatsError] = useState("");
  const [accountStatsLoading, setAccountStatsLoading] = useState(false);
  const [credentialDownload, setCredentialDownload] = useState<{ url: string; filename: string } | null>(null);
  const [exportDownload, setExportDownload] = useState<{ url: string; filename: string } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportStatusMessage, setExportStatusMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountScope, setAccountScope] = useState("all");
  const [accountCategory, setAccountCategory] = useState("");
  const [accountCohort, setAccountCohort] = useState("");
  const [accountYear, setAccountYear] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountResults, setAccountResults] = useState<Array<{ id: number | string; nama: string; nomorAlumni?: string; kategoriProgram?: string; nomorAngkatan?: string; tahunAngkatan?: number | string }>>([]);
  const [accountAlumniId, setAccountAlumniId] = useState("");
  const [accountSearching, setAccountSearching] = useState(false);
  const [accountSearchError, setAccountSearchError] = useState("");
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


  function accountFilter() { return { scope: accountScope, alumniId: accountScope === "single" ? accountAlumniId : "", kategoriProgram: ["cohort","category"].includes(accountScope) ? accountCategory : "", nomorAngkatan: accountScope === "cohort" ? accountCohort.trim() : "", tahunAngkatan: accountScope === "year" ? accountYear.trim() : "" }; }
  function validateAccountScope(scope: ReturnType<typeof accountFilter>) { if (scope.scope === "single" && !scope.alumniId) return "Pilih satu alumni terlebih dahulu."; if (scope.scope === "cohort" && (!scope.kategoriProgram || !scope.nomorAngkatan)) return "Pilih kategori dan isi nomor angkatan terlebih dahulu."; if (scope.scope === "category" && !scope.kategoriProgram) return "Pilih kategori program terlebih dahulu."; if (scope.scope === "year" && !/^\d{4}$/.test(scope.tahunAngkatan)) return "Isi tahun angkatan dengan 4 digit."; return ""; }

  async function refreshAccountStats() {
    setAccountStatsLoading(true);
    setAccountStatsError("");
    try {
      const response = await fetch("/api/admin/alumni-accounts/stats", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.stats) throw new Error(result.error || "Gagal membaca statistik database.");
      setAccountStats(result.stats as Record<string, number>);
    } catch (error) {
      setAccountStatsError(error instanceof Error ? error.message : "Gagal membaca statistik database.");
    } finally {
      setAccountStatsLoading(false);
    }
  }
  async function searchAccountAlumni() { const term = accountSearch.trim(); if (term.length < 2) { setAccountSearchError("Masukkan minimal 2 karakter nama atau nomor alumni."); setAccountResults([]); return; } setAccountSearching(true); setAccountSearchError(""); try { const response = await fetch("/api/alumni?search=" + encodeURIComponent(term) + "&limit=10", { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Pencarian alumni gagal."); setAccountResults(Array.isArray(result.data) ? result.data : []); setAccountAlumniId(""); if (!result.data?.length) setAccountSearchError("Alumni tidak ditemukan."); } catch (error) { setAccountSearchError(error instanceof Error ? error.message : "Pencarian alumni gagal."); } finally { setAccountSearching(false); } }
  async function handleDownloadStoredCredentials() {
    setAccountLoading(true);
    setAccountError("");
    setAccountStatus("");
    try {
      const response = await fetch("/api/admin/alumni-accounts/credentials-export", { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Unduh kredensial tersimpan gagal.");
      }
      const blob = await response.blob();
      const count = Number(response.headers.get("X-Credential-Count") || 0);
      if (!count || !blob.size) throw new Error("Belum ada kredensial tersimpan. Jalankan reset massal setelah fitur terbaru aktif.");
      const url = URL.createObjectURL(blob);
      setCredentialDownload({ url, filename: "kredensial-alumni-lengkap-" + new Date().toISOString().slice(0, 10) + ".csv" });
      setAccountStatus("Berhasil menyiapkan " + count.toLocaleString("id-ID") + " kredensial dari penyimpanan aman. Klik Unduh CSV kredensial.");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Unduh kredensial tersimpan gagal.");
    } finally {
      setAccountLoading(false);
    }
  }

  async function handleExportAccountList() {
    setAccountListLoading(true);
    setAccountListError("");
    setAccountListStatus("");
    setAccountListDownload(null);
    try {
      const response = await fetch("/api/admin/alumni-accounts/export", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Ekspor daftar akun gagal.");
      const rows = Array.isArray(result.accounts) ? result.accounts : [];
      if (!rows.length) throw new Error("Tidak ada akun user yang dapat diekspor.");
      const headers = ["ID Akun", "ID Alumni", "Nama", "Angkatan", "Nomor Alumni", "Email", "Status Akun", "Password"];
      const esc = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
      const csv = [headers, ...rows.map((r: { accountId?: unknown; alumniId?: unknown; nama?: unknown; angkatan?: unknown; nomorAlumni?: unknown; email?: unknown; isActive?: unknown }) => [
        r.accountId, r.alumniId, r.nama, r.angkatan, r.nomorAlumni, r.email, r.isActive ? "Aktif" : "Nonaktif", ""
      ])].map(row => row.map(esc).join(",")).join("\r\n");
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      setAccountListDownload({ url, filename: "daftar-akun-user-" + new Date().toISOString().slice(0, 10) + ".csv" });
      setAccountListStatus("Berhasil menyiapkan " + rows.length.toLocaleString("id-ID") + " akun user. Kolom password dikosongkan karena password lama tidak bisa dibaca dari hash database. Tidak ada akun atau password yang diubah.");
    } catch (error) {
      setAccountListError(error instanceof Error ? error.message : "Ekspor daftar akun gagal.");
    } finally {
      setAccountListLoading(false);
    }
  }

  async function handleBulkActivateAccounts() { const scope = accountFilter(); const invalid = validateAccountScope(scope); if (invalid) { setAccountError(invalid); return; } if (!window.confirm("Aktivasi akun untuk alumni terverifikasi yang sesuai dengan cakupan terpilih? Password baru akan diunduh dalam CSV. Lanjutkan?")) return; setAccountLoading(true); setAccountStatus(""); setAccountError(""); const all: Array<{nama:string;angkatan:string;nomorAlumni:string;email:string;password:string}> = []; try { let more = true, batches = 0; while (more) { if (++batches > 500) throw new Error("Batas 50.000 akun per sekali jalan tercapai. Jalankan lagi untuk melanjutkan."); const response = await fetch("/api/admin/alumni-accounts/bulk-activate", { method:"POST", cache:"no-store", headers:{"Content-Type":"application/json"}, body:JSON.stringify(scope) }); const result = await parseApiResponse(response); if (!response.ok) throw new Error(result.error || "Aktivasi akun gagal."); const credentials = Array.isArray(result.credentials) ? result.credentials : []; const validCredentials = credentials.filter((item: { password?: unknown }) => typeof item.password === "string" && item.password.trim()); all.push(...validCredentials); if (validCredentials.length !== credentials.length) throw new Error("Server mengembalikan kredensial tanpa password. Baris kosong tidak dimasukkan ke CSV; periksa statistik database sebelum menjalankan ulang."); more = Boolean(result.hasMore); if (!credentials.length || scope.scope === "single") break; } if (!all.length) { setAccountStatus("Tidak ada alumni terverifikasi tanpa akun dalam cakupan ini. Tidak ada perubahan dilakukan."); return; } downloadCredentialsCsv("kredensial-alumni", all); setAccountStatus("Berhasil membuat " + all.length + " akun. CSV password siap diunduh. Tekan tombol Unduh CSV di bawah, lalu simpan file dengan aman."); } catch(e) { if (all.length) downloadCredentialsCsv("kredensial-alumni-parsial", all); setAccountError((e instanceof Error ? e.message : "Aktivasi akun gagal.") + (all.length ? " CSV parsial tersedia untuk " + all.length + " akun yang datanya berhasil diterima." : "")); } finally { setAccountLoading(false); void refreshAccountStats(); } }
  async function handleResetPasswords() {
    const scope = accountFilter();
    const invalid = validateAccountScope(scope);
    if (invalid) { setAccountError(invalid); return; }
    if (!window.confirm("Reset akan melanjutkan dari kredensial terakhir yang sudah tersimpan agar password yang sudah berhasil dibuat tidak diulang. Password akun yang belum diproses akan diganti. Lanjutkan?")) return;

    setAccountLoading(true);
    setAccountStatus("");
    setAccountError("");
    const all: Array<{nama:string;angkatan:string;nomorAlumni:string;email:string;password:string;accountId?:number}> = [];

    try {
      let afterId = 0;
      if (scope.scope === "all") {
        const progressResponse = await fetch("/api/admin/alumni-accounts/credentials-export", { method: "HEAD", cache: "no-store" });
        if (!progressResponse.ok) throw new Error("Tidak dapat memeriksa posisi reset tersimpan. Tidak ada password yang diubah.");
        const savedCount = Number(progressResponse.headers.get("X-Credential-Count") || 0);
        afterId = Number(progressResponse.headers.get("X-Credential-Last-Account-Id") || 0);
        const missingBeforeCursor = Number(progressResponse.headers.get("X-Credential-Missing-Before-Cursor") || 0);
        if (missingBeforeCursor > 0) {
          throw new Error("Ditemukan " + missingBeforeCursor + " akun aktif yang belum memiliki kredensial tersimpan sebelum posisi lanjut. Proses dihentikan agar tidak melewati akun. Hubungi Super Admin untuk pemeriksaan.");
        }
        if (savedCount > 0) {
          setAccountStatus("Melanjutkan setelah " + savedCount.toLocaleString("id-ID") + " kredensial tersimpan (ID akun terakhir " + afterId + "). Password yang sudah tersimpan tidak di-reset ulang.");
        }
      }

      let more = true;
      while (more) {
        let result: Record<string, any> | null = null;
        let lastError: unknown = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const response = await fetch("/api/admin/alumni-accounts/reset-passwords", {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ afterId, ...scope }),
            });
            if (response.ok) {
              result = await parseApiResponse(response);
              break;
            }
            if ([502, 503, 504].includes(response.status) && attempt < 3) {
              lastError = new Error("Server sementara tidak merespons (HTTP " + response.status + ").");
              await new Promise(resolve => setTimeout(resolve, 1200 * attempt));
              continue;
            }
            const errorBody = await parseApiResponse(response);
            throw new Error(errorBody.error || "Reset password gagal (HTTP " + response.status + ").");
          } catch (error) {
            lastError = error;
            if (attempt < 3 && (!(error instanceof Error) || /Failed to fetch|NetworkError|HTTP 502|HTTP 503|HTTP 504/i.test(error.message))) {
              await new Promise(resolve => setTimeout(resolve, 1200 * attempt));
              continue;
            }
            throw error;
          }
        }
        if (!result) throw lastError instanceof Error ? lastError : new Error("Reset batch gagal setelah tiga percobaan.");

        const credentials = Array.isArray(result.credentials) ? result.credentials : [];
        const validCredentials = credentials.filter((item: { password?: unknown }) => typeof item.password === "string" && item.password.trim());
        all.push(...validCredentials);
        if (validCredentials.length !== credentials.length) {
          throw new Error("Server mengembalikan kredensial tanpa password. Baris kosong tidak dimasukkan ke CSV; periksa penyimpanan kredensial.");
        }
        afterId = Number(result.lastId) || afterId;
        more = Boolean(result.hasMore);
        if (more && !credentials.length) throw new Error("Batch kosong, proses dihentikan demi keamanan.");
        if (scope.scope === "single") more = false;
      }

      if (scope.scope === "all") {
        setAccountStatus("Proses reset selesai. Menyiapkan seluruh kredensial dari penyimpanan aman, termasuk batch sebelumnya...");
        await handleDownloadStoredCredentials();
      } else if (all.length) {
        downloadCredentialsCsv("password-baru-alumni", all);
        setAccountStatus("Password " + all.length + " akun berhasil direset. CSV password baru siap diunduh.");
      } else {
        setAccountStatus("Tidak ada akun aktif terverifikasi dalam cakupan ini. Password tidak diubah.");
      }
    } catch (e) {
      if (all.length) downloadCredentialsCsv("password-baru-alumni-parsial", all);
      setAccountError((e instanceof Error ? e.message : "Reset password gagal.") + (all.length ? " CSV respons parsial berisi " + all.length + " akun. Gunakan Unduh kredensial tersimpan untuk mengambil seluruh password yang sudah tersimpan." : ""));
    } finally {
      setAccountLoading(false);
      void refreshAccountStats();
    }
  }
  function downloadCredentialsCsv(prefix: string, rows: Array<{nama:string;angkatan:string;nomorAlumni:string;email:string;password:string}>) {
    const headers = ["Nama","Angkatan","ID Alumni","Email","Password"];
    const esc = (value: unknown) => '"' + String(value ?? "").replace(/"/g,'""') + '"';
    const csv = [headers, ...rows.map(r => [r.nama,r.angkatan,r.nomorAlumni,r.email,r.password])].map(row => row.map(esc).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    setCredentialDownload({ url, filename: prefix + "-" + new Date().toISOString().slice(0,10) + ".csv" });
  }

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
    if (!accountListDownload) return;
    return () => URL.revokeObjectURL(accountListDownload.url);
  }, [accountListDownload]);

  useEffect(() => {
    if (!credentialDownload) return;
    return () => URL.revokeObjectURL(credentialDownload.url);
  }, [credentialDownload]);

  useEffect(() => {
    if (!exportDownload) return;
    return () => URL.revokeObjectURL(exportDownload.url);
  }, [exportDownload]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !["admin", "super_admin"].includes(result.user?.role)) {
          router.replace("/login");
          return;
        }
        if (!cancelled) { setIsSuperAdmin(result.user?.role === "super_admin"); setRoleChecked(true); void refreshAccountStats(); }
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

  async function handleVerifiedReportDownload() {
    setExportLoading(true);
    setExportError("");
    setExportStatusMessage("");
    setExportDownload(null);
    try {
      const response = await fetch("/api/alumni/export?status=Terverifikasi&limit=all", { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Ekspor laporan alumni terverifikasi gagal.");
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("File laporan kosong. Periksa data alumni.");
      const rowCount = Number(response.headers.get("X-Export-Row-Count") || 0);
      const url = URL.createObjectURL(blob);
      setExportDownload({ url, filename: "laporan-seluruh-alumni-terverifikasi-" + new Date().toISOString().slice(0, 10) + ".csv" });
      setExportStatusMessage("Server mengekspor " + rowCount.toLocaleString("id-ID") + " baris alumni terverifikasi. Data dengan kolom kosong dan nama duplikat tetap disertakan.");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Ekspor laporan alumni terverifikasi gagal.");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleExportDownload() {
    setExportLoading(true);
    setExportError("");
    setExportDownload(null);
    try {
      const response = await fetch(exportUrl, { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Ekspor CSV gagal diproses.");
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("File ekspor kosong. Periksa filter dan data alumni.");
      const url = URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      setExportDownload({ url, filename: match?.[1] || "alumni-lemhannas-" + new Date().toISOString().slice(0, 10) + ".csv" });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Ekspor CSV gagal diproses.");
    } finally {
      setExportLoading(false);
    }
  }

  function handleTemplateDownload() {
    const headers = ["nama", "kategori program", "nomor angkatan", "tahun angkatan", "status", "instansi", "jabatan", "wilayah", "alamat", "nomor hp"];
    const csv = headers.map((value) => '"' + value.replace(/"/g, '""') + '"').join(",") + "\r\n";
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-data-alumni.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

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

  function inferImportMetadataFromFilename(filename: string) {
    const normalized = filename.toLocaleUpperCase("id-ID").replace(/[_-]+/g, " ");
    const categories = ["PPNK KOLABORASI", "TAPLAI", "PPRA", "PPSA", "PPNK", "P4N", "P3N", "KRA", "KSA", "TOT"];
    const category = categories.find((value) => new RegExp("(?:^|[^A-Z0-9])" + value.replace(/ /g, "\\s+") + "(?=$|[^A-Z0-9])").test(normalized)) || "";
    const yearMatch = normalized.match(/(?:19|20)\d{2}/);
    const year = yearMatch?.[0] || "";
    return {
      kategoriProgram: category,
      nomorAngkatan: year ? String(Number(year) % 100).padStart(2, "0") : "",
      tahunAngkatan: year,
    };
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
    const extension = selected.name.toLowerCase().split(".").pop();
    if (extension !== "csv" && extension !== "xlsx") {
      setImportError("Gunakan file Excel .xlsx atau CSV.");
      return;
    }

    try {
      const parsed = extension === "xlsx" ? await parseXlsxFile(selected) : parseCsv(await selected.text());
      if (parsed.length < 2) throw new Error("File CSV tidak memiliki baris data.");
      const headers = parsed[0].map((value) => value.trim().toLowerCase());
      const index = (...names: string[]) => headers.findIndex((header) => names.includes(header));
      const get = (row: string[], ...names: string[]) => {
        const i = index(...names);
        return i < 0 ? "" : (row[i] ?? "").trim();
      };
      const fileMetadata = inferImportMetadataFromFilename(selected.name);
      const mapped = parsed.slice(1).map((row, rowIndex) => ({
        rowKey: String(rowIndex),
        nomorAlumni: get(row, "nomor alumni", "nomoralumni"),
        nama: get(row, "nama"),
        kategoriProgram: fileMetadata.kategoriProgram || get(row, "kategori program", "angkatan", "kategoriprogram"),
        nomorAngkatan: fileMetadata.nomorAngkatan || get(row, "nomor angkatan", "nomorangkatan"),
        tahunAngkatan: fileMetadata.tahunAngkatan || get(row, "tahun angkatan", "tahunangkatan"),
        instansi: get(row, "instansi"),
        jabatan: get(row, "jabatan"),
        wilayah: get(row, "wilayah"),
        alamat: get(row, "alamat"),
        nomorHp: get(row, "nomor hp", "nomorhp", "no hp", "no. hp"),
        status: get(row, "status") || "Menunggu",
      })).filter((row) => row.nama);
      if (!mapped.length) throw new Error("Kolom Nama tidak ditemukan atau tidak ada data alumni.");
      const invalid = mapped.findIndex((row) => !row.nama || !row.kategoriProgram || !row.nomorAngkatan || !/^\d{4}$/.test(row.tahunAngkatan) || Number(row.tahunAngkatan) < 1900 || Number(row.tahunAngkatan) > new Date().getFullYear() + 5 || row.status !== "Menunggu");
      if (invalid >= 0) throw new Error("Baris data ke-" + (invalid + 2) + " belum valid. Nama, kategori, nomor angkatan, tahun angkatan wajib diisi dan status harus Menunggu. Kolom profil lainnya opsional.");
      setImportRows(mapped);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "File CSV tidak bisa dibaca.");
    }
  }

  async function submitImport() {
    if (!rowsToImport.length || busy) return;
    const confirmed = window.confirm(
      "Konfirmasi sinkronisasi " + rowsToImport.length + " baris dengan cakupan " +
      (importScope === "single" ? "satu alumni" : importScope === "cohort" ? "angkatan terpilih" : importScope === "category" ? "kategori terpilih" : "semua baris file") +
      ". Data yang cocok akan diperbarui tanpa mengubah status/email akun; data baru masuk antrean verifikasi. Lanjutkan?"
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

    let insertedCount = 0;
    let updatedCount = 0;
    try {
      for (let start = 0; start < selectedRows.length; start += 250) {
        const batch = selectedRows.slice(start, start + 250);
        try {
          const response = await fetch("/api/alumni/import-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
              sourceFile: file?.name || "import-manual.csv",
              rows: batch.map((row) => ({
                nomorAlumni: row.nomorAlumni,
                nama: row.nama,
                kategoriProgram: row.kategoriProgram,
                nomorAngkatan: row.nomorAngkatan,
                tahunAngkatan: row.tahunAngkatan,
                instansi: row.instansi,
                jabatan: row.jabatan,
                wilayah: row.wilayah,
                alamat: row.alamat,
                nomorHp: row.nomorHp,
                status: row.status,
              })),
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Batch gagal disinkronkan.");
          success += Number(data.processed ?? batch.length);
          insertedCount += Number(data.inserted ?? 0);
          updatedCount += Number(data.updated ?? 0);
          successfulRows.push(...batch);
        } catch (error) {
          failed += batch.length;
          if (issues.length < 5) issues.push(`Batch baris ${start + 1}-${start + batch.length}: ${error instanceof Error ? error.message : "gagal disimpan"}`);
        }
      }
      setImportStatus(`Selesai: ${success} baris diproses (${insertedCount} data baru ditambahkan, ${updatedCount} data sudah ada dan diperbarui, tanpa membuat duplikat); ${failed} baris gagal.`);
      if (issues.length) setImportError(issues.join("\n"));
      if (successfulRows.length) {
        setImportRows((current) => current.filter((row) => !successfulRows.includes(row)));
        setSelectedImportKey("");
      }
    } catch {
      setImportError("Koneksi terputus saat mengimpor. Periksa daftar alumni sebelum mengulangi agar tidak mengirim duplikat.");
    } finally {
      setBusy(false);
      if (isSuperAdmin) void refreshAccountStats();
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <AdminSidebar />
      <div className="lg:pl-72">
        <AdminHeader />
        <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">


            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#9b791d]">PUSAT KENDALI DATA</p>
              <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">Import & Export Data</h1>
              <p className="mt-1 text-sm text-slate-500">Pusat khusus administrator untuk memasukkan data alumni dan mengunduh CSV berdasarkan cakupan yang dipilih. Hasil import masuk ke antrean verifikasi.</p>
            </div>

            {!roleChecked ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Memeriksa akses administrator...</div>
            ) : <section className="rounded-2xl border border-[#dbe1e8] bg-white p-6 shadow-[0_10px_30px_rgba(11,31,58,0.055)] sm:p-7">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7f1df] text-[#8a6b16]"><Download size={20} /></div>
                <div><h2 className="font-bold text-[#0b1f3a]">Export CSV</h2><p className="text-xs text-slate-500">Pilih cakupan data alumni yang ingin diunduh.</p></div>
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
                    <option value="">Pilih kategori...</option><option>KRA</option><option>PPRA</option><option>P4N</option><option>KSA</option><option>PPSA</option><option>P3N</option><option>TAPLAI</option><option>PPNK</option><option value="PPNK KOLABORASI">PPNK Kolaborasi</option><option>TOT</option>
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
                  (exportScope === "year" && !/^\d{4}$/.test(exportTahun.trim()));
                return <button type="button" disabled={invalid || exportLoading} onClick={() => void handleExportDownload()} aria-disabled={invalid} className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${invalid || exportLoading ? "cursor-not-allowed bg-slate-400" : "bg-[#0b1f3a] hover:bg-[#1a365d]"}`}><Download size={16} />{exportLoading ? "Menyiapkan CSV..." : "Siapkan CSV"}</button>;
              })()}
              <div className="mt-5 rounded-xl border border-[#c9a227]/30 bg-[#f7f1df] p-4">
                <p className="text-sm font-semibold text-[#0b1f3a]">Laporan seluruh alumni terverifikasi</p>
                <p className="mt-1 text-xs leading-5 text-slate-700">Mengambil semua baris berstatus Terverifikasi langsung dari database, termasuk profil dengan kolom kosong. Nama duplikat tetap dipertahankan.</p>
                <button type="button" disabled={exportLoading} onClick={() => void handleVerifiedReportDownload()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#123b68] disabled:cursor-not-allowed disabled:opacity-50"><Download size={16} />{exportLoading ? "Menyiapkan laporan..." : "Unduh seluruh data terverifikasi"}</button>
              </div>
              {exportError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{exportError}</p>}
              {exportStatusMessage && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{exportStatusMessage}</p>}
              {exportDownload && <a href={exportDownload.url} download={exportDownload.filename} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"><Download size={16} />Unduh file CSV</a>}
            </section>}

            <section className="rounded-2xl border border-[#dbe1e8] bg-white p-6 shadow-[0_10px_30px_rgba(11,31,58,0.055)] sm:p-7">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7f1df] text-[#8a6b16]"><FileUp size={20} /></div>
                <div><h2 className="font-bold text-[#0b1f3a]">Import Excel / CSV</h2><p className="text-xs text-slate-500">Unggah file Excel .xlsx atau CSV untuk memperbarui data alumni yang cocok dan menambahkan data baru ke database.</p></div>
              </div>
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5">
                <label className="block text-sm font-semibold text-slate-800">File Excel (.xlsx) atau CSV
                  <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)} className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0b1f3a] file:px-3 file:py-2 file:font-semibold file:text-white" />
                </label>
                <p className="mt-2 text-xs text-slate-500">Semua kolom wajib diisi kecuali Nomor Alumni. Sistem akan membuat Nomor Alumni secara otomatis. Jika nama file memuat kategori dan tahun, keduanya menjadi acuan utama: contoh REKAP ALUMNI TAPLAI 2024 akan dibaca sebagai TAPLAI, nomor angkatan 24, tahun angkatan 2024.</p>
              </div>
              {file && <p className="mt-3 text-xs text-slate-600">File: <strong>{file.name}</strong> · {importRows.length} baris tersisa untuk diperiksa</p>}
              {importRows.length > 0 && <>
                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f3a]/5 text-[#0b1f3a]"><ShieldCheck size={18} /></div><div><h3 className="text-sm font-bold text-[#0b1f3a]">Tentukan cakupan import</h3><p className="text-xs text-slate-500">Saring data dahulu, lalu tinjau hasil sebelum konfirmasi.</p></div></div>
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
                    <select value={importCategory} onChange={(e) => setImportCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Pilih kategori...</option><option>PPRA</option><option>P4N</option><option>PPSA</option><option>P3N</option><option>PPNK</option><option value="PPNK KOLABORASI">PPNK Kolaborasi</option><option>TOT</option></select>
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

            {roleChecked && <section className="rounded-2xl border border-[#dbe1e8] bg-white p-6 shadow-[0_10px_30px_rgba(11,31,58,0.055)] sm:p-7">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7f1df] text-[#8a6b16]"><KeyRound size={20} /></div>
                <div><h2 className="font-bold text-[#0b1f3a]">Aktivasi Akun & Reset Password</h2><p className="text-xs text-slate-500">Atur akun berdasarkan cakupan yang dipilih. CSV password harus disimpan dengan aman.</p></div>
              </div>
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-slate-800">Sinkronisasi database</h3><button type="button" onClick={() => void refreshAccountStats()} disabled={accountStatsLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">{accountStatsLoading ? "Memuat..." : "Perbarui"}</button></div>
                {accountStatsError && <p role="alert" className="mt-2 text-xs text-rose-700">{accountStatsError}</p>}
                {accountStats && <><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Total data alumni</p><p className="mt-1 text-lg font-bold text-slate-900">{Number(accountStats.totalAlumni ?? 0).toLocaleString("id-ID")}</p></div><div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Terverifikasi</p><p className="mt-1 text-lg font-bold text-slate-900">{Number(accountStats.verifiedAlumni ?? 0).toLocaleString("id-ID")}</p></div><div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Menunggu</p><p className="mt-1 text-lg font-bold text-amber-700">{Number(accountStats.pendingAlumni ?? 0).toLocaleString("id-ID")}</p></div><div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Ditolak</p><p className="mt-1 text-lg font-bold text-rose-700">{Number(accountStats.rejectedAlumni ?? 0).toLocaleString("id-ID")}</p></div><div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Total akun</p><p className="mt-1 text-lg font-bold text-slate-900">{Number(accountStats.totalAccounts ?? 0).toLocaleString("id-ID")}</p></div><div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Akun aktif</p><p className="mt-1 text-lg font-bold text-slate-900">{Number(accountStats.activeAccounts ?? 0).toLocaleString("id-ID")}</p></div><div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Terverifikasi tanpa akun</p><p className="mt-1 text-lg font-bold text-amber-700">{Number(accountStats.verifiedWithoutAccount ?? 0).toLocaleString("id-ID")}</p></div><div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Terverifikasi punya akun</p><p className="mt-1 text-lg font-bold text-slate-900">{Number(accountStats.verifiedWithAccount ?? 0).toLocaleString("id-ID")}</p></div><div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Akun tanpa hash password</p><p className="mt-1 text-lg font-bold text-rose-700">{Number(accountStats.accountsWithoutPasswordHash ?? 0).toLocaleString("id-ID")}</p></div></div><p className="mt-3 text-xs leading-5 text-slate-600">Aktivasi dan reset mengikuti data database secara langsung. Hanya alumni berstatus Terverifikasi yang bisa login; data Menunggu/Ditolak tetap dihitung pada total data, tetapi tidak masuk batch password.</p></>}
              </div>
              <label className="block text-xs font-semibold text-slate-700">Cakupan akun
                <select value={accountScope} onChange={(e) => { setAccountScope(e.target.value); setAccountAlumniId(""); setAccountError(""); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal sm:max-w-md">
                  <option value="single">Satu alumni</option><option value="cohort">Angkatan tertentu</option><option value="category">Kategori program</option><option value="year">Tahun angkatan</option><option value="all">Semua alumni yang memenuhi syarat</option>
                </select>
              </label>
              {accountScope === "single" && <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Cari alumni berdasarkan nama atau nomor alumni
                  <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                    <input value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void searchAccountAlumni(); } }} placeholder="Masukkan nama / nomor alumni" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
                    <button type="button" onClick={() => void searchAccountAlumni()} disabled={accountSearching} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0b1f3a] disabled:opacity-50">{accountSearching ? "Mencari..." : "Cari alumni"}</button>
                  </div>
                </label>
                {accountSearchError && <p role="status" className="text-sm text-rose-600">{accountSearchError}</p>}
                {accountResults.length > 0 && <label className="block text-xs font-semibold text-slate-700">Pilih satu alumni
                  <select value={accountAlumniId} onChange={(e) => setAccountAlumniId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                    <option value="">Pilih hasil pencarian...</option>
                    {accountResults.map((item) => <option key={item.id} value={String(item.id)}>{item.nama}{item.nomorAlumni ? " · " + item.nomorAlumni : ""}{item.kategoriProgram ? " · " + item.kategoriProgram : ""}{item.nomorAngkatan ? " Angkatan " + item.nomorAngkatan : ""}</option>)}
                  </select>
                </label>}
              </div>}
              {(accountScope === "cohort" || accountScope === "category") && <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Kategori program
                  <select value={accountCategory} onChange={(e) => setAccountCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                    <option value="">Pilih kategori...</option><option>KRA</option><option>PPRA</option><option>P4N</option><option>KSA</option><option>PPSA</option><option>P3N</option><option>TAPLAI</option><option>PPNK</option><option value="PPNK KOLABORASI">PPNK Kolaborasi</option><option>TOT</option>
                  </select>
                </label>
                {accountScope === "cohort" && <label className="text-xs font-semibold text-slate-700">Nomor angkatan
                  <input value={accountCohort} onChange={(e) => setAccountCohort(e.target.value)} placeholder="Mis. 1" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
                </label>}
              </div>}
              {accountScope === "year" && <label className="mt-4 block text-xs font-semibold text-slate-700">Tahun angkatan
                <input inputMode="numeric" maxLength={4} value={accountYear} onChange={(e) => setAccountYear(e.target.value.replace(/\D/g, "").slice(0,4))} placeholder="Mis. 2024" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal sm:max-w-xs" />
              </label>}
              <div className="mb-4 rounded-xl border border-[#c9a227]/30 bg-[#f7f1df] p-4">
                <h3 className="text-sm font-bold text-[#0b1f3a]">Ekspor daftar akun user (aman, tanpa reset)</h3>
                <p className="mt-1 text-xs leading-5 text-slate-700">Mengunduh daftar akun yang sudah ada, termasuk akun aktif dan nonaktif. Password dibiarkan kosong dan tidak ada data akun yang diubah.</p>
                <button type="button" disabled={accountListLoading} onClick={() => void handleExportAccountList()} className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#c9a227]/40 bg-white px-4 py-2.5 text-sm font-semibold text-[#0b1f3a] hover:bg-[#efe5c5] disabled:opacity-50"><Download size={16}/>{accountListLoading ? "Menyiapkan CSV..." : "Ekspor semua akun user"}</button>
                {accountListStatus && <p role="status" className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700">{accountListStatus}</p>}
                {accountListDownload && <a href={accountListDownload.url} download={accountListDownload.filename} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#123b68]"><Download size={16}/>Unduh daftar akun user CSV</a>}
                {accountListError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{accountListError}</p>}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">Aktivasi membuat akun yang belum ada. Reset mengganti password akun aktif. Keduanya hanya memproses alumni terverifikasi sesuai cakupan.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" disabled={accountLoading} onClick={() => void handleDownloadStoredCredentials()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"><Download size={16}/>Unduh kredensial tersimpan</button>
                <button type="button" disabled={accountLoading} onClick={() => void handleBulkActivateAccounts()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a365d] disabled:opacity-50"><UserRoundPlus size={16}/>{accountLoading ? "Memproses..." : "Aktivasi akun & unduh password"}</button>
                {isSuperAdmin && <button type="button" disabled={accountLoading} onClick={() => void handleResetPasswords()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><KeyRound size={16}/>{accountLoading ? "Memproses..." : "Reset password & unduh CSV"}</button>}
              </div>
              {accountStatus && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{accountStatus}</p>}
              {credentialDownload && <a href={credentialDownload.url} download={credentialDownload.filename} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"><Download size={16} />Unduh CSV kredensial</a>}
              {accountError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{accountError}</p>}
            </section>}

            <section id="template" className="scroll-mt-6 rounded-2xl border border-[#dbe1e8] bg-white p-6 shadow-[0_10px_30px_rgba(11,31,58,0.055)] sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-[#0b1f3a]">Template Data Alumni</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Unduh template ini dan bagikan kepada alumni. Mereka cukup mengisi data pribadi, lalu file dapat langsung diunggah melalui menu Import CSV.</p>
                </div>
                <button type="button" onClick={handleTemplateDownload} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a365d]">
                  <Download size={16} /> Unduh Template CSV
                </button>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                <p className="font-semibold text-slate-800">Petunjuk pengisian</p>
                <p>Kolom wajib: nama, kategori program, nomor angkatan, tahun angkatan, dan status. Status harus Menunggu. Instansi, jabatan, wilayah, alamat, dan nomor HP opsional dan dapat dilengkapi kemudian melalui menu Profil.</p>
                <p className="mt-2">Jangan mengubah nama header. Nomor Alumni, sumber data, dan sumber file ditentukan otomatis oleh sistem. Isi status dengan Menunggu.</p>
                <p className="mt-2">Kategori program yang berlaku: KRA, PPRA, P4N, KSA, PPSA, P3N, TAPLAI, PPNK, PPNK KOLABORASI, atau TOT.</p>
              </div>
            </section>


          </div>
        </main>
      </div>
    </div>
  );
}
