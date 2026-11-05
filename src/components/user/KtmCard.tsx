"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, ShieldCheck, LoaderCircle, IdCard } from "lucide-react";

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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b28b16]">Identitas Alumni</p>
          <h2 className="mt-1 text-lg font-bold text-[#172033]">Kartu Tanda Alumni (KTM)</h2>
          <p className="mt-1 text-sm text-slate-500">Kartu dibuat otomatis berdasarkan data profil Anda.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#18385f] print:hidden">
          <Download size={16} /> Cetak / Simpan PDF
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Memuat tanda tangan pejabat...</div>
      ) : (
        <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-2 print:grid-cols-2">
          <article className="relative isolate aspect-[1.586/1] overflow-hidden rounded-2xl border border-[#5d347b] bg-gradient-to-br from-[#250b43] via-[#421267] to-[#17072c] p-4 text-white shadow-lg sm:p-6 print:break-inside-avoid">
            <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border-[24px] border-white/5" />
            <div className="absolute -bottom-24 right-20 h-64 w-64 rotate-45 border-2 border-amber-300/20" />
            <div className="relative flex items-center gap-3 border-b border-amber-300/50 pb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-amber-200"><IdCard size={27} /></div>
              <div><p className="text-sm font-bold tracking-wide">LEMHANNAS RI</p><p className="text-[9px] text-white/75 sm:text-[10px]">Lembaga Ketahanan Nasional</p></div>
              <div className="ml-auto text-right"><p className="text-xs font-semibold">Kartu Tanda Alumni</p><p className="text-[9px] italic text-white/70">Alumni Lemhannas RI</p></div>
            </div>
            <div className="relative mt-4 flex gap-3 sm:gap-4">
              <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-white/80 bg-slate-200 sm:h-36 sm:w-28">
                {profile.fotoProfil ? <Image src={profile.fotoProfil} alt="Foto alumni" fill unoptimized sizes="112px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-center text-[9px] text-slate-500">Foto alumni</div>}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-sm font-bold sm:text-lg">{profile.nama || "Nama Alumni"}</h3>
                <p className="mt-1 text-[9px] text-white/85 sm:text-xs">No. Alumni: {alumniNo}</p>
                <p className="mt-2 text-[9px] text-white/85 sm:text-xs">Program: {category}</p>
                <p className="text-[9px] text-white/85 sm:text-xs">Angkatan: {cohort} / {year}</p>
                <div className={`mt-3 flex h-12 max-w-[170px] items-end justify-center overflow-hidden rounded-md px-2 py-1 ${signature?.formatTtd === "tot_white" ? "bg-white" : "bg-transparent"}`}>
                  {signature?.signatureUrl ? <Image src={signature.signatureUrl} alt="Tanda tangan Deputi" width={150} height={48} unoptimized className="max-h-11 w-auto object-contain" /> : <span className="text-[9px] text-white/50">Tanda tangan belum tersedia</span>}
                </div>
                <p className="mt-1 text-[9px] font-semibold leading-tight">{signature?.namaDeputi || "Nama Deputi belum diatur"}</p>
                <p className="text-[8px] text-white/75">{signature?.jabatanDeputi || "Deputi"}</p>
              </div>
            </div>
            <div className="absolute bottom-3 right-4 flex items-center gap-1 text-[8px] text-white/70"><ShieldCheck size={11} /> Kartu identitas alumni</div>
          </article>

          <article className="relative isolate aspect-[1.586/1] overflow-hidden rounded-2xl border border-[#5d347b] bg-gradient-to-br from-[#250b43] via-[#421267] to-[#17072c] p-4 text-white shadow-lg sm:p-6 print:break-inside-avoid">
            <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border-[24px] border-white/5" />
            <div className="relative flex items-center gap-3 border-b border-amber-300/50 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-amber-200"><IdCard size={24} /></div>
              <div><p className="text-sm font-bold tracking-wide">LEMHANNAS RI</p><p className="text-[9px] text-white/75">Lembaga Ketahanan Nasional</p></div>
              <p className="ml-auto text-right text-[9px] italic text-white/80">Alumni Bersatu,<br />Untuk Indonesia Maju</p>
            </div>
            <div className="relative mt-4 grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-2 text-[9px] sm:text-xs">
                <p className="mb-3 text-xs font-bold sm:text-sm">Informasi Alumni</p>
                <p>Nama : {profile.nama || "-"}</p>
                <p>No. Alumni : {alumniNo}</p>
                <p>Program : {category}</p>
                <p>Angkatan : {cohort}</p>
                <p>Tahun : {year}</p>
              </div>
              <div className="flex w-20 flex-col items-center justify-center border-l border-white/30 pl-3 text-center sm:w-28">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border-4 border-white/90 bg-white text-center text-[8px] font-bold text-[#351052] sm:h-20 sm:w-20">QR<br />VERIFIKASI</div>
                <span className="mt-1 text-[8px] leading-tight text-white/80">Verifikasi KTM<br />melalui portal</span>
              </div>
            </div>
            <div className="absolute inset-x-4 bottom-3 border-t border-amber-300/40 pt-2 text-[8px] text-white/70 sm:inset-x-6">Kartu identitas resmi alumni Lemhannas RI</div>
          </article>
        </div>
      )}
      <p className="px-5 pb-5 text-xs text-slate-500 print:hidden">Pastikan foto dan informasi profil sudah benar sebelum mencetak KTM. QR verifikasi akan diaktifkan setelah endpoint verifikasi kartu tersedia.</p>
    </section>
  );
}
