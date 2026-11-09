"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users, RefreshCw, AlertCircle, Building2, BriefcaseBusiness, Eye, X, GraduationCap, MapPin } from "lucide-react";

type Alumni = {
  id: string | number;
  nama: string | null;
  angkatan: string | number | null;
  kategoriProgram: string | null;
  nomorAngkatan: string | number | null;
  tahunAngkatan: string | number | null;
  jabatan: string | null;
  instansi: string | null;
  fotoProfil: string | null;
  nomorAlumni?: string | null;
};

export default function ListAngkatan() {
  const [query, setQuery] = useState("");
  const [selectedAngkatan, setSelectedAngkatan] = useState("Semua Angkatan");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedAlumni, setSelectedAlumni] = useState<Alumni | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDirectory() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (selectedAngkatan !== "Semua Angkatan") params.set("kategori", selectedAngkatan);
        params.set("limit", String(pageSize));
        params.set("offset", String((page - 1) * pageSize));
        const response = await fetch(`/api/user/directory?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Direktori alumni gagal dimuat.");
        }
        setAlumni(Array.isArray(result.data) ? result.data : []);
        setTotalCount(Number.isFinite(Number(result.total)) ? Number(result.total) : 0);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadDirectory();
    return () => controller.abort();
  }, [query, selectedAngkatan, page, pageSize, reloadKey]);

  const categories = ["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "TAPLAI", "PPNK", "PPNK KOLABORASI", "TOT"];
  const angkatanOptions = useMemo(() => Array.from(new Set([...categories, ...alumni.map((person) => String(person.kategoriProgram || person.angkatan || "").trim()).filter(Boolean)])).sort((a, b) => {
    const ai = categories.indexOf(a);
    const bi = categories.indexOf(b);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    return a.localeCompare(b, "id");
  }), [alumni]);
  const filteredAlumni = alumni;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const visibleAlumni = filteredAlumni;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#0b1f3a] px-5 py-6 text-white sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Direktori Alumni</h1>
              <p className="mt-1 text-sm text-slate-300">Temukan alumni yang telah terverifikasi.</p>
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <label htmlFor="directory-search" className="mb-2 block text-sm font-semibold text-[#172033]">
            Cari alumni
          </label>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="directory-search"
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              maxLength={100}
              placeholder="Nama, kategori, angkatan, jabatan, atau instansi..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#0b1f3a] focus:ring-4 focus:ring-[#0b1f3a]/10"
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label htmlFor="directory-angkatan" className="mb-2 block text-sm font-semibold text-[#172033]">Filter angkatan</label>
              <select id="directory-angkatan" value={selectedAngkatan} onChange={(event) => { setSelectedAngkatan(event.target.value); setPage(1); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#0b1f3a] focus:ring-4 focus:ring-[#0b1f3a]/10">
                <option>Semua Angkatan</option>
                {angkatanOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between gap-3 pb-1 text-xs text-slate-500 sm:justify-end">
              <span>{loading ? "Memuat data alumni..." : `${totalCount} alumni ditemukan`}</span>
              {loading && <RefreshCw size={15} className="animate-spin" aria-label="Memuat" />}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">Tidak dapat memuat direktori</p>
            <p className="mt-1">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-2 font-semibold underline">Coba lagi dengan mengubah pencarian</button>
          </div>
        </div>
      )}

      {!error && !loading && alumni.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <Users size={30} className="mx-auto text-slate-400" />
          <h2 className="mt-3 font-bold text-[#172033]">Alumni tidak ditemukan</h2>
          <p className="mt-1 text-sm text-slate-500">Coba gunakan kata kunci lain.</p>
        </div>
      )}

      {filteredAlumni.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Alumni</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kategori / Angkatan</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Jabatan</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Instansi</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Detail</th>
                </tr>
              </thead>
              <tbody>
                {visibleAlumni.map((person) => (
                  <tr key={person.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar person={person} />
                        <span className="font-semibold text-[#172033]">{person.nama || "Nama tidak tersedia"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{[person.kategoriProgram || person.angkatan, person.nomorAngkatan, person.tahunAngkatan].filter(Boolean).join(" · ") || "-"}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{person.jabatan || "-"}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{person.instansi || "-"}</td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedAlumni(person)} aria-label={`Lihat detail ${person.nama || "alumni"}`} title="Lihat detail alumni" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-[#0b1f3a] hover:bg-[#0b1f3a] hover:text-white"><Eye size={17} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {visibleAlumni.map((person) => (
              <article key={person.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <Avatar person={person} />
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-bold text-[#172033]">{person.nama || "Nama tidak tersedia"}</h2>
                    <p className="mt-1 text-xs font-semibold text-[#b28b16]">{[person.kategoriProgram || person.angkatan, person.nomorAngkatan ? `Angkatan ${person.nomorAngkatan}` : null, person.tahunAngkatan].filter(Boolean).join(" · ") || "Angkatan belum diisi"}</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p className="flex gap-2"><BriefcaseBusiness size={16} className="mt-0.5 shrink-0 text-slate-400" /><span>{person.jabatan || "Jabatan belum diisi"}</span></p>
                      <p className="flex gap-2"><Building2 size={16} className="mt-0.5 shrink-0 text-slate-400" /><span>{person.instansi || "Instansi belum diisi"}</span></p>
                    </div>
                    <button type="button" onClick={() => setSelectedAlumni(person)} className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#0b1f3a] hover:bg-slate-50"><Eye size={15} /> Lihat Detail</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {totalCount > pageSize && (
        <nav aria-label="Halaman direktori alumni" className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Halaman {page} dari {totalPages}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-[#0b1f3a] disabled:cursor-not-allowed disabled:opacity-40">Sebelumnya</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg bg-[#0b1f3a] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Berikutnya</button>
          </div>
        </nav>
      )}
      <p className="text-xs leading-5 text-slate-400">Direktori hanya menampilkan alumni berstatus terverifikasi. Informasi dibatasi pada data profesional yang tersedia di sistem.</p>
      {selectedAlumni && <DirectoryPreview alumni={selectedAlumni} onClose={() => setSelectedAlumni(null)} />}
    </div>
  );
}

function Avatar({ person }: { person: Alumni }) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = person.nama?.trim() || "Alumni";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AL";

  useEffect(() => {
    setImageFailed(false);
  }, [person.fotoProfil]);

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8edf4] text-sm font-bold text-[#0b1f3a]">
      {person.fotoProfil && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.fotoProfil}
          alt={`Foto ${name}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : initials}
    </div>
  );
}


function DirectoryPreview({ alumni, onClose }: { alumni: Alumni; onClose: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const category = alumni.kategoriProgram || alumni.angkatan || "-";
  const cohort = [alumni.nomorAngkatan ? `Angkatan ${alumni.nomorAngkatan}` : null, alumni.tahunAngkatan].filter(Boolean).join(" / ") || "-";
  const items = [
    ["Nomor Alumni", alumni.nomorAlumni || "Belum tersedia"],
    ["Program", category],
    ["Angkatan", cohort],
    ["Jabatan", alumni.jabatan || "Belum diisi"],
    ["Instansi / Kantor", alumni.instansi || "Belum diisi"],
  ];
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#071526]/65 p-3 backdrop-blur-sm sm:p-6" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-label={`Preview data alumni ${alumni.nama || ""}`} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between bg-[#17132f] px-5 py-4 text-white sm:px-6">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#d9c58f]">Direktori Alumni</p><h2 className="mt-1 text-lg font-bold">Preview Data Alumni</h2></div>
          <button type="button" onClick={onClose} aria-label="Tutup preview" className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"><X size={19} /></button>
        </header>
        <div className="grid gap-5 p-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-6">
          <div className="space-y-3">
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {alumni.fotoProfil && !imageFailed ? <img src={alumni.fotoProfil} alt={`Foto ${alumni.nama || "alumni"}`} referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Foto belum tersedia</div>}
            </div>
            <div className="rounded-xl bg-[#17132f] p-4 text-white"><p className="text-xs text-[#d9c58f]">Nama Alumni</p><p className="mt-1 break-words text-base font-bold">{alumni.nama || "-"}</p></div>
          </div>
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#17132f]"><GraduationCap size={18} className="text-[#b28b16]" /> Informasi Alumni</div>
            <dl className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {items.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(105px,34%)_1fr] gap-3 px-4 py-3"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="break-words text-sm font-semibold text-[#172033]">{value}</dd></div>)}
            </dl>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-400"><MapPin size={14} className="mt-0.5 shrink-0" />Preview hanya untuk melihat informasi. Pengguna direktori tidak dapat mengubah data alumni.</p>
            <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-[#17132f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#28234a] sm:w-auto">Tutup Preview</button>
          </div>
        </div>
      </section>
    </div>
  );
}
