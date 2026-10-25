"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Profile = {
  id?: number;
  nomorAlumni?: string | null;
  nama: string;
  angkatan: string;
  jabatan: string;
  instansi: string;
  status?: string;
  fotoProfil?: string | null;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function ProfilUser() {
  const [form, setForm] = useState({
    nama: "",
    angkatan: "",
    jabatan: "",
    instansi: "",
  });

  const [nomorAlumni, setNomorAlumni] = useState("");
  const [fotoProfil, setFotoProfil] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/user/profile", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Gagal memuat profil."
          );
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

        setFotoProfil(profile.fotoProfil ?? null);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat memuat profil."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    // Izinkan pengguna memilih file yang sama lagi.
    event.target.value = "";

    if (!file) return;

    setError("");
    setSuccess("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        "Format foto harus JPEG, PNG, atau WebP."
      );
      return;
    }

    if (file.size === 0) {
      setError("File foto kosong.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Ukuran foto maksimal 5 MB.");
      return;
    }

    setUploadingPhoto(true);

    try {
      const formData = new FormData();

      // Nama field harus sama dengan yang dibaca route.ts.
      formData.append("photo", file);

      const response = await fetch(
        "/api/user/profile/photo",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Gagal mengunggah foto profil."
        );
      }

      const newPhotoUrl =
        result.data?.fotoProfil ??
        result.data?.photoUrl ??
        result.data?.url;

      if (!newPhotoUrl) {
        throw new Error(
          "Upload berhasil, tetapi URL foto tidak ditemukan pada respons API."
        );
      }

      setFotoProfil(newPhotoUrl);

      setSuccess(
        result.message || "Foto profil berhasil diperbarui."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengunggah foto."
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Gagal mengirim perubahan."
        );
      }

      setSuccess(
        "Perubahan profil diajukan. Data resmi akan berubah setelah ditinjau admin."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengirim perubahan."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        Memuat profil alumni...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <h1 className="mb-2 text-2xl font-bold text-[#0b1f3a]">
        Profil Alumni
      </h1>

      <p className="mb-6 text-sm text-gray-600">
        Nomor alumni: {nomorAlumni || "-"}
      </p>

      {/* FOTO PROFIL */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#0b1f3a]">
          Foto Profil
        </h2>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-200 shadow-sm">
            {fotoProfil ? (
              <img
                src={fotoProfil}
                alt={`Foto profil ${form.nama || "alumni"}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-16 w-16 text-gray-400"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM4 20a8 8 0 1 1 16 0v1H4v-1Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          <div className="w-full text-center sm:text-left">
            <p className="mb-1 font-medium text-gray-800">
              {form.nama || "Alumni"}
            </p>

            <p className="mb-4 text-sm text-gray-500">
              Format JPEG, PNG, atau WebP. Maksimal 5 MB.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              disabled={uploadingPhoto}
              className="hidden"
              aria-label="Pilih foto profil"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0b1f3a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15345c] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {uploadingPhoto ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
                    />
                  </svg>

                  Mengunggah...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16V4m0 0L7 9m5-5 5 5M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"
                    />
                  </svg>

                  {fotoProfil
                    ? "Ganti Foto"
                    : "Upload Foto"}
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* PESAN */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* FORM PROFIL */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="nama"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Nama lengkap
          </label>

          <input
            id="nama"
            value={form.nama}
            onChange={(event) =>
              setForm({
                ...form,
                nama: event.target.value,
              })
            }
            maxLength={200}
            required
            className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10"
          />
        </div>

        <div>
          <label
            htmlFor="angkatan"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Tahun angkatan
          </label>

          <input
            id="angkatan"
            value={form.angkatan}
            onChange={(event) =>
              setForm({
                ...form,
                angkatan: event.target.value,
              })
            }
            maxLength={100}
            required
            className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10"
          />
        </div>

        <div>
          <label
            htmlFor="jabatan"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Jabatan / pekerjaan saat ini
          </label>

          <input
            id="jabatan"
            value={form.jabatan}
            onChange={(event) =>
              setForm({
                ...form,
                jabatan: event.target.value,
              })
            }
            maxLength={200}
            className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10"
          />
        </div>

        <div>
          <label
            htmlFor="instansi"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Instansi / perusahaan
          </label>

          <input
            id="instansi"
            value={form.instansi}
            onChange={(event) =>
              setForm({
                ...form,
                instansi: event.target.value,
              })
            }
            maxLength={200}
            className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10"
          />
        </div>

        <p className="text-sm leading-6 text-gray-500">
          Perubahan informasi profil akan diajukan kepada
          admin untuk ditinjau terlebih dahulu.
        </p>

        <button
          type="submit"
          disabled={saving || uploadingPhoto}
          className="w-full rounded-lg bg-[#0b1f3a] px-4 py-3 font-medium text-white transition hover:bg-[#15345c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? "Mengirim..."
            : "Ajukan Perubahan Profil"}
        </button>
      </form>
    </div>
  );
  }
