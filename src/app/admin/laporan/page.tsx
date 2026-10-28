"use client";

import {
  BarChart3,
  ChevronDown,
  Filter,
  MapPin,
  RefreshCcw,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

interface AngkatanStat {
  angkatan: string;
  kategoriProgram: string;
  nomorAngkatan: string;
  tahunAngkatan: number | null;
  total: number;
  terverifikasi: number;
  menunggu: number;
  ditolak: number;
  wilayahDominan: string;
}

interface WilayahStat {
  wilayah: string;
  jumlah: number;
  persentase: number;
}

const ITEMS_PER_PAGE = 10;

export default function LaporanPage() {
  const [angkatanData, setAngkatanData] = useState<AngkatanStat[]>([]);
  const [wilayahData, setWilayahData] = useState<WilayahStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      fetch("/api/stats/angkatan", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/stats/wilayah", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([angkatan, wilayah]) => {
        if (!active) return;
        if (angkatan.data) setAngkatanData(angkatan.data);
        if (wilayah.data) setWilayahData(wilayah.data);
      })
      .catch(() => { if (active) setError("Gagal memuat data laporan."); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const filteredData = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    return angkatanData.filter((item) =>
      [item.kategoriProgram, item.nomorAngkatan, item.tahunAngkatan == null ? "" : String(item.tahunAngkatan), item.angkatan]
        .some((value) => String(value ?? "").toLowerCase().includes(keyword))
    );
  }, [search, angkatanData]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetFilter = () => { setSearch(""); setPage(1); };

  const maxWilayah = wilayahData.length > 0 ? Math.max(...wilayahData.map((w) => w.jumlah)) : 1;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* =========================================
          SIDEBAR
      ========================================= */}
      <AdminSidebar />

      {/* =========================================
          MAIN CONTENT
      ========================================= */}
      <div className="lg:pl-72">
        <AdminHeader />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* =====================================
                HEADER
            ===================================== */}
            <div className="mb-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">
                    Manajemen Data
                  </p>

                  <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">
                    Laporan
                  </h1>

                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#64748b]">
                    Lihat rekapitulasi dan perkembangan data alumni berdasarkan
                    angkatan dan wilayah.
                  </p>
                </div>

              </div>
            </div>

            {/* =====================================
                FILTER
            ===================================== */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f3a]/5">
                    <Filter size={17} className="text-[#0b1f3a]" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-[#172033]">
                      Filter Laporan
                    </h2>

                    <p className="hidden text-xs text-[#94a3b8] sm:block">
                      Sesuaikan data laporan yang ingin ditampilkan
                    </p>
                  </div>
                </div>

                {search && (
                  <button
                    type="button"
                    onClick={resetFilter}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#9e1b32] hover:underline"
                  >
                    <RefreshCcw size={13} />
                    Reset
                  </button>
                )}
              </div>

              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  placeholder="Cari kategori, nomor, atau tahun angkatan..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-[#fafbfc] pl-10 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1f3a] focus:bg-white focus:ring-4 focus:ring-[#0b1f3a]/5"
                />
              </div>
            </div>

            {/* =====================================
                LAPORAN ANGKATAN
            ===================================== */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="font-bold text-[#172033]">
                    Rekapitulasi Berdasarkan Angkatan
                  </h2>

                  <p className="mt-1 text-xs text-[#94a3b8]">
                    Distribusi data alumni pada setiap angkatan
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                  <BarChart3 size={14} />
                  {loading ? "Memuat..." : `${filteredData.length} angkatan`}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                        Kategori / Angkatan
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                        Total Alumni
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                        Terverifikasi
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                        Menunggu
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                        Ditolak
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                        Wilayah Dominan
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse border-b border-slate-100">
                          {Array.from({ length: 6 }).map((__, j) => (
                            <td key={j} className="px-4 py-4">
                              <div className="h-4 rounded bg-slate-200" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : paginatedData.length > 0 ? (
                      paginatedData.map((item) => (
                        <tr
                          key={`${item.kategoriProgram}-${item.nomorAngkatan}-${item.tahunAngkatan ?? "na"}`}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0b1f3a]/5">
                                <Users size={16} className="text-[#0b1f3a]" />
                              </div>

                              <span className="text-sm font-bold text-[#172033]">
                                {item.kategoriProgram || item.angkatan}<span className="mt-1 block text-xs font-normal text-slate-500">Nomor: {item.nomorAngkatan || "-"} · Tahun: {item.tahunAngkatan ?? "-"}</span>
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="text-sm font-bold text-[#172033]">
                              {item.total.toLocaleString("id-ID")}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                              {item.terverifikasi.toLocaleString("id-ID")}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
                              {item.menunggu.toLocaleString("id-ID")}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                              {item.ditolak.toLocaleString("id-ID")}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-[#b28b16]" />

                              <span className="text-sm text-[#475569]">
                                {item.wilayahDominan || "-"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-[#94a3b8]">
                          Tidak ada data yang sesuai
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-[#94a3b8]">
                  Menampilkan{" "}
                  <span className="font-semibold text-[#475569]">
                    {paginatedData.length}
                  </span>{" "}
                  dari{" "}
                  <span className="font-semibold text-[#475569]">
                    {filteredData.length}
                  </span>{" "}
                  angkatan
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-[#64748b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>

                  <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#0b1f3a] px-3 text-xs font-bold text-white">
                    {currentPage}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-[#64748b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </div>

            {/* =====================================
                DISTRIBUSI WILAYAH
            ===================================== */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f3a]/5">
                    <MapPin size={17} className="text-[#0b1f3a]" />
                  </div>

                  <div>
                    <h2 className="font-bold text-[#172033]">
                      Distribusi Alumni Berdasarkan Wilayah
                    </h2>

                    <p className="mt-1 text-xs text-[#94a3b8]">
                      Persebaran alumni berdasarkan wilayah domisili
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="space-y-5">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="mb-2 flex justify-between">
                          <div className="h-4 w-32 rounded bg-slate-200" />
                          <div className="h-4 w-16 rounded bg-slate-200" />
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100" />
                      </div>
                    ))
                  ) : wilayahData.length > 0 ? (
                    wilayahData.map((item) => (
                      <div key={item.wilayah}>
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#475569]">
                              {item.wilayah}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#94a3b8]">
                              {item.persentase}%
                            </span>

                            <span className="min-w-[45px] text-right text-sm font-bold text-[#172033]">
                              {item.jumlah.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#0b1f3a] transition-all duration-700"
                            style={{
                              width: `${Math.round((item.jumlah / maxWilayah) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-[#94a3b8]">Belum ada data wilayah</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* unused — kept to satisfy import checker if any */
function _ChevronDown() { return <ChevronDown size={16} />; }
