"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
BarChart3,
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
{
label: "Dashboard",
href: "/admin",
icon: LayoutDashboard,
},
{
label: "Pengajuan Akun",
href: "/admin/pengajuan-akun",
icon: UserRoundCheck,
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
showBadge: true,
},
{
label: "Angkatan",
href: "/admin/angkatan",
icon: GraduationCap,
},
{
label: "Wilayah",
href: "/admin/wilayah",
icon: MapPin,
},
{
label: "Laporan",
href: "/admin/laporan",
icon: FileBarChart,
},
{
label: "Pengaturan",
href: "/admin/pengaturan",
icon: Settings,
},
];

export default function AdminSidebar() {
const pathname = usePathname();
const router = useRouter();

const [mobileOpen, setMobileOpen] = useState(false);
const [loadingLogout, setLoadingLogout] = useState(false);
const [pendingCount, setPendingCount] = useState(0);

const closeMobileSidebar = useCallback(() => {
setMobileOpen(false);
}, []);

// Menerima event dari tombol hamburger AdminHeader.
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

// Tutup sidebar ketika berpindah halaman.
useEffect(() => {
closeMobileSidebar();
}, [pathname, closeMobileSidebar]);

// Tutup sidebar menggunakan tombol Escape.
useEffect(() => {
const handleEscape = (event: KeyboardEvent) => {
if (event.key === "Escape") {
closeMobileSidebar();
}
};

window.addEventListener("keydown", handleEscape);

return () => {
  window.removeEventListener("keydown", handleEscape);
};

}, [closeMobileSidebar]);

// Cegah halaman di belakang ikut bergulir saat menu mobile terbuka.
useEffect(() => {
if (!mobileOpen) return;

const previousOverflow = document.body.style.overflow;
document.body.style.overflow = "hidden";

return () => {
  document.body.style.overflow = previousOverflow;
};

}, [mobileOpen]);

// Mengambil jumlah alumni yang menunggu verifikasi.
useEffect(() => {
let cancelled = false;

async function fetchPendingCount() {
  try {
    const response = await fetch("/api/alumni?limit=1", {
      cache: "no-store",
    });

    if (!response.ok) return;

    const data: SidebarData = await response.json();

    if (!cancelled) {
      setPendingCount(
        typeof data.counts?.menunggu === "number"
          ? data.counts.menunggu
          : 0
      );
    }
  } catch (error) {
    console.error(
      "Gagal mengambil jumlah verifikasi alumni:",
      error
    );
  }
}

fetchPendingCount();

return () => {
  cancelled = true;
};

}, []);

// Logout.
const handleLogout = async () => {
if (loadingLogout) return;

setLoadingLogout(true);

try {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Logout gagal.");
  }

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

const isActive = (href: string) => {
if (href === "/admin") {
return pathname === "/admin";
}

return pathname === href || pathname.startsWith(`${href}/`);

};

return (
<>
{/* Overlay mobile */}
<div
className={"fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${ mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0" }"}
onClick={closeMobileSidebar}
aria-hidden="true"
/>

  {/* Sidebar utama */}
  <aside
    id="admin-sidebar"
    aria-label="Navigasi admin"
    className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${
      mobileOpen ? "translate-x-0" : "-translate-x-full"
    }`}
  >
    {/* Header logo */}
    <div className="flex h-20 shrink-0 items-center justify-between border-b border-gray-200 px-5">
      <Link
        href="/admin"
        onClick={closeMobileSidebar}
        className="flex min-w-0 items-center gap-3"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
          <GraduationCap size={25} />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-gray-900">
            Alumni Lemhannas
          </h1>
          <p className="text-xs text-gray-500">
            Panel Administrator
          </p>
        </div>
      </Link>

      <button
        type="button"
        onClick={closeMobileSidebar}
        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 lg:hidden"
        aria-label="Tutup menu"
      >
        <X size={21} />
      </button>
    </div>

    {/* Daftar navigasi */}
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Menu Utama
      </p>

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
              active
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Icon
                size={20}
                className={`shrink-0 ${
                  active
                    ? "text-blue-700"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
              />

              <span className="truncate">{item.label}</span>
            </span>

            {"showBadge" in item &&
              item.showBadge &&
              pendingCount > 0 && (
                <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
          </Link>
        );
      })}
    </nav>

    {/* Informasi admin */}
    <div className="shrink-0 border-t border-gray-200 p-4">
      <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <Settings size={20} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800">
            Administrator
          </p>
          <p className="text-xs text-gray-500">
            Panel Admin
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loadingLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut size={20} />
        <span>
          {loadingLogout ? "Sedang keluar..." : "Keluar"}
        </span>
      </button>
    </div>
  </aside>
</>

);
}
