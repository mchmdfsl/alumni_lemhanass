"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserRound,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

type AlumniUser = {
  nama?: string;
  email?: string | null;
  nomorAlumni?: string;
  role?: string;
};

const menuItems = [
  { label: "Dashboard", href: "/user", icon: LayoutDashboard },
  { label: "Profil Saya", href: "/user/profil", icon: UserRound },
  { label: "Direktori Alumni", href: "/user/angkatan", icon: Users },
  { label: "Pengaturan", href: "/user/pengaturan", icon: Settings },
];

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<AlumniUser>({});
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok || data.user?.role !== "alumni") {
          router.replace("/login");
          return;
        }

        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) router.replace("/login");
      })
      .finally(() => {
        if (active) setLoadingUser(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Logout gagal.");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout gagal:", error);
      setLoggingOut(false);
      window.alert("Gagal keluar. Silakan coba lagi.");
    }
  }

  const displayName = user.nama || "Alumni";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AL";

  function isActive(href: string) {
    if (href === "/user") return pathname === "/user";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#172033]">
      {menuOpen && (
        <button
          type="button"
          aria-label="Tutup navigasi"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex min-h-20 shrink-0 items-center gap-3 border-b border-slate-100 px-6">
          <Image
            src="/images/logo-lemhannas.png"
            alt="Logo LEMHANNAS RI"
            width={52}
            height={52}
            className="h-11 w-11 object-contain"
          />

          <div>
            <p className="text-sm font-bold text-[#0b1f3a]">
              LEMHANNAS RI
            </p>
            <p className="text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
              Portal Alumni
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.2em] text-[#94a3b8]">
            Menu Alumni
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-[#0b1f3a] text-white shadow-sm"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#0b1f3a]"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="my-5 h-px bg-slate-100" />

          <div className="rounded-xl border border-[#c9a227]/20 bg-[#c9a227]/5 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-[#b28b16]" />
              <p className="text-xs font-bold text-[#0b1f3a]">
                Portal Alumni
              </p>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[#64748b]">
              Perbarui data langsung melalui halaman Profil Saya. Setiap perubahan akan tersimpan ke database.
            </p>
          </div>
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#f5f7fa] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b1f3a] text-sm font-bold text-white">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#172033]">
                {loadingUser ? "Memuat akun..." : displayName}
              </p>
              <p className="truncate text-sm text-[#94a3b8]">
                {user.nomorAlumni || user.email || "Alumni terverifikasi"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#64748b] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            <LogOut size={17} />
            {loggingOut ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:h-20 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl p-2 text-[#64748b] transition hover:bg-slate-100 lg:hidden"
              aria-label="Buka menu"
            >
              <Menu size={21} />
            </button>

            <div>
              <p className="text-sm font-bold text-[#0b1f3a]">
                Portal Alumni
              </p>
              <p className="text-xs text-[#94a3b8]">
                Sistem Informasi Alumni LEMHANNAS RI
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-[#fafbfc] px-3 py-2 sm:flex">
            <GraduationCap size={17} className="text-[#b28b16]" />
            <span className="text-xs font-semibold text-[#475569]">
              Portal Alumni Terverifikasi
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
