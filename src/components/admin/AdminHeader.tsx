"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
Bell,
CheckCircle2,
ChevronRight,
Clock,
LogOut,
Menu,
Search,
Settings,
Users,
X,
} from "lucide-react";

interface PendingAlumni {
id: number;
nama: string;
angkatan: string;
instansi: string;
createdAt?: string;
}

export default function AdminHeader() {
const router = useRouter();

const [showNotifications, setShowNotifications] = useState(false);
const [showUserMenu, setShowUserMenu] = useState(false);

const [pendingCount, setPendingCount] = useState<number>(0);
const [pendingList, setPendingList] = useState<PendingAlumni[]>([]);
const [loadingNotif, setLoadingNotif] = useState(false);

const [adminUser, setAdminUser] = useState({
username: "admin",
email: "admin@gmail.com",
});

const notifRef = useRef<HTMLDivElement>(null);
const userMenuRef = useRef<HTMLDivElement>(null);

// Mengambil informasi administrator dan notifikasi pengajuan.
useEffect(() => {
let active = true;

fetch("/api/auth/me", { cache: "no-store" })
  .then(async (res) => {
    const data = await res.json();

    if (res.ok && active && data.user) {
      setAdminUser(data.user);
    }
  })
  .catch(() => undefined);

setLoadingNotif(true);

fetch("/api/alumni?status=Menunggu&limit=4", {
  cache: "no-store",
})
  .then(async (res) => {
    const data = await res.json();

    if (res.ok && active) {
      setPendingCount(data.counts?.menunggu ?? 0);
      setPendingList(data.data ?? []);
    }
  })
  .catch(() => undefined)
  .finally(() => {
    if (active) {
      setLoadingNotif(false);
    }
  });

return () => {
  active = false;
};

}, []);

// Menutup dropdown jika pengguna menekan area di luarnya.
useEffect(() => {
function handleClickOutside(event: MouseEvent) {
const target = event.target as Node;

  if (notifRef.current && !notifRef.current.contains(target)) {
    setShowNotifications(false);
  }

  if (
    userMenuRef.current &&
    !userMenuRef.current.contains(target)
  ) {
    setShowUserMenu(false);
  }
}

document.addEventListener("mousedown", handleClickOutside);

return () => {
  document.removeEventListener("mousedown", handleClickOutside);
};

}, []);

async function handleLogout() {
try {
await fetch("/api/auth/logout", {
method: "POST",
});
} finally {
router.replace("/login");
}
}

// Mengirim event untuk membuka atau menutup sidebar.
function toggleSidebar() {
window.dispatchEvent(new Event("admin-sidebar-toggle"));
}

return (
<header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-6 lg:h-20 lg:px-8">
{/* Bagian kiri: hamburger, pencarian, dan identitas */}
<div className="flex min-w-0 flex-1 items-center gap-3">
<button
type="button"
onClick={toggleSidebar}
aria-label="Buka atau tutup menu navigasi"
aria-controls="admin-sidebar"
className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#0b1f3a] transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b16] lg:hidden"
>
<Menu size={21} />
</button>

    {/* Pencarian pada layar tablet dan desktop */}
    <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-[#fafbfc] px-3 sm:flex">
      <Search size={16} className="shrink-0 text-[#94a3b8]" />

      <input
        type="text"
        placeholder="Cari menu / data..."
        aria-label="Cari menu atau data"
        className="h-10 w-36 bg-transparent text-sm outline-none placeholder:text-[#94a3b8] md:w-48"
      />
    </div>

    {/* Identitas pada HP */}
    <div className="min-w-0 sm:hidden">
      <p className="truncate text-sm font-bold text-[#0b1f3a]">
        LEMHANNAS RI
      </p>

      <p className="text-[10px] text-[#94a3b8]">
        Admin Panel
      </p>
    </div>
  </div>

  {/* Bagian kanan: notifikasi dan profil administrator */}
  <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
    {/* Notifikasi pengajuan alumni */}
    <div className="relative" ref={notifRef}>
      <button
        type="button"
        onClick={() => {
          setShowNotifications((previous) => !previous);
          setShowUserMenu(false);
        }}
        aria-label="Pemberitahuan"
        aria-expanded={showNotifications}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
          showNotifications
            ? "bg-[#0b1f3a]/10 text-[#0b1f3a]"
            : "text-[#64748b] hover:bg-slate-50 hover:text-[#0b1f3a]"
        }`}
        title="Pemberitahuan"
      >
        <Bell size={19} />

        {pendingCount > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#9e1b32]" />
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="fixed left-3 right-3 top-[4.5rem] z-50 max-h-[75vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:max-h-[32rem] sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#172033]">
                Notifikasi
              </h3>

              {pendingCount > 0 && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  {pendingCount} Baru
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              aria-label="Tutup notifikasi"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mt-3 max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {loadingNotif ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Memuat notifikasi...
              </div>
            ) : pendingCount === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2
                  size={24}
                  className="mx-auto mb-2 text-emerald-500"
                />

                <p className="text-xs font-semibold text-slate-700">
                  Semua Data Bersih
                </p>

                <p className="mt-0.5 text-[11px] text-slate-400">
                  Tidak ada pengajuan yang menunggu verifikasi.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2 rounded-xl border border-amber-200/60 bg-amber-50/70 p-3 text-xs text-amber-900">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Clock size={14} className="text-amber-600" />
                    {pendingCount} Pengajuan Menunggu
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                    Data alumni baru siap diperiksa dan divalidasi
                    oleh administrator.
                  </p>
                </div>

                {pendingList.map((alumni) => (
                  <div
                    key={alumni.id}
                    className="rounded-lg px-1 py-2.5 transition hover:bg-slate-50/80"
                  >
                    <p className="line-clamp-1 text-xs font-bold text-slate-800">
                      {alumni.nama}
                    </p>

                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                      {alumni.angkatan} •{" "}
                      {alumni.instansi || "Instansi belum diisi"}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <Link
              href="/admin/verifikasi-alumni"
              onClick={() => setShowNotifications(false)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0b1f3a] py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1a365d]"
            >
              Buka Halaman Verifikasi
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>

    <div className="hidden h-8 w-px bg-slate-200 sm:block" />

    {/* Profil administrator */}
    <div className="relative" ref={userMenuRef}>
      <button
        type="button"
        onClick={() => {
          setShowUserMenu((previous) => !previous);
          setShowNotifications(false);
        }}
        aria-label="Menu akun administrator"
        aria-expanded={showUserMenu}
        className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-50"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f3a] text-xs font-bold text-white shadow-sm">
          AD
        </div>

        <div className="hidden text-left sm:block">
          <p className="line-clamp-1 text-xs font-bold text-[#172033]">
            {adminUser.username}
          </p>

          <p className="text-[10px] text-[#94a3b8]">
            Administrator
          </p>
        </div>
      </button>

      {showUserMenu && (
        <div className="fixed right-3 top-[4.5rem] z-50 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:absolute sm:right-0 sm:top-auto sm:mt-2">
          <div className="border-b border-slate-100 px-2 pb-3 pt-1">
            <p className="text-xs font-bold text-[#172033]">
              Akun Administrator
            </p>

            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {adminUser.email}
            </p>
          </div>

          <div className="space-y-1 py-2">
            <Link
              href="/admin/pengaturan"
              onClick={() => setShowUserMenu(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0b1f3a]"
            >
              <Settings size={15} className="text-[#b28b16]" />
              Pengaturan Sistem
            </Link>

            <Link
              href="/admin/alumni"
              onClick={() => setShowUserMenu(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0b1f3a]"
            >
              <Users size={15} className="text-slate-500" />
              Daftar Alumni
            </Link>
          </div>

          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <LogOut size={15} />
              Keluar dari Sistem
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
</header>

);
  }sName="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowUserMenu((previous) => !previous);
              setShowNotifications(false);
            }}
            aria-label="Menu akun administrator"
            aria-expanded={showUserMenu}
            className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f3a] text-xs font-bold text-white shadow-sm">
              AD
            </div>

            <div className="hidden text-left sm:block">
              <p className="line-clamp-1 text-xs font-bold text-[#172033]">
                {adminUser.username}
              </p>

              <p className="text-[10px] text-[#94a3b8]">
                Administrator
              </p>
            </div>
          </button>

          {/* Dropdown akun administrator */}
          {showUserMenu && (
            <div className="fixed right-3 top-[4.5rem] z-50 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:absolute sm:right-0 sm:top-auto sm:mt-2">
              <div className="border-b border-slate-100 px-2 pb-3 pt-1">
                <p className="text-xs font-bold text-[#172033]">
                  Akun Administrator
                </p>

                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  {adminUser.email}
                </p>
              </div>

              <div className="space-y-1 py-2">
                <Link
                  href="/admin/pengaturan"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0b1f3a]"
                >
                  <Settings
                    size={15}
                    className="text-[#b28b16]"
                  />
                  Pengaturan Sistem
                </Link>

                <Link
                  href="/admin/alumni"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0b1f3a]"
                >
                  <Users size={15} className="text-slate-500" />
                  Daftar Alumni
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut size={15} />
                  Keluar dari Sistem
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
  }erMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0b1f3a]"
                >
                  <Settings size={15} className="text-[#b28b16]" />
                  Pengaturan Sistem
                </Link>

                <Link
                  href="/admin/alumni"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0b1f3a]"
                >
                  <Users size={15} className="text-slate-500" />
                  Daftar Alumni
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut size={15} />
                  Keluar dari Sistem
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
