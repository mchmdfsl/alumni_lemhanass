"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DaftarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDaftar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      alert("Akun berhasil dibuat! Silakan login dan lengkapi profil Anda.");
      router.push("/login");
    } else {
      alert("Gagal mendaftar, email mungkin sudah digunakan.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleDaftar} className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-bold text-[#0b1f3a]">Daftar Akun Baru</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Cukup gunakan email dan password untuk mendaftar.</p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-gray-700">Email</label>
          <input type="email" required className="w-full rounded border px-3 py-2" onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-semibold text-gray-700">Password</label>
          <input type="password" required className="w-full rounded border px-3 py-2" onChange={(e) => setPassword(e.target.value)} />
        </div>

        <button type="submit" disabled={loading} className="w-full rounded bg-[#0b1f3a] py-2 text-white hover:bg-[#0b1f3a]/90">
          {loading ? "Memproses..." : "Daftar Sekarang"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Sudah punya akun? <a href="/login" className="font-semibold text-[#0b1f3a]">Masuk di sini</a>
        </p>
      </form>
    </div>
  );
}