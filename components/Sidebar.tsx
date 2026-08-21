"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  CarFront,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  MapPinned,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [openModal, setOpenModal] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch {
      alert("Logout gagal, coba lagi");
    }
  };

  const menuClass = (path: string) =>
  `flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200 ${
    pathname === path
      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
      : "text-slate-600 hover:bg-slate-100"
  }`;

  return (
    <>
      <aside className="w-[270px] h-screen sticky top-0 bg-white border-r border-slate-200 flex flex-col justify-between px-6 py-8">

        {/* TOP */}
        <div>
          {/* LOGO */}
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-3 rounded-2xl text-white">
              <CarFront size={24} />
            </div>

            <div>
              <h1 className="font-bold text-2xl text-slate-800">
                TransDecision
              </h1>
              <p className="text-sm text-slate-400">
                SPK Transportasi
              </p>
            </div>
          </div>

          {/* MENU */}
<div className="space-y-2">
  <p className="text-xs uppercase text-slate-400 font-semibold mb-3">
    Main Menu
  </p>

  <Link href="/dashboard" className={menuClass("/dashboard")}>
    <LayoutDashboard size={20} />
    Dashboard
  </Link>

  <Link href="/alternatif" className={menuClass("/alternatif")}>
    <CarFront size={20} />
    Alternatif
  </Link>

  

  <Link href="/perhitungan" className={menuClass("/perhitungan")}>
    <BarChart3 size={20} />
    Perhitungan SAW
  </Link>

  <Link href="/maps" className={menuClass("/maps")}>
    <MapPinned size={20} />
    Peta
  </Link>
</div>
        </div>

        {/* BOTTOM */}
        <div className="space-y-2">
          <button
            onClick={() => setOpenModal(true)}
            className="w-full flex items-center gap-3 text-red-500 hover:bg-red-50 px-4 py-3 rounded-2xl transition"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* ================= LOGOUT MODAL ================= */}
      {openModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white w-[360px] rounded-2xl shadow-xl p-6 animate-in fade-in zoom-in">

            {/* ICON */}
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-red-100 text-red-500 mb-4">
              <LogOut size={24} />
            </div>

            {/* TEXT */}
            <h2 className="text-center text-lg font-semibold text-slate-800">
              Logout dari TransDecision?
            </h2>

            <p className="text-center text-sm text-slate-500 mt-2">
              Kamu harus Sign In kembali untuk mengakses dashboard.
            </p>

            {/* BUTTONS */}
            <div className="flex gap-3 mt-6">

              <button
                onClick={() => setOpenModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                Batal
              </button>

              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium"
              >
                Logout
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}