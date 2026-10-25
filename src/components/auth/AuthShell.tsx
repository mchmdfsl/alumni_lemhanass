import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f4f6fa] text-slate-800">
      <header className="relative h-36 overflow-hidden border-b-4 border-[#b99a32] sm:h-44 lg:h-60">
        <Image
          src="/images/lemhannas-header.jpg"
          alt="Gedung Lemhannas RI"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1f3a]/50 via-transparent to-[#0b1f3a]/35" />
        <div className="absolute inset-0 flex items-end justify-center px-4 pb-3 sm:pb-4">
          <p className="text-center text-3xl font-black tracking-wide text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.8)] sm:text-5xl lg:text-7xl">
            LEMHANNAS RI
          </p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl justify-center px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(11,31,58,0.10)]">
          <div className="h-1.5 bg-[#0b1f3a]" />
          <div className="px-5 py-7 sm:px-10 sm:py-9">
            <div className="mb-7 text-center">
              <Image
                src="/images/logo-lemhannas.png"
                alt="Logo Lemhannas RI"
                width={78}
                height={78}
                priority
                className="mx-auto h-16 w-16 object-contain sm:h-[78px] sm:w-[78px]"
              />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#a68a2c]">
                LEMHANNAS RI
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0b1f3a] sm:text-3xl">
                {title}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <span className="h-px w-12 bg-[#b99a32]" />
                <span className="h-2 w-2 rotate-45 bg-[#b99a32]" />
                <span className="h-px w-12 bg-[#b99a32]" />
              </div>
            </div>
            {children}
            <div className="mt-6 text-center text-xs text-slate-400">
              Lembaga Ketahanan Nasional Republik Indonesia
              <div className="mt-2">
                <Link href="/login" className="font-semibold text-[#0b1f3a] hover:underline">
                  Portal Alumni Lemhannas RI
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
