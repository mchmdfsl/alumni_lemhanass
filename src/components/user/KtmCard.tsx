"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, MapPin, Globe2, ShieldCheck, LoaderCircle } from "lucide-react";

type Profile = {
  nama?: string;
  nomorAlumni?: string | null;
  kategoriProgram?: string;
  nomorAngkatan?: string;
  tahunAngkatan?: string | number;
  fotoProfil?: string | null;
};

type Signature = {
  namaDeputi?: string;
  jabatanDeputi?: string;
  signatureUrl?: string | null;
  formatTtd?: "standard" | "tot_white";
};

function QrPlaceholder() {
  return (
    <div className="flex aspect-square w-full items-center justify-center border-[5px] border-white bg-white text-center text-[9px] font-bold leading-tight text-[#35104f] shadow-sm">
      QR
      <br />
      VERIFIKASI
    </div>
  );
}

export default function KtmCard({ profile }: { profile: Profile }) {
  const [signature, setSignature] = useState<Signature | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/ktm-signature", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (active && response.ok) setSignature(result.data ?? null);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const category = profile.kategoriProgram || "-";
  const cohort = profile.nomorAngkatan || "-";
  const year = profile.tahunAngkatan || "-";
  const alumniNo = profile.nomorAlumni || "-";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6a24]">Identitas Alumni</p>
          <h2 className="mt-1 text-lg font-bold text-[#32104c]">Kartu Tanda Alumni (KTM)</h2>
          <p className="mt-1 text-sm text-slate-500">Desain Klasik Elegan · Layout 2</p>
        </div>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#35104f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4a1a69]">
          <Download size={16} /> Cetak / Simpan PDF
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500 print:hidden"><LoaderCircle className="animate-spin" size={18} /> Memuat tanda tangan pejabat...</div>
      ) : (
        <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-2 print:grid-cols-2 print:gap-3 print:p-0">
          {/* SISI DEPAN: panel lambang ungu di kiri, identitas pada bidang putih di kanan */}
          <article className="relative isolate flex aspect-[1.586/1] overflow-hidden rounded-[14px] border border-[#ded9e3] bg-[#faf9fb] text-[#28113f] shadow-lg print:break-inside-avoid print:shadow-none">
            <div className="relative flex w-[24%] shrink-0 flex-col items-center justify-center overflow-hidden bg-[#32104b]">
              <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 9px, rgba(255,255,255,.045) 9px 11px), repeating-linear-gradient(45deg, transparent 0 16px, rgba(255,255,255,.035) 16px 18px)" }} />
              <div className="absolute right-0 top-0 h-full w-[3px] bg-gradient-to-b from-[#f7e3a1] via-[#b88a31] to-[#f7e3a1]" />
              <div className="relative z-10 flex w-full -translate-y-3 flex-col items-center px-2">
                <span className="mb-1 text-2xl text-[#e7bd51]">★</span>
                <Image src="/images/logo-lemhannas.png" alt="Lambang Lemhannas RI" width={112} height={112} priority className="h-auto w-[76%] max-w-[112px] object-contain drop-shadow-md" />
              </div>
              <div className="absolute -bottom-3 -left-5 h-12 w-[125%] rotate-[9deg] bg-[#c71932]" />
              <div className="absolute bottom-1 -left-5 h-7 w-[125%] rotate-[9deg] border-y-[5px] border-white bg-[#f8f7f5]" />
              <div className="absolute bottom-[-20px] -left-5 h-9 w-[125%] rotate-[9deg] bg-[#32104b]" />
            </div>

            <div className="relative min-w-0 flex-1 overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
              <div className="pointer-events-none absolute inset-0 opacity-[0.10]">
                <Image src="/images/lemhannas-header.jpg" alt="" fill unoptimized sizes="600px" className="object-cover object-center" />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/70" />
              <div className="relative flex items-start justify-between gap-2 border-b border-[#d9cfdf] pb-2">
                <div>
                  <h3 className="text-[clamp(11px,1.45vw,19px)] font-extrabold leading-tight tracking-wide text-[#32104b]">LEMHANNAS RI</h3>
                  <p className="text-[clamp(7px,.78vw,10px)] font-medium text-[#3c2a4b]">Lembaga Ketahanan Nasional</p>
                </div>
                <div className="text-right">
                  <p className="text-[clamp(7px,.85vw,11px)] font-bold underline decoration-[#b48b3c] underline-offset-2">Kartu Tanda Alumni</p>
                  <p className="text-[clamp(6px,.7vw,9px)] italic">Alumni Lemhannas RI</p>
                </div>
              </div>

              <div className="relative mt-3 flex min-h-0 gap-2 sm:mt-4 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="line-clamp-2 text-[clamp(11px,1.45vw,19px)] font-extrabold leading-tight text-[#32104b]">{profile.nama || "Nama Alumni"}</h4>
                  <p className="mt-1 text-[clamp(7px,.85vw,11px)] leading-tight">No. Alumni <span className="mx-1">:</span> <strong>{alumniNo}</strong></p>
                  <div className="mt-1.5 text-[clamp(7px,.85vw,11px)] leading-[1.35]">
                    <p>Program <span className="mx-1">:</span> <strong>{category}</strong></p>
                    <p className="pl-[3.45em]">{category === "PPRA" ? "(Pendidikan Pemantapan Pimpinan Nasional)" : ""}</p>
                    <p>Angkatan <span className="mx-1">:</span> <strong>{cohort}{year !== "-" ? ` / ${year}` : ""}</strong></p>
                  </div>
                </div>
                <div className="flex w-[23%] shrink-0 flex-col items-center gap-1">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[5px] border-2 border-white bg-slate-200 shadow-sm ring-1 ring-[#c9bdd2]">
                    {profile.fotoProfil ? <Image src={profile.fotoProfil} alt="Foto alumni" fill unoptimized sizes="110px" className="object-cover" /> : <div className="flex h-full items-center justify-center px-1 text-center text-[8px] text-slate-500">Foto alumni</div>}
                  </div>
                  <div className="w-[82%]"><QrPlaceholder /></div>
                  <p className="text-center text-[clamp(5px,.62vw,8px)] font-semibold leading-tight">Verifikasi Keaslian Kartu<br />Scan QR Code</p>
                </div>
              </div>

              <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2 sm:bottom-3 sm:left-5 sm:right-5">
                <div className="min-w-0">
                  <div className={`flex h-7 max-w-[130px] items-center overflow-hidden ${signature?.formatTtd === "tot_white" ? "bg-white" : ""}`}>
                    {signature?.signatureUrl ? <Image src={signature.signatureUrl} alt="Tanda tangan Deputi" width={125} height={28} unoptimized className="max-h-7 w-auto object-contain object-left" /> : <span className="text-[7px] italic text-slate-400">Tanda tangan belum tersedia</span>}
                  </div>
                  <p className="text-[clamp(6px,.7vw,9px)] font-bold leading-tight text-[#32104b]">{signature?.namaDeputi || "Nama Deputi belum diatur"}</p>
                  <p className="text-[clamp(5px,.62vw,8px)] leading-tight text-[#4c4056]">{signature?.jabatanDeputi || "Deputi"}</p>
                </div>
                <span className="pb-1 text-[clamp(6px,.7vw,9px)] font-semibold text-[#8b6a24]">LEMHANNAS RI</span>
              </div>
            </div>
          </article>

          {/* SISI BELAKANG: bidang ungu, watermark gedung, data alumni dan informasi resmi */}
          <article className="relative isolate flex aspect-[1.586/1] flex-col overflow-hidden rounded-[14px] border border-[#4b2861] bg-[#32104b] text-white shadow-lg print:break-inside-avoid print:shadow-none">
            <div className="pointer-events-none absolute inset-0 opacity-[0.20]">
              <Image src="/images/lemhannas-header.jpg" alt="" fill unoptimized sizes="700px" className="object-cover object-center" />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#32104b]/95 via-[#32104b]/80 to-[#32104b]/65" />
            <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 12px, rgba(255,255,255,.08) 12px 14px)" }} />

            <header className="relative flex items-center gap-2 border-b border-[#b58b3d] px-3 py-2 sm:gap-3 sm:px-5 sm:py-3">
              <Image src="/images/logo-lemhannas.png" alt="Lambang Lemhannas RI" width={54} height={54} className="h-9 w-9 shrink-0 object-contain sm:h-12 sm:w-12" />
              <div>
                <h3 className="text-[clamp(9px,1.1vw,14px)] font-extrabold tracking-wide">LEMHANNAS RI</h3>
                <p className="text-[clamp(6px,.7vw,9px)] text-white/85">Lembaga Ketahanan Nasional</p>
              </div>
              <p className="ml-auto max-w-[42%] text-right text-[clamp(6px,.72vw,9px)] italic leading-tight text-white/90">“Membangun Ketahanan Nasional<br />untuk Indonesia Maju”</p>
            </header>

            <div className="relative flex min-h-0 flex-1 items-center gap-2 px-3 py-2 sm:gap-4 sm:px-5 sm:py-3">
              <div className="min-w-0 flex-1">
                <h4 className="mb-2 text-[clamp(8px,.95vw,12px)] font-bold">Data Alumni</h4>
                <dl className="space-y-1 text-[clamp(7px,.82vw,11px)] leading-tight">
                  <div className="grid grid-cols-[5.3em_1fr] gap-1"><dt>Nama</dt><dd className="min-w-0 break-words">: {profile.nama || "-"}</dd></div>
                  <div className="grid grid-cols-[5.3em_1fr] gap-1"><dt>No. Alumni</dt><dd className="min-w-0 break-all">: {alumniNo}</dd></div>
                  <div className="grid grid-cols-[5.3em_1fr] gap-1"><dt>Program</dt><dd>: {category}</dd></div>
                  <div className="grid grid-cols-[5.3em_1fr] gap-1"><dt>Angkatan</dt><dd>: {cohort}</dd></div>
                  <div className="grid grid-cols-[5.3em_1fr] gap-1"><dt>Tahun</dt><dd>: {year}</dd></div>
                </dl>
              </div>
              <div className="w-[25%] max-w-[112px] shrink-0 rounded-md bg-[#250b3a]/75 p-2 text-center">
                <QrPlaceholder />
                <p className="mt-1 text-[clamp(5px,.62vw,8px)] font-semibold leading-tight">Verifikasi Keaslian Kartu<br />Scan QR Code</p>
              </div>
            </div>

            <footer className="relative grid grid-cols-[1fr_1fr_1fr] border-t border-[#b58b3d] px-2 py-2 sm:px-4 sm:py-2.5">
              <div className="flex min-w-0 items-start gap-1.5 border-r border-white/25 pr-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-white" />
                <p className="text-[clamp(5px,.62vw,8px)] leading-tight">Lemhannas RI<br />Jl. Medan Merdeka Selatan No.10<br />Jakarta Pusat, 10110</p>
              </div>
              <div className="flex min-w-0 items-start gap-1.5 border-r border-white/25 px-2">
                <Globe2 size={14} className="mt-0.5 shrink-0 text-white" />
                <p className="break-words text-[clamp(5px,.62vw,8px)] leading-tight">www.lemhannas.go.id<br />Kartu ini merupakan identitas resmi alumni Lemhannas RI</p>
              </div>
              <div className="flex items-start justify-center pl-2 text-[clamp(5px,.62vw,8px)] leading-tight">
                <span>Alumni Bersatu,<br />Untuk Indonesia Maju</span>
              </div>
            </footer>
          </article>
        </div>
      )}
      <p className="px-5 pb-5 text-xs text-slate-500 print:hidden">Data kartu mengikuti profil alumni. QR pada tampilan ini masih placeholder sampai layanan verifikasi KTM tersedia.</p>
    </section>
  );
}
