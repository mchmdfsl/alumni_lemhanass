"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardCheck,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  UserRoundCheck,
  X,
  MapPin,
} from "lucide-react";

type SidebarData = {
  counts?: {
    menunggu?: number;
  };
};

const menuItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Pengajuan Akun", href: "/admin/pengajuan-akun", icon: UserRoundCheck },
  { label: "Data Alumni", href: "/admin/alumni", icon: Users },
  { label: "Verifikasi Alumni", href: "/admin/verifikasi-alumni", icon: ClipboardCheck, showBadge: true },
  { label: "Angkatan", href: "/admin/angkatan", icon: GraduationCap },
  { label: "Wilayah", href: "/admin/wilayah", icon: MapPin },
  { label: "Laporan", href: "/admin/laporan", icon: FileBarChart },
  { label: "Pengaturan", href: "/admin/pengaturan", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const handleSidebarToggle = () => setMobileOpen((previous) => !previous);
    window.addEventListener("admin-sidebar-toggle", handleSidebarToggle);
    return () => window.removeEventListener("admin-sidebar-toggle", handleSidebarToggle);
  }, []);

  useEffect(() => {
    closeMobileSidebar();
  }, [pathname, closeMobileSidebar]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileSidebar();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeMobileSidebar]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    let cancelled = false;
    async function fetchPendingCount() {
      try {
        const response = await fetch("/api/alumni?limit=1", { cache: "no-store" });
        if (!response.ok) return;
        const data: SidebarData = await response.json();
        if (!cancelled) {
          setPendingCount(typeof data.counts?.menunggu === "number" ? data.counts.menunggu : 0);
        }
      } catch (error) {
        console.error("Gagal mengambil jumlah verifikasi alumni:", error);
      }
    }
    fetchPendingCount();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    if (loadingLogout) return;
    setLoadingLogout(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error("Logout gagal.");
      closeMobileSidebar();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Gagal logout:", error);
      window.alert("Gagal logout. Silakan coba lagi.");
    } finally {
      setLoadingLogout(false);
    }
  };

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeMobileSidebar}
        aria-hidden="true"
      />
      <aside
        id="admin-sidebar"
        aria-label="Navigasi admin"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/admin" onClick={closeMobileSidebar} className="flex min-w-0 items-center gap-3">
            <Image
              src="/images/logo-lemhannas.png"
              alt="Logo LEMHANNAS RI"
              width={52}
              height={52}
              className="h-11 w-11 shrink-0 object-contain"
              priority
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-gray-900">LEMHANNAS RI</h1>
              <p className="text-[11px] text-[#94a3b8]">Panel Administrator</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={closeMobileSidebar}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#0b1f3a] lg:hidden"
            aria-label="Tutup menu"
          >
            <X size={21} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#94a3b8]">Menu Utama</p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileSidebar}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  active ? "bg-[#0b1f3a] text-white shadow-sm" : "text-[#64748b] hover:bg-slate-50 hover:text-[#0b1f3a]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icon size={20} className={`shrink-0 ${active ? "text-white" : "text-[#94a3b8] group-hover:text-[#0b1f3a]"}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {"showBadge" in item && item.showBadge && pendingCount > 0 && (
                  <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#f5f7fa] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b1f3a] text-white">
              <Settings size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#172033]">Administrator</p>
              <p className="text-xs text-gray-500">Panel Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loadingLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#64748b] transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={20} />
            <span>{loadingLogout ? "Sedang keluar..." : "Keluar"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
