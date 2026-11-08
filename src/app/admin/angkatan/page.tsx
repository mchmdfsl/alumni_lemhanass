"use client";

import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
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

const ITEMS_PER_PAGE = 15;

export default function AngkatanPage() {
  const [angkatanData, setAngkatanData] = useState<AngkatanStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const initialCategory = new URLSearchParams(window.location.search).get("kategori");
    if (initialCategory && categories.includes(initialCategory)) setSelectedCategory(initialCategory);
    let active = true;
    setLoading(true);
    fetch("/api/stats/angkatan", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Gagal memuat data angkatan.");
        if (active) setAngkatanData(d.data ?? []);
      })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return angkatanData.filter((a) => {
      const categoryMatch = !selectedCategory || a.kategoriProgram === selectedCategory;
      const searchMatch = [a.kategoriProgram, a.nomorAngkatan, a.tahunAngkatan == null ? "" : String(a.tahunAngkatan), a.angkatan].some((value) => String(value ?? "").toLowerCase().includes(kw));
      return a.total > 0 && categoryMatch && searchMatch;
    });
  }, [search, selectedCategory, angkatanData]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const realCohorts = angkatanData.filter((a) => a.total > 0);
  const totalAlumni = realCohorts.reduce((s, a) => s + a.total, 0);
  const categories = ["PRA", "PPRA", "P4N", "PSA", "PPSA", "P3N", "TAPLAI", "PPNK", "PPNK KOLABORASI", "TOT"];

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
                Data Angkatan
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#64748b]">
                Rekap jumlah alumni per program / angkatan yang terdaftar dalam sistem.
              </p>
            </div>

            {/* SUMMARY CARDS */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Total Alumni</p>
                <p className="mt-1 text-2xl font-bold text-[#0b1f3a]">{loading ? "—" : totalAlumni.toLocaleString("id-ID")}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Jumlah Angkatan</p>
                <p className="mt-1 text-2xl font-bold text-[#0b1f3a]">{loading ? "—" : realCohorts.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Kategori Program</p>
                <p className="mt-1 text-lg font-bold text-[#0b1f3a] truncate">
                  {loading ? "—" : ([...realCohorts].sort((a, b) => b.total - a.total)[0]?.kategoriProgram ?? "-")}
                </p>
              </div>
            </div>

            {!selectedCategory ? (
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => {
                  const rows = angkatanData.filter((item) => item.kategoriProgram === category && item.total > 0);
                  const count = rows.reduce((sum, item) => sum + item.total, 0);
                  return <button key={category} type="button" onClick={() => { setSelectedCategory(category); setSearch(""); setPage(1); }} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#b28b16] hover:shadow-md">
                    <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b1f3a]/5 text-[#0b1f3a]"><GraduationCap size={21} /></span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{rows.length} angkatan</span></div>
                    <h2 className="mt-4 text-lg font-bold text-[#0b1f3a]">{category}</h2>
                    <p className="mt-1 text-sm text-slate-500">{count.toLocaleString("id-ID")} alumni terdaftar</p>
                    <p className="mt-4 text-sm font-semibold text-[#9b7815]">Lihat daftar angkatan →</p>
                  </button>;
                })}
              </section>
            ) : (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#b28b16]">Kategori terpilih</p><h2 className="mt-1 text-xl font-bold text-[#0b1f3a]">{selectedCategory}</h2></div>
                <button type="button" onClick={() => { setSelectedCategory(""); setSearch(""); setPage(1); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0b1f3a] hover:bg-slate-50"><ChevronLeft size={16} /> Semua Kategori</button>
              </div>
            )}

            {selectedCategory && <>
            {/* SEARCH */}
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Cari program, nomor angkatan, atau tahun..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#fafbfc] pl-10 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1f3a] focus:bg-white focus:ring-4 focus:ring-[#0b1f3a]/5"
                  />
                </div>
                {(search || selectedCategory !== "Semua") && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); setSelectedCategory("Semua"); setPage(1); }}
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
                  <h2 className="font-bold text-[#172033]">Daftar Angkatan {selectedCategory}</h2>
                  <p className="mt-1 text-xs text-[#94a3b8]">
                    {loading ? "Memuat..." : `${filtered.length} angkatan ditemukan`}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f3a]/5">
                  <GraduationCap size={17} className="text-[#0b1f3a]" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Kategori / Angkatan</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Terverifikasi</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Menunggu</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Ditolak</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Wilayah Dominan</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="animate-pulse border-b border-slate-100">
                          {Array.from({ length: 7 }).map((__, j) => (
                            <td key={j} className="px-4 py-4"><div className="h-4 rounded bg-slate-200" /></td>
                          ))}
                        </tr>
                      ))
                    ) : paginated.length > 0 ? (
                      paginated.map((item) => (
                        <tr key={`${item.kategoriProgram}-${item.nomorAngkatan}-${item.tahunAngkatan ?? "na"}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0b1f3a]/5">
                                <GraduationCap size={15} className="text-[#0b1f3a]" />
                              </div>
                              <div className="space-y-1"><p className="text-sm font-bold text-[#172033]">{item.kategoriProgram || item.angkatan}</p><p className="text-xs text-slate-500">Nomor angkatan: {item.nomorAngkatan || "-"}</p><p className="text-xs text-slate-500">Tahun angkatan: {item.tahunAngkatan ?? "-"}</p></div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-sm font-bold text-[#172033]">{item.total.toLocaleString("id-ID")}</span>
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
                            <span className="text-sm text-[#475569]">{item.wilayahDominan || "-"}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <a
                              href={`/admin/alumni?kategori=${encodeURIComponent(item.kategoriProgram)}&angkatan=${encodeURIComponent(item.nomorAngkatan)}&back=angkatan&backKategori=${encodeURIComponent(item.kategoriProgram)}`}
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
                        <td colSpan={7} className="py-12 text-center text-sm text-[#94a3b8]">
                          Tidak ada angkatan yang sesuai
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
            </>}
          </div>
        </main>
      </div>
    </div>
  );
}
