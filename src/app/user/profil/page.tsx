"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  UserRound,
  Mail,
  GraduationCap,
  BriefcaseBusiness,
  Building2,
  MapPin,
  Phone,
  Home,
  Save,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  Camera,
  Upload,
} from "lucide-react";

type Profile = {
  id?: number;
  nomorAlumni?: string | null;
  nama: string;
  angkatan: string;
  jabatan: string;
  instansi: string;
  wilayah: string;
  alamat: string;
  nomorHp: string;
  status?: string;
  fotoProfil?: string | null;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10 disabled:bg-slate-50";

export default function ProfilUser() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile>({
    nama: "",
    angkatan: "",
    jabatan: "",
    instansi: "",
    wilayah: "",
    alamat: "",
    nomorHp: "",
    fotoProfil: null,
  });

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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

        if (
          !accountResponse.ok ||
          accountResult.user?.role !== "alumni"
        ) {
          throw new Error(
            "Sesi alumni tidak valid. Silakan login kembali."
          );
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
          wilayah: data.wilayah || "",
          alamat: data.alamat || "",
          nomorHp: data.nomorHp || "",
          status: data.status || "",
          fotoProfil: data.fotoProfil || null,
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

    setNotice(null);
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setNotice({ type: "error", message: "Format email tidak valid." });
      return;
    }
    setEmailSaving(true);
    try {
      const response = await fetch("/api/user/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Gagal menyimpan email.");
      setEmail(normalizedEmail);
      setNotice({ type: "success", message: result.message || "Email berhasil disimpan." });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Gagal menyimpan email." });
    } finally {
      setEmailSaving(false);
    }
  }

  async function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    // Izinkan pengguna memilih kembali file yang sama.
    event.target.value = "";

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setNotice({
        type: "error",
        message: "Format foto harus JPG, PNG, atau WebP.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setNotice({
        type: "error",
        message: "Ukuran foto maksimal 5 MB.",
      });
      return;
    }

    setUploadingPhoto(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch("/api/user/profile/photo", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Gagal mengunggah foto profil."
        );
      }

      const photoUrl = result.data?.fotoProfil;

      if (!photoUrl) {
        throw new Error(
          "Foto berhasil diproses, tetapi URL foto tidak ditemukan."
        );
      }

      setProfile((previous) => ({
        ...previous,
        fotoProfil: photoUrl,
      }));

      setNotice({
        type: "success",
        message: "Foto profil berhasil diperbarui.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mengunggah foto.",
      });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
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
          wilayah: profile.wilayah.trim(),
          alamat: profile.alamat.trim(),
          nomorHp: profile.nomorHp.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Gagal mengirim permintaan perubahan profil."
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
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      {/* Judul halaman */}
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b28b16]">
          Pengelolaan Akun
        </p>

        <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">
          Profil Saya
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Kelola foto dan lihat informasi profil alumni kamu.
        </p>
      </section>

      {/* Kartu foto dan identitas */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#0b1f3a] to-[#18385f] px-5 py-7 sm:px-7">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            {/* Foto profil */}
            <div className="relative shrink-0">
              <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white/80 bg-slate-100 shadow-lg sm:h-32 sm:w-32">
                {profile.fotoProfil ? (
                  <Image
                    key={profile.fotoProfil}
                    src={profile.fotoProfil}
                    alt="Foto profil alumni"
                    fill
                    unoptimized
                    sizes="128px"
                    className="object-cover"
                  />
                ) : (
                  <UserRound
                    size={54}
                    className="text-slate-400"
                  />
                )}

                {uploadingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <LoaderCircle
                      size={30}
                      className="animate-spin text-white"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto || loading}
                aria-label="Ganti foto profil"
                className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#b28b16] text-white shadow-md transition hover:bg-[#997510] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingPhoto ? (
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Camera size={19} />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            {/* Identitas */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
                Profil Alumni
              </p>

              <h2 className="mt-2 break-words text-xl font-bold text-white sm:text-2xl">
                {loading
                  ? "Memuat profil..."
                  : profile.nama || "Alumni"}
              </h2>

              <p className="mt-2 break-all text-sm text-slate-200">
                {email || "Email tidak tersedia"}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <ShieldCheck size={14} />
                  {profile.status || "Alumni"}
                </span>

                {profile.nomorAlumni && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                    No. Alumni: {profile.nomorAlumni}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto || loading}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0b1f3a] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingPhoto ? (
                  <>
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                    Mengunggah foto...
                  </>
                ) : (
                  <>
                    <Upload size={17} />
                    {profile.fotoProfil
                      ? "Ganti Foto"
                      : "Upload Foto"}
                  </>
                )}
              </button>

              <p className="mt-2 text-xs text-slate-300">
                JPG, PNG, atau WebP. Maksimal 5 MB.
              </p>
            </div>
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

      {/* Pesan sukses atau error */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />
          )}

          <p>{notice.message}</p>
        </div>
      )}

      {/* Pengaturan keamanan akun */}
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0b1f3a]">
            <ShieldCheck size={21} />
          </div>
          <div>
            <h2 className="font-bold text-[#172033]">Keamanan Akun</h2>
            <p className="mt-1 text-sm text-slate-500">Ganti password akun secara langsung menggunakan password lama dan password baru.</p>
          </div>
        </div>
        <Link href="/user/ubah-password" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18385f]">
          <ShieldCheck size={17} />
          Ganti Password
        </Link>
      </section>

      {/* Form email akun: diisi sendiri oleh alumni */ }
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="font-bold text-[#172033]">Email Saya</h2>
          <p className="mt-1 text-sm text-slate-500">Email tidak diisi oleh administrator. Masukkan email pribadi yang aktif, atau biarkan kosong sampai siap.</p>
        </div>
        <form onSubmit={handleEmailSubmit} className="space-y-4 p-5 sm:p-6">
          <Field label="Alamat Email" icon={Mail}>
            <input
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setNotice(null); }}
              maxLength={254}
              autoComplete="email"
              className={inputClass}
              placeholder="nama@email.com"
              disabled={loading || emailSaving}
            />
          </Field>
          <button type="submit" disabled={loading || emailSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18385f] disabled:cursor-not-allowed disabled:opacity-60">
            {emailSaving ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}
            {emailSaving ? "Menyimpan email..." : "Simpan Email"}
          </button>
        </form>
      </section>

      {/* Form perubahan profil */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="font-bold text-[#172033]">
            Ajukan Perubahan Profil
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Perubahan data akan dikirim kepada admin untuk ditinjau.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
            <LoaderCircle
              size={20}
              className="animate-spin"
            />
            Mengambil data profil...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 p-5 sm:p-6"
          >
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

            <Field label="Wilayah / Provinsi" icon={MapPin}>
              <input type="text" value={profile.wilayah} onChange={(event) => updateField("wilayah", event.target.value)} maxLength={150} className={inputClass} placeholder="Contoh: Jawa Barat" />
            </Field>

            <Field label="Nomor Telepon / HP" icon={Phone}>
              <input type="tel" value={profile.nomorHp} onChange={(event) => updateField("nomorHp", event.target.value)} maxLength={50} className={inputClass} placeholder="Masukkan nomor telepon aktif" />
            </Field>

            <Field label="Alamat Lengkap" icon={Home}>
              <textarea value={profile.alamat} onChange={(event) => updateField("alamat", event.target.value)} maxLength={5000} rows={3} className={inputClass} placeholder="Masukkan alamat lengkap" />
            </Field>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm leading-relaxed text-amber-900">
                <strong>Perhatian:</strong> Mengirim formulir ini
                tidak langsung mengubah data utama. Permintaan
                akan masuk ke admin untuk ditinjau terlebih dahulu.
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
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
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
          </form>
        )}
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
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
        <Icon size={16} className="text-slate-500" />
        {label}
        {required && (
          <span className="text-red-500">*</span>
        )}
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
        <p className="text-xs font-medium text-slate-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-[#172033]">
          {value}
        </p>
      </div>
    </div>
  );
  }
