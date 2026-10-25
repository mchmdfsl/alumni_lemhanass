"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
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
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

interface Alumni {
  id: number;
  nomorAlumni: string;
  nama: string;
  angkatan: string;
  instansi: string;
  jabatan: string;
  wilayah: string;
  alamat: string;
  email: string;
  nomorHp: string;
  status: "Terverifikasi" | "Menunggu" | "Ditolak";
}

const ITEMS_PER_PAGE = 10;
const STATUS_OPTIONS = ["Semua Status", "Terverifikasi", "Menunggu", "Ditolak"];

export default function AlumniPage() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Semua Status");
  const [angkatan, setAngkatan] = useState("Semua Angkatan");
  const [wilayah, setWilayah] = useState("Semua Wilayah");
  const [page, setPage] = useState(1);

  const [selectedAlumni, setSelectedAlumni] = useState<Alumni | null>(null);
  const [editAlumni, setEditAlumni] = useState<Alumni | null>(null);
  const [deleteAlumni, setDeleteAlumni] = useState<Alumni | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [alumniData, setAlumniData] = useState<Alumni[]>([]);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  // Init filters from URL params (e.g. from Wilayah/Angkatan pages)
  useEffect(() => {
    const w = searchParams.get("wilayah");
    const a = searchParams.get("angkatan");
    if (w) setWilayah(w);
    if (a) setAngkatan(a);
  }, [searchParams]);

  const loadAlumni = () => {
    let active = true;
    setLoadError("");
    fetch("/api/alumni?limit=500", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Gagal memuat data alumni.");
        if (active) setAlumniData(d.data ?? []);
      })
      .catch((e) => { if (active) setLoadError(e.message || "Gagal memuat data alumni."); });
    return () => { active = false; };
  };

  useEffect(loadAlumni, []);

  // Unique filter options derived from data
  const angkatanOptions = useMemo(() => {
    const opts = Array.from(new Set(alumniData.map((a) => a.angkatan).filter(Boolean))).sort();
    return ["Semua Angkatan", ...opts];
  }, [alumniData]);

  const wilayahOptions = useMemo(() => {
    const opts = Array.from(new Set(alumniData.map((a) => a.wilayah).filter(Boolean))).sort();
    return ["Semua Wilayah", ...opts];
  }, [alumniData]);

  const filteredAlumni = useMemo(() => {
    return alumniData.filter((a) => {
      const kw = search.toLowerCase().trim();
      const matchesSearch =
        a.nama.toLowerCase().includes(kw) ||
        a.nomorAlumni.toLowerCase().includes(kw) ||
        a.email.toLowerCase().includes(kw) ||
        a.instansi.toLowerCase().includes(kw) ||
        a.nomorHp.toLowerCase().includes(kw) ||
        a.alamat.toLowerCase().includes(kw);
      const matchesStatus = status === "Semua Status" || a.status === status;
      const matchesAngkatan = angkatan === "Semua Angkatan" || a.angkatan === angkatan;
      const matchesWilayah = wilayah === "Semua Wilayah" || a.wilayah === wilayah;
      return matchesSearch && matchesStatus && matchesAngkatan && matchesWilayah;
    });
  }, [search, status, angkatan, wilayah, alumniData]);

  const totalPages = Math.max(1, Math.ceil(filteredAlumni.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedAlumni = filteredAlumni.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const resetFilter = () => { setSearch(""); setStatus("Semua Status"); setAngkatan("Semua Angkatan"); setWilayah("Semua Wilayah"); setPage(1); };

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
      setAlumniData((prev) => prev.map((a) => (a.id === editAlumni.id ? { ...a, ...d.data } : a)));
      setEditAlumni(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menyimpan data.");
    } finally {
      setSaving(false);
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
      setAlumniData((prev) => prev.filter((a) => a.id !== deleteAlumni.id));
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
      loadAlumni();
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
                  <a
                    href="/api/alumni/export"
                    download
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#475569] shadow-sm transition hover:bg-slate-50"
                  >
                    <Download size={17} />
                    Export CSV
                  </a>

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
                    <p className="hidden text-xs text-[#94a3b8] sm:block">Cari berdasarkan informasi alumni</p>
                  </div>
                </div>

                {(search || status !== "Semua Status" || angkatan !== "Semua Angkatan" || wilayah !== "Semua Wilayah") && (
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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative">
                  <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Cari nama, nomor, email, HP..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#fafbfc] pl-10 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1f3a] focus:bg-white focus:ring-4 focus:ring-[#0b1f3a]/5"
                  />
                </div>

                <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} />
                <FilterSelect value={angkatan} onChange={(v) => { setAngkatan(v); setPage(1); }} options={angkatanOptions} />
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
                    <span className="font-semibold text-[#475569]">{filteredAlumni.length}</span>{" "}
                    data alumni
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                  <Users size={14} />
                  Database Alumni
                </div>
              </div>

              {paginatedAlumni.length > 0 ? (
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
                      />
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalData={filteredAlumni.length}
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
function AlumniTableRow({ alumni, onDetail, onEdit, onDelete }: { alumni: Alumni; onDetail: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
      <td className="px-4 py-4 pl-6">
        <div className="flex items-center gap-3">
          <Avatar name={alumni.nama} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#172033]">{alumni.nama}</p>
            <p className="mt-0.5 text-xs text-[#94a3b8]">{alumni.nomorAlumni}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-[#475569]">{alumni.angkatan}</span>
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
          <ActionButton label="Hapus" danger onClick={onDelete}><Trash2 size={16} /></ActionButton>
        </div>
      </td>
    </tr>
  );
}

/* =========================================
   MOBILE CARD
========================================= */
function AlumniMobileCard({ alumni, onDetail, onEdit, onDelete }: { alumni: Alumni; onDetail: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={alumni.nama} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#172033]">{alumni.nama}</p>
            <p className="mt-0.5 text-xs text-[#94a3b8]">{alumni.nomorAlumni}</p>
          </div>
        </div>
        <StatusBadge status={alumni.status} />
      </div>

      <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
        <MobileInfo icon={<UserRound size={14} />} label="Angkatan" value={alumni.angkatan} />
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
        <button type="button" onClick={onEdit} className="flex h-9 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748b] tran
