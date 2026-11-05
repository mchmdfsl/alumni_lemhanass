import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ShieldCheck, XCircle } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function VerifyKtmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) notFound();

  const [alumni] = await db()`
    SELECT nama, nomor_alumni AS "nomorAlumni",
      COALESCE(kategori_program, angkatan) AS "kategoriProgram",
      nomor_angkatan AS "nomorAngkatan", tahun_angkatan AS "tahunAngkatan", status
    FROM alumni
    WHERE ktm_verification_token = ${token}::uuid
    LIMIT 1
  `;

  if (!alumni) notFound();
  const valid = alumni.status === "Terverifikasi";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-[#32104b] px-6 py-7 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/75">Lemhannas Republik Indonesia</p>
          <h1 className="mt-2 text-2xl font-bold">Verifikasi Kartu Alumni</h1>
        </div>
        <div className="p-6 sm:p-8">
          <div className={`mb-6 flex items-center gap-3 rounded-2xl p-4 ${valid ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
            {valid ? <ShieldCheck size={30} /> : <XCircle size={30} />}
            <div>
              <p className="font-bold">{valid ? "Kartu terdaftar" : "Kartu tidak berlaku"}</p>
              <p className="text-sm">{valid ? "Data kartu cocok dengan data alumni terverifikasi." : "Status alumni belum terverifikasi atau kartu tidak berlaku."}</p>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-slate-500">Nama alumni</dt><dd className="font-semibold text-slate-900">{alumni.nama}</dd></div>
            <div><dt className="text-slate-500">Nomor alumni</dt><dd className="font-semibold text-slate-900">{alumni.nomorAlumni || "-"}</dd></div>
            <div><dt className="text-slate-500">Program</dt><dd className="font-semibold text-slate-900">{alumni.kategoriProgram || "-"}</dd></div>
            <div><dt className="text-slate-500">Angkatan</dt><dd className="font-semibold text-slate-900">{alumni.nomorAngkatan || "-"}</dd></div>
            <div><dt className="text-slate-500">Tahun</dt><dd className="font-semibold text-slate-900">{alumni.tahunAngkatan || "-"}</dd></div>
          </dl>
          <p className="mt-7 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">Halaman ini hanya menampilkan informasi minimum untuk pemeriksaan keaslian KTM.</p>
        </div>
      </section>
    </main>
  );
}
