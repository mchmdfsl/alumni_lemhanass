"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, MapPin, Globe2, LoaderCircle } from "lucide-react";

type Profile = {
  nama?: string;
  nomorAlumni?: string | null;
  kategoriProgram?: string;
  nomorAngkatan?: string;
  tahunAngkatan?: string | number;
  fotoProfil?: string | null;
  ktmVerificationToken?: string | null;
};

type Signature = {
  namaDeputi?: string;
  jabatanDeputi?: string;
  signatureUrl?: string | null;
  formatTtd?: "standard" | "tot_white";
};

function QrCode({ token }: { token?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!token || failed) {
    return <div className="flex aspect-square w-full items-center justify-center bg-white px-1 text-center text-[8px] font-semibold text-[#17132f]">{token ? "QR gagal dimuat" : "QR belum tersedia"}</div>;
  }
  return (
    <Image
      src={`/api/ktm/qr?token=${encodeURIComponent(token)}`}
      alt="QR verifikasi keaslian KTM"
      width={480}
      height={480}
      unoptimized
      onError={() => setFailed(true)}
      className="aspect-square w-full bg-white object-contain"
    />
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
        if (active && response.ok) {
          const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
          const match = rows.find((row: Signature & { kategoriProgram?: string }) => row.kategoriProgram === profile.kategoriProgram);
          setSignature(match ?? rows[0] ?? null);
        }
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile.kategoriProgram]);

  const category = profile.kategoriProgram || "-";
  const cohort = profile.nomorAngkatan || "-";
  const year = profile.tahunAngkatan || "-";
  const alumniNo = profile.nomorAlumni || "-";
  const nameLength = (profile.nama || "Nama Alumni").trim().length;
  const frontNameSize = nameLength > 64 ? "9px" : nameLength > 48 ? "10px" : nameLength > 36 ? "12px" : nameLength > 26 ? "15px" : "20px";
  const backNameSize = nameLength > 64 ? "8px" : nameLength > 44 ? "9px" : nameLength > 30 ? "10px" : "12px";

  const downloadKtmPdf = async () => {
    if (loading) {
      alert("KTM masih dimuat. Tunggu sebentar sampai kedua sisi kartu tampil.");
      return;
    }
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".ktm-print-area article"));
    if (cards.length !== 2) {
      alert("Kartu KTM depan dan belakang belum siap. Muat ulang halaman lalu coba lagi.");
      return;
    }

    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[data-ktm-lib="${src}"]`);
      if (existing?.dataset.loaded === "true") return resolve();
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Gagal memuat pustaka PDF.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.ktmLib = src;
      script.onload = () => { script.dataset.loaded = "true"; resolve(); };
      script.onerror = () => reject(new Error("Gagal memuat pustaka PDF."));
      document.head.appendChild(script);
    });

    try {
      await Promise.all([
        loadScript("https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.11/dist/html2canvas-pro.min.js"),
        loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js"),
      ]);
      const win = window as typeof window & {
        html2canvas?: (element: HTMLElement, options: Record<string, unknown>) => Promise<HTMLCanvasElement>;
        jspdf?: { jsPDF: new (options: Record<string, unknown>) => {
          addImage: (data: string, type: string, x: number, y: number, width: number, height: number) => void;
          addPage: (format: number[]) => void;
          save: (filename: string) => void;
        } };
      };
      if (!win.html2canvas || !win.jspdf?.jsPDF) throw new Error("Pustaka pembuat PDF tidak tersedia.");

      const pdf = new win.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54], compress: true });
      for (let index = 0; index < cards.length; index += 1) {
        const canvas = await win.html2canvas(cards[index], {
          scale: 3, useCORS: true, allowTaint: false, backgroundColor: null,
          logging: false, width: cards[index].scrollWidth, height: cards[index].scrollHeight,
        });
        if (index > 0) pdf.addPage([85.6, 54]);
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, 85.6, 54);
      }
      const safeName = (profile.nama || "Alumni").normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
      pdf.save(`KTM_${safeName || "Alumni"}.pdf`);
    } catch (error) {
      console.error("KTM PDF download failed:", error);
      const detail = error instanceof Error ? error.message : String(error);
      alert(`PDF KTM gagal dibuat: ${detail}`);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5b2878]">Identitas Alumni</p>
          <h2 className="mt-1 text-lg font-bold text-[#17132f]">Kartu Tanda Alumni (KTM)</h2>
        </div>
        <button type="button" onClick={downloadKtmPdf} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17132f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#28234a] disabled:opacity-60">
          <Download size={16} /> Unduh KTM (PDF)
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500 print:hidden"><LoaderCircle className="animate-spin" size={18} /> Memuat identitas pejabat...</div>
      ) : (
        <div className="ktm-print-area mx-auto grid w-full max-w-[1160px] min-w-0 items-start gap-5 p-4 sm:gap-6 sm:p-6 print:grid-cols-2 print:gap-3 print:p-0" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))" }}>
          {/* FRONT: komposisi kartu disamakan dengan desain yang disetujui */}
          <article style={{ containerType: "inline-size" }} className="relative isolate flex aspect-[85.6/54] w-full min-w-0 overflow-hidden rounded-[14px] border border-[#d8d2bd] bg-[#f4f1df] text-[#17132f] shadow-lg print:break-inside-avoid print:shadow-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_18%,rgba(255,255,255,.95),transparent_55%),linear-gradient(115deg,#f7f4e6_0%,#eeecd9_58%,#f8f5e8_100%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_10px,rgba(177,151,86,.18)_11px,transparent_12px)]" />
            <div className="pointer-events-none absolute inset-0 opacity-25 bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_8px,rgba(177,151,86,.12)_9px,transparent_10px)]" />
            <div className="relative flex w-[25%] shrink-0 flex-col items-center overflow-hidden bg-[#17132f]">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,#665b8d_0_1px,transparent_2px),radial-gradient(circle_at_75%_38%,#8a7da7_0_1px,transparent_2px),repeating-linear-gradient(135deg,transparent_0px,transparent_9px,rgba(255,255,255,.08)_10px,transparent_11px)]" />
              <div className="relative z-10 mt-[17%] flex w-full flex-col items-center px-2">
                <span className="mb-1 text-[clamp(12px,4cqw,20px)] text-[#d5b66b]">★</span>
                <Image src="/images/logo-lemhannas.png" alt="Lambang Lemhannas RI" width={112} height={112} priority className="h-auto w-[76%] max-w-[112px] object-contain drop-shadow-md" />
              </div>
              <svg className="absolute -bottom-1 left-0 h-[34%] w-full" viewBox="0 0 220 100" preserveAspectRatio="none" aria-hidden="true">
                <path d="M-8 8 C52 42 78 54 130 70 C166 82 190 91 230 100 L230 112 L-8 112Z" fill="#b71936" />
                <path d="M-8 31 C48 61 86 70 132 84 C172 96 194 101 230 106 L230 118 L-8 118Z" fill="#f4f1e8" />
                <path d="M-8 53 C42 78 82 87 132 98 C173 107 198 111 230 114 L230 125 L-8 125Z" fill="#17132f" />
              </svg>
              <div className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-b from-[#c9ad6a] via-[#fff5d4] to-[#b99c59]" />
            </div>

            <div className="relative min-w-0 flex-1 overflow-hidden px-[3.2%] py-[3.2%]">
              <div className="pointer-events-none absolute -right-[12%] top-[22%] h-[45%] w-[80%] rotate-[-8deg] rounded-[50%] border-t border-[#c9b36f]/55" />
              <div className="pointer-events-none absolute -right-[18%] top-[28%] h-[48%] w-[90%] rotate-[-8deg] rounded-[50%] border-t border-[#c9b36f]/35" />
              <header className="relative flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[clamp(15px,4.5cqw,23px)] font-extrabold leading-tight tracking-wide text-[#17132f]">LEMHANNAS RI</h3>
                  <p className="text-[clamp(9px,2.4cqw,12px)] font-medium text-[#39344b]">Lembaga Ketahanan Nasional</p>
                </div>
                <div className="text-right">
                  <p className="text-[clamp(9px,2.6cqw,13px)] font-bold">Kartu Tanda Alumni</p>
                  <p className="text-[clamp(8px,2.1cqw,11px)] italic">Alumni Lemhannas RI</p>
                </div>
              </header>

              <div className="relative mt-[3.5%] flex min-h-0 gap-[3%]">
                <div className="min-w-0 flex-1">
                  <h4 title={profile.nama || "Nama Alumni"} style={{ fontSize: frontNameSize }} className="line-clamp-2 max-w-full break-words [overflow-wrap:anywhere] font-extrabold leading-[1.08] text-[#17132f]">{profile.nama || "Nama Alumni"}</h4>
                  <p className="mt-1 text-[clamp(9px,2.6cqw,13px)] leading-tight">No. Alumni <span className="mx-1">:</span> <strong>{alumniNo}</strong></p>
                  <div className="mt-1.5 text-[clamp(9px,2.6cqw,13px)] leading-[1.35]">
                    <p>Program <span className="mx-1">:</span> <strong>{category}</strong></p>
                    <p className="pl-[3.45em]">{category === "PPRA" ? "(Pendidikan Pemantapan Pimpinan Nasional)" : ""}</p>
                    <p>Angkatan <span className="mx-1">:</span> <strong>{cohort}{year !== "-" ? ` / ${year}` : ""}</strong></p>
                  </div>
                </div>
                <div className="flex w-[24%] shrink-0 flex-col items-center gap-1">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[5px] border-2 border-[#d0bd83] bg-slate-200 shadow-sm">
                    {profile.fotoProfil ? <Image src={profile.fotoProfil} alt="Foto alumni" fill unoptimized sizes="110px" className="object-cover" /> : <div className="flex h-full items-center justify-center px-1 text-center text-[8px] text-slate-500">Foto alumni</div>}
                  </div>
                  <div className="w-[82%] border border-[#c7b77e] bg-white p-[2px]"><QrCode token={profile.ktmVerificationToken} /></div>
                  <p className="text-center text-[clamp(8px,2.2cqw,11px)] font-semibold leading-tight">Verifikasi Keaslian Kartu<br />Scan QR Code</p>
                </div>
              </div>

              <div className="absolute bottom-[4%] left-[3.2%] right-[3.2%] flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className={`flex h-[clamp(18px,6cqw,29px)] max-w-[130px] items-center overflow-hidden ${signature?.formatTtd === "tot_white" ? "bg-white" : ""}`}>
                    {signature?.signatureUrl ? <Image src={signature.signatureUrl} alt="Tanda tangan Deputi" width={125} height={28} unoptimized className="max-h-full w-auto object-contain object-left" /> : <span className="text-[7px] italic text-slate-400"> </span>}
                  </div>
                  <p className="text-[clamp(8px,2.1cqw,11px)] font-bold leading-tight text-[#17132f]">{signature?.namaDeputi || ""}</p>
                  <p className="text-[clamp(7px,1.9cqw,10px)] leading-tight text-[#39344b]">{signature?.jabatanDeputi || ""}</p>
                </div>
              </div>
            </div>
          </article>

          {/* BACK: navy, watermark gedung, blok data kiri, QR kanan, footer institusi */}
          <article style={{ containerType: "inline-size" }} className="relative isolate flex aspect-[85.6/54] w-full min-w-0 flex-col overflow-hidden rounded-[14px] border border-[#282343] bg-[#17132f] text-white shadow-lg print:break-inside-avoid print:shadow-none">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(111,94,151,.20),transparent_65%),linear-gradient(135deg,#211b40_0%,#17132f_55%,#211b40_100%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.10] bg-[linear-gradient(rgba(211,195,143,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(211,195,143,.16)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_12px,rgba(255,255,255,.12)_13px,transparent_14px)]" />

            <header className="relative flex items-center gap-[2.5%] border-b border-[#c8b477]/30 px-[4%] py-[3%]">
              <Image src="/images/logo-lemhannas.png" alt="Lambang Lemhannas RI" width={54} height={54} className="h-[clamp(26px,8cqw,42px)] w-[clamp(26px,5vw,42px)] shrink-0 object-contain" />
              <div>
                <h3 className="text-[clamp(13px,1.5vw,18px)] font-extrabold tracking-wide text-[#d9c58f]">LEMHANNAS RI</h3>
                <p className="text-[clamp(8px,2.1cqw,11px)] text-white/85">Lembaga Ketahanan Nasional</p>
              </div>
              <p className="ml-auto max-w-[42%] text-right text-[clamp(8px,2.2cqw,11px)] italic leading-tight text-[#e0d3aa]">"Membangun Ketahanan Nasional<br />untuk Indonesia Maju"</p>
            </header>

            <div className="relative flex min-h-0 flex-1 items-center gap-[4%] px-[4%] py-[2.5%]">
              <div className="min-w-0 flex-1">
                <h4 className="mb-[2.5%] border-b border-white/45 pb-1 text-[clamp(11px,2.9cqw,14px)] font-bold">Data Alumni</h4>
                <dl className="space-y-[1.6%] text-[clamp(9px,2.5cqw,13px)] leading-tight">
                  <div className="grid grid-cols-[5.3em_1fr] gap-1"><dt>Nama</dt><dd title={profile.nama || "-"} style={{ fontSize: backNameSize }} className="line-clamp-2 min-w-0 break-words leading-[1.12] [overflow-wrap:anywhere]">: {profile.nama || "-"}</dd></div>
                  <div className="grid grid-cols-[5.3em_1fr] gap-1"><dt>No. Alumni</dt><dd className="min-w-0 break-all">: {alumniNo}</dd></div>
                  <div className="grid grid-cols-[5.3em_1fr] gap-1"><dt>Program</dt><dd>: {category}</dd></div>
                  <div className="grid grid-cols-[5.3em_1fr] gap-1"><dt>Angkatan</dt><dd>: {cohort}</dd></div>
                  <div className="grid grid-cols-[5.3em_1fr] gap-1"><dt>Tahun</dt><dd>: {year}</dd></div>
                </dl>
              </div>
              <div className="w-[25%] max-w-[112px] shrink-0 border border-[#c8b477]/50 bg-white p-[5px] text-center">
                <QrCode token={profile.ktmVerificationToken} />
                <p className="mt-1 text-[clamp(7px,1.9cqw,10px)] font-semibold leading-tight text-[#17132f]">Verifikasi Keaslian Kartu<br />Scan QR Code</p>
              </div>
            </div>

            <footer className="relative grid grid-cols-[1fr_1fr_1fr] border-t border-[#c8b477]/45 px-[2.5%] py-[2.5%]">
              <div className="flex min-w-0 items-start gap-1.5 border-r border-white/20 pr-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#d9c58f]" />
                <p className="text-[clamp(7px,1.9cqw,10px)] leading-tight">Lemhannas RI<br />Jl. Medan Merdeka Selatan No.10<br />Jakarta Pusat, 10110</p>
              </div>
              <div className="flex min-w-0 items-start gap-1.5 border-r border-white/20 px-2">
                <Globe2 size={14} className="mt-0.5 shrink-0 text-[#d9c58f]" />
                <p className="break-words text-[clamp(7px,1.9cqw,10px)] leading-tight">www.lemhannas.go.id<br />Kartu ini merupakan identitas resmi alumni Lemhannas RI</p>
              </div>
              <div className="flex items-start justify-center pl-2 text-[clamp(7px,1.9cqw,10px)] leading-tight text-[#e0d3aa]">
                <span>Alumni Bersatu,<br />Untuk Indonesia Maju</span>
              </div>
            </footer>
          </article>
        </div>
      )}
      <p className="px-5 pb-5 text-xs text-slate-500 print:hidden">KTM menampilkan data alumni terverifikasi. QR pada kedua sisi kartu membuka halaman pemeriksaan keaslian dan status akun.</p>
    </section>
  );
}
