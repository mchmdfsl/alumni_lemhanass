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
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

type AlumniStatus = "Terverifikasi" | "Menunggu" | "Ditolak";

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
  status: AlumniStatus;
  fotoProfil: string | null;
}

const ITEMS_PER_PAGE = 10;
const STATUS_OPTIONS = [
  "Semua Status",
  "Terverifikasi",
  "Menunggu",
  "Ditolak",
];

const EMPTY_ALUMNI: Omit<Alumni, "id"> = {
  nomorAlumni: "",
  nama: "",
  angkatan: "",
  instansi: "",
  jabatan: "",
  wilayah: "",
  alamat: "",
  email: "",
  nomorHp: "",
  status: "Menunggu",
  fotoProfil: null,
};

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizeAlumni(item: Record<string, unknown>): Alumni {
  return {
    id: Number(item.id),
    nomorAlumni: text(item.nomorAlumni ?? item.nomor_alumni),
    nama: text(item.nama),
    angkatan: text(item.angkatan),
    instansi: text(item.instansi),
    jabatan: text(item.jabatan),
    wilayah: text(item.wilayah),
    alamat: text(item.alamat),
    email: text(item.email),
    nomorHp: text(item.nomorHp ?? item.nomor_hp),
    status: (
      ["Terverifikasi", "Menunggu", "Ditolak"].includes(
        text(item.status),
      )
        ? text(item.status)
        : "Menunggu"
    ) as AlumniStatus,
    fotoProfil: text(
      item.fotoProfil ?? item.foto_profil,
    ) || null,
  };
}

export default function AlumniPage() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Semua Status");
  const [angkatan, setAngkatan] = useState("Semua Angkatan");
  const [wilayah, setWilayah] = useState("Semua Wilayah");
  const [page, setPage] = useState(1);

  const [selectedAlumni, setSelectedAlumni] =
    useState<Alumni | null>(null);
  const [editAlumni, setEditAlumni] =
    useState<Alumni | null>(null);
  const [deleteAlumni, setDeleteAlumni] =
    useState<Alumni | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [alumniData, setAlumniData] = useState<Alumni[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const w = searchParams.get("wilayah");
    const a = searchParams.get("angkatan");

    if (w) setWilayah(w);
    if (a) setAngkatan(a);
  }, [searchParams]);

  const loadAlumni = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/alumni?limit=500", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal memuat data alumni.",
        );
      }

      const rows = Array.isArray(result.data)
        ? result.data
        : [];

      setAlumniData(
        rows.map((item: Record<string, unknown>) =>
          normalizeAlumni(item),
        ),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Gagal memuat data alumni.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlumni();
  }, [loadAlumni]);

  const angkatanOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        alumniData
          .map((item) => item.angkatan)
          .filter(Boolean),
      ),
    ).sort();

    return ["Semua Angkatan", ...values];
  }, [alumniData]);

  const wilayahOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        alumniData
          .map((item) => item.wilayah)
          .filter(Boolean),
      ),
    ).sort();

    return ["Semua Wilayah", ...values];
  }, [alumniData]);

  const filteredAlumni = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return alumniData.filter((alumni) => {
      const searchable = [
        alumni.nama,
        alumni.nomorAlumni,
        alumni.email,
        alumni.instansi,
        alumni.nomorHp,
        alumni.alamat,
        alumni.jabatan,
      ];

      const matchesSearch =
        !keyword ||
        searchable.some((value) =>
          value.toLowerCase().includes(keyword),
        );

      const matchesStatus =
        status === "Semua Status" ||
        alumni.status === status;

      const matchesAngkatan =
        angkatan === "Semua Angkatan" ||
        alumni.angkatan === angkatan;

      const matchesWilayah =
        wilayah === "Semua Wilayah" ||
        alumni.wilayah === wilayah;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesAngkatan &&
        matchesWilayah
      );
    });
  }, [search, status, angkatan, wilayah, alumniData]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAlumni.length / ITEMS_PER_PAGE),
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedAlumni = filteredAlumni.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const resetFilter = () => {
    setSearch("");
    setStatus("Semua Status");
    setAngkatan("Semua Angkatan");
    setWilayah("Semua Wilayah");
    setPage(1);
  };

  const handleSaveEdit = async (
    updated: Partial<Alumni>,
  ) => {
    if (!editAlumni) return;

    setSaving(true);

    try {
      const response = await fetch(
        `/api/alumni/${editAlumni.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updated),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal menyimpan perubahan.",
        );
      }

      if (result.data) {
        const updatedAlumni = normalizeAlumni({
          ...editAlumni,
          ...result.data,
        });

        setAlumniData((previous) =>
          previous.map((item) =>
            item.id === editAlumni.id
              ? updatedAlumni
              : item,
          ),
        );
      } else {
        await loadAlumni();
      }

      setEditAlumni(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan perubahan.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteAlumni) return;

    setSaving(true);

    try {
      const response = await fetch(
        `/api/alumni/${deleteAlumni.id}`,
        { method: "DELETE" },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal menghapus alumni.",
        );
      }

      setAlumniData((previous) =>
        previous.filter(
          (item) => item.id !== deleteAlumni.id,
        ),
      );

      setDeleteAlumni(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menghapus alumni.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdd = async (
    payload: Record<string, string>,
  ) => {
    setSaving(true);

    try {
      const response = await fetch("/api/alumni", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal menambah alumni.",
        );
      }

      await loadAlumni();
      setShowAddModal(false);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menambah alumni.",
      );
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
          <div className="mx-auto max-w-7xl">
            {loadError && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {loadError}
                <button
                  type="button"
                  onClick={() => void loadAlumni()}
                  className="ml-3 font-bold underline"
                >
                  Coba lagi
                </button>
              </div>
            )}

            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">
                  Manajemen Alumni
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">
                  Data Alumni
                </h1>

                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#64748b]">
                  Kelola informasi alumni LEMHANNAS RI,
                  termasuk foto profil, data pribadi, instansi,
                  kontak, dan status verifikasi.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href="/api/alumni/export"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#475569] shadow-sm hover:bg-slate-50"
                >
                  <Download size={17} />
                  Export CSV
                </a>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 text-sm font-semibold text-white hover:bg-[#123b68]"
                >
                  <Plus size={17} />
                  Tambah Alumni
                </button>
              </div>
            </div>

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f3a]/5">
                    <Filter
                      size={17}
                      className="text-[#0b1f3a]"
                    />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-[#172033]">
                      Filter Data
                    </h2>
                    <p className="hidden text-xs text-[#94a3b8] sm:block">
                      Cari berdasarkan informasi alumni
                    </p>
                  </div>
                </div>

                {(search ||
                  status !== "Semua Status" ||
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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                    placeholder="Cari nama, nomor, email, HP..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#fafbfc] pl-10 pr-4 text-sm text-[#172033] outline-none focus:border-[#0b1f3a] focus:bg-white"
                  />
                </div>

                <FilterSelect
                  value={status}
                  onChange={(value) => {
                    setStatus(value);
                    setPage(1);
                  }}
                  options={STATUS_OPTIONS}
                />

                <FilterSelect
                  value={angkatan}
                  onChange={(value) => {
                    setAngkatan(value);
                    setPage(1);
                  }}
                  options={angkatanOptions}
                />

                <FilterSelect
                  value={wilayah}
                  onChange={(value) => {
                    setWilayah(value);
                    setPage(1);
                  }}
                  options={wilayahOptions}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="font-bold text-[#172033]">
                    Daftar Alumni
                  </h2>
                  <p className="mt-1 text-xs text-[#94a3b8]">
                    Menampilkan{" "}
                    <span className="font-semibold text-[#475569]">
                      {filteredAlumni.length}
                    </span>{" "}
                    data alumni
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                  <Users size={14} />
                  Database Alumni
                </div>
              </div>

              {loading ? (
                <div className="px-6 py-16 text-center text-sm text-slate-500">
                  Memuat data alumni...
                </div>
              ) : paginatedAlumni.length > 0 ? (
                <>
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
                            onDetail={() =>
                              setSelectedAlumni(alumni)
                            }
                            onEdit={() => setEditAlumni(alumni)}
                            onDelete={() =>
                              setDeleteAlumni(alumni)
                            }
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-slate-100 lg:hidden">
                    {paginatedAlumni.map((alumni) => (
                      <AlumniMobileCard
                        key={alumni.id}
                        alumni={alumni}
                        onDetail={() =>
                          setSelectedAlumni(alumni)
                        }
                        onEdit={() => setEditAlumni(alumni)}
                        onDelete={() =>
                          setDeleteAlumni(alumni)
                        }
                      />
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalData={filteredAlumni.length}
                    onPrevious={() =>
                      setPage((previous) =>
                        Math.max(1, previous - 1),
                      )
                    }
                    onNext={() =>
                      setPage((previous) =>
                        Math.min(totalPages, previous + 1),
                      )
                    }
                  />
                </>
              ) : (
                <div className="px-6 py-16 text-center">
                  <Users
                    size={32}
                    className="mx-auto mb-3 text-slate-300"
                  />
                  <p className="font-semibold text-slate-700">
                    Data alumni tidak ditemukan
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Coba ubah kata kunci atau filter.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilter}
                    className="mt-4 text-sm font-semibold text-[#0b1f3a] underline"
                  >
                    Reset filter
                  </button>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {selectedAlumni && (
        <AlumniDetailModal
          alumni={selectedAlumni}
          onClose={() => setSelectedAlumni(null)}
          onEdit={() => {
            setEditAlumni(selectedAlumni);
            setSelectedAlumni(null);
          }}
        />
      )}

      {editAlumni && (
        <AlumniEditModal
          alumni={editAlumni}
          saving={saving}
          onClose={() => setEditAlumni(null)}
          onSave={handleSaveEdit}
        />
      )}

      {deleteAlumni && (
        <ConfirmDeleteModal
          alumni={deleteAlumni}
          saving={saving}
          onClose={() => setDeleteAlumni(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

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

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-3 text-${align} text-xs font-semibold uppercase tracking-wide text-[#94a3b8] first:pl-6 last:pr-6`}
    >
      {children}
    </th>
  );
}

function Avatar({
  name,
  photo,
  size = "normal",
}: {
  name: string;
  photo?: string | null;
  size?: "normal" | "large";
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [photo]);

  const dimension =
    size === "large" ? "h-24 w-24 text-2xl" : "h-11 w-11 text-sm";

  return (
    <div
      className={`relative flex ${dimension} shrink-0 items-center justify-center overflow-hi
