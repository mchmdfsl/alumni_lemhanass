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

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [adminUser, setAdminUser] = useState({ username: "Administrator", email: "admin@gmail.com" });

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok && active && d.user) setAdminUser(d.user);
      })
      .catch(() => undefined);

    fetch("/api/alumni?limit=1", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok && active && d.counts?.menunggu !== undefined) {
          setPendingCount(d.counts.menunggu);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
    }
  }

  const isSettingsActive = pathname === "/admin/pengaturan";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
        <Image
          src="/images/logo-lemhannas.png"
          alt="Logo LEMHANNAS RI"
          width={52}
          height={52}
          className="h-11 w-11 object-contain"
        />

        <div>
          <p className="text-sm font-bold text-[#0b1f3a]">LEMHANNAS RI</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#94a3b8]">
            Sistem Alumni
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#94a3b8]">
          Menu Utama
        </p>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-[#0b1f3a] text-white shadow-sm"
                  : "text-[#64748b] hover:bg-slate-50 hover:text-[#0b1f3a]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </div>

              {item.hasBadge && pendingCount > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
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

      {/* Bottom Profile */}
      <div className="border-t border-slate-100 p-4">
        <div className="mb-3 rounded-xl bg-[#f5f7fa] p-3">
          <p className="text-xs font-bold text-[#172033] line-clamp-1">
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
  );
}
