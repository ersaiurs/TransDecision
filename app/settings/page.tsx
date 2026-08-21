"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Settings, User, Moon, Bell, LogOut, ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);
  const [notif, setNotif] = useState(true);

  // ================= BACK =================
  const handleBack = () => {
    router.back();
  };

  // ================= DARK MODE (FIX) =================
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);

    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // ================= LOGOUT =================
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch {
      alert("Logout gagal, coba lagi");
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
            <Settings size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
            <p className="text-sm text-slate-500">
              Atur akun dan preferensi aplikasi
            </p>
          </div>
        </div>
      </div>

      {/* AKUN */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          <User size={18} /> Akun
        </h2>

        <p className="text-slate-600 text-sm">Email</p>
        <p className="font-medium text-slate-800">
          {auth.currentUser?.email || "Tidak login"}
        </p>
      </div>

      {/* PREFERENSI */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">Preferensi</h2>

        {/* DARK MODE */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <Moon size={18} />
            <span>Dark Mode</span>
          </div>

          <button
            onClick={toggleDarkMode}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
              darkMode ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow-md transform transition ${
                darkMode ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>

        {/* NOTIF */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <Bell size={18} />
            <span>Notifikasi</span>
          </div>

          <button
            onClick={() => setNotif(!notif)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
              notif ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow-md transform transition ${
                notif ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* LOGOUT */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-medium transition"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}