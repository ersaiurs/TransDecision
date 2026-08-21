// Helper Spasial untuk perhitungan Haversine dan pembacaan GeoJSON Stasiun KRL

// Formula Haversine untuk menghitung jarak (km) antara dua koordinat (lat, lon)
export function hitungJarakHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

// Struktur data stasiun dari GeoJSON
export interface StasiunGeoJSON {
  nama: string;
  lat: number;
  lon: number;
}

// Fungsi untuk mengekstrak daftar stasiun dari file GeoJSON standar
export function parseGeoJSONStasiun(geoJsonData: any): StasiunGeoJSON[] {
  const stasiunList: StasiunGeoJSON[] = [];

  if (!geoJsonData || !geoJsonData.features) return stasiunList;

  geoJsonData.features.forEach((feature: any) => {
    const coords = feature.geometry?.coordinates; // Format GeoJSON: [longitude, latitude]
    const properties = feature.properties || {};
    
    // Sesuaikan key nama stasiun dengan atribut di GeoJSON Anda (misal: 'name', 'nama_stasiun', dll)
    const namaStasiun = properties.name || properties.nama || properties.STASIUN || "Stasiun KRL";

    if (coords && coords.length >= 2) {
      stasiunList.push({
        nama: namaStasiun,
        lon: coords[0],
        lat: coords[1],
      });
    }
  });

  return stasiunList;
}

// Mencari stasiun terdekat dari koordinat tertentu (misal: posisi user atau tujuan)
export function cariStasiunTerdekat(
  lat: number,
  lon: number,
  stasiunList: StasiunGeoJSON[]
): { stasiun: StasiunGeoJSON | null; jarakKm: number } {
  if (!stasiunList || stasiunList.length === 0) {
    return { stasiun: null, jarakKm: 0 };
  }

  let stasiunTerdekat: StasiunGeoJSON | null = null;
  let jarakMin = Infinity;

  stasiunList.forEach((stasiun) => {
    const jarak = hitungJarakHaversine(lat, lon, stasiun.lat, stasiun.lon);
    if (jarak < jarakMin) {
      jarakMin = jarak;
      stasiunTerdekat = stasiun;
    }
  });

  return {
    stasiun: stasiunTerdekat,
    jarakKm: jarakMin,
  };
}