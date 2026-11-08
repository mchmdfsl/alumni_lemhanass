"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserPlus, RefreshCw, Trash2, UserRoundCheck, UserRoundX } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

type AdminUser = { id: number; username: string; email: string; kategoriProgram: string | null; isActive: boolean; createdAt?: string; updatedAt?: string };

const adminGroups = [
  { value: "ADMIN_GROUP_1", label: "Admin 1 · KRA, PPRA, P4N" },
  { value: "ADMIN_GROUP_2", label: "Admin 2 · KSA, PPSA, P3N" },
  { value: "ADMIN_GROUP_3", label: "Admin 3 · TAPLAI, PPNK, PPNK KOLABORASI" },
  { value: "ADMIN_GROUP_4", label: "Admin 4 · TOT" },
];

export default function ManajemenAdminPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kategoriProgram, setKategoriProgram] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 403 || response.status === 401) { router.replace("/admin"); return; }
      if (!response.ok) throw new Error(data.error || "Gagal memuat daftar admin.");
      setUsers(data.users || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Terjadi kesalahan."); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || data.user?.role !== "super_admin") { router.replace("/admin"); return; }
      setRole(data.user.role);
      void loadUsers();
    }).catch(() => router.replace("/login"));
  }, [loadUsers, router]);

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, email, password, kategoriProgram }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal membuat akun admin.");
      setUsername(""); setEmail(""); setPassword(""); setKategoriProgram(""); setNotice("Akun admin berhasil dibuat.");
      await loadUsers();
    } catch (e) { setError(e instanceof Error ? e.message : "Terjadi kesalahan."); }
    finally { setSaving(false); }
  }

  async function changeCategory(user: AdminUser, nextCategory: string) {
    if (user.kategoriProgram === nextCategory) return;
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategoriProgram: nextCategory }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengubah kategori admin.");
      setNotice(`Kelompok akun ${user.username} berhasil diperbarui.`);
      await loadUsers();
    } catch (e) { setError(e instanceof Error ? e.message : "Terjadi kesalahan."); }
  }

  async function toggleStatus(user: AdminUser) {
    const action = user.isActive ? "menonaktifkan" : "mengaktifkan";
    if (!window.confirm(`Yakin ingin ${action} akun ${user.username}?`)) return;
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !user.isActive }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengubah status akun.");
      setNotice(`Status akun ${user.username} berhasil diperbarui.`); await loadUsers();
    } catch (e) { setError(e instanceof Error ? e.message : "Terjadi kesalahan."); }
  }

  async function deleteUser(user: AdminUser) {
    if (!window.confirm(`Hapus akun admin "${user.username}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus akun.");
      setNotice(`Akun ${user.username} berhasil dihapus.`); await loadUsers();
    } catch (e) { setError(e instanceof Error ? e.message : "Terjadi kesalahan."); }
  }

  if (role !== "super_admin") return <div className="min-h-screen bg-[#f5f7fa]"><AdminSidebar /><div className="lg:pl-72"><AdminHeader /><main className="p-8 text-sm text-slate-500">Memeriksa akses Super Admin...</main></div></div>;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <AdminSidebar />
      <div className="lg:pl-72">
        <AdminHeader />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[#0b1f3a] p-3 text-white"><ShieldCheck size={24} /></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">Khusus Super Admin</p><h1 className="mt-1 text-2xl font-bold text-[#0b1f3a] sm:text-3xl">Manajemen Akun Admin</h1><p className="mt-2 text-sm text-slate-500">Buat, aktifkan, nonaktifkan, dan hapus akun Admin. Akun Super Admin tidak dikelola dari halaman ini.</p></div>
            </div>
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3"><UserPlus className="text-[#b28b16]" size={22} /><div><h2 className="font-bold text-[#172033]">Tambah akun Admin</h2><p className="text-xs text-slate-500">Password minimal 12 karakter.</p></div></div>
              <form onSubmit={createAdmin} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Username<input required minLength={3} maxLength={80} pattern="[a-zA-Z0-9._-]+" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#b28b16] focus:ring-2 focus:ring-[#b28b16]/20" /></label>
                <label className="text-sm font-medium text-slate-700">Email<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#b28b16] focus:ring-2 focus:ring-[#b28b16]/20" /></label>
                <label className="text-sm font-medium text-slate-700">Kelompok Admin<select required value={kategoriProgram} onChange={(e) => setKategoriProgram(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#b28b16] focus:ring-2 focus:ring-[#b28b16]/20"><option value="" disabled>Pilih kelompok Admin</option>{adminGroups.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}</select></label>
                <label className="text-sm font-medium text-slate-700 md:col-span-2">Password<input required type="password" minLength={12} maxLength={1024} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#b28b16] focus:ring-2 focus:ring-[#b28b16]/20" /></label>
                <div className="md:col-span-2"><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#15365f] disabled:opacity-60"><UserPlus size={17} />{saving ? "Menyimpan..." : "Buat akun Admin"}</button></div>
              </form>
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-bold text-[#172033]">Daftar akun Admin</h2><p className="mt-1 text-xs text-slate-500">{users.length} akun tercatat</p></div><button onClick={() => void loadUsers()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><RefreshCw size={15} />Muat ulang</button></div>
              {loading ? <div className="p-8 text-center text-sm text-slate-500">Memuat akun admin...</div> : users.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Belum ada akun Admin yang dibuat melalui halaman ini.</div> :
                <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Akun</th><th className="px-5 py-3">Kelompok Admin</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Dibuat</th><th className="px-5 py-3 text-right">Tindakan</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-semibold text-slate-800">{user.username}</p><p className="mt-1 text-xs text-slate-500">{user.email}</p></td><td className="px-5 py-4"><select aria-label={`Kategori untuk ${user.username}`} value={user.kategoriProgram || ""} onChange={(e) => void changeCategory(user, e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"><option value="" disabled>Pilih kelompok Admin</option>{adminGroups.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}</select></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{user.isActive ? "Aktif" : "Nonaktif"}</span></td><td className="px-5 py-4 text-slate-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID") : "-"}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => void toggleStatus(user)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${user.isActive ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>{user.isActive ? <UserRoundX size={14} /> : <UserRoundCheck size={14} />}{user.isActive ? "Nonaktifkan" : "Aktifkan"}</button><button onClick={() => void deleteUser(user)} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"><Trash2 size={14} />Hapus</button></div></td></tr>)}</tbody></table></div>
              }
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
