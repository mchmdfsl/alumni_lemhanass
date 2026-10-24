"use client";
import { useState } from "react";

export default function PengajuanPage() {
  const [jenis, setJenis] = useState("Perbarui Data");
  const [pesan, setPesan] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Pengajuan '${jenis}' berhasil dikirim ke Admin!`);
    setPesan("");
  };

  return (
    <div className="max-w-2xl bg-white p-6 rounded-xl shadow-sm border">
      <h1 className="text-2xl font-bold text-[#0b1f3a] mb-2">Pengajuan Akun</h1>
      <p className="text-sm text-gray-500 mb-6">Gunakan form ini jika Anda ingin mengajukan permohonan penghapusan akun atau perbaruan data yang terkunci kepada Admin.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Jenis Pengajuan</label>
          <select 
            className="w-full border rounded p-2 bg-white" 
            value={jenis} 
            onChange={(e) => setJenis(e.target.value)}
          >
            <option value="Perbarui Data">Permohonan Perbarui Data</option>
            <option value="Hapus Data">Permohonan Hapus Data Akun</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Keterangan / Alasan</label>
          <textarea 
            rows={4} 
            className="w-full border rounded p-2" 
            placeholder="Tuliskan detail pengajuan Anda di sini..."
            value={pesan}
            required
            onChange={(e) => setPesan(e.target.value)}
          />
        </div>

        <button type="submit" className="w-full bg-[#9e1b32] text-white py-2 rounded font-medium mt-2 hover:bg-red-800 transition">
          Kirim Pengajuan
        </button>
      </form>
    </div>
  );
}