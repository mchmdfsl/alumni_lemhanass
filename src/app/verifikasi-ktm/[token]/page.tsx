import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ShieldCheck, XCircle } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function VerifyKtmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) notFound();

  const [alumni] = await db()`
    SELECT a.nama, a.nomor_alumni AS "nomorAlumni",
      COALESCE(a.kategori_program, a.angkatan) AS "kategoriProgram",
      a.nomor_angkatan AS "nomorAngkatan", a.tahun_angkatan AS "tahunAngkatan",
      a.status AS "alumniStatus",
      COALESCE(account.is_active, FALSE) AS "accountActive",
      (account.id IS NOT NULL) AS "hasAccount"
    FROM alumni a
    LEFT JOIN LATERAL (
      SELECT id, is_active
      FROM alumni_accounts
      WHERE alumni_id = a.id
      ORDER BY id ASC
      LIMIT 1
    ) account ON TRUE
    WHERE a.ktm_verification_token = ${token}::uuid
    LIMIT 1
  `;

  if (!alumni) notFound();
  const valid = alumni.alumniStatus === "Terverifikasi" && alumni.hasAccount && alumni.accountActive;
  const inactive = alumni.alumniStatus === "Terverifikasi" && alumni.hasAccount && !alumni.accountActive;
  const unverified = alumni.alumniStatus !== "Terverifikasi";
  const statusLabel = valid ? "AKTIF" : inactive ? "NONAKTIF" : unverified ? "BELUM TERVERIFIKASI" : "BELUM ADA AKUN";
  const statusTitle = valid ? "KARTU VALID · AKUN AKTIF" : inactive ? "KARTU TERDAFTAR · AKUN NONAKTIF" : unverified ? "BELUM TERVERIFIKASI" : "BELUM MEMILIKI AKUN";
  const statusDescription = valid ? "Identitas alumni terverifikasi dan akun saat ini aktif." : inactive ? "Identitas alumni terdaftar, tetapi akun telah dinonaktifkan oleh Admin." : unverified ? "Data alumni ditemukan, tetapi belum disetujui melalui proses verifikasi." : "Data alumni sudah terverifikasi, tetapi belum memiliki akun yang dapat digunakan.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-[#32104b] px-6 py-7 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/75">Lemhannas Republik Indonesia</p>
          <h1 className="mt-2 text-2xl font-bold">Verifikasi Kartu Alumni</h1>
        </div>
        <div className="p-6 sm:p-8">
          <div className={`mb-6 flex items-center gap-3 rounded-2xl p-4 ${valid ? "bg-emerald-50 text-emerald-800" : inactive ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"}`}>
            {valid ? <ShieldCheck size={30} /> : <XCircle size={30} />}
            <div>
              <p className="font-bold">{statusTitle}</p>
              <p className="text-sm">{statusDescription}</p>
            </div>
          </div>
          <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-sm text-slate-600">Status akun</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${valid ? "bg-emerald-100 text-emerald-800" : inactive ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{statusLabel}</span>
          </div>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-slate-500">Nama alumni</dt><dd className="font-semibold text-slate-900">{alumni.nama}</dd></div>
            <div><dt className="text-slate-500">Nomor alumni</dt><dd className="font-semibold text-slate-900">{alumni.nomorAlumni || "-"}</dd></div>
            <div><dt className="text-slate-500">Program</dt><dd className="font-semibold text-slate-900">{alumni.kategoriProgram || "-"}</dd></div>
            <div><dt className="text-slate-500">Angkatan</dt><dd className="font-semibold text-slate-900">{alumni.nomorAngkatan || "-"}</dd></div>
            <div><dt className="text-slate-500">Tahun</dt><dd className="font-semibold text-slate-900">{alumni.tahunAngkatan || "-"}</dd></div>
          </dl>
          <p className="mt-7 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">Status akun diperiksa langsung dari database saat QR dipindai. Status dapat berubah mengikuti tindakan Admin.</p>
        </div>
      </section>
    </main>
  );
}
