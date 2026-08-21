"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { ArrowLeft, MapPin, Navigation, Trophy, Train, Zap } from "lucide-react";


// Mengimpor tipe data dari lib/saw.ts
import { DetailTransportasi } from "@/lib/saw";
import dynamic from "next/dynamic";

const MapMain = dynamic(() => import("@/components/MapMain"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-500 font-medium">
      🗺️ Memuat Peta...
    </div>
  ),
});


export default function MapsPage() {
  const router = useRouter();
  const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";

  // ======================
  // State
  // ======================
  const [rekomendasiTerbaik, setRekomendasiTerbaik] = useState<DetailTransportasi | null>(null);
  const [infoRute, setInfoRute] = useState({ asal: "", transitName: "", tujuan: "" });
  const [coords, setCoords] = useState<{
    origin: [number, number] | null;
    transit: [number, number] | null;
    destination: [number, number] | null;
  }>({ origin: null, transit: null, destination: null });

  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Pastikan komponen dirender di Client (menghindari error Next.js SSR Leaflet)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check ketersediaan transit secara valid
  const hasTransit = Boolean(
    coords.transit &&
      Array.isArray(coords.transit) &&
      coords.transit.length === 2 &&
      coords.transit[0] !== 0 &&
      coords.transit[1] !== 0 &&
      infoRute.transitName &&
      infoRute.transitName.trim() !== ""
  );

  // ======================
  // Load Data SAW & Fetch Track
  // ======================
  useEffect(() => {
    const dataTersimpan = localStorage.getItem("last_saw_recommendations");
    const ruteTersimpan = localStorage.getItem("last_saw_route_info");
    const coordsTersimpan = localStorage.getItem("last_saw_route_coords");

    let loadedBestRank: DetailTransportasi | null = null;
    let loadedCoords: any = null;

    if (ruteTersimpan) {
      try {
        setInfoRute(JSON.parse(ruteTersimpan));
      } catch (e) {
        console.error("Gagal memuat info rute:", e);
      }
    }

    if (dataTersimpan) {
      try {
        const listAlternatif: DetailTransportasi[] = JSON.parse(dataTersimpan);
        if (listAlternatif.length > 0) {
          loadedBestRank = listAlternatif[0];
          setRekomendasiTerbaik(loadedBestRank);
        }
      } catch (e) {
        console.error("Gagal memuat alternatif hasil SAW:", e);
      }
    }

    if (coordsTersimpan) {
      try {
        const parsedCoords = JSON.parse(coordsTersimpan);
        const cleanCoords = {
          origin: parsedCoords.origin || null,
          transit:
            parsedCoords.transit && parsedCoords.transit[0] !== 0 && parsedCoords.transit[1] !== 0
              ? parsedCoords.transit
              : null,
          destination: parsedCoords.destination || null,
        };
        loadedCoords = cleanCoords;
        setCoords(cleanCoords);
      } catch (e) {
        console.error("Gagal memuat koordinat rute:", e);
      }
    }

    // Ambil jalur geometry dari Geoapify Routing API jika koordinat tersedia
    if (loadedCoords?.origin && loadedCoords?.destination) {
      fetchRouteTrack(loadedCoords, loadedBestRank);
    } else {
      setLoading(false);
    }
  }, []);

  // Fungsi mengambil titik-titik koordinat track polyline rute Peringkat 1
  const fetchRouteTrack = async (
    c: { origin: [number, number]; transit?: [number, number] | null; destination: [number, number] },
    bestRank: DetailTransportasi | null
  ) => {
    try {
      const isTransitValid = Boolean(
        c.transit && Array.isArray(c.transit) && c.transit.length === 2 && c.transit[0] !== 0 && c.transit[1] !== 0
      );

      const waypoints: string[] = [`${c.origin[0]},${c.origin[1]}`];
      if (isTransitValid && c.transit) {
        waypoints.push(`${c.transit[0]},${c.transit[1]}`);
      }
      waypoints.push(`${c.destination[0]},${c.destination[1]}`);

      const waypointsStr = waypoints.join("|");

      let mode = "drive";
      if (bestRank?.moda === "motorcycle") mode = "motorcycle";
      else if (bestRank?.moda === "walk") mode = "walk";

      const url = `https://api.geoapify.com/v1/routing?waypoints=${waypointsStr}&mode=${mode}&apiKey=${GEOAPIFY_API_KEY}`;
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const rawCoords = data.features[0].geometry.coordinates;

          let formattedPolyline: [number, number][] = [];
          if (Array.isArray(rawCoords[0][0])) {
            formattedPolyline = rawCoords.flat().map((pt: number[]) => [pt[1], pt[0]]);
          } else {
            formattedPolyline = rawCoords.map((pt: number[]) => [pt[1], pt[0]]);
          }

          setRouteGeometry(formattedPolyline);
        }
      } else {
        throw new Error("Gagal mengambil respon rute");
      }
    } catch (err) {
      console.error("Gagal mengambil geometry rute:", err);
      const fallbackPoints: [number, number][] = [c.origin];
      if (c.transit && c.transit[0] !== 0) fallbackPoints.push(c.transit);
      fallbackPoints.push(c.destination);
      setRouteGeometry(fallbackPoints);
    } finally {
      setLoading(false);
    }
  };

  const allMarkerPositions: [number, number][] = [
    ...(coords.origin ? [coords.origin] : []),
    ...(hasTransit && coords.transit ? [coords.transit] : []),
    ...(coords.destination ? [coords.destination] : []),
  ];

  if (loading || !isMounted) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-slate-500 animate-pulse font-medium">Memuat Peta Perjalanan...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* ================= HEADER KONTROL ================= */}
        <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-2xl shadow-sm gap-3">
          <button
            onClick={() => router.push("/alternatif")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold transition"
          >
            <ArrowLeft size={20} />
            Kembali ke Alternatif
          </button>

          <div className="flex items-center gap-3">
            {hasTransit ? (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
                <Train size={14} /> Rute Transit
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
                <Zap size={14} fill="currentColor" /> Rute Langsung (Tanpa Transit)
              </span>
            )}

            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 font-medium text-sm">
              <Trophy size={16} className="text-yellow-500 fill-yellow-400" />
              Rute Terbaik Terpilih via SAW
            </div>
          </div>
        </div>

        {/* ================= PANEL UTAMA MAPS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KOLOM KIRI: DETAIL RUTE SPK */}
          <div className="space-y-6 lg:col-span-1">
            {rekomendasiTerbaik && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-md">
                <p className="text-xs uppercase tracking-widest text-cyan-400 font-bold mb-2">
                  Rekomendasi Rank #1 ({rekomendasiTerbaik.skor_spk.toFixed(2)}%)
                </p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">
                    {rekomendasiTerbaik.icon}
                  </div>
                  <div>
                    <h2 className="font-bold text-xl leading-snug">{rekomendasiTerbaik.label}</h2>
                    <p className="text-sm text-slate-400 capitalize">Moda: {rekomendasiTerbaik.moda}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-700 text-center">
                  <div>
                    <p className="text-xs text-slate-400">Jarak</p>
                    <p className="font-bold text-sm mt-0.5">{rekomendasiTerbaik.jarak_km.toFixed(2)} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Waktu</p>
                    <p className="font-bold text-sm mt-0.5">{rekomendasiTerbaik.waktu_menit.toFixed(0)} mnt</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total Biaya</p>
                    <p className="font-bold text-sm mt-0.5 text-emerald-400">
                      {rekomendasiTerbaik.estimasi_biaya === 0
                        ? "Gratis"
                        : `Rp ${rekomendasiTerbaik.estimasi_biaya.toLocaleString("id-ID")}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PANDUAN LANGKAH PERJALANAN */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Navigation size={18} className="text-cyan-600" />
                Panduan Rute Perjalanan
              </h3>

              <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-6 text-sm">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 bg-emerald-500 text-white p-1 rounded-full ring-4 ring-white">
                    <MapPin size={12} />
                  </div>
                  <p className="font-semibold text-slate-700">Mulai dari Titik Asal</p>
                  <p className="text-slate-500 text-xs mt-1 break-words">{infoRute.asal || "Lokasi Awal"}</p>
                </div>

                {rekomendasiTerbaik?.detail_rute?.map((langkah, index) => {
                  const isTransitStep =
                    hasTransit &&
                    infoRute.transitName &&
                    langkah.toLowerCase().includes(infoRute.transitName.toLowerCase());

                  return (
                    <div key={index} className="relative">
                      <div
                        className={`absolute -left-[31px] top-0 text-white p-1 rounded-full ring-4 ring-white text-[9px] w-5 h-5 flex items-center justify-center font-bold ${
                          isTransitStep ? "bg-amber-500" : "bg-cyan-500"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <p className="text-slate-700 font-medium">{langkah}</p>

                      {isTransitStep && (
                        <span className="inline-flex items-center gap-1 mt-1 bg-amber-50 text-amber-700 text-[11px] px-2 py-0.5 rounded-md border border-amber-200 font-medium">
                          <Train size={12} /> Stasiun / Titik Transit ({infoRute.transitName})
                        </span>
                      )}
                    </div>
                  );
                })}

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 bg-blue-600 text-white p-1 rounded-full ring-4 ring-white">
                    <MapPin size={12} />
                  </div>
                  <p className="font-semibold text-slate-700">Sampai di Tujuan</p>
                  <p className="text-slate-500 text-xs mt-1 break-words">{infoRute.tujuan || "Lokasi Tujuan"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: RENDERING MAPS LEAFLET */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-4 shadow-sm h-[550px] lg:h-auto flex flex-col justify-between border border-slate-100">
            <div className="mb-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Visualisasi Peta Geografis</h3>
                <p className="text-slate-500 text-xs mt-0.5">Menampilkan jalur navigasi Rank #1 secara real-time</p>
              </div>

              <div className="hidden sm:flex items-center gap-3 text-xs bg-slate-50 p-2 rounded-xl border">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Asal
                </span>
                {hasTransit && (
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Transit
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Tujuan
                </span>
              </div>
            </div>

            {/* CONTAINER PETA LEAFLET */}
            <div className="flex-1 rounded-2xl border border-slate-200 relative overflow-hidden">
            <MapMain
  coords={coords}
  infoRute={infoRute}
  routeGeometry={routeGeometry}
  allMarkerPositions={allMarkerPositions}
  hasTransit={hasTransit}
  apiKey={GEOAPIFY_API_KEY}
/>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}