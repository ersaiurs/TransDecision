"use client";

import { auth, db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { User, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useMemo, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import {
  BarChart3,
  Download,
  ArrowLeft,
  MapPinned,
  Trophy,
  Route,
  SlidersHorizontal,
  Info,
  Loader2,
  RotateCcw,
} from "lucide-react";

// ======================
// CHART
// ======================
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// ======================
// PDF
// ======================
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// ======================
// Interfaces
// ======================
interface DetailBiaya {
  keterangan: string;
  harga: number;
}

interface KriteriaAHP {
  kode: string;
  nama: string;
  bobot: number;
  tipe: "cost" | "benefit";
}

interface DataRekomendasi {
  moda: string;
  label: string;
  icon: string;
  jarak_km: number;
  waktu_menit: number;
  estimasi_biaya: number;
  skor_spk: number;
  detail_rute?: string[];
  detail_biaya?: DetailBiaya[];
}

interface ApiResultData {
  rekomendasi?: DataRekomendasi[];
  infoRute?: { asal: string; tujuan: string };
  kriteriaAHP?: KriteriaAHP[];
  crScore?: number;
}

function PerhitunganContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const asalParam = searchParams.get("asal");
  const tujuanParam = searchParams.get("tujuan");

  // ======================
  // State Data Raw & UI
  // ======================
  const [rawAlternatives, setRawAlternatives] = useState<DataRekomendasi[]>([]);
  const [infoRute, setInfoRute] = useState({ asal: "", tujuan: "" });
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State Slider Bobot User (dalam persen 0 - 100)
  const [weightBiaya, setWeightBiaya] = useState<number>(45); // C1
  const [weightWaktu, setWeightWaktu] = useState<number>(35); // C2
  const [weightJarak, setWeightJarak] = useState<number>(20); // C3

  // 1. Monitor State Autentikasi
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Helper: Load dari LocalStorage Fallback
  const loadFromLocalStorage = useCallback(() => {
    const dataTersimpan = localStorage.getItem("last_saw_recommendations");
    const ruteTersimpan = localStorage.getItem("last_saw_route_info");
    const ahpTersimpan = localStorage.getItem("last_ahp_weights");

    if (dataTersimpan) {
      try {
        setRawAlternatives(JSON.parse(dataTersimpan));
      } catch (e) {
        console.error("Gagal memuat riwayat rekomendasi:", e);
      }
    }

    if (ruteTersimpan) {
      try {
        setInfoRute(JSON.parse(ruteTersimpan));
      } catch (e) {
        console.error("Gagal memuat info rute:", e);
      }
    }

    if (ahpTersimpan) {
      try {
        const parsedAHP = JSON.parse(ahpTersimpan);
        if (parsedAHP.kriteria) {
          const list: KriteriaAHP[] = parsedAHP.kriteria;
          const c1 = list.find((x) => x.kode === "C1")?.bobot ?? 0.45;
          const c2 = list.find((x) => x.kode === "C2")?.bobot ?? 0.35;
          const c3 = list.find((x) => x.kode === "C3")?.bobot ?? 0.20;
          setWeightBiaya(Math.round(c1 * 100));
          setWeightWaktu(Math.round(c2 * 100));
          setWeightJarak(Math.round(c3 * 100));
        }
      } catch (e) {
        console.error("Gagal memuat bobot AHP:", e);
      }
    }
  }, []);

  // 3. Helper: Simpan ke Firestore
  const saveRecommendation = useCallback(
    async (data: ApiResultData, currentUser: User) => {
      try {
        const rekomendasi = data.rekomendasi ?? [];
        const terbaik = rekomendasi[0];
        const listKriteria = data.kriteriaAHP ?? [];

        await addDoc(
          collection(db, "users", currentUser.uid, "recommendations"),
          {
            asal: data.infoRute?.asal ?? "",
            tujuan: data.infoRute?.tujuan ?? "",
            createdAt: serverTimestamp(),
            bobot: {
              harga: listKriteria.find((x) => x.kode === "C1")?.bobot ?? 0,
              waktu: listKriteria.find((x) => x.kode === "C2")?.bobot ?? 0,
              jarak: listKriteria.find((x) => x.kode === "C3")?.bobot ?? 0,
            },
            hasilSAW: {
              transportasiTerbaik: terbaik?.label ?? "",
              skorTerbaik: terbaik?.skor_spk ?? 0,
              ranking: rekomendasi.map((item) => ({
                moda: item.moda,
                label: item.label,
                icon: item.icon,
                skor_spk: item.skor_spk,
                jarak_km: item.jarak_km,
                waktu_menit: item.waktu_menit,
                estimasi_biaya: item.estimasi_biaya,
                detail_rute: item.detail_rute ?? [],
                detail_biaya: item.detail_biaya ?? [],
              })),
            },
            route: {
              jarak: terbaik?.jarak_km ?? 0,
              durasi: terbaik?.waktu_menit ?? 0,
              estimasiBiaya: terbaik?.estimasi_biaya ?? 0,
            },
          }
        );

        sessionStorage.setItem("recommendation_saved", "true");
        console.log("✅ Berhasil disimpan ke Firestore");
      } catch (err) {
        console.error("Gagal menyimpan ke Firestore:", err);
      }
    },
    []
  );

  // 4. Fetch Data Perhitungan awal dari Server
  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;

    const fetchDataPerhitungan = async () => {
      setIsLoading(true);

      try {
        const query = new URLSearchParams();
        if (asalParam) query.append("asal", asalParam);
        if (tujuanParam) query.append("tujuan", tujuanParam);

        const response = await fetch(`/api/spk/perhitungan?${query.toString()}`);

        if (!response.ok) {
          throw new Error("Gagal mengambil data dari server");
        }

        const result = await response.json();

        if (isMounted && result.data) {
          setRawAlternatives(result.data.rekomendasi || []);
          setInfoRute(result.data.infoRute || { asal: "", tujuan: "" });

          if (result.data.kriteriaAHP) {
            const list: KriteriaAHP[] = result.data.kriteriaAHP;
            const c1 = list.find((x) => x.kode === "C1")?.bobot ?? 0.45;
            const c2 = list.find((x) => x.kode === "C2")?.bobot ?? 0.35;
            const c3 = list.find((x) => x.kode === "C3")?.bobot ?? 0.20;
            setWeightBiaya(Math.round(c1 * 100));
            setWeightWaktu(Math.round(c2 * 100));
            setWeightJarak(Math.round(c3 * 100));
          }

          const sudahDisimpan = sessionStorage.getItem("recommendation_saved");
          if (!sudahDisimpan && user) {
            await saveRecommendation(result.data, user);
          }
        } else if (isMounted) {
          loadFromLocalStorage();
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        if (isMounted) loadFromLocalStorage();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDataPerhitungan();

    return () => {
      isMounted = false;
    };
  }, [asalParam, tujuanParam, user, authLoading, saveRecommendation, loadFromLocalStorage]);

  /// ======================
// Handler Pilihan Bobot
// ======================
const handleWeightPreset = (
  biaya: number,
  waktu: number,
  jarak: number
) => {
  setWeightBiaya(biaya);
  setWeightWaktu(waktu);
  setWeightJarak(jarak);

  saveWeightsToLocal(biaya, waktu, jarak);
};

// Helper untuk menyimpan ke LocalStorage
const saveWeightsToLocal = (b: number, w: number, j: number) => {
  localStorage.setItem(
    "last_ahp_weights",
    JSON.stringify({
      kriteria: [
        {
          kode: "C1",
          nama: "Estimasi Biaya",
          bobot: b / 100,
          tipe: "cost",
        },
        {
          kode: "C2",
          nama: "Waktu Tempuh",
          bobot: w / 100,
          tipe: "cost",
        },
        {
          kode: "C3",
          nama: "Jarak Tempuh",
          bobot: j / 100,
          tipe: "cost",
        },
      ],
    })
  );
};

// Reset Bobot ke Default AHP
const resetWeights = () => {
  handleWeightPreset(45, 35, 20);
};

  // ========================================================
  // RE-CALCULATE METODE SAW BERDASARKAN SLIDER DENGAN MEMO
  // ========================================================
  const riwayatPencarian = useMemo(() => {
    if (rawAlternatives.length === 0) return [];

    const wBiaya = weightBiaya / 100;
    const wWaktu = weightWaktu / 100;
    const wJarak = weightJarak / 100;

    // Cari Min Values (karena semua kriteria bernilai COST)
    const minBiaya = Math.min(
      ...rawAlternatives.map((a) => (a.estimasi_biaya === 0 ? 1 : a.estimasi_biaya))
    );
    const minWaktu = Math.min(...rawAlternatives.map((a) => a.waktu_menit));
    const minJarak = Math.min(...rawAlternatives.map((a) => a.jarak_km));

    // Hitung Normalisasi SAW Cost: R_ij = Min_j / X_ij
    const calculated = rawAlternatives.map((item) => {
      const realBiaya = item.estimasi_biaya === 0 ? 1 : item.estimasi_biaya;
      const rBiaya = minBiaya / realBiaya;
      const rWaktu = minWaktu / item.waktu_menit;
      const rJarak = minJarak / item.jarak_km;

      // Skor Akhir V_i = ∑ (w_j * r_ij)
      const skorAkhir = (rBiaya * wBiaya + rWaktu * wWaktu + rJarak * wJarak) * 100;

      return {
        ...item,
        skor_spk: Number(skorAkhir.toFixed(2)),
      };
    });

    // Urutkan dari Skor Tertinggi ke Terendah
    return calculated.sort((a, b) => b.skor_spk - a.skor_spk);
  }, [rawAlternatives, weightBiaya, weightWaktu, weightJarak]);

  // Chart Memoization
  const chartData = useMemo(() => {
    const backgroundColors = riwayatPencarian.map((_, index) =>
      index === 0
        ? "rgba(16, 185, 129, 0.85)"
        : `rgba(59, 130, 246, ${Math.max(0.2, 0.85 - index * 0.15)})`
    );
    const borderColors = riwayatPencarian.map((_, index) =>
      index === 0 ? "rgba(16, 185, 129, 1)" : "rgba(59, 130, 246, 1)"
    );

    return {
      labels: riwayatPencarian.map((r) => r.label),
      datasets: [
        {
          label: "Skor Preferensi SAW (%)",
          data: riwayatPencarian.map((r) => r.skor_spk),
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 12,
        },
      ],
    };
  }, [riwayatPencarian]);

  // Export PDF
  const exportPDF = async () => {
    const input = document.getElementById("result-section");
    if (!input) return;

    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("LAPORAN EVALUASI SPK (SAW) - TRANSDECISION", 14, 12);

      pdf.addImage(imgData, "PNG", 10, 18, imgWidth, imgHeight);
      pdf.save("laporan-perhitungan-saw.pdf");
    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      alert("Terjadi kesalahan saat mengekspor PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-700 p-8 text-white shadow-lg">
          <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 blur-3xl"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="uppercase tracking-[4px] text-cyan-100 text-sm mb-2 font-medium">
                Sistem Pendukung Keputusan (SAW Method)
              </p>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Detail Perhitungan SAW
              </h1>
              <p className="text-cyan-100 max-w-2xl leading-relaxed">
                Evaluasi keputusan menggunakan pembobotan kriteria dinamis via <b>SAW</b> (Simple Additive Weighting).
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/alternatif")}
                className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-cyan-700 shadow hover:scale-105 transition"
              >
                <ArrowLeft size={18} />
                Kembali
              </button>
              <button
                onClick={exportPDF}
                disabled={riwayatPencarian.length === 0 || isExporting || isLoading}
                className="flex items-center gap-2 rounded-2xl bg-slate-900/20 backdrop-blur px-5 py-3 font-semibold text-white border border-white/20 hover:bg-slate-900/30 transition disabled:opacity-50"
              >
                <Download size={18} />
                {isExporting ? "Memproses..." : "Export PDF"}
              </button>
            </div>
          </div>
        </div>

        {/* INDIKATOR LOADING */}
        {isLoading ? (
          <div className="bg-white rounded-3xl shadow-sm p-16 text-center border border-slate-100 flex flex-col items-center justify-center">
            <Loader2 size={48} className="animate-spin text-cyan-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-800">Mengambil Data Perhitungan...</h3>
            <p className="text-slate-500 text-sm mt-1">Mengalkulasi matriks SAW dari server.</p>
          </div>
        ) : (
          <>
            {/* STATISTIK */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-slate-500 text-sm">Total Alternatif</p>
                    <h2 className="text-4xl font-bold mt-2 text-slate-800">{riwayatPencarian.length}</h2>
                  </div>
                  <div className="bg-cyan-100 text-cyan-600 p-4 rounded-2xl">
                    <Route size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-slate-500 text-sm">Rekomendasi Terbaik</p>
                    <h2 className="text-2xl font-bold mt-2 text-slate-800">
                      {riwayatPencarian.length > 0 ? riwayatPencarian[0].label : "-"}
                    </h2>
                  </div>
                  <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl">
                    <Trophy size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-slate-500 text-sm">Skor Akhir (SAW)</p>
                    <h2 className="text-4xl font-bold mt-2 text-slate-800">
                      {riwayatPencarian.length > 0 ? `${riwayatPencarian[0].skor_spk.toFixed(2)}%` : "-"}
                    </h2>
                  </div>
                  <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl">
                    <BarChart3 size={28} />
                  </div>
                </div>
              </div>
            </div>

            {/* INFORMASI BOBOT SLIDER & INFORMASI RUTE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* INTERACTIVE WEIGHT BUTTONS */}
<div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100 flex flex-col justify-between">
  <div>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
          <SlidersHorizontal size={22} />
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Atur Pilihan Kriteria
          </h2>

          <p className="text-xs text-slate-500">
            Pilih kriteria yang ingin diprioritaskan
          </p>
        </div>
      </div>

      <button
        onClick={resetWeights}
        title="Reset ke Default AHP"
        className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition"
      >
        <RotateCcw size={16} />
      </button>
    </div>

    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
      Kriteria yang dipilih akan mendapatkan bobot terbesar.
    </p>

    {/* PILIHAN BOBOT */}
    <div className="grid grid-cols-3 gap-3">

      {/* BIAYA */}
      <button
        type="button"
        onClick={() => handleWeightPreset(60, 25, 15)}
        className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-center ${
          weightBiaya === 60 &&
          weightWaktu === 25 &&
          weightJarak === 15
            ? "border-indigo-500 bg-indigo-50 shadow-md scale-[1.02]"
            : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50"
        }`}
      >
        <div className="text-2xl mb-2">
          💰
        </div>

        <p className="font-bold text-slate-800 text-sm">
          Biaya
        </p>

        <p className="text-xs text-slate-500 mt-1">
          Prioritas
        </p>

        {weightBiaya === 60 &&
          weightWaktu === 25 &&
          weightJarak === 15 && (
            <span className="inline-block mt-2 text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-lg">
              Dipilih
            </span>
          )}
      </button>

      {/* WAKTU */}
      <button
        type="button"
        onClick={() => handleWeightPreset(25, 60, 15)}
        className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-center ${
          weightBiaya === 25 &&
          weightWaktu === 60 &&
          weightJarak === 15
            ? "border-blue-500 bg-blue-50 shadow-md scale-[1.02]"
            : "border-slate-100 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50"
        }`}
      >
        <div className="text-2xl mb-2">
          ⏱️
        </div>

        <p className="font-bold text-slate-800 text-sm">
          Waktu
        </p>

        <p className="text-xs text-slate-500 mt-1">
          Prioritas
        </p>

        {weightBiaya === 25 &&
          weightWaktu === 60 &&
          weightJarak === 15 && (
            <span className="inline-block mt-2 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">
              Dipilih
            </span>
          )}
      </button>

      {/* JARAK */}
      <button
        type="button"
        onClick={() => handleWeightPreset(25, 15, 60)}
        className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-center ${
          weightBiaya === 25 &&
          weightWaktu === 15 &&
          weightJarak === 60
            ? "border-cyan-500 bg-cyan-50 shadow-md scale-[1.02]"
            : "border-slate-100 bg-slate-50 hover:border-cyan-300 hover:bg-cyan-50/50"
        }`}
      >
        <div className="text-2xl mb-2">
          📍
        </div>

        <p className="font-bold text-slate-800 text-sm">
          Jarak
        </p>

        <p className="text-xs text-slate-500 mt-1">
          Prioritas
        </p>

        {weightBiaya === 25 &&
          weightWaktu === 15 &&
          weightJarak === 60 && (
            <span className="inline-block mt-2 text-[10px] font-bold text-cyan-600 bg-cyan-100 px-2 py-1 rounded-lg">
              Dipilih
            </span>
          )}
      </button>

    </div>

    {/* INFORMASI BOBOT SAAT INI */}
    <div className="mt-4 grid grid-cols-3 gap-2">
      <div className="bg-indigo-50 rounded-xl p-2 text-center">
        <p className="text-[10px] text-slate-500">
          Biaya
        </p>
        <p className="font-bold text-indigo-600 text-sm">
          {weightBiaya}%
        </p>
      </div>

      <div className="bg-blue-50 rounded-xl p-2 text-center">
        <p className="text-[10px] text-slate-500">
          Waktu
        </p>
        <p className="font-bold text-blue-600 text-sm">
          {weightWaktu}%
        </p>
      </div>

      <div className="bg-cyan-50 rounded-xl p-2 text-center">
        <p className="text-[10px] text-slate-500">
          Jarak
        </p>
        <p className="font-bold text-cyan-600 text-sm">
          {weightJarak}%
        </p>
      </div>
    </div>
  </div>

  {/* TOTAL BOBOT */}
  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 font-medium">
    <span>Total Bobot:</span>

    <span className="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
      {weightBiaya + weightWaktu + weightJarak}% (1.00)
    </span>
  </div>
</div>

              {/* INFORMASI RUTE */}
              <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm p-6 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-cyan-100 p-3 rounded-2xl text-cyan-600">
                    <MapPinned size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Informasi Lokasi Awal ke Lokasi Tujuan</h2>
                    <p className="text-xs text-slate-500">Parameter titik asal dan tujuan untuk kalkulasi jarak & biaya</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <p className="text-xs uppercase tracking-wider text-emerald-600 font-semibold mb-1">Titik Asal</p>
                    <h3 className="font-semibold text-slate-800 break-words">{infoRute.asal || "-"}</h3>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                    <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">Titik Tujuan</p>
                    <h3 className="font-semibold text-slate-800 break-words">{infoRute.tujuan || "-"}</h3>
                  </div>
                </div>

                <div className="mt-4 bg-slate-50 rounded-2xl p-3 text-xs text-slate-600 flex items-center gap-2">
                  <Info size={16} className="text-cyan-600 shrink-0" />
                  <span>Semua kriteria (Biaya, Waktu, Jarak) bertipe <b>Cost</b> (nilai semakin kecil semakin diprioritaskan).</span>
                </div>
              </div>
            </div>

            {/* HASIL / TABEL & GRAFIK */}
            {riwayatPencarian.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm p-16 text-center border border-slate-100">
                <BarChart3 size={70} className="mx-auto text-slate-300 mb-5" />
                <h2 className="text-2xl font-bold text-slate-700">Belum Ada Data Perhitungan</h2>
                <p className="text-slate-500 mt-3 max-w-xl mx-auto">
                  Silakan lakukan pencarian rute pada halaman <b>Alternatif</b> terlebih dahulu untuk menjalankan simulasi metode SAW.
                </p>
                <button
                  onClick={() => router.push("/alternatif")}
                  className="mt-8 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-6 py-3 rounded-2xl transition"
                >
                  Mulai Pencarian
                </button>
              </div>
            ) : (
              <div id="result-section" className="space-y-6 bg-slate-50/50 p-2 rounded-3xl">

                {/* TABEL HASIL SAW */}
                <div className="bg-white rounded-3xl shadow-sm pb-8 border border-slate-100">
                  <div className="flex items-center justify-between px-7 py-6 border-b">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">
                        Ranking Hasil SAW
                      </h2>
                      <p className="text-slate-500 mt-1 text-sm">
                        Hasil perankingan sesuai dengan Bobot Preferensi Pilihan 
                      </p>
                    </div>
                    <div className="bg-cyan-100 text-cyan-600 p-4 rounded-2xl">
                      <BarChart3 size={26} />
                    </div>
                  </div>

                  <div className="overflow-visible">
                    <table className="min-w-full">
                      <thead className="bg-slate-50">
                        <tr className="text-slate-600 text-sm">
                          <th className="px-6 py-4 text-left">Ranking</th>
                          <th className="px-6 py-4 text-left">Transportasi</th>
                          <th className="px-6 py-4 text-left">Jarak (C3)</th>
                          <th className="px-6 py-4 text-left">Waktu (C2)</th>
                          <th className="px-6 py-4 text-left">Biaya (C1)</th>
                          <th className="px-6 py-4 text-right">Skor Akhir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riwayatPencarian.map((item, index) => {
                          const isTop = index === 0;
                          return (
                            <tr
                              key={item.moda}
                              className={`border-t hover:bg-slate-50 transition relative ${
                                isTop ? "bg-emerald-50/60" : ""
                              }`}
                            >
                              <td className="px-6 py-5">
                                {isTop ? (
                                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 text-emerald-800 px-4 py-2 font-bold border border-emerald-200">
                                    <Trophy size={18} className="fill-yellow-400 text-yellow-500" />
                                    <span>Rank #1</span>
                                  </div>
                                ) : (
                                  <span className="font-bold text-slate-600">#{index + 1}</span>
                                )}
                              </td>

                              <td className="px-6 py-5 relative group cursor-help">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center text-xl">
                                    {item.icon}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-slate-800">{item.label}</h3>
                                    <p className="text-xs text-slate-500">{item.moda}</p>
                                  </div>
                                </div>

                                {!isExporting && item.detail_rute && item.detail_rute.length > 0 && (
                                  <div className="absolute z-[100] left-10 bottom-full mb-2 w-72 bg-slate-800 text-white text-sm rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 border border-slate-700">
                                    <div className="font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2">
                                      Detail Rute Perjalanan
                                    </div>
                                    <ul className="space-y-2">
                                      {item.detail_rute.map((rute, idx) => (
                                        <li key={idx} className="flex gap-3 items-start">
                                          <span className="text-cyan-500 mt-0.5">●</span>
                                          <span className="text-slate-200 leading-relaxed text-xs">{rute}</span>
                                        </li>
                                      ))}
                                    </ul>
                                    <div className="absolute top-full left-8 border-[6px] border-transparent border-t-slate-800"></div>
                                  </div>
                                )}
                              </td>

                              <td className="px-6 py-5 font-medium">{item.jarak_km.toFixed(2)} Km</td>
                              <td className="px-6 py-5 font-medium">{item.waktu_menit.toFixed(0)} Menit</td>

                              <td className="px-6 py-5 font-medium relative group cursor-help">
                                <span className="border-b border-dashed border-slate-400 pb-0.5">
                                  {item.estimasi_biaya === 0
                                    ? "Gratis / JakLingko"
                                    : `Rp ${item.estimasi_biaya.toLocaleString("id-ID")}`}
                                </span>

                                {!isExporting && item.detail_biaya && item.detail_biaya.length > 0 && (
                                  <div className="absolute z-[100] left-4 bottom-full mb-2 w-64 bg-slate-800 text-white text-sm rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 border border-slate-700">
                                    <div className="font-bold text-emerald-400 mb-3 border-b border-slate-700 pb-2">
                                      Rincian Biaya
                                    </div>
                                    <div className="space-y-2">
                                      {item.detail_biaya.map((biaya, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-slate-200 text-xs">
                                          <span className="text-slate-400 max-w-[140px] text-left">{biaya.keterangan}</span>
                                          <span className="font-medium">Rp {biaya.harga.toLocaleString("id-ID")}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-slate-700 flex justify-between font-bold text-white items-center text-xs">
                                      <span>Total</span>
                                      <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">
                                        Rp {item.estimasi_biaya.toLocaleString("id-ID")}
                                      </span>
                                    </div>
                                    <div className="absolute top-full left-8 border-[6px] border-transparent border-t-slate-800"></div>
                                  </div>
                                )}
                              </td>

                              <td className="px-6 py-5 text-right">
                                <span
                                  className={`text-xl font-bold ${
                                    isTop ? "text-emerald-600" : "text-cyan-600"
                                  }`}
                                >
                                  {item.skor_spk.toFixed(2)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GRAFIK */}
                <div className="bg-white rounded-3xl shadow-sm p-8 border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">
                        Grafik Evaluasi Preferensi SAW
                      </h2>
                      <p className="text-slate-500 mt-1 text-sm">
                        Visualisasi perbandingan skor preferensi akhir tiap alternatif transportasi
                      </p>
                    </div>
                    <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl">
                      <BarChart3 size={28} />
                    </div>
                  </div>
                  <div className="h-[400px]">
                    <Bar
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: { enabled: true },
                        },
                        scales: {
                          y: {
                            min: 0,
                            max: 100,
                            ticks: { stepSize: 20 },
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* KESIMPULAN */}
                <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-3xl p-8 text-white shadow-lg">
                  <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-8">
                    <div>
                      <p className="uppercase tracking-[3px] text-cyan-100 text-xs mb-2 font-medium">
                        Kesimpulan Evaluasi
                      </p>
                      <h2 className="text-3xl font-bold mb-3">
                        Rekomendasi Utama TransDecision
                      </h2>
                      <p className="text-cyan-100 max-w-2xl leading-relaxed">
                        Berdasarkan bobot kriteria dan perhitungan matriks SAW, moda transportasi yang paling direkomendasikan adalah{" "}
                        <span className="font-bold text-white bg-white/20 px-3 py-1 rounded-lg inline-block my-1">
                          {riwayatPencarian[0]?.label || "-"}
                        </span>{" "}
                        dengan tingkat preferensi mencapai{" "}
                        <span className="font-bold text-white">
                          {riwayatPencarian[0]?.skor_spk.toFixed(2) || 0}%
                        </span>.
                      </p>
                    </div>
                    <div className="text-center bg-white/15 rounded-3xl px-8 py-6 backdrop-blur">
                      <p className="text-cyan-100 text-xs">Nilai Preferensi Akhir</p>
                      <h1 className="text-5xl font-bold mt-2">
                        {riwayatPencarian[0]?.skor_spk.toFixed(2) || 0}%
                      </h1>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default function PerhitunganPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading page...</div>}>
      <PerhitunganContent />
    </Suspense>
  );
}