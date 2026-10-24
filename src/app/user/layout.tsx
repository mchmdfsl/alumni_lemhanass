"use client";
import { useState } from "react";
import { User, Users, FileText, Menu, LogOut, X } from "lucide-react";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: "Profil Saya", href: "/user/profil", icon: <User size={20} /> },
    { name: "List Angkatan", href: "/user/angkatan", icon: <Users size={20} /> },
    { name: "Pengajuan Data", href: "/user/pengajuan", icon: <FileText size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-sm transition-transform duration-300 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <span className="text-xl font-bold text-[#0b1f3a]">Portal Alumni</span>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-500"><X size={24} /></button>
        </div>
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <a key={item.name} href={item.href} className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100">
              {item.icon} <span className="font-medium">{item.name}</span>
            </a>
          ))}
          <a href="/login" className="flex items-center gap-3 rounded-lg px-4 py-3 text-red-600 hover:bg-red-50 mt-8">
            <LogOut size={20} /> <span className="font-medium">Keluar</span>
          </a>
        </nav>
      </aside>

      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />}

      <div className="flex-1 lg:pl-64 w-full">
        <header className="flex h-16 items-center bg-white px-4 border-b shadow-sm lg:hidden">
          <button onClick={() => setIsOpen(true)} className="p-2 text-gray-600"><Menu size={24} /></button>
          <span className="ml-4 text-lg font-bold text-[#0b1f3a]">Portal Alumni</span>
        </header>
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}