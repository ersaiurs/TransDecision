"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import {
  ArrowLeft,
  Calculator,
  CheckCircle,
  Trophy,
} from "lucide-react";

interface DataRekomendasi {
  moda: string;
  label: string;
  icon: string;
  jarak_km: number;
  waktu_menit: number;
  estimasi_biaya: number;
  skor_spk: number;
}

const BOBOT = {
  jarak: 0.35,
  waktu: 0.40,
  biaya: 0.25,
};

export default function PerhitunganSAWPage() {
  const router = useRouter();

  const [alternatif, setAlternatif] = useState<DataRekomendasi[]>([]);
  const [infoRute, setInfoRute] = useState({
    asal: "",
    tujuan: "",
  });

  useEffect(() => {
    const data = localStorage.getItem("last_saw_recommendations");
    const rute = localStorage.getItem("last_saw_route_info");

    if (data) {
      setAlternatif(JSON.parse(data));
    }

    if (rute) {
      setInfoRute(JSON.parse(rute));
    }
  }, []);

  // ===========================
  // Nilai Minimum (Cost)
  // ===========================

  const minJarak = useMemo(() => {
    if (!alternatif.length) return 0;
    return Math.min(...alternatif.map((x) => x.jarak_km));
  }, [alternatif]);

  const minWaktu = useMemo(() => {
    if (!alternatif.length) return 0;
    return Math.min(...alternatif.map((x) => x.waktu_menit));
  }, [alternatif]);

  const minBiaya = useMemo(() => {
    if (!alternatif.length) return 0;
    return Math.min(...alternatif.map((x) => x.estimasi_biaya));
  }, [alternatif]);

  // ===========================
  // Normalisasi
  // Semua Cost
  // ===========================

  const normalisasi = useMemo(() => {
    return alternatif.map((item) => ({
      ...item,

      rJarak:
        minJarak === 0
          ? 0
          : minJarak / item.jarak_km,

      rWaktu:
        minWaktu === 0
          ? 0
          : minWaktu / item.waktu_menit,

      rBiaya:
        item.estimasi_biaya === 0
          ? 1
          : minBiaya / item.estimasi_biaya,
    }));
  }, [
    alternatif,
    minJarak,
    minWaktu,
    minBiaya,
  ]);

  // ===========================
  // Perhitungan Preferensi
  // ===========================

  const hasilSAW = useMemo(() => {
    return normalisasi.map((item) => {
      const vJarak =
        item.rJarak * BOBOT.jarak;

      const vWaktu =
        item.rWaktu * BOBOT.waktu;

      const vBiaya =
        item.rBiaya * BOBOT.biaya;

      const total =
        vJarak +
        vWaktu +
        vBiaya;

      return {
        ...item,

        vJarak,
        vWaktu,
        vBiaya,

        total,
      };
    });
  }, [normalisasi]);

  const ranking = useMemo(() => {
    return [...hasilSAW].sort(
      (a, b) => b.total - a.total
    );
  }, [hasilSAW]);

  if (!alternatif.length) {
    return (
      <Layout>
        <div className="bg-white rounded-3xl p-16 shadow text-center">

          <Calculator
            size={70}
            className="mx-auto text-slate-300"
          />

          <h1 className="text-3xl font-bold mt-5">
            Belum Ada Data
          </h1>

          <p className="text-slate-500 mt-3">
            Silakan lakukan pencarian transportasi
            terlebih dahulu.
          </p>

          <button
            onClick={() =>
              router.push("/alternatif")
            }
            className="mt-8 bg-cyan-600 text-white px-6 py-3 rounded-xl"
          >
            Kembali
          </button>

        </div>
      </Layout>
    );
  }

  return (
  <Layout>

    <div className="space-y-6">

      {/* ================= HERO ================= */}

  {/* ================= HERO ================= */}

  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 p-8 text-white shadow-lg">

    <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl"></div>

    <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-6">

      <div>

        <p className="uppercase tracking-[4px] text-cyan-100 text-sm mb-2">
          METODE SIMPLE ADDITIVE WEIGHTING
        </p>

        <h1 className="text-4xl font-bold mb-3">
          Proses Perhitungan SAW
        </h1>

        <p className="max-w-3xl text-cyan-100">
          Halaman ini menjelaskan secara rinci proses perhitungan
          metode <b>Simple Additive Weighting (SAW)</b> mulai dari
          penentuan bobot, pembentukan matriks keputusan,
          normalisasi hingga perhitungan nilai preferensi yang
          menghasilkan ranking akhir transportasi.
        </p>

      </div>

      <button
        onClick={() => router.push("/perhitungan")}
        className="bg-white text-cyan-600 px-6 py-3 rounded-2xl font-semibold shadow hover:scale-105 transition flex items-center gap-2"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

    </div>

  </div>

  {/* ================= INFORMASI RUTE ================= */}

  <div className="bg-white rounded-3xl shadow-sm p-6">

    <h2 className="text-2xl font-bold text-slate-800 mb-5">
      Informasi Rute
    </h2>

    <div className="grid md:grid-cols-2 gap-5">

      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">

        <p className="text-sm font-semibold text-emerald-600">
          Titik Asal
        </p>

        <h3 className="mt-2 font-semibold text-slate-700">
          {infoRute.asal}
        </h3>

      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5">

        <p className="text-sm font-semibold text-blue-600">
          Titik Tujuan
        </p>

        <h3 className="mt-2 font-semibold text-slate-700">
          {infoRute.tujuan}
        </h3>

      </div>

    </div>

  </div>

  {/* ================= LANGKAH 1 ================= */}

  <div className="bg-white rounded-3xl shadow-sm p-7">

    <div className="flex items-center gap-3 mb-5">

      <div className="bg-cyan-100 p-3 rounded-2xl">

        <Calculator className="text-cyan-600"/>

      </div>

      <div>

        <h2 className="text-2xl font-bold">
          Tahap 1
        </h2>

        <p className="text-slate-500">
          Penentuan Kriteria dan Bobot
        </p>

      </div>

    </div>

    <p className="text-slate-600 mb-5">

      Metode SAW memerlukan beberapa kriteria sebagai dasar
      pengambilan keputusan. Pada sistem ini digunakan tiga
      kriteria yaitu jarak perjalanan, waktu tempuh, dan
      estimasi biaya.

    </p>

    <table className="min-w-full border rounded-xl overflow-hidden">

      <thead className="bg-slate-100">

        <tr>

          <th className="p-4 text-left">
            Kriteria
          </th>

          <th className="text-center">
            Jenis
          </th>

          <th className="text-center">
            Bobot
          </th>

        </tr>

      </thead>

      <tbody>

        <tr className="border-t">

          <td className="p-4">
            Jarak
          </td>

          <td className="text-center">
            Cost
          </td>

          <td className="text-center font-bold">
            {BOBOT.jarak}
          </td>

        </tr>

        <tr className="border-t">

          <td className="p-4">
            Waktu Tempuh
          </td>

          <td className="text-center">
            Cost
          </td>

          <td className="text-center font-bold">
            {BOBOT.waktu}
          </td>

        </tr>

        <tr className="border-t">

          <td className="p-4">
            Estimasi Biaya
          </td>

          <td className="text-center">
            Cost
          </td>

          <td className="text-center font-bold">
            {BOBOT.biaya}
          </td>

        </tr>

      </tbody>

    </table>

    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">

      <p className="font-semibold text-blue-700">

        Semua kriteria bertipe <b>Cost</b>.

      </p>

      <p className="text-slate-600 mt-2">

        Semakin kecil nilai jarak, waktu tempuh,
        dan biaya maka semakin baik alternatif tersebut.

      </p>

    </div>

  </div>

  {/* ================= LANGKAH 2 ================= */}

  <div className="bg-white rounded-3xl shadow-sm p-7">

    <div className="flex items-center gap-3 mb-5">

      <div className="bg-emerald-100 p-3 rounded-2xl">

        <CheckCircle className="text-emerald-600"/>

      </div>

      <div>

        <h2 className="text-2xl font-bold">

          Tahap 2

        </h2>

        <p className="text-slate-500">

          Matriks Keputusan (X)

        </p>

      </div>

    </div>

    <p className="text-slate-600 mb-6">

      Matriks keputusan merupakan nilai asli setiap alternatif
      sebelum dilakukan proses normalisasi.

    </p>

    <table className="min-w-full">

      <thead className="bg-slate-100">

        <tr>

          <th className="p-4 text-left">
            Alternatif
          </th>

          <th className="text-center">
            Jarak
          </th>

          <th className="text-center">
            Waktu
          </th>

          <th className="text-center">
            Biaya
          </th>

        </tr>

      </thead>

      <tbody>

        {alternatif.map((item) => (

          <tr
            key={item.moda}
            className="border-t hover:bg-slate-50"
          >

            <td className="p-4 font-semibold">

              {item.icon} {item.label}

            </td>

            <td className="text-center">

              {item.jarak_km.toFixed(2)} Km

            </td>

            <td className="text-center">

              {item.waktu_menit.toFixed(0)} Menit

            </td>

            <td className="text-center">

              Rp {item.estimasi_biaya.toLocaleString("id-ID")}

            </td>

          </tr>

        ))}

      </tbody>

    </table>

  </div>

</div>

{/* ====================== TAHAP 3 ====================== */}

<div className="bg-white rounded-3xl shadow-sm p-7">

  <div className="flex items-center gap-3 mb-5">

    <div className="bg-blue-100 p-3 rounded-2xl">
      <Calculator className="text-blue-600" />
    </div>

    <div>
      <h2 className="text-2xl font-bold">
        Tahap 3
      </h2>

      <p className="text-slate-500">
        Normalisasi Matriks (R)
      </p>
    </div>

  </div>

  <p className="text-slate-600 mb-6">

    Karena seluruh kriteria merupakan <b>Cost</b>,
    maka normalisasi menggunakan rumus:

  </p>

  <div className="bg-slate-100 rounded-2xl p-6 text-center mb-8">

    <h2 className="text-3xl font-bold">

      Rij = Min(Xij) / Xij

    </h2>

    <p className="mt-3 text-slate-600">

      Semakin kecil nilai suatu alternatif,
      maka hasil normalisasinya semakin besar.

    </p>

  </div>

  {/* Nilai Minimum */}

  <div className="grid md:grid-cols-3 gap-5 mb-8">

    <div className="rounded-2xl border bg-emerald-50 border-emerald-200 p-5">

      <p className="text-sm text-emerald-600 font-semibold">
        Minimum Jarak
      </p>

      <h2 className="text-3xl font-bold mt-2">
        {minJarak.toFixed(2)}
      </h2>

      <p className="text-sm text-slate-500">
        Kilometer
      </p>

    </div>

    <div className="rounded-2xl border bg-blue-50 border-blue-200 p-5">

      <p className="text-sm text-blue-600 font-semibold">
        Minimum Waktu
      </p>

      <h2 className="text-3xl font-bold mt-2">
        {minWaktu.toFixed(0)}
      </h2>

      <p className="text-sm text-slate-500">
        Menit
      </p>

    </div>

    <div className="rounded-2xl border bg-orange-50 border-orange-200 p-5">

      <p className="text-sm text-orange-600 font-semibold">
        Minimum Biaya
      </p>

      <h2 className="text-3xl font-bold mt-2">

        Rp {minBiaya.toLocaleString("id-ID")}

      </h2>

      <p className="text-sm text-slate-500">
        Rupiah
      </p>

    </div>

  </div>

  {/* Tabel Normalisasi */}

  <div className="overflow-x-auto">

    <table className="min-w-full">

      <thead className="bg-slate-100">

        <tr>

          <th className="p-4 text-left">
            Alternatif
          </th>

          <th className="text-center">
            R Jarak
          </th>

          <th className="text-center">
            R Waktu
          </th>

          <th className="text-center">
            R Biaya
          </th>

        </tr>

      </thead>

      <tbody>

        {normalisasi.map((item) => (

          <tr
            key={item.moda}
            className="border-t hover:bg-slate-50"
          >

            <td className="p-4 font-semibold">

              {item.icon} {item.label}

            </td>

            <td className="text-center font-semibold">

              {item.rJarak.toFixed(3)}

            </td>

            <td className="text-center font-semibold">

              {item.rWaktu.toFixed(3)}

            </td>

            <td className="text-center font-semibold">

              {item.rBiaya.toFixed(3)}

            </td>

          </tr>

        ))}

      </tbody>

    </table>

  </div>

  {/* Contoh Perhitungan */}

  <div className="mt-8 rounded-2xl border border-cyan-200 bg-cyan-50 p-6">

    <h3 className="font-bold text-cyan-700 mb-4">
      Contoh Perhitungan Normalisasi
    </h3>

    <p className="text-slate-700">

      Misalkan alternatif pertama memiliki
      jarak <b>{normalisasi[0].jarak_km.toFixed(2)} Km</b>.

    </p>

    <p className="mt-3 text-slate-700">

      Maka:

    </p>

    <div className="mt-4 bg-white rounded-xl p-5 text-center border">

      <h2 className="text-2xl font-bold">

        R =
        {" "}
        {minJarak.toFixed(2)}
        {" "}
        ÷
        {" "}
        {normalisasi[0].jarak_km.toFixed(2)}
        {" "}
        =
        {" "}
        {normalisasi[0].rJarak.toFixed(3)}

      </h2>

    </div>

    <p className="mt-5 text-slate-600">

      Langkah yang sama dilakukan pada
      seluruh alternatif dan seluruh kriteria.

    </p>

  </div>

</div>

{/* ====================== TAHAP 4 ====================== */}

<div className="bg-white rounded-3xl shadow-sm p-7">

  <div className="flex items-center gap-3 mb-5">

    <div className="bg-emerald-100 p-3 rounded-2xl">
      <Calculator className="text-emerald-600" />
    </div>

    <div>
      <h2 className="text-2xl font-bold">
        Tahap 4
      </h2>

      <p className="text-slate-500">
        Perhitungan Nilai Preferensi (V)
      </p>
    </div>

  </div>

  <p className="text-slate-600 mb-6">
    Setelah seluruh nilai dinormalisasi, setiap nilai dikalikan
    dengan bobot kriterianya kemudian dijumlahkan.
  </p>

  <div className="bg-slate-100 rounded-2xl p-6 text-center mb-8">

    <h2 className="text-3xl font-bold">

      V = (W × R)

    </h2>

    <p className="mt-3 text-slate-600">

      V = (Bobot × Nilai Normalisasi)

    </p>

  </div>

  {/* ================= TABEL PERHITUNGAN ================= */}

  <div className="overflow-x-auto">

    <table className="min-w-full">

      <thead className="bg-slate-100">

        <tr>

          <th className="p-4 text-left">
            Alternatif
          </th>

          <th className="text-center">
            0.35 × R Jarak
          </th>

          <th className="text-center">
            0.40 × R Waktu
          </th>

          <th className="text-center">
            0.25 × R Biaya
          </th>

          <th className="text-center">
            Total V
          </th>

        </tr>

      </thead>

      <tbody>

        {hasilSAW.map((item) => (

          <tr
            key={item.moda}
            className="border-t hover:bg-slate-50"
          >

            <td className="p-4 font-semibold">

              {item.icon} {item.label}

            </td>

            <td className="text-center">

              {item.vJarak.toFixed(3)}

            </td>

            <td className="text-center">

              {item.vWaktu.toFixed(3)}

            </td>

            <td className="text-center">

              {item.vBiaya.toFixed(3)}

            </td>

            <td className="text-center font-bold text-cyan-600">

              {item.total.toFixed(3)}

            </td>

          </tr>

        ))}

      </tbody>

    </table>

  </div>

  {/* ================= CONTOH PERHITUNGAN ================= */}

  <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">

    <h3 className="font-bold text-emerald-700 text-lg mb-5">

      Contoh Perhitungan Alternatif

      <span className="ml-2">
        {hasilSAW[0].icon}
      </span>

      {hasilSAW[0].label}

    </h3>

    <div className="space-y-4">

      <div className="bg-white rounded-xl border p-4">

        <p className="font-semibold">

          Nilai Jarak

        </p>

        <p className="mt-2">

          0.35 × {hasilSAW[0].rJarak.toFixed(3)}

          {" = "}

          <b>{hasilSAW[0].vJarak.toFixed(3)}</b>

        </p>

      </div>

      <div className="bg-white rounded-xl border p-4">

        <p className="font-semibold">

          Nilai Waktu

        </p>

        <p className="mt-2">

          0.40 × {hasilSAW[0].rWaktu.toFixed(3)}

          {" = "}

          <b>{hasilSAW[0].vWaktu.toFixed(3)}</b>

        </p>

      </div>

      <div className="bg-white rounded-xl border p-4">

        <p className="font-semibold">

          Nilai Biaya

        </p>

        <p className="mt-2">

          0.25 × {hasilSAW[0].rBiaya.toFixed(3)}

          {" = "}

          <b>{hasilSAW[0].vBiaya.toFixed(3)}</b>

        </p>

      </div>

    </div>

  </div>

  {/* ================= TOTAL ================= */}

  <div className="mt-8 rounded-2xl bg-cyan-600 text-white p-8 text-center">

    <p className="text-cyan-100 text-lg">

      Total Nilai Preferensi

    </p>

    <h2 className="text-4xl font-bold mt-4">

      {hasilSAW[0].vJarak.toFixed(3)}

      {" + "}

      {hasilSAW[0].vWaktu.toFixed(3)}

      {" + "}

      {hasilSAW[0].vBiaya.toFixed(3)}

    </h2>

    <h1 className="text-6xl font-bold mt-6">

      = {hasilSAW[0].total.toFixed(3)}

    </h1>

    <p className="mt-5 text-cyan-100">

      Nilai ini nantinya digunakan pada proses
      perangkingan seluruh alternatif.

    </p>

  </div>

</div>

{/* ====================== TAHAP 5 ====================== */}

<div className="bg-white rounded-3xl shadow-sm p-7">

  <div className="flex items-center gap-3 mb-5">

    <div className="bg-yellow-100 p-3 rounded-2xl">
      <Trophy className="text-yellow-600" />
    </div>

    <div>
      <h2 className="text-2xl font-bold">
        Tahap 5
      </h2>

      <p className="text-slate-500">
        Perangkingan Alternatif
      </p>
    </div>

  </div>

  <p className="text-slate-600 mb-6">
    Nilai preferensi setiap alternatif diurutkan dari yang terbesar
    hingga terkecil. Alternatif dengan nilai preferensi terbesar
    dipilih sebagai rekomendasi terbaik.
  </p>

  <div className="overflow-x-auto">

    <table className="min-w-full">

      <thead className="bg-slate-100">

        <tr>

          <th className="p-4 text-center">
            Ranking
          </th>

          <th className="text-left">
            Alternatif
          </th>

          <th className="text-center">
            Nilai Preferensi (V)
          </th>

        </tr>

      </thead>

      <tbody>

        {ranking.map((item, index) => (

          <tr
            key={item.moda}
            className={`border-t ${
              index === 0
                ? "bg-emerald-50"
                : ""
            }`}
          >

            <td className="text-center p-5">

              {index === 0 ? (

                <span className="bg-emerald-500 text-white px-4 py-2 rounded-full font-bold">
                  🏆 #1
                </span>

              ) : (

                <span className="font-bold">
                  #{index + 1}
                </span>

              )}

            </td>

            <td className="p-5">

              <div className="flex items-center gap-3">

                <div className="w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center text-xl">
                  {item.icon}
                </div>

                <div>

                  <h3 className="font-semibold">

                    {item.label}

                  </h3>

                  <p className="text-xs text-slate-500">

                    {item.moda}

                  </p>

                </div>

              </div>

            </td>

            <td className="text-center font-bold text-cyan-600 text-lg">

              {item.total.toFixed(3)}

            </td>

          </tr>

        ))}

      </tbody>

    </table>

  </div>

</div>

{/* ====================== ANALISIS ====================== */}

<div className="bg-white rounded-3xl shadow-sm p-7">

  <h2 className="text-2xl font-bold mb-6">

    Analisis Hasil Perhitungan

  </h2>

  <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6">

    <p className="text-slate-700 leading-8">

      Berdasarkan hasil perhitungan menggunakan metode
      <b> Simple Additive Weighting (SAW)</b>,
      alternatif transportasi dengan nilai preferensi
      tertinggi adalah

      <span className="font-bold text-blue-700">

        {" "}
        {ranking[0].label}

      </span>

      dengan nilai preferensi sebesar

      <span className="font-bold text-blue-700">

        {" "}
        {ranking[0].total.toFixed(3)}

      </span>.

    </p>

    <p className="mt-5 text-slate-700 leading-8">

      Nilai tersebut diperoleh karena alternatif ini
      memiliki kombinasi nilai jarak, waktu tempuh,
      dan estimasi biaya yang paling optimal setelah
      dilakukan proses normalisasi dan pembobotan.

    </p>

    <p className="mt-5 text-slate-700 leading-8">

      Semakin besar nilai preferensi (V),
      maka alternatif tersebut semakin layak
      direkomendasikan sebagai moda transportasi
      terbaik berdasarkan kriteria yang digunakan.

    </p>

  </div>

</div>

{/* ====================== KESIMPULAN ====================== */}

<div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl p-8 text-white shadow-lg">

  <div className="flex flex-col lg:flex-row justify-between items-center gap-8">

    <div>

      <p className="uppercase tracking-[4px] text-cyan-100 text-sm">

        Kesimpulan

      </p>

      <h2 className="text-4xl font-bold mt-3">

        Rekomendasi Terbaik

      </h2>

      <p className="mt-5 text-cyan-100 max-w-3xl leading-8">

        Berdasarkan seluruh tahapan metode
        <b> Simple Additive Weighting (SAW)</b>,
        mulai dari pembentukan matriks keputusan,
        normalisasi, pembobotan hingga perangkingan,
        maka moda transportasi yang paling direkomendasikan
        adalah

        <span className="font-bold text-white">

          {" "}
          {ranking[0].label}

        </span>

        dengan nilai preferensi sebesar

        <span className="font-bold text-white">

          {" "}
          {ranking[0].total.toFixed(3)}

        </span>.

      </p>

    </div>

    <div className="bg-white/15 rounded-3xl px-10 py-8 text-center">

      <p className="text-cyan-100">
        Nilai Preferensi
      </p>

      <h1 className="text-6xl font-bold mt-3">

        {ranking[0].total.toFixed(3)}

      </h1>

      <p className="mt-4">

        🏆 {ranking[0].label}

      </p>

    </div>

  </div>

</div>

  
  </Layout>
);
}