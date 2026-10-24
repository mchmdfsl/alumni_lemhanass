"use client";
import { useState } from "react";

export default function ProfilUser() {
  const [formData, setFormData] = useState({
    nama: "", angkatan: "", pekerjaan: "", instansi: ""
  });

  const handleSimpan = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Profil berhasil disimpan! (Integrasi API Menyusul)");
  };

  return (
    <div className="max-w-2xl bg-white p-6 rounded-xl shadow-sm border">
      <h1 className="text-2xl font-bold text-[#0b1f3a] mb-6">Lengkapi Profil Anda</h1>
      
      <div className="mb-6 flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-gray-200 border flex items-center justify-center overflow-hidden">
          <span className="text-gray-400 text-sm">Foto</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Upload Foto Profil Baru</label>
          <input type="file" accept="image/*" className="text-sm" />
        </div>
      </div>

      <form onSubmit={handleSimpan} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
          <input type="text" className="w-full border rounded p-2" required onChange={e => setFormData({...formData, nama: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tahun Angkatan</label>
          <input type="number" className="w-full border rounded p-2" required onChange={e => setFormData({...formData, angkatan: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pekerjaan Saat Ini</label>
          <input type="text" className="w-full border rounded p-2" onChange={e => setFormData({...formData, pekerjaan: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Instansi / Perusahaan</label>
          <input type="text" className="w-full border rounded p-2" onChange={e => setFormData({...formData, instansi: e.target.value})} />
        </div>
        <button type="submit" className="w-full bg-[#0b1f3a] text-white py-2 rounded font-medium mt-4">Simpan Perubahan</button>
      </form>
    </div>
  );
}