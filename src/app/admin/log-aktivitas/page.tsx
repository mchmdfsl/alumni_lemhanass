"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

type AuditLog = { id: number; action: string; actor: string; alumniId: number | null; details: unknown; createdAt: string };
type PageData = { logs: AuditLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

function labelAction(action: string) {
  const known: Record<string, string> = {
    edit: "Edit data alumni",
    delete: "Hapus alumni",
    bulk_delete: "Hapus alumni massal",
    "status:Terverifikasi": "Verifikasi alumni",
    "status:Ditolak": "Tolak alumni",
    "status:Menunggu": "Kembalikan ke menunggu",
    admin_created: "Buat akun Admin",
    admin_updated: "Ubah status Admin",
    admin_deleted: "Hapus akun Admin",
    login: "Login",
    logout: "Logout",
    user_request_reviewed: "Proses permintaan alumni",
    settings_updated: "Ubah pengaturan",
  };
  return known[action] || action.replaceAll("_", " ");
}

export default function LogAktivitasPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async (nextPage = page, q = query) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/activity-logs?page=${nextPage}&limit=25&q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) { router.replace("/login"); return; }
      if (!response.ok) throw new Error(result.error || "Gagal memuat log aktivitas.");
      setData(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Terjadi kesalahan."); }
    finally { setLoading(false); }
  }, [page, query, router]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok || !["admin", "super_admin"].includes(result.user?.role)) { router.replace("/login"); return; }
      setRole(result.user.role);
      void loadLogs(1, "");
    }).catch(() => router.replace("/login"));
  }, [loadLogs, router]);

  function search(event: React.FormEvent) {
    event.preventDefault();
    setPage(1); setQuery(draftQuery.trim());
    void loadLogs(1, draftQuery.trim());
  }

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  };

  return <div className="min-h-screen bg-[#f5f7fa]">
    <AdminSidebar />
    <div className="lg:pl-72"><AdminHeader />
      <main className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#0b1f3a] p-3 text-white"><Activity size={24} /></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">Khusus Admin & Super Admin</p>
            <h1 className="mt-1 text-2xl font-bold text-[#0b1f3a] sm:text-3xl">Log Aktivitas</h1>
            <p className="mt-2 text-sm text-slate-500">Riwayat tindakan administratif yang tercatat di sistem. Log tidak dapat diakses oleh akun Alumni.</p></div>
        </div>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <form onSubmit={search} className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
            <div className="relative flex-1"><Search size={17} className="absolute left-3 top-3 text-slate-400" />
              <input value={draftQuery} onChange={(e) => setDraftQuery(e.target.value)} placeholder="Cari akun, aktivitas, atau detail..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#b28b16]" /></div>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white"><Search size={16} />Cari</button>
            <button type="button" onClick={() => void loadLogs(page, query)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16} />Muat ulang</button>
          </form>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm text-slate-500"><span>{data?.pagination.total ?? 0} aktivitas tercatat</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{role === "super_admin" ? "Super Admin" : "Admin"}</span></div>
          {loading ? <div className="p-10 text-center text-sm text-slate-500">Memuat log aktivitas...</div> : !data?.logs.length ? <div className="p-10 text-center text-sm text-slate-500">Belum ada aktivitas yang cocok dengan pencarian.</div> :
            <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Waktu</th><th className="px-5 py-3">Akun</th><th className="px-5 py-3">Aktivitas</th><th className="px-5 py-3">Detail</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{data.logs.map((log) => <tr key={log.id} className="align-top hover:bg-slate-50/70"><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(log.createdAt)}</td><td className="px-5 py-4"><span className="font-semibold text-slate-800">{log.actor || "Akun lama (belum tercatat)"}</span><p className="mt-1 text-xs text-slate-400">{String((log.details as { actorRole?: string } | null)?.actorRole || "Peran belum tercatat")}</p></td><td className="px-5 py-4 font-medium text-slate-700">{labelAction(log.action)}</td><td className="max-w-md whitespace-normal px-5 py-4 text-xs leading-5 text-slate-500"><pre className="whitespace-pre-wrap break-words font-sans">{JSON.stringify(log.details ?? {}, null, 2)}</pre>{log.alumniId ? <span className="mt-1 inline-block">ID Alumni: {log.alumniId}</span> : null}</td></tr>)}</tbody>
            </table></div>}
          <div className="flex items-center justify-between border-t border-slate-100 p-4"><p className="text-xs text-slate-500">Halaman {data?.pagination.page ?? page} dari {data?.pagination.totalPages ?? 1}</p>
            <div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => { const next = page - 1; setPage(next); void loadLogs(next, query); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft size={16} />Sebelumnya</button>
              <button disabled={loading || page >= (data?.pagination.totalPages ?? 1)} onClick={() => { const next = page + 1; setPage(next); void loadLogs(next, query); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40">Berikutnya<ChevronRight size={16} /></button></div>
          </div>
        </section>
      </div></main>
    </div>
  </div>;
}
