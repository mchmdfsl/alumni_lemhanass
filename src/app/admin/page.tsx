"use client";

import { useEffect, useState } from "react";

import {
  Users,
  UserCheck,
  Clock3,
  TrendingUp,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import StatCard from "@/components/admin/StatCard";
import RecentAlumni from "@/components/admin/RecentAlumni";

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({ total: 0, terverifikasi: 0, menunggu: 0, ditolak: 0 });
  const [wilayahData, setWilayahData] = useState<{ wilayah: string; jumlah: number; persentase: number }[]>([]);
  const [aktivitas, setAktivitas] = useState({ dataBaru: 0, datadiperbarui: 0, datadiverifikasi: 0, dataditolak: 0 });
  const [loadingWilayah, setLoadingWilayah] = useState(true);
  const [loadingAktivitas, setLoadingAktivitas] = useState(true);

  useEffect(() => {
    let active = true;

    // Fetch counts
    fetch("/api/alumni?limit=1", { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (r.ok && active && d.counts) setCounts(d.counts); })
      .catch(() => undefined);

    // Fetch wilayah stats
    fetch("/api/stats/wilayah", { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (r.ok && active) setWilayahData(d.data ?? []); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoadingWilayah(false); });

    // Fetch aktivitas stats
    fetch("/api/stats/aktivitas", { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (r.ok && active && d.data) setAktivitas(d.data); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoadingAktivitas(false); });

    return () => { active = false; };
  }, []);

  const formatCount = (value: number) => value.toLocaleString("id-ID");
  const top5Wilayah = wilayahData.slice(0, 5);

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
            {/* =====================================
                PAGE TITLE
            ===================================== */}
            <div className="mb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">
                    Dashboard Admin
                  </p>

                  <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">
                    Selamat Datang, Admin
                  </h1>

                  <p className="mt-1.5 text-sm text-[#64748b]">
                    Kelola dan pantau data alumni LEMHANNAS RI.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                  <ShieldCheck size={17} className="text-[#b28b16]" />

                  <span className="text-sm font-medium text-[#475569]">
                    Sistem Administrasi Alumni
                  </span>
                </div>
              </div>
            </div>

            {/* =====================================
                STATISTICS
            ===================================== */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Alumni"
                value={formatCount(counts.total)}
                description="Total alumni di database"
                icon={Users}
              />

              <StatCard
                title="Terverifikasi"
                value={formatCount(counts.terverifikasi)}
                description="Status terverifikasi"
                icon={UserCheck}
              />

              <StatCard
                title="Menunggu Verifikasi"
                value={formatCount(counts.menunggu)}
                description="Perlu pemeriksaan admin"
                icon={Clock3}
              />

              <StatCard
                title="Ditolak"
                value={formatCount(counts.ditolak)}
                description="Data yang ditolak admin"
                icon={XCircle}
              />
            </section>

            {/* =====================================
                MAIN GRID
            ===================================== */}
            <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* ===================================
                  RECENT ALUMNI
              =================================== */}
              <div className="xl:col-span-2">
                <RecentAlumni />
              </div>

              {/* ===================================
                  QUICK SUMMARY
              =================================== */}
              <div className="space-y-6">
                {/* Alumni berdasarkan wilayah */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-[#172033]">
                        Sebaran Alumni
                      </h2>

                      <p className="mt-1 text-xs text-[#94a3b8]">
                        Berdasarkan wilayah
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f3a]/5">
                      <MapPin size={18} className="text-[#0b1f3a]" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {loadingWilayah ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="mb-2 flex justify-between">
                            <div className="h-4 w-28 rounded bg-slate-200" />
                            <div className="h-4 w-12 rounded bg-slate-200" />
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100" />
                        </div>
                      ))
                    ) : top5Wilayah.length > 0 ? (
                      top5Wilayah.map((item) => (
                        <RegionItem
                          key={item.wilayah}
                          region={item.wilayah}
                          value={item.jumlah.toLocaleString("id-ID")}
                          percentage={`${item.persentase}%`}
                        />
                      ))
                    ) : (
                      <p className="text-center text-sm text-[#94a3b8]">Belum ada data</p>
                    )}
                  </div>
                </div>

                {/* Aktivitas */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-[#172033]">
                        Aktivitas Data
                      </h2>

                      <p className="mt-1 text-xs text-[#94a3b8]">
                        Ringkasan bulan ini
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c9a227]/10">
                      <TrendingUp size={18} className="text-[#b28b16]" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {loadingAktivitas ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex animate-pulse items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                          <div className="h-4 w-28 rounded bg-slate-200" />
                          <div className="h-4 w-10 rounded bg-slate-200" />
                        </div>
                      ))
                    ) : (
                      <>
                        <ActivityItem label="Data baru" value={formatCount(aktivitas.dataBaru)} />
                        <ActivityItem label="Data diperbarui" value={formatCount(aktivitas.datadiperbarui)} />
                        <ActivityItem label="Data diverifikasi" value={formatCount(aktivitas.datadiverifikasi)} />
                        <ActivityItem label="Data ditolak" value={formatCount(aktivitas.dataditolak)} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

/* =========================================
   REGION ITEM
========================================= */

function RegionItem({
  region,
  value,
  percentage,
}: {
  region: string;
  value: string;
  percentage: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-[#475569]">{region}</span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#94a3b8]">{percentage}</span>

          <span className="text-sm font-bold text-[#172033]">{value}</span>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#0b1f3a] transition-all duration-700"
          style={{
            width: percentage,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================
   ACTIVITY ITEM
========================================= */

function ActivityItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#64748b]">{label}</span>

      <span className="text-sm font-bold text-[#172033]">{value}</span>
    </div>
  );
}
