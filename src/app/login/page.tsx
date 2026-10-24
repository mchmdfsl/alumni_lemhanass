"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      if (data.role === "admin") router.push("/admin");
      else router.push("/user/profil");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#0b1f3a]">Login Sistem</h1>
        
        {error && <div className="mb-4 rounded bg-red-100 p-2 text-sm text-red-600">{error}</div>}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-gray-700">Email / ID Anggota</label>
          <input 
            type="text" 
            className="w-full rounded border px-3 py-2 focus:border-[#9e1b32] focus:outline-none"
            value={identifier} 
            onChange={(e) => setIdentifier(e.target.value)} 
            required 
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-semibold text-gray-700">Password / No Angkatan</label>
          <input 
            type="password" 
            className="w-full rounded border px-3 py-2 focus:border-[#9e1b32] focus:outline-none"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <div className="mt-2 text-right text-sm">
            <a href="/lupa-password" className="text-gray-500 hover:text-[#9e1b32]">Lupa password?</a>
          </div>
        </div>

        <button type="submit" className="w-full rounded bg-[#0b1f3a] py-2 text-white hover:bg-[#0b1f3a]/90">
          MASUK
        </button>

        <div className="mt-6 space-y-2 text-center text-sm text-gray-600">
          <p>Belum terdaftar? <a href="/daftar" className="font-semibold text-[#0b1f3a] hover:text-[#9e1b32]">Buat Pengajuan (Daftar)</a></p>
          <p>Alumni lama? <a href="/klaim-akun" className="font-semibold text-[#0b1f3a] hover:text-[#9e1b32]">Klaim Akun & Set Password</a></p>
        </div>
      </form>
    </div>
  );
}