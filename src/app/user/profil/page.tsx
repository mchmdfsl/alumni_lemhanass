"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  UserRound,
  Mail,
  GraduationCap,
  BriefcaseBusiness,
  Building2,
  Save,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type Profile = {
  id?: number;
  nomorAlumni?: string | null;
  nama: string;
  angkatan: string;
  jabatan: string;
  instansi: string;
  status?: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10 disabled:bg-slate-50";

export default function ProfilUser() {
  const [profile, setProfile] = useState<Profile>({
    nama: "",
    angkatan: "",
    jabatan: "",
    instansi: "",
  });

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const [profileResponse, accountResponse] = await Promise.all([
          fetch("/api/user/profile", {
            cache: "no-store",
          }),
          fetch("/api/auth/me", {
            cache: "no-store",
          }),
        ]);

        const profileResult = await profileResponse.json();
        const accountResult = await accountResponse.json();

        if (!profileResponse.ok) {
          throw new Error(
            profileResult.message || "Gagal mengambil data profil."
          );
        }

        if (!accountResponse.ok || accountResult.user?.role !== "alumni") {
          throw new Error("Sesi alumni tidak valid. Silakan login kembali.");
        }

        if (!active) return;

        const data = profileResult.data;

        setProfile({
          id: data.id,
          nomorAlumni: data.nomorAlumni || "",
          nama: data.nama || "",
          angkatan: String(data.angkatan || ""),
          jabatan: data.jabatan || "",
          instansi: data.instansi || "",
          status: data.status || "",
        });

        setEmail(accountResult.user.email || "");
      } catch (error) {
        if (!active) return;

        setNotice({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat profil.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function updateField(field: keyof Profile, value: string) {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (notice) setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (profile.nama.trim().length < 2) {
      setNotice({
        type: "error",
        message: "Nama lengkap minimal 2 karakter.",
      });
      return;
    }

    if (!profile.angkatan.trim()) {
      setNotice({
        type: "error",
        message: "Tahun angkatan wajib diisi.",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: profile.nama.trim(),
          angkatan: profile.angkatan.trim(),
          jabatan: profile.jabatan.trim(),
          instansi: profile.instansi.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Gagal mengirim permintaan perubahan profil."
        );
      }

      setNotice({
        type: "success",
        message:
          result.message ||
          "Permintaan perubahan profil berhasil dikirim kepada admin.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan. Silakan coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Judul halaman */}
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">
          Pengelolaan Akun
        </p>

        <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">
          Profil Saya
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Lihat informasi alumni dan ajukan perubahan data yang perlu diperbarui.
        </p>
      </section>

      {/* Informasi akun */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0b1f3a] text-white">
            <UserRound size={27} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-[#0b1f3a]">
              {loading ? "Memuat profil..." : profile.nama || "Alumni"}
            </h2>

            <p className="mt-1 break-all text-sm text-slate-500">
              {email || "Email tidak tersedia"}
            </p>
          </div>

          <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex">
            <ShieldCheck size={15} />
            Terverifikasi
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <InfoItem
            icon={GraduationCap}
            label="Nomor Alumni"
            value={profile.nomorAlumni || "-"}
          />

          <InfoItem
            icon={Mail}
            label="Email Akun"
            value={email || "-"}
          />

          <InfoItem
            icon={GraduationCap}
            label="Angkatan"
            value={profile.angkatan || "-"}
          />

          <InfoItem
            icon={ShieldCheck}
            label="Status Alumni"
            value={profile.status || "-"}
          />
        </div>
      </section>

      {/* Form perubahan profil */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="font-bold text-[#172033]">
            Ajukan Perubahan Profil
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Perubahan akan dikirim kepada admin untuk ditinjau sebelum
            diterapkan pada data alumni.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          {notice && (
            <div
              role="status"
              className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {notice.type === "success" ? (
                <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
              )}

              <p>{notice.message}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
              <LoaderCircle size={20} className="animate-spin" />
              Mengambil data profil...
            </div>
          ) : (
            <>
              <Field
                label="Nama Lengkap"
                icon={UserRound}
                required
              >
                <input
                  type="text"
                  value={profile.nama}
                  onChange={(event) =>
                    updateField("nama", event.target.value)
                  }
                  maxLength={200}
                  required
                  className={inputClass}
                  placeholder="Masukkan nama lengkap"
                />
              </Field>

              <Field
                label="Tahun Angkatan"
                icon={GraduationCap}
                required
              >
                <input
                  type="text"
                  value={profile.angkatan}
                  onChange={(event) =>
                    updateField("angkatan", event.target.value)
                  }
                  maxLength={100}
                  required
                  className={inputClass}
                  placeholder="Masukkan tahun atau nama angkatan"
                />
              </Field>

              <Field
                label="Jabatan / Pekerjaan"
                icon={BriefcaseBusiness}
              >
                <input
                  type="text"
                  value={profile.jabatan}
                  onChange={(event) =>
                    updateField("jabatan", event.target.value)
                  }
                  maxLength={200}
                  className={inputClass}
                  placeholder="Contoh: Direktur, PNS, Pengusaha"
                />
              </Field>

              <Field
                label="Instansi / Perusahaan"
                icon={Building2}
              >
                <input
                  type="text"
                  value={profile.instansi}
                  onChange={(event) =>
                    updateField("instansi", event.target.value)
                  }
                  maxLength={200}
                  className={inputClass}
                  placeholder="Masukkan instansi atau perusahaan"
                />
              </Field>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm leading-relaxed text-amber-900">
                  <strong>Perhatian:</strong> Mengirim formulir ini tidak
                  langsung mengubah data utama. Permintaan akan masuk ke
                  admin untuk ditinjau terlebih dahulu.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                <Link
                  href="/user"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <ArrowLeft size={16} />
                  Kembali ke Dashboard
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18385f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Kirim Permintaan
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  required = false,
  children,
}: {
  label: string;
  icon: typeof UserRound;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
        <Icon size={16} className="text-[#64748b]" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0b1f3a] shadow-sm">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-[#172033]">
          {value}
        </p>
      </div>
    </div>
  );
}
