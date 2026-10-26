"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        const isAdmin = response.ok && (data.user?.role === "admin" || data.user?.role === "super_admin");
        if (!isAdmin) router.replace(`/login?next=${encodeURIComponent(pathname || "/admin")}`);
        else if (active) setReady(true);
      })
      .catch(() => router.replace("/login"));
    return () => { active = false; };
  }, [pathname, router]);
  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] text-sm text-slate-600">Memeriksa sesi admin…</main>;
  return children;
}
