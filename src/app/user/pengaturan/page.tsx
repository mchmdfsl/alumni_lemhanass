"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleUserRound,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
  Settings as SettingsIcon,
  LoaderCircle,
} from "lucide-react";

type Account = {
  nama?: string | null;
  email?: string | null;
  nomorAlumni?: string | null;
  role?: string;
};

export default function PengaturanPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || result.user?.role !== "alumni") {
          router.replace("/login");
          return;
        }

        if (active) setAccount(result.user as Account);
      } catch {
        if (active) setError("Informasi akun tidak dapat dimuat. Periksa koneksi lalu muat ulang halaman.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAccount();
    return () => {
      active = false;
    };
  }, [router, reloadKey]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Permintaan logout gagal.");
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal keluar dari akun. Silakan coba lagi.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 bg-[#0b1f3a] px-5 py-6 text-white sm:px-7">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Pengaturan Akun</h1>
            <p className="mt-1 text-sm text-slate-300">Kelola informasi akun dan keamanan akses portal alumni.</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mx-5 mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-2 font-semibold underline underline-offset-2"
              >
                Coba muat ulang
              </button>
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e8edf4] text-[#0b1f3a]">
              <CircleUserRound size={29} />
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin" />Memuat informasi akun...</p>
              ) : (
                <>
                  <h2 className="break-words text-lg font-bold text-[#172033]">{account?.nama || "Alumni"}</h2>
                  <p className="mt-1 break-all text-sm text-slate-500">{account?.email || "Email tidak tersedia"}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={14} /> Akun alumni aktif
                  </span>
                </>
              )}
            </div>
            <Link href="/user/profil" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#18385f]">
              Lihat Profil <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="font-bold text-[#172033]">Informasi Akun</h2>
          <p className="mt-1 text-sm text-slate-500">Data ini digunakan untuk mengenali akun Anda di portal alumni.</p>
        </div>
        <div className="divide-y divide-slate-100">
          <SettingRow icon={UserRound} title="Nama alumni" description={loading ? "Memuat..." : account?.nama || "Belum tersedia"} />
          <SettingRow icon={CircleUserRound} title="Email akun" description={loading ? "Memuat..." : account?.email || "Belum tersedia"} />
          <SettingRow icon={ShieldCheck} title="Nomor alumni" description={loading ? "Memuat..." : account?.nomorAlumni || "Belum tersedia"} />
        </div>
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <p className="text-sm leading-6 text-slate-600">
            Untuk memperbarui nama, angkatan, jabatan, atau instansi, buka halaman Profil Saya dan kirim permintaan perubahan. Perubahan akan ditinjau administrator sebelum diterapkan.
          </p>
          <Link href="/user/profil" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#0b1f3a] hover:text-[#b28b16]">
            Ajukan perubahan profil <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="font-bold text-[#172033]">Keamanan & Sesi</h2>
          <p className="mt-1 text-sm text-slate-500">Informasi tentang akses dan keamanan akun Anda.</p>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0b1f3a]">
              <KeyRound size={19} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#172033]">Kata sandi</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Ganti kata sandi secara berkala dan jangan bagikan kepada orang lain.</p>
              <Link href="/user/ubah-password" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#0b1f3a] hover:text-[#b28b16]">Ubah kata sandi <ArrowRight size={15} /></Link>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0b1f3a]">
              <ShieldCheck size={19} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#172033]">Status verifikasi</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Direktori dan fitur alumni tersedia bagi akun aktif yang terhubung dengan data alumni terverifikasi.</p>
            </div>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
            <div className="flex items-start gap-3">
              <LogOut size={19} className="mt-0.5 shrink-0 text-red-600" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-800">Keluar dari akun</h3>
                <p className="mt-1 text-sm leading-6 text-red-700">Akhiri sesi portal alumni pada perangkat ini.</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}
                  {loggingOut ? "Sedang keluar..." : "Keluar dari akun"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-4 sm:px-6">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className="mt-1 break-words text-sm font-semibold text-[#172033]">{description}</p>
      </div>
    </div>
  );
}
