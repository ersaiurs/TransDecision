"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Eye, EyeOff, CarFront } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password tidak sama");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name,
        });
      }

      await auth.signOut();
      router.push("/login");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email sudah terdaftar, silakan login");
      } else if (err.code === "auth/weak-password") {
        setError("Password terlalu lemah (minimal 6 karakter)");
      } else {
        setError("Gagal mendaftar, coba lagi");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch {
      setError("Registrasi Google gagal");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-slate-950 px-4 py-12">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-4xl p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-gray-900">

        {/* KOLOM KIRI: HEADER & FORM */}
        <div className="flex flex-col justify-center h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-500 p-3 rounded-xl shadow-lg text-white">
              <CarFront size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TransDecision Register</h1>
              <p className="text-gray-500 text-xs">Buat akun baru untuk melanjutkan</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* NAMA */}
            <div>
              <label className="text-xs text-gray-700 font-medium">Nama</label>
              <input
                type="text"
                className="mt-1 w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm text-gray-900"
                placeholder="Nama Lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-xs text-gray-700 font-medium">Email</label>
              <input
                type="email"
                className="mt-1 w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm text-gray-900"
                placeholder="admin@transdecision.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-xs text-gray-700 font-medium">Kata Sandi</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="mt-1 w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm pr-10 text-gray-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 inset-y-0 text-gray-400 hover:text-gray-600 flex items-center"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="text-xs text-gray-700 font-medium">Konfirmasi Kata Sandi</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="mt-1 w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm pr-10 text-gray-900"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 inset-y-0 text-gray-400 hover:text-gray-600 flex items-center"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60 text-sm mt-2 shadow-md"
            >
              {loading ? "Memproses..." : "Daftar"}
            </button>
          </form>

          {/* DIVIDER */}
          <div className="text-center text-gray-400 my-3 text-xs">
            atau
          </div>

          {/* GOOGLE BUTTON */}
          <button
            onClick={handleGoogleRegister}
            className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition text-sm shadow-sm flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Daftar dengan Google
          </button>

          {/* SWITCH */}
          <p className="text-center text-gray-500 text-xs mt-4">
            Sudah punya akun?{" "}
            <a href="/login" className="text-blue-600 hover:underline font-medium">
              Sign In
            </a>
          </p>
        </div>

        {/* KOLOM KANAN: ILUSTRASI / GAMBAR */}
        <div className="hidden md:flex flex-col items-center justify-center bg-blue-50/50 rounded-xl p-8 border border-blue-100 h-full min-h-[360px]">
          <div className="bg-blue-500/10 p-6 rounded-full mb-4 text-blue-600 border border-blue-500/20 shadow-inner">
            <CarFront size={56} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">TransDecision Management</h3>
          <p className="text-gray-500 text-xs text-center mt-2 max-w-xs">
            Solusi cerdas berbasis data untuk keputusan transportasi yang lebih akurat dan efisien.
          </p>
        </div>

      </div>
    </div>
  );
}