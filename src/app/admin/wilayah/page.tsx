"use client";

import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  RefreshCcw,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

interface WilayahStat {
  wilayah: string;
  jumlah: number;
  persentase: number;
}

const ITEMS_PER_PAGE = 15;

export default function WilayahPage() {
  const [wilayahData, setWilayahData] = useState<WilayahStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/stats/wilayah", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Gagal memuat data wilayah.");
        if (active) setWilayahData(d.data ?? []);
      })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return wilayahData.filter((w) => w.wilayah.toLowerCase().includes(kw));
  }, [search, wilayahData]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalAlumni = wilayahData.reduce((s, w) => s + w.jumlah, 0);
  const maxJumlah = wilayahData.length > 0 ? Math.max(...wilayahData.map((w) => w.jumlah)) : 1;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <AdminSidebar />

      <div className="lg:pl-72">
        <AdminHeader />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* HEADER */}
            <div className="mb-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">
                Manajemen Data
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">
                Sebaran Wilayah
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#64748b]">
                Distribusi alumni berdasarkan wilayah atau provinsi domisili.
              </p>
            </div>

            {/* SUMMARY CARDS */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Total Alumni</p>
                <p className="mt-1 text-2xl font-bold text-[#0b1f3a]">{loading ? "—" : totalAlumni.toLocaleString("id-ID")}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Jumlah Wilayah</p>
                <p className="mt-1 text-2xl font-bold text-[#0b1f3a]">{loading ? "—" : wilayahData.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Wilayah Terbanyak</p>
                <p className="mt-1 text-lg font-bold text-[#0b1f3a] truncate">
                  {loading ? "—" : wilayahData[0]?.wilayah ?? "-"}
                </p>
              </div>
            </div>

            {/* SEARCH */}
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Cari wilayah atau provinsi..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#fafbfc] pl-10 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1f3a] focus:bg-white focus:ring-4 focus:ring-[#0b1f3a]/5"
                  />
                </div>
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); setPage(1); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#9e1b32] hover:underline"
                  >
                    <RefreshCcw size={13} />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="font-bold text-[#172033]">Daftar Wilayah</h2>
                  <p className="mt-1 text-xs text-[#94a3b8]">
                    {loading ? "Memuat..." : `${filtered.length} wilayah ditemukan`}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f3a]/5">
                  <MapPin size={17} className="text-[#0b1f3a]" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Wilayah</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Jumlah Alumni</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Persentase</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Proporsi</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="animate-pulse border-b border-slate-100">
                          {Array.from({ length: 5 }).map((__, j) => (
                            <td key={j} className="px-4 py-4"><div className="h-4 rounded bg-slate-200" /></td>
                          ))}
                        </tr>
                      ))
                    ) : paginated.length > 0 ? (
                      paginated.map((item) => (
                        <tr key={item.wilayah} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0b1f3a]/5">
                                <MapPin size={15} className="text-[#0b1f3a]" />
                              </div>
                              <span className="text-sm font-semibold text-[#172033]">{item.wilayah}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-sm font-bold text-[#172033]">{item.jumlah.toLocaleString("id-ID")}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                              {item.persentase}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-[#0b1f3a] transition-all duration-700"
                                style={{ width: `${Math.round((item.jumlah / maxJumlah) * 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <a
                              href={`/admin/alumni?wilayah=${encodeURIComponent(item.wilayah)}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0b1f3a]/5 px-3 py-1.5 text-xs font-semibold text-[#0b1f3a] transition hover:bg-[#0b1f3a]/10"
                            >
                              <Users size={13} />
                              Lihat Alumni
                            </a>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-sm text-[#94a3b8]">
                          Tidak ada wilayah yang sesuai
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-xs text-[#94a3b8]">
                    Halaman <span className="font-semibold text-[#475569]">{currentPage}</span> dari{" "}
                    <span className="font-semibold text-[#475569]">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#0b1f3a] px-3 text-xs font-bold text-white">{currentPage}</div>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
