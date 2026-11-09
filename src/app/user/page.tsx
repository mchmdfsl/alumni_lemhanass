"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserRound,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  Users,
  CircleCheck,
  IdCard,
  Clock3,
} from "lucide-react";

type AlumniUser = {
  id?: number;
  nama?: string;
  email?: string | null;
  nomorAlumni?: string;
  role?: string;
};

export default function UserDashboardPage() {
  const [user, setUser] = useState<AlumniUser>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || data.user?.role !== "alumni") {
          return;
        }

        if (active) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Gagal memuat data alumni:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  const displayName = user.nama || "Alumni";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AL";

  return (
    <div className="space-y-6">
      {/* Judul dashboard */}
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">
          Dashboard Alumni
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">
              Selamat Datang, {loading ? "..." : displayName}
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
              Selamat datang di Portal Alumni LEMHANNAS RI.
              Pantau informasi dan kelola data profil alumni Anda.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:self-auto">
            <ShieldCheck size={18} className="text-[#b28b16]" />
            <span className="text-sm font-medium text-[#475569]">
              Portal Alumni
            </span>
          </div>
        </div>
      </section>

      {/* Kartu informasi */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <InfoCard
          title="Nama Alumni"
          value={loading ? "Memuat..." : displayName}
          description="Identitas akun Anda"
          icon={UserRound}
        />

        <InfoCard
          title="Nomor Alumni"
          value={loading ? "..." : user.nomorAlumni || "-"}
          description="Nomor identitas alumni"
          icon={IdCard}
        />

        <InfoCard
          title="Status Akun"
          value="Terverifikasi"
          description="Akun dapat digunakan"
          icon={CircleCheck}
        />

      </section>

      {/* Konten utama */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Profil */}
        <div className="space-y-6 xl:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-bold text-[#172033]">
                  Informasi Profil
                </h2>
                <p className="mt-1 text-xs text-[#94a3b8]">
                  Ringkasan identitas akun alumni Anda
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1f3a]/5">
                <UserRound size={20} className="text-[#0b1f3a]" />
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0b1f3a] text-xl font-bold text-white">
                  {initials}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-[#0b1f3a]">
                    {loading ? "Memuat data..." : displayName}
                  </h3>

                  <p className="mt-1 truncate text-sm text-[#64748b]">
                    {user.email || "Email tidak tersedia"}
                  </p>

                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <ShieldCheck size={13} />
                    Alumni Terverifikasi
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                <ProfileRow
                  label="Nama Lengkap"
                  value={user.nama || "-"}
                />

                <ProfileRow
                  label="Nomor Alumni"
                  value={user.nomorAlumni || "-"}
                />

                <ProfileRow
                  label="Email"
                  value={user.email || "-"}
                />
              </div>

              <Link
                href="/user/profil"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#18385f] sm:w-auto"
              >
                Lihat Profil Saya
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Informasi layanan */}
          <div className="rounded-2xl border border-[#c9a227]/20 bg-gradient-to-r from-white to-[#c9a227]/5 p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c9a227]/10">
                <GraduationCap size={22} className="text-[#b28b16]" />
              </div>

              <div>
                <h2 className="font-bold text-[#0b1f3a]">
                  Tetap Terhubung dengan Alumni
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
                  Gunakan direktori alumni untuk melihat informasi
                  rekan alumni. Jika terdapat data yang perlu diperbarui,
                  perbarui langsung melalui halaman Profil Saya.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu cepat */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="font-bold text-[#172033]">
                Akses Cepat
              </h2>

              <p className="mt-1 text-xs text-[#94a3b8]">
                Pilih layanan yang ingin Anda buka
              </p>
            </div>

            <div className="space-y-3">
              <QuickLink
                href="/user/profil"
                title="Profil Saya"
                description="Informasi identitas alumni"
                icon={UserRound}
              />

              <QuickLink
                href="/user/angkatan"
                title="Direktori Alumni"
                description="Lihat daftar rekan alumni"
                icon={Users}
              />

            </div>
          </div>

          {/* Panduan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Clock3 size={19} className="text-[#b28b16]" />
              </div>

              <div>
                <h2 className="font-bold text-[#172033]">
                  Informasi Penting
                </h2>
                <p className="text-xs text-[#94a3b8]">
                  Panduan penggunaan portal
                </p>
              </div>
            </div>

            <ul className="space-y-3 text-sm leading-relaxed text-[#64748b]">
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b28b16]" />
                Pastikan informasi profil Anda sesuai.
              </li>

              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b28b16]" />
                Hubungi administrator jika membutuhkan bantuan terkait akun.
              </li>

              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b28b16]" />
                Jaga kerahasiaan akun dan informasi login Anda.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof UserRound;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b1f3a]/5">
          <Icon size={21} strokeWidth={1.8} className="text-[#0b1f3a]" />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-[#64748b]">{title}</p>

        <h3 className="mt-2 break-words text-xl font-bold tracking-tight text-[#172033]">
          {value}
        </h3>

        <p className="mt-2 text-xs text-[#94a3b8]">{description}</p>
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs font-medium text-[#94a3b8]">
        {label}
      </span>

      <span className="break-words text-sm font-semibold text-[#172033] sm:text-right">
        {value}
      </span>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof UserRound;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-[#0b1f3a]/15 hover:bg-[#f5f7fa]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b1f3a]/5 transition group-hover:bg-[#0b1f3a]">
        <Icon
          size={19}
          className="text-[#0b1f3a] transition group-hover:text-white"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#172033]">{title}</p>
        <p className="mt-1 text-xs text-[#94a3b8]">{description}</p>
      </div>

      <ArrowRight
        size={16}
        className="shrink-0 text-[#94a3b8] transition group-hover:translate-x-0.5 group-hover:text-[#0b1f3a]"
      />
    </Link>
  );
}
