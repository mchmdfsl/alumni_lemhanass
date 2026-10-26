"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Download,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Server,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function PengaturanPage() {
  const [adminUser, setAdminUser] = useState({
    username: "",
    email: "",
    role: "",
  });
  const [dbStats, setDbStats] = useState({
    total: 0,
    terverifikasi: 0,
    menunggu: 0,
    ditolak: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Fetch user info
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok && active && d.user) setAdminUser(d.user);
      })
      .catch(() => undefined);

    // Fetch DB counts
    fetch("/api/alumni?limit=1", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok && active && d.counts) setDbStats(d.counts);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <AdminSidebar />

      <div className="lg:pl-72">
        <AdminHeader />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">
                Sistem & Preferensi
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">
                Pengaturan Sistem
              </h1>
              <p className="mt-1 text-sm text-[#64748b]">
                Kelola profil administrator, keamanan akun, dan konfigurasi database.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Column: Admin Profile & Credentials */}
              <div className="space-y-6 lg:col-span-2">
                {/* Profile Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1f3a]/5 text-[#0b1f3a]">
                      <User size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#172033]">
                        Profil Administrator
                      </h2>
                      <p className="text-xs text-[#94a3b8]">
                        Informasi akun admin yang sedang login
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Username
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={adminUser.username || "Tidak tersedia"}
                            readOnly
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Role
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={adminUser.role || "Tidak tersedia"}
                            readOnly
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Email Administrator
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={adminUser.email || "Tidak tersedia"}
                          readOnly
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Email dan kredensial dikonfigurasi melalui environment variable server demi keamanan maksimal.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Password & Security Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                      <Lock size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#172033]">
                        Keamanan & Kata Sandi
                      </h2>
                      <p className="text-xs text-[#94a3b8]">
                        Prosedur pengamanan akses administrator
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <KeyRound size={20} className="mt-0.5 shrink-0 text-[#b28b16]" />
                        <div className="text-xs leading-relaxed text-slate-600">
                          <p className="font-semibold text-slate-800">
                            Cara Mengubah Password Admin
                          </p>
                          <p className="mt-1">
                            Untuk menjaga sistem tetap aman dan anti-bruteforce, password admin disimpan di file rahasia{" "}
                            <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-slate-800">
                              .env.local
                            </code>{" "}
                            pada variabel <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-slate-800">ADMIN_PASSWORD</code>.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={20} className="text-emerald-600" />
                        <div>
                          <p className="text-xs font-semibold text-emerald-900">
                            Sesi Terenkripsi Aktif
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            Cookie sesi dilindungi enkripsi HMAC-SHA256 dengan masa berlaku 8 jam.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Backup & Export Data */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Download size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#172033]">
                        Cadangan Data (Backup)
                      </h2>
                      <p className="text-xs text-[#94a3b8]">
                        Unduh seluruh data alumni ke format CSV
                      </p>
                    </div>
                  </div>

                  <p className="mb-4 text-xs leading-relaxed text-slate-600">
                    Anda dapat mengunduh seluruh data alumni yang ada di database kapan saja sebagai salinan arsip lokal.
                  </p>

                  <a
                    href="/api/alumni/export?format=csv"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1a365d]"
                  >
                    <Download size={15} />
                    Unduh Seluruh Data Alumni (CSV)
                  </a>
                </div>
              </div>

              {/* Right Column: Database & Server Stats */}
              <div className="space-y-6">
                {/* Database Status Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Database size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#172033]">
                        Database Cloud
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold">Detail konfigurasi server</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Provider</span>
                      <span className="font-semibold text-slate-800">Neon PostgreSQL</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Region</span>
                      <span className="font-semibold text-slate-800">AWS us-east-2</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Enkripsi SSL</span>
                      <span className="font-semibold text-emerald-600">Require (TLS)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Pooler</span>
                      <span className="font-semibold text-slate-800">Dikelola oleh provider</span>
                    </div>
                  </div>
                </div>

                {/* Database Metrics Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                    Ringkasan Data Database
                  </h3>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs">
                      <span className="font-medium text-slate-600">Total Alumni</span>
                      <span className="font-bold text-[#0b1f3a]">
                        {dbStats.total.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 px-3.5 py-2.5 text-xs">
                      <span className="font-medium text-emerald-800">Terverifikasi</span>
                      <span className="font-bold text-emerald-700">
                        {dbStats.terverifikasi.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-amber-50/60 px-3.5 py-2.5 text-xs">
                      <span className="font-medium text-amber-800">Menunggu Verifikasi</span>
                      <span className="font-bold text-amber-700">
                        {dbStats.menunggu.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-rose-50/60 px-3.5 py-2.5 text-xs">
                      <span className="font-medium text-rose-800">Ditolak</span>
                      <span className="font-bold text-rose-700">
                        {dbStats.ditolak.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* About System Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-xs text-slate-500 space-y-2">
                  <p className="font-bold text-slate-800 text-sm">Sistem Pendataan Alumni</p>
                  <p>Lemhannas Republik Indonesia</p>
                  <p className="text-[11px] text-slate-400">Versi 1.0.0 — Next.js 16 (Turbopack)</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
