"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Search,
  UserCheck,
  UserX,
  Download,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

interface VerificationAlumni {
  id: number;
  nomorAlumni: string;
  nama: string;
  angkatan: string;
  kategoriProgram?: string;
  nomorAngkatan?: string;
  tahunAngkatan?: string | number | null;
  instansi: string;
  jabatan: string;
  wilayah: string;
  alamat: string;
  email: string;
  nomorHp: string;
  tanggalPengajuan: string;
  status: "Menunggu" | "Terverifikasi" | "Ditolak";
}

const ITEMS_PER_PAGE = 6;

export default function VerifikasiAlumniPage() {
  const [verificationData, setVerificationData] = useState<VerificationAlumni[]>([]);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [angkatan, setAngkatan] = useState("Semua Angkatan");
  const [wilayah, setWilayah] = useState("Semua Wilayah");
  const [page, setPage] = useState(1);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [credentialDownload, setCredentialDownload] = useState<{ url: string; filename: string } | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [selectedAlumni, setSelectedAlumni] =
    useState<VerificationAlumni | null>(null);

  const [rejectAlumni, setRejectAlumni] = useState<VerificationAlumni | null>(
    null
  );

  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!credentialDownload) return;
    return () => URL.revokeObjectURL(credentialDownload.url);
  }, [credentialDownload]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (active && response.ok) setIsSuperAdmin(result.user?.role === "super_admin");
      })
      .catch(() => undefined);
    fetch("/api/alumni?status=Menunggu&limit=500", { cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal memuat pengajuan."); if (active) setVerificationData((result.data ?? []).map((item: VerificationAlumni & { createdAt?: string }) => ({ ...item, tanggalPengajuan: item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "-" }))); })
      .catch((error) => { if (active) setLoadError(error.message || "Gagal memuat pengajuan."); });
    return () => { active = false; };
  }, []);

  const filteredAlumni = useMemo(() => {
    return verificationData.filter((alumni) => {
      const keyword = search.toLowerCase().trim();

      const matchesSearch =
        alumni.nama.toLowerCase().includes(keyword) ||
        alumni.nomorAlumni.toLowerCase().includes(keyword) ||
        alumni.email.toLowerCase().includes(keyword) ||
        alumni.instansi.toLowerCase().includes(keyword);

      const matchesAngkatan =
        angkatan === "Semua Angkatan" || (alumni.kategoriProgram || alumni.angkatan) === angkatan;

      const matchesWilayah =
        wilayah === "Semua Wilayah" || alumni.wilayah === wilayah;

      return matchesSearch && matchesAngkatan && matchesWilayah;
    });
  }, [search, angkatan, wilayah]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAlumni.length / ITEMS_PER_PAGE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedAlumni = filteredAlumni.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetFilter = () => {
    setSearch("");
    setAngkatan("Semua Angkatan");
    setWilayah("Semua Wilayah");
    setPage(1);
  };



  const handleBulkVerify = async () => {
    if (!window.confirm("Verifikasi massal akan memproses SEMUA data hasil impor berstatus Menunggu dalam kelompok 100 data per permintaan. Proses bisa berlangsung beberapa menit. Lanjutkan?")) return;
    setBulkLoading(true);
    let totalUpdated = 0;
    try {
      let remaining = 1;
      let batches = 0;
      while (remaining > 0) {
        if (++batches > 200) throw new Error("Batas aman proses tercapai. Muat ulang halaman lalu jalankan kembali untuk melanjutkan data yang masih Menunggu.");
        const response = await fetch("/api/alumni/bulk-verify", { method: "POST", cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Verifikasi massal gagal.");
        const updated = Number(result.updated ?? 0);
        totalUpdated += updated;
        remaining = Number(result.remaining ?? 0);
        if (updated === 0 && remaining > 0) throw new Error("Tidak ada data yang diproses, tetapi masih ada data Menunggu. Hentikan proses dan periksa log server.");
        if (remaining > 0) {
          // Yield to the browser between database batches.
          await new Promise((resolve) => window.setTimeout(resolve, 100));
        }
      }
      window.alert("Verifikasi massal selesai. Total data yang diverifikasi pada proses ini: " + totalUpdated);
      window.location.reload();
    } catch (error) {
      window.alert((error instanceof Error ? error.message : "Verifikasi massal gagal.") + "\\n\\nData yang sudah berhasil diproses dalam kelompok sebelumnya tetap tersimpan. Jalankan kembali untuk melanjutkan data yang masih Menunggu.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkActivateAccounts = async () => {
    if (!window.confirm("Aktivasi massal membuat akun untuk alumni terverifikasi yang belum memiliki akun. File CSV password akan tersedia untuk diunduh setelah proses selesai. Lanjutkan?")) return;
    setAccountLoading(true);
    const allCredentials: Array<{ nama: string; angkatan: string; nomorAlumni: string; email: string; password: string }> = [];
    try {
      let finished = false, batches = 0;
      while (!finished) {
        if (++batches > 500) throw new Error("Batas aman 50.000 akun tercapai. Jalankan kembali untuk melanjutkan.");
        const response = await fetch("/api/admin/alumni-accounts/bulk-activate", { method: "POST", cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Aktivasi akun massal gagal.");
        const credentials = Array.isArray(result.credentials) ? result.credentials : [];
        allCredentials.push(...credentials);
        finished = credentials.length < 100;
      }
      if (!allCredentials.length) { window.alert("Tidak ada alumni terverifikasi tanpa akun."); return; }
      const esc = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
      const csv = [["Nama", "Angkatan", "ID Alumni", "Email", "Password"], ...allCredentials.map(item => [item.nama, item.angkatan, item.nomorAlumni, item.email, item.password])].map(row => row.map(esc).join(",")).join("\r\n");
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      setCredentialDownload({ url, filename: "kredensial-alumni-" + new Date().toISOString().slice(0, 10) + ".csv" });
      window.alert("Selesai. " + allCredentials.length + " akun dibuat. CSV siap diunduh lewat tombol Unduh CSV pada halaman ini. Simpan file dengan aman.");
    } catch (error) { window.alert(error instanceof Error ? error.message : "Aktivasi akun massal gagal."); }
    finally { setAccountLoading(false); }
  };

  const handleVerify = async (alumni: VerificationAlumni) => {
    try {
      const response = await fetch(`/api/alumni/${alumni.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Terverifikasi" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Verifikasi gagal.");
      setVerificationData((items) => items.filter((item) => item.id !== alumni.id));
    } catch (error) { alert(error instanceof Error ? error.message : "Verifikasi gagal."); }
  };

  const handleReject = async () => {
    if (!rejectAlumni) return;
    if (!rejectionReason.trim()) { alert("Silakan masukkan alasan penolakan."); return; }
    try {
      const response = await fetch(`/api/alumni/${rejectAlumni.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Ditolak", alasanPenolakan: rejectionReason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Penolakan gagal.");
      setVerificationData((items) => items.filter((item) => item.id !== rejectAlumni.id));
      setRejectAlumni(null);
      setRejectionReason("");
    } catch (error) { alert(error instanceof Error ? error.message : "Penolakan gagal."); }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <AdminSidebar />

      <div className="lg:pl-72">
        <AdminHeader />

        <main className="p-4 sm:p-6 lg:p-8">
          {loadError && <div role="alert" className="mx-auto mb-4 max-w-7xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>}
          <div className="mx-auto max-w-7xl">
            {/* PAGE HEADER */}
            <div className="mb-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">
                    Verifikasi Alumni
                  </p>

                  <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">
                    Verifikasi Data Alumni
                  </h1>

                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#64748b]">
                    Periksa dan validasi data alumni yang mengajukan pendaftaran
                    sebelum ditampilkan sebagai alumni terverifikasi.
                  </p>
                </div>




                {isSuperAdmin && <button type="button" onClick={handleBulkVerify} disabled={bulkLoading || accountLoading} className="inline-flex items-center justify-center rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#16345c] disabled:cursor-not-allowed disabled:opacity-60">{bulkLoading ? "Memverifikasi..." : "Verifikasi Massal Data Impor"}</button>}
                {isSuperAdmin && <button type="button" onClick={handleBulkActivateAccounts} disabled={accountLoading || bulkLoading} className="inline-flex items-center justify-center rounded-xl border border-[#0b1f3a] bg-white px-4 py-3 text-sm font-semibold text-[#0b1f3a] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">{accountLoading ? "Membuat akun..." : "Aktivasi Massal Alumni & Unduh Password"}</button>}
                {credentialDownload && <a href={credentialDownload.url} download={credentialDownload.filename} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"><Download size={16} />Unduh CSV Kredensial</a>}

                {/* Pending Indicator */}
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                    <UserCheck size={18} className="text-amber-600" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-amber-700">
                      Menunggu Verifikasi
                    </p>

                    <p className="text-lg font-bold text-amber-800">
                      {verificationData.length} Alumni
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FILTER */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f3a]/5">
                    <Filter size={17} className="text-[#0b1f3a]" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-[#172033]">
                      Filter Pengajuan
                    </h2>

                    <p className="hidden text-xs text-[#94a3b8] sm:block">
                      Cari data alumni yang perlu diverifikasi
                    </p>
                  </div>
                </div>

                {(search ||
                  angkatan !== "Semua Angkatan" ||
                  wilayah !== "Semua Wilayah") && (
                  <button
                    type="button"
                    onClick={resetFilter}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#9e1b32] hover:underline"
                  >
                    <X size={14} />
                    Reset
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {/* SEARCH */}
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari nama, nomor, email..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#fafbfc] pl-10 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1f3a] focus:bg-white focus:ring-4 focus:ring-[#0b1f3a]/5"
                  />
                </div>

                <FilterSelect
                  value={angkatan}
                  onChange={(value) => {
                    setAngkatan(value);
                    setPage(1);
                  }}
                  options={[
                    "Semua Angkatan",
                    "PRA",
                    "PPRA",
                    "P4N",
                    "PSA",
                    "PPSA",
                    "P3N",
                    "TAPLAI",
                    "PPNK",
                    "PPNK KOLABORASI",
                    "TOT",
                  ]}
                />

                <FilterSelect
                  value={wilayah}
                  onChange={(value) => {
                    setWilayah(value);
                    setPage(1);
                  }}
                  options={[
                    "Semua Wilayah",
                    "DKI Jakarta",
                    "Jawa Barat",
                    "Jawa Tengah",
                    "Jawa Timur",
                    "Banten",
                  ]}
                />
              </div>
            </div>

            {/* DATA */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="font-bold text-[#172033]">
                    Pengajuan Verifikasi
                  </h2>

                  <p className="mt-1 text-xs text-[#94a3b8]">
                    Menampilkan{" "}
                    <span className="font-semibold text-[#475569]">
                      {filteredAlumni.length}
                    </span>{" "}
                    pengajuan
                  </p>
                </div>

                <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  Perlu Tindakan Admin
                </div>
              </div>

              {paginatedAlumni.length > 0 ? (
                <>
                  {/* DESKTOP */}
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60">
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                            Alumni
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                            Kategori / Angkatan
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                            Instansi
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                            Wilayah
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                            Pengajuan
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                            Aksi
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedAlumni.map((alumni) => (
                          <VerificationRow
                            key={alumni.id}
                            alumni={alumni}
                            onDetail={() => setSelectedAlumni(alumni)}
                            onVerify={() => handleVerify(alumni)}
                            onReject={() => setRejectAlumni(alumni)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE */}
                  <div className="divide-y divide-slate-100 lg:hidden">
                    {paginatedAlumni.map((alumni) => (
                      <VerificationMobileCard
                        key={alumni.id}
                        alumni={alumni}
                        onDetail={() => setSelectedAlumni(alumni)}
                        onVerify={() => handleVerify(alumni)}
                        onReject={() => setRejectAlumni(alumni)}
                      />
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalData={filteredAlumni.length}
                    onPrevious={() => setPage((prev) => Math.max(1, prev - 1))}
                    onNext={() =>
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
                  />
                </>
              ) : (
                <EmptyState onReset={resetFilter} />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* DETAIL MODAL */}
      {selectedAlumni && (
        <VerificationDetailModal
          alumni={selectedAlumni}
          onClose={() => setSelectedAlumni(null)}
          onVerify={() => {
            handleVerify(selectedAlumni);
            setSelectedAlumni(null);
          }}
          onReject={() => {
            setSelectedAlumni(null);
            setRejectAlumni(selectedAlumni);
          }}
        />
      )}

      {/* REJECT MODAL */}
      {rejectAlumni && (
        <RejectModal
          alumni={rejectAlumni}
          reason={rejectionReason}
          onReasonChange={setRejectionReason}
          onClose={() => {
            setRejectAlumni(null);
            setRejectionReason("");
          }}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}

/* =========================================
   FILTER SELECT
========================================= */

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-[#fafbfc] px-4 pr-10 text-sm text-[#475569] outline-none transition focus:border-[#0b1f3a] focus:bg-white focus:ring-4 focus:ring-[#0b1f3a]/5"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
      />
    </div>
  );
}

/* =========================================
   DESKTOP ROW
========================================= */

function VerificationRow({
  alumni,
  onDetail,
  onVerify,
  onReject,
}: {
  alumni: VerificationAlumni;
  onDetail: () => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={alumni.nama} />

          <div>
            <p className="text-sm font-semibold text-[#172033]">
              {alumni.nama}
            </p>

            <p className="mt-0.5 text-xs text-[#94a3b8]">
              {alumni.nomorAlumni}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-4 text-sm font-medium text-[#475569]">
        {[alumni.kategoriProgram || alumni.angkatan, alumni.nomorAngkatan ? `Angkatan ${alumni.nomorAngkatan}` : null, alumni.tahunAngkatan].filter(Boolean).join(" · ")}
      </td>

      <td className="max-w-[230px] px-4 py-4">
        <p className="line-clamp-1 text-sm text-[#475569]">{alumni.instansi}</p>

        <p className="mt-0.5 text-xs text-[#94a3b8]">{alumni.jabatan}</p>
      </td>

      <td className="px-4 py-4 text-sm text-[#475569]">{alumni.wilayah}</td>

      <td className="px-4 py-4">
        <p className="text-xs font-medium text-[#475569]">
          {alumni.tanggalPengajuan}
        </p>

        <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-600">
          Menunggu
        </span>
      </td>

      <td className="px-4 py-4">
        <div className="flex justify-end gap-1">
          <ActionButton label="Detail" onClick={onDetail}>
            <Eye size={16} />
          </ActionButton>

          <ActionButton label="Verifikasi" success onClick={onVerify}>
            <Check size={16} />
          </ActionButton>

          <ActionButton label="Tolak" danger onClick={onReject}>
            <UserX size={16} />
          </ActionButton>
        </div>
      </td>
    </tr>
  );
}

/* =========================================
   MOBILE CARD
========================================= */

function VerificationMobileCard({
  alumni,
  onDetail,
  onVerify,
  onReject,
}: {
  alumni: VerificationAlumni;
  onDetail: () => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={alumni.nama} />

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#172033]">
              {alumni.nama}
            </p>

            <p className="mt-0.5 text-xs text-[#94a3b8]">
              {alumni.nomorAlumni}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
          Menunggu
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
        <InfoItem label="Kategori Program" value={alumni.kategoriProgram || alumni.angkatan} />
        <InfoItem label="Nomor Angkatan" value={alumni.nomorAngkatan || "—"} />
        <InfoItem label="Tahun Angkatan" value={String(alumni.tahunAngkatan || "—")} />

        <InfoItem label="Wilayah" value={alumni.wilayah} />

        <div className="col-span-2">
          <InfoItem label="Instansi" value={alumni.instansi} />
        </div>

        <div className="col-span-2">
          <InfoItem label="Tanggal Pengajuan" value={alumni.tanggalPengajuan} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onDetail}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0b1f3a] text-xs font-semibold text-white transition hover:bg-[#123b68]"
        >
          <Eye size={14} />
          Periksa
        </button>

        <button
          type="button"
          onClick={onVerify}
          className="flex h-9 w-10 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
          title="Verifikasi"
        >
          <Check size={15} />
        </button>

        <button
          type="button"
          onClick={onReject}
          className="flex h-9 w-10 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
          title="Tolak"
        >
          <UserX size={15} />
        </button>
      </div>
    </div>
  );
}

/* =========================================
   DETAIL MODAL
========================================= */

function VerificationDetailModal({
  alumni,
  onClose,
  onVerify,
  onReject,
}: {
  alumni: VerificationAlumni;
  onClose: () => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#071526]/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Avatar name={alumni.nama} />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#b28b16]">
                Pemeriksaan Data
              </p>

              <h2 className="mt-0.5 text-lg font-bold text-[#172033]">
                {alumni.nama}
              </h2>

              <p className="text-xs text-[#94a3b8]">{alumni.nomorAlumni}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94a3b8] transition hover:bg-slate-100 hover:text-[#172033]"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5 sm:p-6">
          <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <UserCheck size={18} className="mt-0.5 shrink-0 text-amber-600" />

              <div>
                <p className="text-sm font-bold text-amber-800">
                  Data Menunggu Verifikasi
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Periksa kesesuaian data alumni sebelum melakukan verifikasi.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem label="Nama Lengkap" value={alumni.nama} />

            <DetailItem label="Nomor Alumni" value={alumni.nomorAlumni} />

            <DetailItem label="Kategori Program" value={alumni.kategoriProgram || alumni.angkatan} />
            <DetailItem label="Nomor Angkatan" value={alumni.nomorAngkatan || "—"} />
            <DetailItem label="Tahun Angkatan" value={String(alumni.tahunAngkatan || "—")} />

            <DetailItem label="Status" value={alumni.status} />

            <DetailItem label="Instansi" value={alumni.instansi} />

            <DetailItem label="Jabatan" value={alumni.jabatan} />

            <DetailItem label="Wilayah" value={alumni.wilayah} />

            <DetailItem label="Nomor HP" value={alumni.nomorHp} />

            <div className="sm:col-span-2">
              <DetailItem label="Email" value={alumni.email} />
            </div>

            <div className="sm:col-span-2">
              <DetailItem label="Alamat" value={alumni.alamat} />
            </div>

            <DetailItem
              label="Tanggal Pengajuan"
              value={alumni.tanggalPengajuan}
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex flex-col gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:p-6">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-[#475569] transition hover:bg-slate-50"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={onReject}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            <UserX size={15} />
            Tolak
          </button>

          <button
            type="button"
            onClick={onVerify}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Check size={15} />
            Verifikasi Alumni
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   REJECT MODAL
========================================= */

function RejectModal({
  alumni,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  alumni: VerificationAlumni;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#071526]/60 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
              Penolakan Data
            </p>

            <h2 className="mt-1 text-lg font-bold text-[#172033]">
              Tolak Pengajuan?
            </h2>

            <p className="mt-1 text-xs text-[#94a3b8]">
              {alumni.nama} · {alumni.nomorAlumni}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-xs leading-5 text-red-700">
              Pengajuan yang ditolak sebaiknya memiliki alasan yang jelas agar
              alumni mengetahui data yang perlu diperbaiki.
            </p>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-[#172033]">
              Alasan Penolakan
            </span>

            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              rows={4}
              placeholder="Contoh: Data instansi tidak sesuai dengan dokumen pendukung..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-[#fafbfc] px-4 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1f3a] focus:bg-white focus:ring-4 focus:ring-[#0b1f3a]/5"
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-[#475569] hover:bg-slate-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <UserX size={15} />
            Tolak Pengajuan
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   INFO ITEM
========================================= */

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold text-[#475569]">{value}</p>
    </div>
  );
}

/* =========================================
   DETAIL ITEM
========================================= */

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold leading-5 text-[#475569]">
        {value}
      </p>
    </div>
  );
}

/* =========================================
   AVATAR
========================================= */

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b1f3a]/5 text-xs font-bold text-[#0b1f3a]">
      {initials}
    </div>
  );
}

/* =========================================
   ACTION BUTTON
========================================= */

function ActionButton({
  children,
  label,
  danger = false,
  success = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  danger?: boolean;
  success?: boolean;
  onClick?: () => void;
}) {
  let className = "text-[#94a3b8] hover:bg-slate-100 hover:text-[#0b1f3a]";

  if (danger) {
    className = "text-red-400 hover:bg-red-50 hover:text-red-600";
  }

  if (success) {
    className = "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${className}`}
    >
      {children}
    </button>
  );
}

/* =========================================
   PAGINATION
========================================= */

function Pagination({
  currentPage,
  totalPages,
  totalData,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  totalData: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-xs text-[#94a3b8]">
        Halaman{" "}
        <span className="font-semibold text-[#475569]">{currentPage}</span> dari{" "}
        <span className="font-semibold text-[#475569]">{totalPages}</span> ·{" "}
        {totalData} data
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={onPrevious}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#0b1f3a] px-3 text-xs font-bold text-white">
          {currentPage}
        </div>

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={onNext}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* =========================================
   EMPTY STATE
========================================= */

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
        <UserCheck size={24} className="text-emerald-500" />
      </div>

      <h3 className="mt-4 font-bold text-[#172033]">Tidak ada pengajuan</h3>

      <p className="mt-1 max-w-sm text-sm leading-6 text-[#94a3b8]">
        Semua data alumni sudah diproses atau tidak ada data yang sesuai dengan
        filter.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 text-sm font-semibold text-[#0b1f3a] hover:underline"
      >
        Reset filter
      </button>
    </div>
  );
}
