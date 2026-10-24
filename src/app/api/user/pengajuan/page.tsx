
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type RequestItem = {
  id: number;
  requestType: string;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

const requestLabels: Record<string, string> = {
  profile_update: "Perubahan profil",
  data_update: "Perubahan data",
  delete_account: "Penghapusan akun",
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function PengajuanPage() {
  const [jenis, setJenis] = useState("data_update");
  const [pesan, setPesan] = useState("");
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch("/api/user/requests", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal memuat pengajuan.");
      }

      setRequests(result.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/user/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: jenis,
          message: pesan,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengirim pengajuan.");
      }

      setPesan("");
      setSuccess("Pengajuan berhasil dikirim dan menunggu tinjauan admin.");

      await loadRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0b1f3a]">
          Pengajuan Alumni
        </h1>

        <p className="mb-6 mt-2 text-sm text-gray-600">
          Kirim permintaan kepada admin. Pengajuan tidak langsung mengubah atau
          menghapus data resmi.
        </p>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="jenis" className="mb-1 block text-sm font-medium">
              Jenis pengajuan
            </label>

            <select
              id="jenis"
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option value="data_update">Perubahan data</option>
              <option value="delete_account">Penghapusan akun</option>
            </select>
          </div>

          <div>
            <label htmlFor="pesan" className="mb-1 block text-sm font-medium">
              Keterangan
            </label>

            <textarea
              id="pesan"
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              rows={5}
              maxLength={2000}
              required
              placeholder="Jelaskan data yang ingin diubah atau alasan penghapusan akun..."
              className="w-full rounded-lg border p-3"
            />

            <p className="mt-1 text-right text-xs text-gray-500">
              {pesan.length}/2000 karakter
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#0b1f3a] px-5 py-3 font-medium text-white disabled:opacity-60"
          >
            {saving ? "Mengirim..." : "Kirim Pengajuan"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-[#0b1f3a]">
          Riwayat Pengajuan
        </h2>

        {loading ? (
          <p className="text-sm text-gray-500">Memuat riwayat...</p>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">
            Belum ada pengajuan.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#0b1f3a]">
                      {requestLabels[item.requestType] ?? item.requestType}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Dikirim {formatDate(item.createdAt)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.status === "Disetujui"
                        ? "bg-green-100 text-green-700"
                        : item.status === "Ditolak"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                  {item.message}
                </p>

                {item.adminNote && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="font-medium">Catatan admin</p>
                    <p className="mt-1 whitespace-pre-wrap">{item.adminNote}</p>
                  </div>
                )}

                {item.reviewedAt && (
                  <p className="mt-3 text-xs text-gray-500">
                    Ditinjau {formatDate(item.reviewedAt)}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
    }
        
