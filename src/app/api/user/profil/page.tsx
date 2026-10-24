
"use client";

import { FormEvent, useEffect, useState } from "react";

type Profile = {
  nama: string;
  angkatan: string | number | null;
  jabatan: string | null;
  instansi: string | null;
  nomorAlumni: string;
};

export default function ProfilUser() {
  const [form, setForm] = useState({
    nama: "",
    angkatan: "",
    jabatan: "",
    instansi: "",
  });

  const [nomorAlumni, setNomorAlumni] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/user/profile", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Gagal memuat profil.");
        }

        if (!active) return;

        const profile: Profile = result.data;

        setNomorAlumni(profile.nomorAlumni ?? "");
        setForm({
          nama: profile.nama ?? "",
          angkatan: String(profile.angkatan ?? ""),
          jabatan: profile.jabatan ?? "",
          instansi: profile.instansi ?? "",
        });
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

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengirim perubahan.");
      }

      setSuccess(
        "Perubahan profil diajukan. Data resmi akan berubah setelah ditinjau admin."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6">Memuat profil alumni...</div>;
  }

  return (
    <div className="max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-2xl font-bold text-[#0b1f3a]">
        Profil Alumni
      </h1>

      <p className="mb-6 text-sm text-gray-600">
        Nomor alumni: {nomorAlumni || "-"}
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
          <label htmlFor="nama" className="mb-1 block text-sm font-medium">
            Nama lengkap
          </label>
          <input
            id="nama"
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            maxLength={200}
            required
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label htmlFor="angkatan" className="mb-1 block text-sm font-medium">
            Tahun angkatan
          </label>
          <input
            id="angkatan"
            value={form.angkatan}
            onChange={(e) => setForm({ ...form, angkatan: e.target.value })}
            maxLength={100}
            required
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label htmlFor="jabatan" className="mb-1 block text-sm font-medium">
            Jabatan / pekerjaan saat ini
          </label>
          <input
            id="jabatan"
            value={form.jabatan}
            onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
            maxLength={200}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label htmlFor="instansi" className="mb-1 block text-sm font-medium">
            Instansi / perusahaan
          </label>
          <input
            id="instansi"
            value={form.instansi}
            onChange={(e) => setForm({ ...form, instansi: e.target.value })}
            maxLength={200}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <p className="text-sm text-gray-500">
          Perubahan akan dikirim kepada admin untuk ditinjau terlebih dahulu.
        </p>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-[#0b1f3a] px-4 py-3 font-medium text-white disabled:opacity-60"
        >
          {saving ? "Mengirim..." : "Ajukan Perubahan Profil"}
        </button>
      </form>
    </div>
  );
              }
      
