"use client";
import { useState } from "react";

export default function ListAngkatan() {
  const [filter, setFilter] = useState("");
  
  const dummyAlumni = [
    { nama: "Ahmad Rizky", angkatan: 2020, pekerjaan: "Software Engineer" },
    { nama: "Siti Sarah", angkatan: 2021, pekerjaan: "Data Analyst" },
    { nama: "Budi Santoso", angkatan: 2020, pekerjaan: "UI/UX Designer" },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-[#0b1f3a]">Direktori Alumni</h1>
        <input 
          type="text" 
          placeholder="Cari tahun angkatan..." 
          className="border rounded p-2 text-sm w-full sm:w-64"
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-y">
              <th className="p-3 text-sm font-semibold">Nama Alumni</th>
              <th className="p-3 text-sm font-semibold">Angkatan</th>
              <th className="p-3 text-sm font-semibold">Pekerjaan</th>
            </tr>
          </thead>
          <tbody>
            {dummyAlumni
              .filter(a => a.angkatan.toString().includes(filter))
              .map((alumni, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm">{alumni.nama}</td>
                <td className="p-3 text-sm">{alumni.angkatan}</td>
                <td className="p-3 text-sm text-gray-500">{alumni.pekerjaan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}