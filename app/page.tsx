"use client";

import { CarFront } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-900 to-slate-950 text-center px-6">
      {/* Icon */}
      <div className="bg-blue-500 text-white p-6 rounded-2xl shadow-lg mb-6">
        <CarFront size={48} />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-white mb-2">TransDecision</h1>

      <p className="text-gray-300 text-lg mb-8">
        Decision Support System untuk Prediksi Transportasi
      </p>

      {/* Button */}
      <Link
        href="/login"
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transition-all"
      >
        Masuk ke Dashboard
      </Link>
    </main>
  );
}