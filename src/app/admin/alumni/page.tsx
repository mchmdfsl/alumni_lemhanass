"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Eye,
  Filter,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Search,
  Trash2,
  UserX,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

interface Alumni {
  id: number;
  accountId?: number | null;
  accountActive: boolean;
  nomorAlumni: string;
  nama: string;
  angkatan: string;
  kategoriProgram: string;
  nomorAngkatan: string;
  tahunAngkatan: string;
  instansi: string;
  jabatan: string;
  wilayah: string;
  alamat: string;
  email: string;
  nomorHp: string;
  status: "Terverifikasi" | "Menunggu" | "Ditolak";
  fotoProfil?: string | null;
}

const ITEMS_PER_PAGE = 10;
const STATUS_OPTIONS = ["Semua Status", "Terverifikasi", "Menunggu", "Ditolak"];

export default function AlumniPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Semua Status");
  const [kategori, setKategori] = useState("Semua Kategori Program");
  const [nomorAngkatanFilter, setNomorAngkatanFilter] = useState("Semua Nomor Angkatan");
  const [tahunAngkatanFilter, setTahunAngkatanFilter] = useState("Semua Tahun Angkatan");
  const [wilayah, setWilayah] = useState("Semua Wilayah");
  const [page, setPage] = useState(1);
  const [cohortBackLink, setCohortBackLink] = useState("/admin/angkatan");

  const [selectedAlumni, setSelectedAlumni] = useState<Alumni | null>(null);
  const [editAlumni, setEditAlumni] = useState<Alumni | null>(null);
  const [deleteAlumni, setDeleteAlumni] = useState<Alumni | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [alumniData, setAlumniData] = useState<Alumni[]>([]);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

  // Read URL filters after mount to avoid a useSearchParams prerender/Suspense build error.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const w = params.get("wilayah");
    const a = params.get("angkatan");
    const category = params.get("kategori");
    if (w) setWilayah(w);
    if (category) setKategori(category);
    if (a) setNomorAngkatanFilter(a);
    const back = params.get("back");
    const backCategory = params.get("backKategori");
    if (back === "angkatan") setCohortBackLink(backCategory ? `/admin/angkatan?kategori=${encodeURIComponent(backCategory)}` : "/admin/angkatan");
  }, []);

  const [totalData, setTotalData] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{ kategori: string[]; nomorAngkatan: string[]; tahunAngkatan: string[]; wilayah: string[] }>({ kategori: [], nomorAngkatan: [], tahunAngkatan: [], wilayah: [] });
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setLoadError("");
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (status !== "Semua Status") params.set("status", status);
        if (kategori !== "Semua Kategori Program") params.set("kategoriProgram", kategori);
        if (nomorAngkatanFilter !== "Semua Nomor Angkatan") params.set("nomorAngkatan", nomorAngkatanFilter);
        if (tahunAngkatanFilter !== "Semua Tahun Angkatan") params.set("tahunAngkatan", tahunAngkatanFilter);
        if (wilayah !== "Semua Wilayah") params.set("wilayah", wilayah);
        params.set("limit", String(ITEMS_PER_PAGE));
        params.set("offset", String((page - 1) * ITEMS_PER_PAGE));
        const response = await fetch(`/api/alumni?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat data alumni.");
        setAlumniData(Array.isArray(result.data) ? result.data : []);
        setTotalData(Number(result.total ?? 0));
        if (result.filterOptions) setFilterOptions(result.filterOptions);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setLoadError(error instanceof Error ? error.message : "Gagal memuat data alumni.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, search.trim() ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, status, kategori, nomorAngkatanFilter, tahunAngkatanFilter, wilayah, page, reloadKey]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (active && response.ok) setIsSuperAdmin(result.user?.role === "super_admin");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const handleBulkDelete = async () => {
    if (!isSuperAdmin || bulkDeleting || alumniData.length === 0) return;
    const allowedIds = new Set(alumniData.map((alumni) => String(alumni.id)));
    const input = window.prompt(
      "Masukkan ID alumni yang ingin dihapus, pisahkan dengan koma. ID tersedia: " +
      alumniData.map((alumni) => alumni.id).join(", ")
    );
    if (input === null || !input.trim()) return;
    const ids = Array.from(new Set(input.split(",").map((value) => value.trim()).filter(Boolean)));
    if (!ids.length || ids.some((id) => !/^\\d+$/.test(id) || !allowedIds.has(id))) {
      window.alert("Daftar ID tidak valid. Pilih ID dari data yang sedang dimuat. Tidak ada data dihapus.");
      return;
    }
    const typed = window.prompt(
      `Anda akan menghapus ${ids.length} data alumni beserta akun yang terkait. Tindakan tidak dapat dibatalkan. Ketik HAPUS untuk melanjutkan.`
    );
    if (typed !== "HAPUS") {
      if (typed !== null) window.alert("Konfirmasi tidak cocok. Tidak ada data yang dihapus.");
      return;
    }
    setBulkDeleting(true);
    try {
      const response = await fetch("/api/alumni/bulk-delete", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ids.map(Number), confirmation: "HAPUS" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menghapus data alumni.");
      setPage(1);
      setReloadKey((value) => value + 1);
      window.alert(result.message || "Data alumni berhasil dihapus.");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Gagal menghapus data alumni.");
    } finally {
      setBulkDeleting(false);
    }
  };

  // Filter dropdown options are loaded from distinct values in the database.
  const categoryOrder = ["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "TAPLAI", "PPNK", "PPNK KOLABORASI", "TOT"];
  const kategoriOptions = ["Semua Kategori Program", ...categoryOrder.filter((item) => filterOptions.kategori.includes(item)), ...filterOptions.kategori.filter((item) => !categoryOrder.includes(item)).sort((a, b) => a.localeCompare(b, "id"))];
  const nomorAngkatanOptions = ["Semua Nomor Angkatan", ...filterOptions.nomorAngkatan];
  const tahunAngkatanOptions = ["Semua Tahun Angkatan", ...filterOptions.tahunAngkatan];
  const wilayahOptions = ["Semua Wilayah", ...filterOptions.wilayah];
  const filteredAlumni = alumniData;
  const totalPages = Math.max(1, Math.ceil(totalData / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedAlumni = filteredAlumni;
  const resetFilter = () => { setSearch(""); setStatus("Semua Status"); setKategori("Semua Kategori Program"); setNomorAngkatanFilter("Semua Nomor Angkatan"); setTahunAngkatanFilter("Semua Tahun Angkatan"); setWilayah("Semua Wilayah"); setPage(1); };
  // Edit alumni
  const handleSaveEdit = async (updated: Partial<Alumni>) => {
    if (!editAlumni) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/alumni/${editAlumni.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan data.");
      setReloadKey((value) => value + 1);
      setEditAlumni(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  // Penonaktifan akun dilakukan langsung, dengan alasan dan audit log.
  const handleDeactivateAccount = async (alumni: Alumni) => {
    if (alumni.status !== "Terverifikasi" || deactivatingId !== null) return;
    const reason = window.prompt(`Alasan penonaktifan akun untuk ${alumni.nama}:`);
    if (reason === null || !reason.trim()) return;
    const confirmed = window.confirm(`Nonaktifkan akun ${alumni.nama}? Data alumninya tetap tersimpan.`);
    if (!confirmed) return;
    setDeactivatingId(alumni.id);
    try {
      const response = await fetch("/api/admin/alumni-accounts/deactivate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ alumniId: alumni.id, reason: reason.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menonaktifkan akun.");
      window.alert(result.message || "Akun berhasil dinonaktifkan.");
      setReloadKey((value) => value + 1);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Gagal menonaktifkan akun.");
    } finally {
      setDeactivatingId(null);
    }
  };

  // Delete alumni
  const handleConfirmDelete = async () => {
    if (!deleteAlumni) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/alumni/${deleteAlumni.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus data.");
      setReloadKey((value) => value + 1);
      setDeleteAlumni(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menghapus data.");
    } finally {
      setSaving(false);
    }
  };

  // Add alumni
  const handleSaveAdd = async (payload: Record<string, string>) => {
    setSaving(true);
    try {
      const r = await fetch("/api/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menambah alumni.");
      setReloadKey((value) => value + 1);
      setShowAddModal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menambah alumni.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <AdminSidebar />

      <div className="lg:pl-72">
        <AdminHeader />

        <main className="p-4 sm:p-6 lg:p-8">
          {loadError && (
            <div role="alert" className="mx-auto mb-4 max-w-7xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </div>
          )}
          <div className="mx-auto max-w-7xl">
            <div className="mb-4">
              <a href={cohortBackLink} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0b1f3a] shadow-sm transition hover:bg-slate-50">
                <ChevronLeft size={16} /> Kembali ke Angkatan
              </a>
            </div>
            {/* PAGE HEADER */}
            <div className="mb-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">
                    Manajemen Alumni
                  </p>

                  <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">
                    Data Alumni
                  </h1>

                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#64748b]">
                    Kelola informasi alumni LEMHANNAS RI secara terpusat, mulai
                    dari data pribadi, instansi, kontak, hingga status verifikasi.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting || alumniData.length === 0}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShieldAlert size={17} />
                      {bulkDeleting ? "Menghapus..." : "Hapus Massal"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123b68]"
                  >
                    <Plus size={17} />
                    Tambah Alumni
                  </button>
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
                    <h2 className="text-sm font-bold text-[#172033]">Filter Data</h2>
                    <p className="hidden text-xs text-[#94a3b8] sm:block">Filter langsung dari seluruh data di database</p>
                  </div>
                </div>

                {(search || status !== "Semua Status" || kategori !== "Semua Kategori Program" || nomorAngkatanFilter !== "Semua Nomor Angkatan" || tahunAngkatanFilter !== "Semua Tahun Angkatan" || wilayah !== "Semua Wilayah") && (
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="relative">
                  <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Cari nama, nomor alumni, email, HP, jabatan, instansi, alamat..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#fafbfc] pl-10 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1f3a] focus:bg-white focus:ring-4 focus:ring-[#0b1f3a]/5"
                  />
                </div>

                <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} />
                <FilterSelect value={kategori} onChange={(v) => { setKategori(v); setPage(1); }} options={kategoriOptions} />
                <FilterSelect value={nomorAngkatanFilter} onChange={(v) => { setNomorAngkatanFilter(v); setPage(1); }} options={nomorAngkatanOptions} />
                <FilterSelect value={tahunAngkatanFilter} onChange={(v) => { setTahunAngkatanFilter(v); setPage(1); }} options={tahunAngkatanOptions} />
                <FilterSelect value={wilayah} onChange={(v) => { setWilayah(v); setPage(1); }} options={wilayahOptions} />
              </div>
            </div>

            {/* DATA TABLE */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="font-bold text-[#172033]">Daftar Alumni</h2>
                  <p className="mt-1 text-xs text-[#94a3b8]">
                    Menampilkan{" "}
                    <span className="font-semibold text-[#475569]">{totalData}</span>{" "}
                    data sesuai filter {loading ? "(memuat...)" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                  <Users size={14} />
                  Database Alumni
                </div>
              </div>

              {loading && paginatedAlumni.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-500">Memuat hasil pencarian dari database...</div>
              ) : paginatedAlumni.length > 0 ? (
                <>
                  {/* DESKTOP */}
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60">
                          <TableHeader>Alumni</TableHeader>
                          <TableHeader>Angkatan</TableHeader>
                          <TableHeader>Instansi &amp; Jabatan</TableHeader>
                          <TableHeader>Kontak</TableHeader>
                          <TableHeader>Status</TableHeader>
                          <TableHeader align="right">Aksi</TableHeader>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedAlumni.map((alumni) => (
                          <AlumniTableRow
                            key={alumni.id}
                            alumni={alumni}
                            onDetail={() => setSelectedAlumni(alumni)}
                            onEdit={() => setEditAlumni(alumni)}
                            onDelete={() => setDeleteAlumni(alumni)}
                            onDeactivate={() => handleDeactivateAccount(alumni)}
                            deactivating={deactivatingId === alumni.id}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE */}
                  <div className="divide-y divide-slate-100 lg:hidden">
                    {paginatedAlumni.map((alumni) => (
                      <AlumniMobileCard
                        key={alumni.id}
                        alumni={alumni}
                        onDetail={() => setSelectedAlumni(alumni)}
                        onEdit={() => setEditAlumni(alumni)}
                        onDelete={() => setDeleteAlumni(alumni)}
                        onDeactivate={() => handleDeactivateAccount(alumni)}
                        deactivating={deactivatingId === alumni.id}
                      />
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalData={totalData}
                    onPrevious={() => setPage((prev) => Math.max(1, prev - 1))}
                    onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
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
        <AlumniDetailModal
          alumni={selectedAlumni}
          onClose={() => setSelectedAlumni(null)}
          onEdit={() => { setEditAlumni(selectedAlumni); setSelectedAlumni(null); }}
        />
      )}

      {/* EDIT MODAL */}
      {editAlumni && (
        <AlumniEditModal
          alumni={editAlumni}
          saving={saving}
          onClose={() => setEditAlumni(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* DELETE CONFIRM */}
      {deleteAlumni && (
        <ConfirmDeleteModal
          alumni={deleteAlumni}
          saving={saving}
          onClose={() => setDeleteAlumni(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <AlumniAddModal
          saving={saving}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveAdd}
        />
      )}
    </div>
  );
}

/* =========================================
   TABLE HEADER
========================================= */
function TableHeader({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-4 py-3 text-${align} text-xs font-semibold uppercase tracking-wide text-[#94a3b8] first:pl-6 last:pr-6`}>
      {children}
    </th>
  );
}

/* =========================================
   FILTER SELECT
========================================= */
function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-[#fafbfc] px-4 pr-10 text-sm text-[#475569] outline-none transition focus:border-[#0b1f3a] focus:bg-white focus:ring-4 focus:ring-[#0b1f3a]/5"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
    </div>
  );
}

/* =========================================
   TABLE ROW
========================================= */
function AlumniTableRow({ alumni, onDetail, onEdit, onDelete, onDeactivate, deactivating }: { alumni: Alumni; onDetail: () => void; onEdit: () => void; onDelete: () => void; onDeactivate: () => void; deactivating: boolean }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
      <td className="px-4 py-4 pl-6">
        <div className="flex items-center gap-3">
          <Avatar name={alumni.nama} photo={alumni.fotoProfil} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#172033]">{alumni.nama}</p>
            <p className="mt-0.5 text-xs text-[#94a3b8]">{alumni.nomorAlumni}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="space-y-1"><span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-[#475569]">{alumni.kategoriProgram || alumni.angkatan}</span><p className="text-xs text-slate-500">Angkatan {alumni.nomorAngkatan || "—"} · {alumni.tahunAngkatan || "Tahun —"}</p></div>
      </td>
      <td className="max-w-[250px] px-4 py-4">
        <p className="line-clamp-1 text-sm font-medium text-[#475569]">{alumni.instansi}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-[#94a3b8]">{alumni.jabatan}</p>
      </td>
      <td className="px-4 py-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Phone size={13} className="text-[#94a3b8]" />
            <span className="text-xs font-medium text-[#475569]">{alumni.nomorHp}</span>
          </div>
          <div className="flex max-w-[190px] items-center gap-1.5">
            <Mail size={13} className="shrink-0 text-[#94a3b8]" />
            <span className="truncate text-xs text-[#94a3b8]">{alumni.email}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-4"><StatusBadge status={alumni.status} /></td>
      <td className="px-4 py-4 pr-6">
        <div className="flex justify-end gap-1">
          <ActionButton label="Detail" onClick={onDetail}><Eye size={16} /></ActionButton>
          <ActionButton label="Edit" onClick={onEdit}><Pencil size={16} /></ActionButton>
          {alumni.status === "Terverifikasi" && alumni.accountActive && <ActionButton label={deactivating ? "Menonaktifkan..." : "Nonaktifkan akun"} danger onClick={onDeactivate}><UserX size={16} /></ActionButton>}
          {alumni.status === "Terverifikasi" && !alumni.accountActive && <span className="px-2 text-[10px] font-semibold text-slate-400">Akun nonaktif</span>}
          <ActionButton label="Hapus" danger onClick={onDelete}><Trash2 size={16} /></ActionButton>
        </div>
      </td>
    </tr>
  );
}

/* =========================================
   MOBILE CARD
========================================= */
function AlumniMobileCard({ alumni, onDetail, onEdit, onDelete, onDeactivate, deactivating }: { alumni: Alumni; onDetail: () => void; onEdit: () => void; onDelete: () => void; onDeactivate: () => void; deactivating: boolean }) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={alumni.nama} photo={alumni.fotoProfil} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#172033]">{alumni.nama}</p>
            <p className="mt-0.5 text-xs text-[#94a3b8]">{alumni.nomorAlumni}</p>
          </div>
        </div>
        <StatusBadge status={alumni.status} />
      </div>

      <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
        <MobileInfo icon={<UserRound size={14} />} label="Kategori Program" value={alumni.kategoriProgram || alumni.angkatan} />
        <MobileInfo icon={<UserRound size={14} />} label="Nomor Angkatan" value={alumni.nomorAngkatan || "—"} />
        <MobileInfo icon={<UserRound size={14} />} label="Tahun Angkatan" value={String(alumni.tahunAngkatan || "—")} />
        <MobileInfo icon={<MapPin size={14} />} label="Wilayah" value={alumni.wilayah} />
        <MobileInfo icon={<UserRound size={14} />} label="Instansi" value={`${alumni.instansi} — ${alumni.jabatan}`} />
        <MobileInfo icon={<Phone size={14} />} label="Nomor HP" value={alumni.nomorHp} />
        <MobileInfo icon={<Mail size={14} />} label="Email" value={alumni.email} />
        <MobileInfo icon={<MapPin size={14} />} label="Alamat" value={alumni.alamat} />
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onDetail} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0b1f3a] text-xs font-semibold text-white transition hover:bg-[#123b68]">
          <Eye size={14} /> Detail
        </button>
        <button type="button" onClick={onEdit} className="flex h-9 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748b] transition hover:bg-slate-50">
          <Pencil size={15} />
        </button>
        {alumni.status === "Terverifikasi" && alumni.accountActive && <button type="button" onClick={onDeactivate} disabled={deactivating} title="Nonaktifkan akun" className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"><UserX size={15} />{deactivating ? "Memproses..." : "Nonaktifkan"}</button>}
        {alumni.status === "Terverifikasi" && !alumni.accountActive && <span className="flex h-9 items-center px-2 text-xs text-slate-400">Akun nonaktif</span>}
        <button type="button" onClick={onDelete} className="flex h-9 w-10 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

/* =========================================
   MOBILE INFO
========================================= */
function MobileInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 text-[#94a3b8]">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">{label}</p>
        <p className="mt-0.5 break-words text-xs font-semibold text-[#475569]">{value}</p>
      </div>
    </div>
  );
}

/* =========================================
   STATUS BADGE
========================================= */
function StatusBadge({ status }: { status: Alumni["status"] }) {
  const styles = { Terverifikasi: "bg-emerald-50 text-emerald-600", Menunggu: "bg-amber-50 text-amber-600", Ditolak: "bg-red-50 text-red-600" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}>{status}</span>;
}

/* =========================================
   AVATAR
========================================= */
function Avatar({ name, photo }: { name: string; photo?: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { setImageFailed(false); }, [photo]);
  const initials = name.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-[#0b1f3a]/5 text-xs font-bold text-[#0b1f3a]">
      {photo && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={"Foto profil " + name} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
      ) : (initials || "A")}
    </div>
  );
}

/* =========================================
   ACTION BUTTON
========================================= */
function ActionButton({ children, label, danger = false, onClick }: { children: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} title={label} className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${danger ? "text-red-400 hover:bg-red-50 hover:text-red-600" : "text-[#94a3b8] hover:bg-slate-100 hover:text-[#0b1f3a]"}`}>
      {children}
    </button>
  );
}

/* =========================================
   PAGINATION
========================================= */
function Pagination({ currentPage, totalPages, totalData, onPrevious, onNext }: { currentPage: number; totalPages: number; totalData: number; onPrevious: () => void; onNext: () => void }) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-xs text-[#94a3b8]">
        Halaman <span className="font-semibold text-[#475569]">{currentPage}</span> dari{" "}
        <span className="font-semibold text-[#475569]">{totalPages}</span> · {totalData} data
      </p>
      <div className="flex items-center gap-2">
        <button type="button" disabled={currentPage === 1} onClick={onPrevious} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft size={16} />
        </button>
        <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#0b1f3a] px-3 text-xs font-bold text-white">{currentPage}</div>
        <button type="button" disabled={currentPage === totalPages} onClick={onNext} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
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
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Users size={24} className="text-[#94a3b8]" />
      </div>
      <h3 className="mt-4 font-bold text-[#172033]">Data tidak ditemukan</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[#94a3b8]">
        Tidak ada alumni yang sesuai dengan pencarian atau filter yang dipilih.
      </p>
      <button type="button" onClick={onReset} className="mt-4 text-sm font-semibold text-[#0b1f3a] hover:underline">
        Reset filter
      </button>
    </div>
  );
}

/* =========================================
   DETAIL MODAL
========================================= */
function AlumniDetailModal({ alumni, onClose, onEdit }: { alumni: Alumni; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071526]/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Avatar name={alumni.nama} photo={alumni.fotoProfil} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#b28b16]">Detail Alumni</p>
              <h2 className="mt-0.5 text-lg font-bold text-[#172033]">{alumni.nama}</h2>
              <p className="text-xs text-[#94a3b8]">{alumni.nomorAlumni}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94a3b8] transition hover:bg-slate-100 hover:text-[#172033]">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-[#94a3b8]">Instansi / Jabatan</p>
              <p className="mt-1 text-sm font-semibold text-[#475569]">{alumni.instansi}</p>
              <p className="mt-0.5 text-xs text-[#94a3b8]">{alumni.jabatan}</p>
            </div>
            <StatusBadge status={alumni.status} />
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <h3 className="mb-3 text-sm font-bold text-[#172033]">Informasi Alumni</h3>
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
            <div className="sm:col-span-2"><DetailItem label="Email" value={alumni.email} /></div>
            <div className="sm:col-span-2"><DetailItem label="Alamat Lengkap" value={alumni.alamat} /></div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:p-6">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-[#475569] transition hover:bg-slate-50">Tutup</button>
          <button type="button" onClick={onEdit} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-5 text-sm font-semibold text-white transition hover:bg-[#123b68]">
            <Pencil size={15} /> Edit Data
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   EDIT MODAL
========================================= */
function AlumniEditModal({ alumni, saving, onClose, onSave }: { alumni: Alumni; saving: boolean; onClose: () => void; onSave: (data: Partial<Alumni>) => void }) {
  const [form, setForm] = useState({ ...alumni });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071526]/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
          <h2 className="font-bold text-[#172033]">Edit Data Alumni</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94a3b8] transition hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditField label="Nama Lengkap *" value={form.nama} onChange={set("nama")} />

            <CategorySelect label="Kategori Program *" value={form.kategoriProgram || form.angkatan} onChange={set("kategoriProgram")} />
            <EditField label="Nomor Angkatan *" value={form.nomorAngkatan} onChange={set("nomorAngkatan")} required />
            <EditField label="Tahun Angkatan *" type="number" value={String(form.tahunAngkatan || "")} onChange={set("tahunAngkatan")} required />
            <EditField label="Nomor HP" value={form.nomorHp} onChange={set("nomorHp")} />
            <EditField label="Nomor Alumni" value={form.nomorAlumni} onChange={set("nomorAlumni")} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Status</label>
              <select value={form.status} onChange={set("status")} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#0b1f3a] focus:ring-4 focus:ring-[#0b1f3a]/10">
                {["Menunggu", "Terverifikasi", "Ditolak"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <EditField label="Instansi" value={form.instansi} onChange={set("instansi")} />
            <EditField label="Jabatan" value={form.jabatan} onChange={set("jabatan")} />
            <EditField label="Wilayah" value={form.wilayah} onChange={set("wilayah")} />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Alamat</label>
              <textarea value={form.alamat} onChange={set("alamat")} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0b1f3a] focus:ring-4 focus:ring-[#0b1f3a]/10" />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:p-6">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-[#475569] transition hover:bg-slate-50">Batal</button>
          <button type="button" disabled={saving} onClick={() => onSave(form)} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-5 text-sm font-semibold text-white transition hover:bg-[#123b68] disabled:opacity-60">
            <Save size={15} /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   ADD MODAL
========================================= */
function AlumniAddModal({ saving, onClose, onSave }: { saving: boolean; onClose: () => void; onSave: (d: Record<string, string>) => void }) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    onSave(Object.fromEntries(fd.entries()) as Record<string, string>);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071526]/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
          <h2 className="font-bold text-[#172033]">Tambah Alumni Baru</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94a3b8] transition hover:bg-slate-100"><X size={18} /></button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <EditField label="Nama Lengkap *" name="nama" required />

            <CategorySelect label="Kategori Program *" name="kategoriProgram" required />
            <EditField label="Nomor Angkatan *" name="nomorAngkatan" required />
            <EditField label="Tahun Angkatan *" name="tahunAngkatan" type="number" required />
            <EditField label="Nomor HP" name="nomorHp" />
            <EditField label="Nomor Alumni" name="nomorAlumni" />
            <EditField label="Instansi" name="instansi" />
            <EditField label="Jabatan" name="jabatan" />
            <EditField label="Wilayah" name="wilayah" />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Alamat</label>
              <textarea name="alamat" rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0b1f3a] focus:ring-4 focus:ring-[#0b1f3a]/10" />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:p-6">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-[#475569] transition hover:bg-slate-50">Batal</button>
            <button type="submit" disabled={saving} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-5 text-sm font-semibold text-white transition hover:bg-[#123b68] disabled:opacity-60">
              <Plus size={15} /> {saving ? "Menyimpan..." : "Tambah Alumni"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategorySelect({ label, value, onChange, name, required = false }: { label: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; name?: string; required?: boolean }) {
  const categories = ["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "TAPLAI", "PPNK", "PPNK KOLABORASI", "TOT"];
  const options = value && !categories.includes(value) ? [value, ...categories] : categories;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <select name={name} value={value} onChange={onChange} required={required} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#0b1f3a] focus:ring-4 focus:ring-[#0b1f3a]/10">
        {!required && <option value="">Pilih kategori</option>}
        {required && !value && <option value="">Pilih kategori program</option>}
        {options.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
    </div>
  );
}

/* =========================================
   CONFIRM DELETE MODAL
========================================= */
function ConfirmDeleteModal({ alumni, saving, onClose, onConfirm }: { alumni: Alumni; saving: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071526]/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
            <Trash2 size={22} className="text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-[#172033]">Hapus Data Alumni</h2>
          <p className="mt-2 text-sm text-[#64748b]">
            Apakah Anda yakin ingin menghapus data alumni{" "}
            <span className="font-semibold text-[#172033]">{alumni.nama}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-[#475569] transition hover:bg-slate-50">Batal</button>
          <button type="button" disabled={saving} onClick={onConfirm} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
            <Trash2 size={15} /> {saving ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   EDIT FIELD (uncontrolled or controlled)
========================================= */
function EditField({ label, name, value, onChange, required, type = "text" }: {
  label: string; name?: string; value?: string; onChange?: React.ChangeEventHandler<HTMLInputElement>;
  required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        defaultValue={value === undefined ? undefined : undefined}
        onChange={onChange}
        required={required}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-[#0b1f3a] focus:ring-4 focus:ring-[#0b1f3a]/10"
      />
    </div>
  );
}

/* =========================================
   DETAIL ITEM
========================================= */
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#475569]">{value}</p>
    </div>
  );
}
