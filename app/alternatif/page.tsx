"use client";

import Layout from "@/components/Layout";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  rekomendasikanTransportasi,
  DetailTransportasi,
} from "@/lib/saw";

// Import konfigurasi Firestore & fungsi penyimpan data
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// ======================================================
// GEOAPIFY API KEY
// ======================================================

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";

// ======================================================
// MARKER ICON
// ======================================================

const originMarkerIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destinationMarkerIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ======================================================
// MAP AUTO MOVE
// ======================================================

function ChangeMap({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);

  return null;
}

// ======================================================
// TIPE HASIL GEOAPIFY
// ======================================================

interface GeoapifyFeature {
  type: string;
  properties: {
    formatted?: string;
    name?: string;
    osm_type?: string;
    osm_id?: number;
    category?: string;
    datasource?: {
      sourcename?: string;
      raw?: {
        railway?: string;
        highway?: string;
        public_transport?: string;
        station?: string;
      };
    };
    [key: string]: any;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

// ======================================================
// HELPER CEK STASIUN & HALTE
// ======================================================

function isStationFeature(feature: GeoapifyFeature | null): boolean {
  if (!feature) return false;

  const props = feature.properties || {};
  const datasource = props.datasource || {};
  const raw = datasource.raw || {};

  const text = [
    props.formatted,
    props.name,
    props.category,
    raw.railway,
    raw.station,
    raw.public_transport,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("railway=station") ||
    text.includes("station") ||
    text.includes("stasiun") ||
    raw.railway === "station" ||
    raw.station === "train"
  );
}

function isBusStopFeature(feature: GeoapifyFeature | null): boolean {
  if (!feature) return false;

  const props = feature.properties || {};
  const datasource = props.datasource || {};
  const raw = datasource.raw || {};

  const text = [
    props.formatted,
    props.name,
    props.category,
    raw.highway,
    raw.public_transport,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("bus_stop") ||
    text.includes("bus stop") ||
    text.includes("halte") ||
    raw.highway === "bus_stop"
  );
}

// ======================================================
// PAGE COMPONENT
// ======================================================

export default function Alternatif() {
  const router = useRouter();

  const [origin, setOrigin] = useState("");
  const [originResults, setOriginResults] = useState<GeoapifyFeature[]>([]);
  const [destination, setDestination] = useState("");
  const [destinationResults, setDestinationResults] = useState<GeoapifyFeature[]>([]);

  const [position, setPosition] = useState<[number, number]>([-6.2, 106.816666]);
  const [originCoord, setOriginCoord] = useState<[number, number] | null>(null);
  const [destinationCoord, setDestinationCoord] = useState<[number, number] | null>(null);

  const [originFeature, setOriginFeature] = useState<GeoapifyFeature | null>(null);
  const [destinationFeature, setDestinationFeature] = useState<GeoapifyFeature | null>(null);

  const [recommendations, setRecommendations] = useState<DetailTransportasi[]>([]);
  const [loading, setLoading] = useState(false);

  const originRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);

  const originIsStation = isStationFeature(originFeature);
  const destinationIsStation = isStationFeature(destinationFeature);
  const originIsBusStop = isBusStopFeature(originFeature);
  const destinationIsBusStop = isBusStopFeature(destinationFeature);

  // Load saved data from localStorage on mount
  useEffect(() => {
    try {
      const savedRecs = localStorage.getItem("last_saw_recommendations");
      if (savedRecs) {
        setRecommendations(JSON.parse(savedRecs));
      }

      const savedRouteInfo = localStorage.getItem("last_saw_route_info");
      if (savedRouteInfo) {
        const parsedInfo = JSON.parse(savedRouteInfo);
        if (parsedInfo.asal) setOrigin(parsedInfo.asal);
        if (parsedInfo.tujuan) setDestination(parsedInfo.tujuan);
      }

      const savedCoords = localStorage.getItem("last_saw_route_coords");
      if (savedCoords) {
        const parsedCoords = JSON.parse(savedCoords);
        if (parsedCoords.origin) {
          setOriginCoord(parsedCoords.origin);
          setPosition(parsedCoords.origin);
        }
        if (parsedCoords.destination) {
          setDestinationCoord(parsedCoords.destination);
        }
      }
    } catch (error) {
      console.error("Gagal memuat data dari localStorage:", error);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (originRef.current && !originRef.current.contains(target)) {
        setOriginResults([]);
      }
      if (destinationRef.current && !destinationRef.current.contains(target)) {
        setDestinationResults([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOriginSearch = async (value: string) => {
    setOrigin(value);
    setOriginFeature(null);
    setOriginCoord(null);

    if (!value.trim() || value.trim().length < 3) {
      setOriginResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          value
        )}&lang=id&limit=5&filter=countrycode:id&apiKey=${GEOAPIFY_API_KEY}`
      );

      if (!response.ok) throw new Error("Gagal mencari lokasi asal");
      const data = await response.json();
      if (data.features) setOriginResults(data.features);
    } catch (error) {
      console.error("Error Geoapify Origin:", error);
    }
  };

  const handleDestinationSearch = async (value: string) => {
    setDestination(value);
    setDestinationFeature(null);
    setDestinationCoord(null);

    if (!value.trim() || value.trim().length < 3) {
      setDestinationResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          value
        )}&lang=id&limit=5&filter=countrycode:id&apiKey=${GEOAPIFY_API_KEY}`
      );

      if (!response.ok) throw new Error("Gagal mencari lokasi tujuan");
      const data = await response.json();
      if (data.features) setDestinationResults(data.features);
    } catch (error) {
      console.error("Error Geoapify Destination:", error);
    }
  };

  const selectOrigin = (feature: GeoapifyFeature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const displayName = feature.properties.formatted || feature.properties.name || "Lokasi Asal";

    setOrigin(displayName);
    setOriginCoord([lat, lon]);
    setOriginFeature(feature);
    setPosition([lat, lon]);
    setOriginResults([]);
  };

  const selectDestination = (feature: GeoapifyFeature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const displayName = feature.properties.formatted || feature.properties.name || "Lokasi Tujuan";

    setDestination(displayName);
    setDestinationCoord([lat, lon]);
    setDestinationFeature(feature);
    setDestinationResults([]);
  };

  // RESET LOKASI
  const handleResetLocations = () => {
    setOrigin("");
    setDestination("");
    setOriginCoord(null);
    setDestinationCoord(null);
    setOriginFeature(null);
    setDestinationFeature(null);
    setOriginResults([]);
    setDestinationResults([]);
    setRecommendations([]);
    setPosition([-6.2, 106.816666]);

    localStorage.removeItem("last_saw_recommendations");
    localStorage.removeItem("last_saw_route_info");
    localStorage.removeItem("last_saw_route_coords");
  };

  const handleRecommendation = async () => {
    if (!originCoord || !destinationCoord) {
      alert("Pilih lokasi asal dan tujuan dulu.");
      return;
    }

    setLoading(true);

    try {
      // 1. Ambil rute acuan utama
      const mainUrl = `https://api.geoapify.com/v1/routing?waypoints=${originCoord[0]},${originCoord[1]}|${destinationCoord[0]},${destinationCoord[1]}&mode=drive&apiKey=${GEOAPIFY_API_KEY}`;

      const response = await fetch(mainUrl);
      if (!response.ok) throw new Error("Gagal mendapatkan data rute.");

      const data = await response.json();
      if (!data.features || data.features.length === 0) {
        alert("Gagal mendapatkan data rute.");
        return;
      }

      const props = data.features[0].properties;
      const baseDistanceKm = Number(props.distance || 0) / 1000;
      const baseTimeMin = Number(props.time || 0) / 60;

      const targetModes = [
        {
          mode: "drive",
          label: "Mobil",
          icon: "🚗",
          waktuMenit: baseTimeMin,
        },
        {
          mode: "motorcycle",
          label: "Sepeda Motor",
          icon: "🏍️",
          waktuMenit: baseTimeMin * 0.85,
        },
        {
          mode: "walk",
          label: "Jalan Kaki",
          icon: "🚶",
          waktuMenit: (baseDistanceKm / 4.5) * 60,
        },
      ];

      const dataValid = targetModes.map((target) => {
        return {
          moda: target.mode,
          label: target.label,
          icon: target.icon,
          jarak_km: baseDistanceKm,
          waktu_menit: target.waktuMenit,
          estimasi_biaya: 0,
          detail_rute: [`Berangkat dari ${origin}`, `Menuju ${destination}`],
          detail_biaya: [{ keterangan: "Biaya dasar", harga: 0 }],
        };
      });

      // Hitung Rekomendasi SAW
      const hasilRankingSPK = rekomendasikanTransportasi(dataValid, origin, destination);

      if (!hasilRankingSPK || hasilRankingSPK.length === 0) {
        alert("Tidak ada hasil rekomendasi.");
        return;
      }

      setRecommendations(hasilRankingSPK);

      const ruteTerbaik = hasilRankingSPK[0] as DetailTransportasi & {
        transitName?: string;
        transitCoord?: [number, number];
      };

      let transitName = ruteTerbaik.transitName || "";
      let transitCoord = ruteTerbaik.transitCoord || null;

      if ((originIsStation && destinationIsStation) || (originIsBusStop && destinationIsBusStop)) {
        transitName = "";
        transitCoord = null;
      }

      // Simpan ke LocalStorage
      localStorage.setItem("last_saw_recommendations", JSON.stringify(hasilRankingSPK));
      localStorage.setItem("last_saw_route_info", JSON.stringify({ asal: origin, tujuan: destination, transitName: transitName || "" }));
      localStorage.setItem("last_saw_route_coords", JSON.stringify({ origin: originCoord, destination: destinationCoord, transit: transitCoord }));

      // =========================================================================
      // 🌟 PENYIMPANAN DATA KE 4 TABEL TERPISAH FIRESTORE
      // =========================================================================
      try {
        // 1. Simpan ke Tabel 3.4: "Rekomendasi" (Header Rekomendasi)
        const dataRekomendasi = JSON.parse(
          JSON.stringify({
            lokasi_asal: origin || "",
            lokasi_tujuan: destination || "",
            koordinat_asal: {
              lat: originCoord ? originCoord[0] : 0,
              lng: originCoord ? originCoord[1] : 0,
            },
            koordinat_tujuan: {
              lat: destinationCoord ? destinationCoord[0] : 0,
              lng: destinationCoord ? destinationCoord[1] : 0,
            },
            rekomendasi_terbaik: ruteTerbaik?.label || "Mobil",
            skor_terbaik: typeof ruteTerbaik?.skor_spk === "number" ? ruteTerbaik.skor_spk : 0,
          })
        );
        dataRekomendasi.created_at = serverTimestamp();

        const refRekomendasi = await addDoc(collection(db, "Rekomendasi"), dataRekomendasi);
        const idRekomendasi = refRekomendasi.id; // Dipakai untuk relasi tabel lain

        // 2. Simpan ke Tabel 3.7: "SAW" (Detail Matriks & Hasil SPK)
        const dataSAW = JSON.parse(
          JSON.stringify({
            id_rekomendasi: idRekomendasi,
            jarak_dasar_km: baseDistanceKm || 0,
            waktu_dasar_menit: baseTimeMin || 0,
            skor_terbaik: typeof ruteTerbaik?.skor_spk === "number" ? ruteTerbaik.skor_spk : 0,
            moda_terbaik: ruteTerbaik?.label || "Mobil",
          })
        );
        dataSAW.created_at = serverTimestamp();

        await addDoc(collection(db, "SAW"), dataSAW);

        // 3. Simpan ke Tabel 3.6: "Rekomendasi_Transportasi" (Rincian Setiap Moda)
        for (let i = 0; i < hasilRankingSPK.length; i++) {
          const item = hasilRankingSPK[i];
          const dataTransportasi = JSON.parse(
            JSON.stringify({
              id_rekomendasi: idRekomendasi,
              peringkat: i + 1,
              moda: item.label || "",
              jarak_km: item.jarak_km || 0,
              waktu_menit: item.waktu_menit || 0,
              estimasi_biaya: item.estimasi_biaya || 0,
              skor_spk: typeof item.skor_spk === "number" ? item.skor_spk : 0,
            })
          );
          dataTransportasi.created_at = serverTimestamp();

          await addDoc(collection(db, "Rekomendasi_Transportasi"), dataTransportasi);
        }

        // 4. Simpan ke Tabel 3.5: "Transaksi" (Log Transaksi Pencarian)
        const dataTransaksi = JSON.parse(
          JSON.stringify({
            id_rekomendasi: idRekomendasi,
            jenis_aktivitas: "Pencarian Rekomendasi SPK SAW",
            status: "Selesai",
          })
        );
        dataTransaksi.created_at = serverTimestamp();

        await addDoc(collection(db, "Log Aktivitas"), dataTransaksi);

        console.log("✅ Berhasil menyimpan data ke 4 Tabel Firestore!");
      } catch (firebaseErr) {
        console.error("❌ Gagal menyimpan ke tabel Firestore:", firebaseErr);
      }
    } catch (error) {
      console.error("Error recommendation:", error);
      alert("Terjadi masalah saat memproses rekomendasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Cari Rekomendasi Transportasi
        </h1>
        <button
          onClick={handleResetLocations}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-sm font-medium transition flex items-center gap-1.5 shadow-sm"
        >
          🔄 Reset Lokasi
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow space-y-5 overflow-visible">
        {/* ASAL */}
        <div ref={originRef} className="relative z-[50]">
          <label className="text-sm text-gray-500 font-medium">📍 Lokasi Asal</label>
          <input
            type="text"
            autoComplete="off"
            placeholder="Cari lokasi asal..."
            className="border p-3 rounded-xl w-full mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-800"
            value={origin}
            onChange={(e) => handleOriginSearch(e.target.value)}
          />

          {originFeature && (
            <div className="mt-2 flex flex-wrap gap-2">
              {originIsStation && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg text-xs font-medium">🚉 Stasiun</span>
              )}
              {originIsBusStop && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg text-xs font-medium">🚌 Halte</span>
              )}
            </div>
          )}

          {originResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 max-h-60 overflow-y-auto z-[9999]">
              {originResults.map((place, index) => (
                <div
                  key={`${place.properties.formatted}-${index}`}
                  className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 text-sm text-gray-700"
                  onClick={() => selectOrigin(place)}
                >
                  📍 {place.properties.formatted}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TUJUAN */}
        <div ref={destinationRef} className="relative z-[40]">
          <label className="text-sm text-gray-500 font-medium">🏁 Lokasi Tujuan</label>
          <input
            type="text"
            autoComplete="off"
            placeholder="Cari lokasi tujuan..."
            className="border p-3 rounded-xl w-full mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-800"
            value={destination}
            onChange={(e) => handleDestinationSearch(e.target.value)}
          />

          {destinationFeature && (
            <div className="mt-2 flex flex-wrap gap-2">
              {destinationIsStation && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg text-xs font-medium">🚉 Stasiun</span>
              )}
              {destinationIsBusStop && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg text-xs font-medium">🚌 Halte</span>
              )}
            </div>
          )}

          {destinationResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 max-h-60 overflow-y-auto z-[9999]">
              {destinationResults.map((place, index) => (
                <div
                  key={`${place.properties.formatted}-${index}`}
                  className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 text-sm text-gray-700"
                  onClick={() => selectDestination(place)}
                >
                  📍 {place.properties.formatted}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STATUS LOKASI */}
        {originCoord && destinationCoord && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
            <div className="font-semibold text-slate-700 mb-2">Status Lokasi</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Asal:</span>{" "}
                <span className="font-medium text-slate-700">
                  {originIsStation ? "🚉 Stasiun" : originIsBusStop ? "🚌 Halte" : "📍 Lokasi umum"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Tujuan:</span>{" "}
                <span className="font-medium text-slate-700">
                  {destinationIsStation ? "🚉 Stasiun" : destinationIsBusStop ? "🚌 Halte" : "📍 Lokasi umum"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* MAP */}
        <div className="border rounded-2xl overflow-hidden shadow-inner relative z-10">
          <MapContainer
            center={position}
            zoom={13}
            className="z-0"
            style={{ height: "400px", width: "100%" }}
          >
            <ChangeMap center={position} />
            <TileLayer
              attribution='Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`}
              maxZoom={20}
            />

            {originCoord && (
              <Marker position={originCoord} icon={originMarkerIcon}>
                <Popup>
                  <strong className="text-red-600">📍 Lokasi Asal</strong>
                  <br />
                  {origin}
                </Popup>
              </Marker>
            )}

            {destinationCoord && (
              <Marker position={destinationCoord} icon={destinationMarkerIcon}>
                <Popup>
                  <strong className="text-blue-600">🏁 Lokasi Tujuan</strong>
                  <br />
                  {destination}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* BUTTON CARI REKOMENDASI */}
        <button
          onClick={handleRecommendation}
          disabled={loading}
          className="bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 w-full font-semibold text-base transition disabled:bg-gray-300 shadow-md"
        >
          {loading ? "Menghitung..." : "⚡ Cari Rekomendasi"}
        </button>

        {/* HASIL REKOMENDASI */}
        {recommendations.length > 0 && (
          <div className="mt-6 p-4 border rounded-xl bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Hasil Rekomendasi</h2>
              <span className="text-xs text-slate-500">SAW</span>
            </div>

            {recommendations.map((rec, index) => (
              <div
                key={`${rec.moda}-${index}`}
                className={`flex items-center justify-between bg-white p-3 rounded-lg border ${
                  index === 0 ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">{rec.icon}</div>
                  <div>
                    <div className="font-semibold text-slate-700">{rec.label}</div>
                    <div className="text-xs text-slate-500">
                      {rec.jarak_km.toFixed(2)} km • {rec.waktu_menit.toFixed(0)} menit
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {index === 0 && (
                    <div className="text-[10px] font-bold text-blue-600 mb-1">
                      REKOMENDASI TERBAIK
                    </div>
                  )}
                  <span className="font-bold text-blue-600">
                    {typeof rec.skor_spk === "number" ? rec.skor_spk.toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>
            ))}

            <button
              onClick={() => router.push("/maps")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold transition"
            >
              🗺️ Lihat Peta Rute Selengkapnya
            </button>

            <button
              onClick={() => router.push("/perhitungan")}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-bold transition"
            >
              📊 Lihat Detail Perhitungan
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}