"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  ClipboardCheck,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const menuItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Data Alumni",
    href: "/admin/alumni",
    icon: Users,
  },
  {
    label: "Verifikasi Alumni",
    href: "/admin/verifikasi-alumni",
    icon: ClipboardCheck,
    hasBadge: true,
  },
  {
    label: "Angkatan",
    href: "/admin/angkatan",
    icon: GraduationCap,
  },
  {
    label: "Wilayah",
    href: "/admin/wilayah",
    icon: BarChart3,
  },
  {
    label: "Laporan",
    href: "/admin/laporan",
    icon: FileBarChart,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [adminUser, setAdminUser] = useState({
    username: "Administrator",
    email: "admin@gmail.com",
  });

  // Ambil informasi administrator dan jumlah pengajuan.
  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();

        if (response.ok && active && data.user) {
          setAdminUser(data.user);
        }
      })
      .catch(() => undefined);

    fetch("/api/alumni?limit=1", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();

        if (
          response.ok &&
          active &&
          data.counts?.menunggu !== undefined
        ) {
          setPendingCount(data.counts.menunggu);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  // Menerima perintah buka/tutup dari tombol hamburger di header.
  useEffect(() => {
    const handleSidebarToggle = () => {
      setMobileOpen((previous) => !previous);
    };

    window.addEventListener(
      "admin-sidebar-toggle",
      handleSidebarToggle
    );

    return () => {
      window.removeEventListener(
        "admin-sidebar-toggle",
        handleSidebarToggle
      );
    };
  }, []);

  // Tutup sidebar setelah berpindah halaman.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Tutup sidebar menggunakan tombol Escape.
  useEffect(() => {
    if (!mobileOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  // Cegah halaman belakang ikut bergulir ketika sidebar terbuka.
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  async function handleLogout() {
    setMobileOpen(false);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/login");
    }
  }

  const isSettingsActive = pathname === "/admin/pengaturan";

  return (
    <>
      {/* Latar belakang ketika sidebar dibuka di HP */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Tutup menu navigasi"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar desktop dan mobile */}
      <aside
        id="admin-sidebar"
        aria-label="Navigasi administrator"
        aria-hidden={
          typeof window !== "undefined" &&
          window.innerWidth < 1024 &&
          !mobileOpen
        }
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo dan tombol tutup */}
        <div className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/images/logo-lemhannas.png"
              alt="Logo LEMHANNAS RI"
              width={52}
              height={52}
              className="h-11 w-11 shrink-0 object-contain"
            />

            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0b1f3a]">
                LEMHANNAS RI
              </p>

              <p className="text-[10px] font-medium uppercase tracking-wider text-[#94a3b8]">
                Sistem Alumni
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Tutup sidebar"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#0b1f3a] lg:hidden"
          >
            <X size={21} />
          </button>
        </div>

        {/* Navigasi utama */}
        <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-4 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#94a3b8]">
            Menu Utama
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              (item.href !== "/admin" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-[#0b1f3a] text-white shadow-sm"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#0b1f3a]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className="shrink-0"
                  />

                  <span>{item.label}</span>
                </div>

                {item.hasBadge && pendingCount > 0 && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      active
                        ? "bg-amber-400 text-slate-900"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="my-5 h-px bg-slate-100" />

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#94a3b8]">
            Sistem
          </p>

          <Link
            href="/admin/pengaturan"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
              isSettingsActive
                ? "bg-[#0b1f3a] text-white shadow-sm"
                : "text-[#64748b] hover:bg-slate-50 hover:text-[#0b1f3a]"
            }`}
          >
            <Settings size={18} strokeWidth={1.8} />
            <span>Pengaturan</span>
          </Link>
        </nav>

        {/* Profil administrator dan tombol logout */}
        <div className="shrink-0 border-t border-slate-100 p-4">
          <div className="mb-3 rounded-xl bg-[#f5f7fa] p-3">
            <p className="line-clamp-1 text-xs font-bold text-[#172033]">
              {adminUser.username}
            </p>

            <p className="mt-0.5 truncate text-[11px] text-[#94a3b8]">
              {adminUser.email}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#64748b] transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={17} />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
  }
