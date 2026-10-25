
"use client";

import { useState } from "react";
import Link from "next/link";

export default function KlaimAkunPage() {
  const [form, setForm] = useState({
    nama: "",
    angkatan: "",
    email: "",
    password: "",
    konfirmasi: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  function updateField(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setMessage("");
    setSuccess(false);

    if (form.password.length < 12) {
      setMessage("Password minimal 12 karakter.");
      return;
    }

    if (form.password !== form.konfirmasi) {
      setMessage("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: form.nama.trim(),
          angkatan: form.angkatan.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Pengajuan klaim akun gagal."
        );
      }

      setSuccess(true);
      setMessage(
        result.message ||
          "Pengajuan berhasil dikirim dan menunggu verifikasi admin."
      );

      setForm({
        nama: "",
        angkatan: "",
        email: "",
        password: "",
        konfirmasi: "",
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-800">
            Alumni Lemhannas
          </p>

          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Klaim Akun Alumni
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Masukkan nama lengkap dan angkatan sesuai
            data alumni. Admin akan memeriksa pengajuan
            sebelum akun diaktifkan.
          </p>
        </div>

        {message && (
          <div
            role="alert"
            aria-live="polite"
            className={`mb-5 rounded-lg p-3 text-sm ${
              success
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nama"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Nama Lengkap
            </label>

            <input
              id="nama"
              name="nama"
              value={form.nama}
              onChange={updateField}
              className={inputClass}
              placeholder="Sesuai data alumni"
              autoComplete="name"
              maxLength={200}
              required
            />
          </div>

          <div>
            <label
              htmlFor="angkatan"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Angkatan
            </label>

            <input
              id="angkatan"
              name="angkatan"
              value={form.angkatan}
              onChange={updateField}
              className={inputClass}
              placeholder="Masukkan angkatan alumni"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email Aktif
            </label>

            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={updateField}
              className={inputClass}
              placeholder="nama@email.com"
              autoComplete="email"
              maxLength={254}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={updateField}
              className={inputClass}
              placeholder="Minimal 12 karakter"
              autoComplete="new-password"
              minLength={12}
              maxLength={1024}
              required
            />
          </div>

          <div>
            <label
              htmlFor="konfirmasi"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Konfirmasi Password
            </label>

            <input
              id="konfirmasi"
              type="password"
              name="konfirmasi"
              value={form.konfirmasi}
              onChange={updateField}
              className={inputClass}
              placeholder="Ulangi password"
              autoComplete="new-password"
              minLength={12}
              maxLength={1024}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-900 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Mengirim pengajuan..."
              : "Ajukan Klaim Akun"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Sudah memiliki akun?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-800 hover:underline"
          >
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
