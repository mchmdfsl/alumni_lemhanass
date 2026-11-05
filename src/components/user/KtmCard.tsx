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
          {/* DEPAN: desain putih pilihan nomor 2, foto dan identitas utama */}
          <article className="relative isolate aspect-[1.586/1] overflow-hidden rounded-xl border border-[#d9d2c4] bg-white p-4 text-[#263247] shadow-md sm:p-6 print:break-inside-avoid">
            <div className="absolute inset-x-0 top-0 h-2 bg-[#6b4a82]" />
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border-[18px] border-[#f3eff6]" />
            <div className="relative flex items-center gap-3 border-b border-[#e6dfd2] pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f0f6] text-[#6b4a82]"><IdCard size={24} /></div>
              <div><p className="text-sm font-extrabold tracking-wide text-[#33233e]">LEMHANNAS RI</p><p className="text-[9px] text-slate-500 sm:text-[10px]">Lembaga Ketahanan Nasional Republik Indonesia</p></div>
              <div className="ml-auto text-right"><p className="text-[10px] font-bold text-[#6b4a82] sm:text-xs">KARTU TANDA ALUMNI</p><p className="text-[8px] text-slate-500">ALUMNI LEMHANNAS RI</p></div>
            </div>
            <div className="relative mt-4 flex gap-3 sm:gap-4">
              <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md border border-[#d8d2c8] bg-slate-100 sm:h-36 sm:w-28">
                {profile.fotoProfil ? <Image src={profile.fotoProfil} alt="Foto alumni" fill unoptimized sizes="112px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-center text-[9px] text-slate-500">Foto alumni</div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-semibold uppercase tracking-wider text-[#8b7548]">Identitas Alumni</p>
                <h3 className="mt-1 line-clamp-2 text-sm font-extrabold text-[#242033] sm:text-lg">{profile.nama || "Nama Alumni"}</h3>
                <p className="mt-1 text-[9px] text-slate-700 sm:text-xs">No. Alumni: <strong>{alumniNo}</strong></p>
                <p className="mt-2 text-[9px] text-slate-700 sm:text-xs">Program: <strong>{category}</strong></p>
                <p className="text-[9px] text-slate-700 sm:text-xs">Angkatan: <strong>{cohort} / {year}</strong></p>
              </div>
            </div>
            <div className="absolute inset-x-4 bottom-3 flex items-end justify-between border-t border-[#e6dfd2] pt-2 sm:inset-x-6">
              <p className="text-[8px] text-slate-500">Kartu identitas alumni</p>
              <p className="text-[8px] font-semibold tracking-wide text-[#6b4a82]">LEMHANNAS RI</p>
            </div>
          </article>

          {/* BELAKANG: sisi informasi putih yang berbeda dari sisi depan */}
          <article className="relative isolate aspect-[1.586/1] overflow-hidden rounded-xl border border-[#d9d2c4] bg-white p-4 text-[#263247] shadow-md sm:p-6 print:break-inside-avoid">
            <div className="absolute inset-x-0 top-0 h-2 bg-[#6b4a82]" />
            <div className="relative flex items-center justify-between border-b border-[#e6dfd2] pb-3">
              <div><p className="text-sm font-extrabold tracking-wide text-[#33233e]">LEMHANNAS RI</p><p className="text-[9px] text-slate-500">Informasi dan pengesahan kartu</p></div>
              <p className="text-right text-[8px] italic text-[#6b4a82]">Alumni Bersatu,<br />Untuk Indonesia Maju</p>
            </div>
            <div className="relative mt-4 grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-2 text-[9px] text-slate-700 sm:text-xs">
                <p className="mb-3 text-xs font-bold text-[#33233e] sm:text-sm">INFORMASI ALUMNI</p>
                <p>Nama: <strong>{profile.nama || "-"}</strong></p>
                <p>Nomor Alumni: <strong>{alumniNo}</strong></p>
                <p>Program: <strong>{category}</strong></p>
                <p>Angkatan: <strong>{cohort}</strong></p>
                <p>Tahun: <strong>{year}</strong></p>
              </div>
              <div className="flex w-20 flex-col items-center justify-center border-l border-[#e6dfd2] pl-3 text-center sm:w-28">
                <div className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-[#6b4a82] bg-[#f7f4f8] text-center text-[8px] font-bold text-[#49345b] sm:h-20 sm:w-20">QR<br />VERIFIKASI</div>
                <span className="mt-1 text-[8px] leading-tight text-slate-500">Verifikasi KTM<br />melalui portal</span>
              </div>
            </div>
            <div className="absolute inset-x-4 bottom-3 flex items-end justify-between border-t border-[#e6dfd2] pt-2 sm:inset-x-6">
              <div className="min-w-0">
                <div className={`flex h-8 max-w-[145px] items-center justify-start overflow-hidden ${signature?.formatTtd === "tot_white" ? "bg-white" : "bg-transparent"}`}>
                  {signature?.signatureUrl ? <Image src={signature.signatureUrl} alt="Tanda tangan Deputi" width={130} height={32} unoptimized className="max-h-8 w-auto object-contain object-left" /> : <span className="text-[8px] text-slate-400">Tanda tangan belum tersedia</span>}
                </div>
                <p className="text-[8px] font-bold leading-tight text-[#33233e]">{signature?.namaDeputi || "Nama Deputi belum diatur"}</p>
                <p className="text-[7px] text-slate-500">{signature?.jabatanDeputi || "Deputi"}</p>
              </div>
              <div className="flex items-center gap-1 text-[8px] text-slate-500"><ShieldCheck size={11} className="text-[#6b4a82]" /> Kartu Alumni</div>
            </div>
          </article>
        </div>
      )}
      <p className="px-5 pb-5 text-xs text-slate-500 print:hidden">Pastikan foto dan informasi profil sudah benar sebelum mencetak KTM. QR verifikasi akan diaktifkan setelah endpoint verifikasi kartu tersedia.</p>
    </section>
  );
}
