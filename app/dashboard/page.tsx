"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { ArrowRight, Funnel } from "lucide-react";
import {
  CarFront,
  Bike,
  TrendingUp,
  MapPinned,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  Bus,
  Train,
  Layers,
  HelpCircle,
  Lightbulb,
} from "lucide-react";

import dynamic from "next/dynamic";

const MapDashboard = dynamic(() => import("@/components/MapDashboard"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-500 font-medium">
      🗺️ Memuat Peta...
    </div>
  ),
});

const defaultCenter = {
  lat: -6.4025,
  lng: 106.8186,
};

interface Alternative {
  id: string;
  name: string;
  cost: number; // Biaya (Rupiah)
  time: number; // Menit
  distance: number; // Km
  icon: any;
  isCombo?: boolean;
}

// Data Simulasi Umum Moda Transportasi (Bukan Kasus Spesifik)
const generalAlternatives: Alternative[] = [
  {
    id: "ojol",
    name: "Ojek Online",
    cost: 20000,
    time: 25,
    distance: 8,
    icon: Bike,
  },
  {
    id: "taksi",
    name: "Taksi Online",
    cost: 55000,
    time: 35,
    distance: 8,
    icon: CarFront,
  },
  {
    id: "krl",
    name: "KRL Commuter Line",
    cost: 4000,
    time: 20,
    distance: 10,
    icon: Train,
  },
  {
    id: "bus",
    name: "Bus / TransJakarta",
    cost: 3500,
    time: 45,
    distance: 9,
    icon: Bus,
  },
  {
    id: "combo1",
    name: "Ojek Online + KRL",
    cost: 15000,
    time: 22,
    distance: 9,
    icon: Layers,
    isCombo: true,
  },
];

export default function Dashboard() {
  const router = useRouter();

  const [locationStatus, setLocationStatus] = useState<string>(
    "Mencari lokasi Anda...",
  );
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Bobot Kriteria SAW dalam persen (1 - 100%), Total = 100%
  const [weights, setWeights] = useState({
    cost: 34,
    time: 33,
    distance: 33,
  });

  const totalWeight = weights.cost + weights.time + weights.distance;

  // ----------------------------------------------------
  // LOGIKA HANDLER SLIDER agar Total Maksimal 100%
  // ----------------------------------------------------
  const handleWeightChange = (
    changedKey: "cost" | "time" | "distance",
    newValue: number,
  ) => {
    const clampedValue = Math.min(100, Math.max(0, newValue));
    const otherKeys = (["cost", "time", "distance"] as const).filter(
      (k) => k !== changedKey,
    );

    const remaining = 100 - clampedValue;
    const currentOtherSum = weights[otherKeys[0]] + weights[otherKeys[1]];

    let newOther1 = 0;
    let newOther2 = 0;

    if (currentOtherSum > 0) {
      newOther1 = Math.round(
        (weights[otherKeys[0]] / currentOtherSum) * remaining,
      );
      newOther2 = remaining - newOther1;
    } else {
      newOther1 = Math.floor(remaining / 2);
      newOther2 = remaining - newOther1;
    }

    setWeights({
      [changedKey]: clampedValue,
      [otherKeys[0]]: newOther1,
      [otherKeys[1]]: newOther2,
    } as typeof weights);
  };

  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";

  // ----------------------------------------------------
  // PERHITUNGAN SAW (Simple Additive Weighting) DINAMIS
  // ----------------------------------------------------
  const rankedData = useMemo(() => {
    if (generalAlternatives.length === 0) return [];

    const minCost = Math.min(...generalAlternatives.map((a) => a.cost));
    const minTime = Math.min(...generalAlternatives.map((a) => a.time));
    const minDistance = Math.min(...generalAlternatives.map((a) => a.distance));

    const wCost = weights.cost / 100;
    const wTime = weights.time / 100;
    const wDistance = weights.distance / 100;

    const calculated = generalAlternatives.map((item) => {
      const safeCost = item.cost === 0 ? 100 : item.cost;
      const safeMinCost = minCost === 0 ? 100 : minCost;

      const normCost = safeMinCost / safeCost;
      const normTime = minTime / item.time;
      const normDistance = minDistance / item.distance;

      const totalScore =
        normCost * wCost + normTime * wTime + normDistance * wDistance;

      return {
        ...item,
        score: totalScore,
        scorePercentage: Math.round(totalScore * 100),
      };
    });

    calculated.sort((a, b) => b.score - a.score);

    return calculated.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [weights]);

  const bestOption = rankedData[0];

  // ----------------------------------------------------
  // LEAFLET MAP INTEGRATION
  // ----------------------------------------------------

  return (
    <Layout>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors p-4 md:p-6">
        {/* HERO */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 dark:from-cyan-700 dark:to-blue-900 rounded-3xl p-8 text-white mb-6 relative overflow-hidden">
          <div className="max-w-2xl">
            <p className="uppercase tracking-[4px] text-sm mb-3 text-cyan-100 font-semibold">
              Personalized Decision Support System
            </p>
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                Sistem Pendukung Keputusan transportasi
              </h1>
            </div>
            <p className="text-cyan-100">
              Platform pintar untuk membantu Anda memilih moda transportasi
              terbaik (tunggal maupun kombinasi multimoda) berdasarkan prioritas
              personal Anda.
            </p>
          </div>

          <button
            onClick={() => router.push("/alternatif")}
            className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 bg-white text-blue-600 font-semibold px-7 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
          >
            Input Alternatif Anda
            <ArrowRight size={20} />
          </button>

          <button
            onClick={() => router.push("/alternatif")}
            className="md:hidden mt-6 bg-white text-blue-600 font-semibold px-6 py-3.5 rounded-2xl shadow-lg flex items-center gap-2"
          >
            Input Alternatif Anda
            <ArrowRight size={18} />
          </button>

          <div className="absolute -right-10 -top-10 w-52 h-52 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* INFORMASI UMUM WEBSITE & CARA PENGGUNAAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* INFORMASI WEBSITE */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm transition-colors border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 mb-3 text-cyan-500">
              <Info size={22} />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Tentang Website Ini
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Website ini dirancang menggunakan algoritma Simple Additive
              Weighting (SAW) untuk memberikan rekomendasi objektif pilihan
              transportasi. Sistem secara otomatis memperhitungkan kombinasi
              biaya, efisiensi waktu, dan jarak perjalanan sesuai bobot
              preferensi yang Anda tentukan sendiri.
            </p>
          </div>

          {/* CARA PENGGUNAAN */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm transition-colors border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 mb-3 text-cyan-500">
              <HelpCircle size={22} />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Cara Penggunaan
              </h2>
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-cyan-500">3.</span>
                <span>
                  Klik tombol "Input Alternatif Anda" untuk menambahkan rute
                  atau pilihan moda transportasi kustom Anda sendiri.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-cyan-500">2.</span>
                <span>
                  Sistem akan langsung menghitung ulang Skor Akhir & Peringkat
                  secara real-time.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-cyan-500">2.</span>
                <span>
                  Pilih tombol menentukan mana yang lebih penting: Biaya, Waktu,
                  atau Jarak.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-cyan-500">1.</span>
                <span>Dan hasil akan sesuai dengan bobot yang dipilih.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Jumlah Alternatif
            </p>

            <div className="flex items-center gap-4 mt-2">
              <h2 className="text-3xl font-bold">7</h2>

              <div className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                <p>Motor • Mobil • Ojol • Taksi</p>
                <p>KRL • TransJakarta • Angkot</p>
              </div>
            </div>

            <CarFront className="text-cyan-500 mt-3" />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Jumlah Alternatif
            </p>

            <div className="flex items-center gap-4 mt-2">
              <h2 className="text-3xl font-bold">7</h2>

              <div className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                <p>Biaya • Waktu Tempuh • Jarak</p>
              </div>
            </div>

            <Funnel className="text-green-500 mt-3" />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Status Geolocation
            </p>
            <h2 className="text-sm font-bold mt-2 text-slate-700 dark:text-slate-200 truncate">
              {userCoords ? "Aktif (Presisi)" : "Default Map"}
            </h2>
            <MapPinned className="text-violet-500 mt-3" />
          </div>
        </div>

        {/* CONTENT MAIN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* MAP SECTION */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Peta Interaktif Transportasi
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {locationStatus}
                  </p>
                </div>
                <MapPinned className="text-cyan-500" />
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative h-[380px] w-full bg-slate-100 dark:bg-slate-700 z-0">
                {!apiKey ? (
                  <div className="p-4 text-amber-600 dark:text-amber-400 text-sm">
                    Geoapify API Key belum dipasang di .env.local
                  </div>
                ) : (
                  <MapDashboard
                    apiKey={apiKey}
                    defaultCenter={defaultCenter}
                    setUserCoords={setUserCoords}
                    setLocationStatus={setLocationStatus}
                  />
                )}
              </div>
            </div>

            {/* TABLE DINAMIS */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
              <div className="flex items-center gap-2 mb-3 text-cyan-500">
                <Info size={22} />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Transparansi Perhitungan
                </h2>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Sistem keputusan ini menggunakan kalkulasi objektif berbasis
                matematika:
              </p>

              <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    size={16}
                    className="text-emerald-500 shrink-0 mt-0.5"
                  />
                  <span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      Normalisasi Cost:
                    </strong>{" "}
                    Semua parameter (Biaya, Waktu, Jarak) bersifat <em>cost</em>{" "}
                    (makin kecil makin baik).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    size={16}
                    className="text-emerald-500 shrink-0 mt-0.5"
                  />
                  <span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      Pembobotan Dinamis:
                    </strong>{" "}
                    Nilai ternormalisasi dikalikan dengan bobot persentase
                    slider Anda secara langsung.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    size={16}
                    className="text-emerald-500 shrink-0 mt-0.5"
                  />
                  <span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      Skor Akhir:
                    </strong>{" "}
                    Penjumlahan seluruh kriteria menghasilkan peringkat
                    kelayakan dari 0% hingga 100%.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
            <div className="flex items-center gap-2 mb-4 text-cyan-500">
              <Lightbulb size={22} />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Pilihan Kriteria
              </h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Berdasarkan pengaturan bobot saat ini, fokus utama sistem
              ditentukan berdasarkan bobot awal atau bobot prioritas yang Anda
              pilih untuk biaya, waktu tempuh, dan jarak.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50">
                <p className="font-semibold text-cyan-700 dark:text-cyan-300 mb-0.5">
                  Biaya
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Makin murah opsi transportasi, makin tinggi kontribusi nilai
                  kelayakannya.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/50">
                <p className="font-semibold text-violet-700 dark:text-violet-300 mb-0.5">
                  Waktu Perjalanan
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Makin cepat estimasi durasi sampai, makin besar skor
                  efisiensinya.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300 mb-0.5">
                  Jarak
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Memilih rute terpendek untuk meminimalkan kelelahan di
                  perjalanan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
