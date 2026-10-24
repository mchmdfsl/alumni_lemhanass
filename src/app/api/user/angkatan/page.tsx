
"use client";

import { useEffect, useState } from "react";

type Alumni = {
  id: number;
  nama: string;
  angkatan: string | number | null;
  jabatan: string | null;
  instansi: string | null;
};

export default function ListAngkatan() {
  const [filter, setFilter] = useState("");
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAlumni() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (filter.trim()) params.set("q", filter.trim());

        const response = await fetch(
          `/api/user/directory?${params.toString()}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Gagal memuat direktori.");
        }

        if (active) setAlumni(result.data ?? []);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Terjadi kesalahan."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAlumni();

    return () => {
      active = false;
    };
  }, [filter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1f3a]">
          Direktori Alumni
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Cari alumni berdasarkan nama, angkatan, jabatan, atau instansi.
        </p>
      </div>

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Cari nama, tahun angkatan, atau instansi..."
        className="w-full rounded-lg border bg-white p-3"
        aria-label="Cari alumni"
      />

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-6 text-gray-500">Memuat direktori alumni...</p>
      ) : alumni.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
          Tidak ada alumni yang cocok dengan pencarian.
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Menampilkan {alumni.length} alumni. Maksimal 200 hasil per pencarian.
          </p>

          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Angkatan</th>
                  <th className="px-4 py-3">Jabatan</th>
                  <th className="px-4 py-3">Instansi</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {alumni.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[#0b1f3a]">
                      {item.nama || "-"}
                    </td>
                    <td className="px-4 py-3">{item.angkatan ?? "-"}</td>
                    <td className="px-4 py-3">{item.jabatan || "-"}</td>
                    <td className="px-4 py-3">{item.instansi || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
