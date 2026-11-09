"use client";

import { useRef, useState } from "react";
import { Download, LoaderCircle, XCircle } from "lucide-react";
import KtmCard from "@/components/user/KtmCard";

type AlumniKtm = {
  id: number | string;
  nama: string;
  nomorAlumni: string;
  kategoriProgram: string;
  nomorAngkatan: string;
  tahunAngkatan: string;
  fotoProfil: string | null;
  ktmVerificationToken: string;
};

type KtmProfile = {
  nama: string;
  nomorAlumni: string;
  kategoriProgram: string;
  nomorAngkatan: string;
  tahunAngkatan: string;
  fotoProfil: string | null;
  ktmVerificationToken: string | null;
};

type WritableFile = {
  write: (data: Uint8Array) => Promise<void>;
  close: () => Promise<void>;
  abort: () => Promise<void>;
};
type FileHandle = { createWritable: () => Promise<WritableFile> };
type PdfWindow = Window & {
  html2canvas?: (element: HTMLElement, options: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  jspdf?: { jsPDF: new (options: Record<string, unknown>) => {
    addImage: (data: string, type: string, x: number, y: number, width: number, height: number) => void;
    addPage: (format: number[]) => void;
    output: (type: "blob") => Blob;
  } };
  fflate?: {
    Zip: new (callback: (error: Error | null, data: Uint8Array, final: boolean) => void) => {
      add: (file: { push: (data: Uint8Array, final?: boolean) => void }) => void;
      end: () => void;
    };
    ZipPassThrough: new (filename: string) => { push: (data: Uint8Array, final?: boolean) => void };
  };
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<FileHandle>;
};

const SLOT_COUNT = 4;
const EMPTY_PROFILE: KtmProfile = {
  nama: "Memuat data alumni",
  nomorAlumni: "-",
  kategoriProgram: "KRA",
  nomorAngkatan: "-",
  tahunAngkatan: "-",
  fotoProfil: null,
  ktmVerificationToken: null,
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-ktm-bulk-lib="${src}"]`);
    if (existing?.dataset.loaded === "true") return resolve();
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Gagal memuat pustaka ekspor KTM.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.ktmBulkLib = src;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error("Gagal memuat pustaka ekspor KTM."));
    document.head.appendChild(script);
  });
}

function safePart(value: string, fallback: string) {
  const safe = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return safe || fallback;
}

function waitForSlot(root: HTMLElement, timeoutMs = 30000): Promise<HTMLElement[]> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      const cards = Array.from(root.querySelectorAll<HTMLElement>(".ktm-print-area article"));
      const button = root.querySelector<HTMLButtonElement>("button");
      if (cards.length === 2 && button && !button.disabled) {
        const images = Array.from(root.querySelectorAll<HTMLImageElement>(".ktm-print-area img"));
        if (images.every((img) => img.complete)) {
          resolve(cards);
          return;
        }
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error("Kartu atau QR belum selesai dimuat. Periksa koneksi lalu ulangi unduhan."));
        return;
      }
      window.setTimeout(check, 150);
    };
    check();
  });
}

export default function BulkKtmExporter() {
  const [profiles, setProfiles] = useState<KtmProfile[]>(() => Array.from({ length: SLOT_COUNT }, () => EMPTY_PROFILE));
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, message: "" });
  const [error, setError] = useState("");
  const cancelRef = useRef(false);
  const roots = useRef<Array<HTMLDivElement | null>>([]);

  function cancelExport() {
    cancelRef.current = true;
    setCancelled(true);
  }

  async function handleDownload() {
    if (busy) return;
    if (!window.confirm("Siapkan satu ZIP berisi PDF KTM depan-belakang untuk seluruh alumni terverifikasi sesuai hak akses akun ini? Proses dapat memerlukan waktu dan koneksi internet stabil.")) return;

    setBusy(true);
    setCancelled(false);
    cancelRef.current = false;
    setError("");
    setProgress({ done: 0, total: 0, message: "Pilih lokasi penyimpanan ZIP..." });

    let writable: WritableFile | null = null;
    let writeChain: Promise<void> = Promise.resolve();
    let streamError: Error | null = null;

    try {
      const win = window as PdfWindow;
      if (!win.showSaveFilePicker) {
        throw new Error("Ekspor satu ZIP berukuran besar memerlukan Chrome atau Edge versi terbaru agar file dapat ditulis langsung ke komputer tanpa memenuhi memori browser.");
      }
      const fileHandle = await win.showSaveFilePicker({
        suggestedName: `KTM-Alumni-Terverifikasi-${new Date().toISOString().slice(0, 10)}.zip`,
        types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }],
      });
      writable = await fileHandle.createWritable();

      await Promise.all([
        loadScript("https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.11/dist/html2canvas-pro.min.js"),
        loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js"),
        loadScript("https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js"),
      ]);

      if (!win.html2canvas || !win.jspdf?.jsPDF || !win.fflate?.Zip || !win.fflate.ZipPassThrough) {
        throw new Error("Pustaka PDF/ZIP tidak tersedia di browser.");
      }

      const zip = new win.fflate.Zip((zipError, data) => {
        if (zipError) {
          streamError = zipError;
          return;
        }
        writeChain = writeChain.then(() => writable!.write(data));
      });

      const alumni: AlumniKtm[] = [];
      let offset = 0;
      while (true) {
        if (cancelRef.current) throw new Error("Proses dibatalkan.");
        const response = await fetch(`/api/admin/ktm-export?limit=500&offset=${offset}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal mengambil daftar alumni KTM.");
        const rows = Array.isArray(result.data) ? result.data as AlumniKtm[] : [];
        if (!rows.length && offset === 0) throw new Error("Tidak ada alumni terverifikasi dengan token KTM dalam cakupan akun ini.");
        alumni.push(...rows);
        const total = Number(result.total) || alumni.length;
        setProgress({ done: 0, total, message: "Data alumni terverifikasi berhasil dimuat." });
        if (!result.hasMore || !rows.length) break;
        offset += rows.length;
      }

      for (let start = 0; start < alumni.length; start += SLOT_COUNT) {
        if (cancelRef.current) throw new Error("Proses dibatalkan.");
        const batch = alumni.slice(start, start + SLOT_COUNT);
        const nextProfiles = Array.from({ length: SLOT_COUNT }, (_, index) => {
          const row = batch[index];
          return row ? {
            nama: row.nama || "Alumni",
            nomorAlumni: row.nomorAlumni || "-",
            kategoriProgram: row.kategoriProgram || "-",
            nomorAngkatan: row.nomorAngkatan || "-",
            tahunAngkatan: row.tahunAngkatan || "-",
            fotoProfil: row.fotoProfil || null,
            ktmVerificationToken: row.ktmVerificationToken || null,
          } : EMPTY_PROFILE;
        });
        setProfiles(nextProfiles);
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

        const cardSets = await Promise.all(batch.map(async (_, index) => {
          const root = roots.current[index];
          if (!root) throw new Error("Area render KTM tidak ditemukan.");
          return waitForSlot(root);
        }));

        const pdfBlobs = await Promise.all(batch.map(async (row, index) => {
          const pdf = new win.jspdf!.jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54], compress: true });
          for (let side = 0; side < cardSets[index].length; side += 1) {
            const card = cardSets[index][side];
            const canvas = await win.html2canvas!(card, {
              scale: 3, useCORS: true, allowTaint: false, backgroundColor: null,
              logging: false, width: card.scrollWidth, height: card.scrollHeight,
            });
            if (side > 0) pdf.addPage([85.6, 54]);
            pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 85.6, 54);
            canvas.width = 1;
            canvas.height = 1;
          }
          return { row, blob: pdf.output("blob") };
        }));

        for (const item of pdfBlobs) {
          const filename = `KTM_${item.row.id}_${safePart(item.row.nomorAlumni, "NoAlumni")}_${safePart(item.row.nama, "Alumni")}.pdf`;
          const entry = new win.fflate!.ZipPassThrough(filename);
          zip.add(entry);
          entry.push(new Uint8Array(await item.blob.arrayBuffer()), true);
        }
        await writeChain;
        if (streamError) throw streamError;
        const done = Math.min(start + batch.length, alumni.length);
        setProgress({ done, total: alumni.length, message: `Membuat PDF KTM: ${done.toLocaleString("id-ID")} dari ${alumni.length.toLocaleString("id-ID")} alumni.` });
      }

      if (cancelRef.current) throw new Error("Proses dibatalkan.");
      setProgress({ done: alumni.length, total: alumni.length, message: "Menyelesaikan arsip ZIP..." });
      zip.end();
      await writeChain;
      if (streamError) throw streamError;
      await writable.close();
      writable = null;
      setProgress({ done: alumni.length, total: alumni.length, message: `Selesai. ${alumni.length.toLocaleString("id-ID")} PDF KTM sudah disimpan dalam satu ZIP.` });
    } catch (cause) {
      if (writable) await writable.abort().catch(() => undefined);
      const message = cause instanceof Error ? cause.message : "Ekspor KTM gagal.";
      setError(message);
      setProgress((current) => ({ ...current, message: cancelRef.current ? "Proses dihentikan." : current.message }));
    } finally {
      setBusy(false);
      setCancelled(false);
      cancelRef.current = false;
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Download size={20} /></div>
          <div>
            <h2 className="font-bold text-[#172033]">Unduh KTM Alumni Massal</h2>
            <p className="text-xs text-slate-500">Satu ZIP berisi PDF terpisah untuk setiap alumni terverifikasi.</p>
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-600">Setiap PDF berisi sisi depan dan belakang dengan desain KTM yang sudah disetujui. Admin hanya dapat mengunduh kategori yang menjadi tanggung jawabnya, sedangkan Super Admin mencakup seluruh kategori. Arsip ditulis langsung ke komputer agar ribuan PDF tidak menumpuk di memori browser.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void handleDownload()} className="inline-flex items-center gap-2 rounded-xl bg-[#17132f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#28234a] disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
            {busy ? "Membuat ZIP KTM..." : "Unduh semua KTM (ZIP)"}
          </button>
          {busy && <button type="button" onClick={cancelExport} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"><XCircle size={16} />Batalkan</button>}
        </div>
        {(busy || progress.message) && <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-600"><span>{progress.message}</span>{progress.total > 0 && <strong>{Math.round((progress.done / progress.total) * 100)}%</strong>}</div>
          {progress.total > 0 && <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-700 transition-all" style={{ width: `${Math.min(100, (progress.done / progress.total) * 100)}%` }} /></div>}
        </div>}
        {cancelled && <p className="mt-3 text-sm text-amber-700">Permintaan pembatalan dikirim.</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </section>
      <div aria-hidden="true" className="pointer-events-none fixed left-[-14000px] top-0 z-[-1] w-[1160px]">
        {profiles.map((profile, index) => (
          <div key={index} ref={(element) => { roots.current[index] = element; }} className="w-[1160px]">
            <KtmCard profile={profile} />
          </div>
        ))}
      </div>
    </>
  );
}
