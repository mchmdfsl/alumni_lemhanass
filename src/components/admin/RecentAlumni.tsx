"use client";

import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

export interface RecentAlumniItem {
  id: number;
  nama: string;
  nomorAlumni?: string;
  angkatan: string;
  instansi: string;
  wilayah: string;
  status: "Terverifikasi" | "Menunggu" | "Ditolak";
}

interface RecentAlumniProps {
  items?: RecentAlumniItem[];
  loading?: boolean;
}

export default function RecentAlumni({ items, loading: propLoading }: RecentAlumniProps) {
  const [internalItems, setInternalItems] = useState<RecentAlumniItem[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  useEffect(() => {
    if (items !== undefined) {
      setInternalItems(items);
      setInternalLoading(false);
      return;
    }

    let active = true;
    setInternalLoading(true);
    fetch("/api/alumni?limit=6", { cache: "no-store" })
      .then(async (res) => {
        const result = await res.json();
        if (res.ok && active && Array.isArray(result.data)) {
          setInternalItems(result.data);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setInternalLoading(false);
      });

    return () => {
      active = false;
    };
  }, [items]);

  const loading = propLoading ?? internalLoading;
  const list = items ?? internalItems;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <h2 className="font-bold text-[#172033]">Alumni Terbaru</h2>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Data alumni yang baru ditambahkan atau diperbarui
          </p>
        </div>

        <Link
          href="/admin/alumni"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#0b1f3a] transition-colors hover:text-[#b28b16]"
        >
          Lihat Semua
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="divide-y divide-slate-100 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 rounded bg-slate-200" />
                  <div className="h-3 w-20 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-6 w-20 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="p-8 text-center text-sm text-[#94a3b8]">
          Belum ada data alumni yang tersimpan.
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Alumni
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Angkatan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Instansi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Wilayah
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {list.map((alumni) => (
                  <tr
                    key={alumni.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={alumni.nama} />
                        <div>
                          <p className="text-sm font-semibold text-[#172033]">
                            {alumni.nama}
                          </p>
                          <p className="mt-0.5 text-xs text-[#94a3b8]">
                            {alumni.nomorAlumni ? alumni.nomorAlumni : `Alumni #${String(alumni.id).padStart(4, "0")}`}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-[#475569]">
                      {alumni.angkatan || "-"}
                    </td>

                    <td className="max-w-[200px] px-4 py-4 text-sm text-[#475569]">
                      <span className="line-clamp-1">{alumni.instansi || "-"}</span>
                    </td>

                    <td className="px-4 py-4 text-sm text-[#475569]">
                      {alumni.wilayah || "-"}
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={alumni.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Cards */}
          <div className="divide-y divide-slate-100 md:hidden">
            {list.map((alumni) => (
              <div key={alumni.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={alumni.nama} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#172033]">
                        {alumni.nama}
                      </p>
                      <p className="mt-0.5 text-xs text-[#94a3b8]">
                        {alumni.angkatan || "-"}
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={alumni.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                      Instansi
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-medium text-[#475569]">
                      {alumni.instansi || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                      Wilayah
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#475569]">
                      {alumni.wilayah || "-"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================
   AVATAR
========================================= */

function Avatar({ name }: { name: string }) {
  const initials = (name || "")
    .replace(/^((Prof|Dr|Dra|Drs|H|Hj|Ir|Kolonel|Brigjen|Mayjen|Laksma|Marsma)\.?\s*)+/gi, "")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b1f3a]/5 text-xs font-bold text-[#0b1f3a]">
      {initials || <UserRound size={16} />}
    </div>
  );
}

/* =========================================
   STATUS BADGE
========================================= */

function StatusBadge({ status }: { status: RecentAlumniItem["status"] }) {
  if (status === "Terverifikasi") {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
        Terverifikasi
      </span>
    );
  }

  if (status === "Ditolak") {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">
        Ditolak
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
      Menunggu
    </span>
  );
}
