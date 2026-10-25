
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type RequestItem = {
  id: number;
  email: string;
  requestType: string;
  status: string;
  createdAt: string;
  alumniId: number | null;
  nomorAlumni: string | null;
  namaAlumni: string | null;
};

export default function PengajuanAkunPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/alumni-accounts/requests",
        { cache: "no-store" },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal memuat pengajuan.");
      }

      setItems(result.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function review(
    item: RequestItem,
    status: "Disetujui" | "Ditolak",
  ) {
    let reviewNote = "";

    if (status === "Ditolak") {
      reviewNote = window.prompt("Masukkan alasan penolakan:")?.trim() ?? "";
      if (!reviewNote) return;
    } else {
      const confirmed = window.confirm(
        `Setujui pengajuan akun ${item.email}?`,
      );
      if (!confirmed) return;
    }

    setBusyId(item.id);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/alumni-accounts/requests/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reviewNote }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Pengajuan gagal diproses.");
      }

      await loadRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="text-sm font-medium text-blue-800"
        >
          ← Kembali ke Dashboard
        </Link>

        <header className="mb-6 mt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Administrasi Alumni
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Pengajuan Akun Alumni
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Periksa identitas sebelum menyetujui akses akun.
          </p>
        </header>

        <section className="mb-4 flex items-center justify-between rounded-xl border bg-white p-4">
          <div>
            <p className="text-sm text-slate-500">
              Pengajuan menunggu
            </p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
          <button
            onClick={() => void loadRequests()}
            disabled={loading}
            className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Muat ulang
          </button>
        </section>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="p-6 text-center">Memuat pengajuan...</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="font-semibold">Tidak ada pengajuan menunggu.</p>
            <p className="mt-1 text-sm text-slate-500">
              Pengajuan baru akan muncul di halaman ini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">
                      {item.namaAlumni || "Data alumni belum cocok"}
                    </h2>
                    <p className="mt-1 break-all text-sm text-slate-600">
                      {item.email}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Nomor alumni: {item.nomorAlumni || "Belum terhubung"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Jenis: {item.requestType} · ID pengajuan: {item.id}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    {item.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => void review(item, "Disetujui")}
                    disabled={busyId !== null || item.alumniId === null}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {busyId === item.id ? "Memproses..." : "Setujui"}
                  </button>
                  <button
                    onClick={() => void review(item, "Ditolak")}
                    disabled={busyId !== null}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-40"
                  >
                    Tolak
                  </button>
                </div>

                {item.alumniId === null && (
                  <p className="mt-3 text-xs text-amber-700">
                    Pengajuan belum terhubung ke data alumni. Cocokkan
                    identitas terlebih dahulu; persetujuan dinonaktifkan.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
