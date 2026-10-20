"use client";

import Image from "next/image";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: formData.get("email"), password: formData.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrorMessage(result.error || "Login gagal. Periksa kembali kredensial.");
        return;
      }
      const requestedNext = new URLSearchParams(window.location.search).get("next");
      const next = requestedNext?.startsWith("/admin") ? requestedNext : "/admin";
      router.replace(next);
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[100svh] bg-[#f5f7fa]">
      {/* =========================================
          HEADER LEMHANNAS
      ========================================= */}
      <header className="relative w-full overflow-hidden">
        <div className="relative h-[110px] w-full overflow-hidden sm:h-[140px] md:h-[170px] lg:h-[200px] xl:h-[220px]">
          <Image
            src="/images/lemhannas-header.jpg"
            alt="LEMHANNAS RI"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>

        {/* Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-black/[0.04]" />

        {/* Gold line */}
        <div
          className="
            absolute
            bottom-0
            left-0
            h-[3px]
            w-full
            bg-[#c9a227]
            sm:h-1
          "
        />
      </header>

      {/* =========================================
          LOGIN SECTION
      ========================================= */}
      <section
        className="
          relative
          flex
          min-h-[calc(100svh-118px)]
          items-start
          justify-center
          overflow-hidden
          px-4
          py-8
          sm:min-h-[calc(100svh-148px)]
          sm:px-6
          sm:py-10
          md:min-h-[calc(100svh-178px)]
          md:py-12
          lg:min-h-[calc(100svh-218px)]
          lg:py-14
          xl:min-h-[calc(100svh-251px)]
        "
      >
        {/* =========================================
            DECORATIVE BACKGROUND
        ========================================= */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Left glow */}
          <div
            className="
              absolute
              -left-40
              top-20
              h-80
              w-80
              rounded-full
              bg-[#0b1f3a]/5
              blur-3xl
              sm:h-96
              sm:w-96
            "
          />

          {/* Right glow */}
          <div
            className="
              absolute
              -bottom-32
              -right-32
              h-80
              w-80
              rounded-full
              bg-[#c9a227]/10
              blur-3xl
              sm:h-96
              sm:w-96
            "
          />

          {/* Decorative circles
              Disembunyikan di mobile supaya tidak
              mengganggu area login.
          */}
          <div className="absolute right-[-150px] top-[20%] hidden h-[500px] w-[500px] rounded-full border border-[#0b1f3a]/5 md:block" />

          <div className="absolute right-[-100px] top-[27%] hidden h-[400px] w-[400px] rounded-full border border-[#0b1f3a]/5 md:block" />

          <div className="absolute right-[-50px] top-[34%] hidden h-[300px] w-[300px] rounded-full border border-[#0b1f3a]/5 md:block" />
        </div>

        {/* =========================================
            LOGIN CARD
        ========================================= */}
        <div
          className="
            relative
            z-10
            w-full
            max-w-[440px]
            sm:max-w-[460px]
          "
        >
          <div
            className="
              overflow-hidden
              rounded-xl
              border
              border-slate-200
              bg-white
              shadow-[0_15px_45px_rgba(7,21,38,0.08)]
              sm:rounded-2xl
              sm:shadow-[0_20px_60px_rgba(7,21,38,0.10)]
            "
          >
            {/* Card Top Accent */}
            <div className="h-1 bg-[#0b1f3a] sm:h-1.5" />

            <div
              className="
                px-5
                py-7
                sm:px-8
                sm:py-8
                md:px-10
                md:py-9
              "
            >
              {/* =========================================
                  LOGO / BRAND
              ========================================= */}
              <div
                className="
                  mb-7
                  text-center
                  sm:mb-8
                "
              >
                {/* Logo */}
                <div
                  className="
                    mb-4
                    flex
                    justify-center
                    sm:mb-5
                  "
                >
                  <Image
                    src="/images/logo-lemhannas.png"
                    alt="Logo LEMHANNAS RI"
                    width={100}
                    height={100}
                    priority
                    className="
                      h-[72px]
                      w-[72px]
                      object-contain
                      sm:h-[82px]
                      sm:w-[82px]
                      md:h-[90px]
                      md:w-[90px]
                    "
                  />
                </div>

                {/* Institution */}
                <p
                  className="
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.25em]
                    text-[#b28b16]
                    sm:text-[10px]
                    sm:tracking-[0.3em]
                    md:text-[11px]
                  "
                >
                  LEMHANNAS RI
                </p>

                {/* Main Title */}
                <h1
                  className="
                    mt-1.5
                    text-[22px]
                    font-bold
                    leading-tight
                    tracking-[-0.02em]
                    text-[#0b1f3a]
                    sm:text-[24px]
                    md:text-[26px]
                  "
                >
                  Pendataan Alumni
                </h1>

                {/* Subtitle */}
                <p
                  className="
                    mx-auto
                    mt-2
                    max-w-[290px]
                    text-xs
                    leading-5
                    text-[#64748b]
                    sm:max-w-[320px]
                    sm:text-sm
                    sm:leading-6
                  "
                >
                  Sistem Informasi Pendataan Alumni
                  <br />
                  Lembaga Ketahanan Nasional Republik Indonesia
                </p>

                {/* Decorative Divider */}
                <div
                  className="
                    mx-auto
                    mt-4
                    flex
                    items-center
                    justify-center
                    gap-2.5
                    sm:mt-5
                    sm:gap-3
                  "
                >
                  <div className="h-px w-8 bg-[#c9a227] sm:w-12" />

                  <div className="h-1.5 w-1.5 rotate-45 bg-[#c9a227] sm:h-2 sm:w-2" />

                  <div className="h-px w-8 bg-[#c9a227] sm:w-12" />
                </div>
              </div>

              {/* =========================================
                  WELCOME
              ========================================= */}
              <div className="mb-6 sm:mb-7">
                <h2
                  className="
                    text-lg
                    font-bold
                    text-[#172033]
                    sm:text-xl
                  "
                >
                  Selamat Datang
                </h2>

                <p
                  className="
                    mt-1.5
                    text-sm
                    leading-5
                    text-[#64748b]
                    sm:leading-6
                  "
                >
                  Silakan masuk untuk mengakses sistem pendataan alumni
                  LEMHANNAS RI.
                </p>
              </div>

              {/* =========================================
                  FORM
              ========================================= */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {errorMessage && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}
                {/* Email / Nomor Alumni */}
                <div>
                  <label
                    htmlFor="email"
                    className="
                      mb-2
                      block
                      text-sm
                      font-semibold
                      text-[#172033]
                    "
                  >
                    Email atau Username Admin
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      strokeWidth={1.8}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        text-[#94a3b8]
                      "
                    />

                    <input
                      id="email"
                      name="email"
                      type="text"
                      required
                      maxLength={254}
                      autoComplete="username"
                      placeholder="Masukkan email atau username admin"
                      className="
                        h-12
                        w-full
                        rounded-xl
                        border
                        border-[#dbe1e8]
                        bg-[#fafbfc]
                        pl-11
                        pr-4
                        text-base
                        text-[#172033]
                        outline-none
                        transition-all
                        placeholder:text-[#94a3b8]
                        hover:border-[#b9c2ce]
                        focus:border-[#0b1f3a]
                        focus:bg-white
                        focus:ring-4
                        focus:ring-[#0b1f3a]/5
                        sm:text-sm
                      "
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="
                      mb-2
                      block
                      text-sm
                      font-semibold
                      text-[#172033]
                    "
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      strokeWidth={1.8}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        text-[#94a3b8]
                      "
                    />

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      maxLength={1024}
                      autoComplete="current-password"
                      placeholder="Masukkan password"
                      className="
                        h-12
                        w-full
                        rounded-xl
                        border
                        border-[#dbe1e8]
                        bg-[#fafbfc]
                        pl-11
                        pr-12
                        text-base
                        text-[#172033]
                        outline-none
                        transition-all
                        placeholder:text-[#94a3b8]
                        hover:border-[#b9c2ce]
                        focus:border-[#0b1f3a]
                        focus:bg-white
                        focus:ring-4
                        focus:ring-[#0b1f3a]/5
                        sm:text-sm
                      "
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="
                        absolute
                        right-3.5
                        top-1/2
                        -translate-y-1/2
                        p-1
                        text-[#94a3b8]
                        transition-colors
                        hover:text-[#0b1f3a]
                      "
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    className="
                      min-h-[32px]
                      text-sm
                      font-medium
                      text-[#0b1f3a]
                      transition-colors
                      hover:text-[#9e1b32]
                    "
                  >
                    Lupa password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="
                    flex
                    h-12
                    w-full
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#0b1f3a]
                    text-sm
                    font-bold
                    tracking-wide
                    text-white
                    shadow-lg
                    shadow-[#0b1f3a]/15
                    transition-all
                    duration-200
                    hover:bg-[#123b68]
                    hover:shadow-xl
                    hover:shadow-[#0b1f3a]/20
                    active:scale-[0.99]
                  "
                >
                  {isSubmitting ? "MEMPROSES..." : "MASUK"}
                </button>
              </form>

              {/* =========================================
                  INFORMATION
              ========================================= */}
              <div
                className="
                  mt-6
                  border-t
                  border-slate-100
                  pt-5
                  sm:mt-7
                  sm:pt-6
                "
              >
                <div className="text-center">
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.12em]
                      text-[#64748b]
                      sm:text-xs
                      sm:tracking-[0.15em]
                    "
                  >
                    Sistem Pendataan Alumni
                  </p>

                  <p className="mt-2 text-[11px] italic text-[#94a3b8] sm:text-xs">
                    Tanhana Dharmma Mangrva
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================
              FOOTER
          ========================================= */}
          <div className="px-2 pb-[env(safe-area-inset-bottom)] pt-5 text-center sm:pt-6">
            <p className="text-[10px] text-[#64748b] sm:text-xs">
              © {new Date().getFullYear()} LEMHANNAS RI. All Rights Reserved.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
