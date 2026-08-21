export interface DetailBiaya {
  keterangan: string;
  harga: number;
}

export interface DetailTransportasi {
  moda: string;
  label: string;
  icon: string;
  jarak_km: number;
  waktu_menit: number;
  estimasi_biaya: number;
  skor_spk: number;
  detail_rute?: string[];
  detail_biaya?: DetailBiaya[];
  transitName?: string;
  transitCoord?: [number, number];
}

interface HasilSkenario {
  moda: string;
  label: string;
  icon: string;
  waktu: number;
  biaya: number;
  detail_rute: string[];
  detail_biaya: DetailBiaya[];
  transitName?: string;
  transitCoord?: [number, number];
}

/**
 * Fungsi untuk menghitung tarif progresif KRL Commuter Line
 * Rp3.000 untuk 25 km pertama, +Rp1.000 setiap 10 km berikutnya
 */
function hitungTarifKRL(jarak: number): number {
  const tarifDasar = 3000;
  if (jarak <= 25) {
    return tarifDasar;
  }
  const sisaJarak = jarak - 25;
  const tambahanKelipatan = Math.ceil(sisaJarak / 10);
  return tarifDasar + (tambahanKelipatan * 1000);
}

/**
 * Fungsi pembantu untuk memotong alamat yang terlalu panjang
 */
function formatNamaTempat(nama: string): string {
  if (!nama) return "Titik Lokasi";
  return nama.split(',')[0].trim();
}

/**
 * Fungsi untuk memvalidasi apakah wilayah masuk dalam 5 Administrasi DKI Jakarta
 */
function isWilayahDKI(alamat: string): boolean {
  const text = alamat.toLowerCase();
  const dkiRegions = [
    "jakarta pusat",
    "jakarta utara",
    "jakarta barat",
    "jakarta selatan",
    "jakarta timur",
    "dki jakarta"
  ];
  return dkiRegions.some(region => text.includes(region));
}

/**
 * Deteksi stasiun terdekat secara dinamis berdasarkan wilayah asal (Tanpa Dummy/Hardcode Tetap ke Tebet)
 */
function deteksiStasiunTerdekat(alamat: string): { name: string; coord: [number, number] } {
  const text = alamat.toLowerCase();
  if (text.includes("bekasi")) {
    return { name: "Stasiun Bekasi", coord: [-6.2345, 106.9923] };
  }
  if (text.includes("depok")) {
    return { name: "Stasiun Depok Baru", coord: [-6.3888, 106.8294] };
  }
  if (text.includes("bogor")) {
    return { name: "Stasiun Bogor", coord: [-6.5960, 106.7932] };
  }
  if (text.includes("tangerang")) {
    return { name: "Stasiun Tangerang", coord: [-6.1764, 106.6319] };
  }
  if (text.includes("bassura") || text.includes("jatinegara")) {
    return { name: "Stasiun Jatinegara", coord: [-6.2151, 106.8704] };
  }
  // Default regional Jakarta Selatan / Umum
  return { name: "Stasiun Tebet", coord: [-6.2266, 106.8584] };
}

/**
 * Kasus Penanganan Wilayah / Transportasi Lokal & Non-DKI
 */
function buatSkenarioWilayah(
  jarakAsli: number, 
  waktuAsli: number, 
  tempatAsal: string, 
  tempatTujuan: string, 
  namaAsal: string, 
  namaTujuan: string
): HasilSkenario | null {
  const isDKI = isWilayahDKI(namaAsal) && isWilayahDKI(namaTujuan);

  if (isDKI) {
    const tarifAngkot = jarakAsli > 10 ? 3500 : 0;
    return {
      moda: "public_transport_dki",
      label: jarakAsli > 10 ? "Transjakarta / Angkutan Umum" : "JakLingko",
      icon: "🚌",
      waktu: Math.max(Math.round(waktuAsli * 1.2), 5),
      biaya: tarifAngkot,
      detail_rute: [
        `Menuju halte/titik angkutan di ${tempatAsal}`,
        `Perjalanan umum dalam wilayah DKI Jakarta menuju ${tempatTujuan}`
      ],
      detail_biaya: [
        { keterangan: "Tarif Angkutan Umum DKI", harga: tarifAngkot }
      ]
    };
  } else {
    if (jarakAsli < 1) {
      const waktuJalan = Math.max(Math.round(jarakAsli * 12), 3);
      return {
        moda: "jalan_kaki_lokal",
        label: "Jalan Kaki",
        icon: "🚶",
        waktu: waktuJalan,
        biaya: 0,
        detail_rute: [
          `Berjalan kaki dari ${tempatAsal} karena jarak kurang dari 1 km`,
          `Tiba di ${tempatTujuan}`
        ],
        detail_biaya: [
          { keterangan: "Gratis (Jalan Kaki)", harga: 0 }
        ]
      };
    } else {
      const tarifAngkotSetempat = 7000; 
      return {
        moda: "angkutan_umum_setempat",
        label: "Angkutan Umum Setempat (Angkot)",
        icon: "🚐",
        waktu: Math.max(Math.round(waktuAsli * 0.8), 10),
        biaya: tarifAngkotSetempat,
        detail_rute: [
          `Naik angkutan umum / angkot setempat dari ${tempatAsal}`,
          `Perjalanan menuju ${tempatTujuan}`
        ],
        detail_biaya: [
          { keterangan: "Tarif Angkutan Umum Setempat", harga: tarifAngkotSetempat }
        ]
      };
    }
  }
}

export function buatSkenarioSponge(
  modeGeoapify: string, 
  jarakAsli: number, 
  waktuAsli: number,
  namaAsal: string = "",
  namaTujuan: string = ""
): HasilSkenario | null {
  const asal = namaAsal.toLowerCase();
  const tujuan = namaTujuan.toLowerCase();

  const tempatAsal = formatNamaTempat(namaAsal);
  const tempatTujuan = formatNamaTempat(namaTujuan);

  // ========================================================
  // ALTERNATIF 1: MOBIL (DRIVE / TAXI ONLINE)
  // ========================================================
  if (modeGeoapify === "drive") {
    const tarifTaxi = Math.round(jarakAsli * 5000) + 12000;
    return {
      moda: "drive",
      label: "Taxi Online (Full Gocar / GrabCar)",
      icon: "🚗",
      waktu: waktuAsli,
      biaya: tarifTaxi,
      detail_rute: [
        `Dijemput di ${tempatAsal}`,
        `Perjalanan langsung menuju ${tempatTujuan}`
      ],
      detail_biaya: [
        { keterangan: "Tarif Taxi Online", harga: tarifTaxi }
      ]
    };
  }

  // ========================================================
  // ALTERNATIF 2: MOTORCYCLE (GOJEK)
  // ========================================================
  if (modeGeoapify === "motorcycle") {
    const tarifOjol = Math.round(jarakAsli * 2000) + 8000;
    return {
      moda: "motorcycle",
      label: "Ojek Online (Full Goride / GrabBike)",
      icon: "🏍️",
      waktu: waktuAsli,
      biaya: tarifOjol,
      detail_rute: [
        `Dijemput di ${tempatAsal}`,
        `Perjalanan dengan motor menuju ${tempatTujuan}`
      ],
      detail_biaya: [
        { keterangan: "Tarif Ojek Online", harga: tarifOjol }
      ]
    };
  }

  // ========================================================
  // VALIDASI KETAT TRANSIT KRL / MULTIMODA
  // ========================================================
  if (jarakAsli < 4 || (asal.includes("bekasi") && tujuan.includes("bekasi"))) {
    return null; // Mengabaikan skenario transit absurd untuk jarak dekat / lokal
  }

  if (asal.includes("stasiun") && tujuan.includes("stasiun")) {
    const biayaKRL = hitungTarifKRL(jarakAsli);
    return {
      moda: "krl_murni",
      label: "Murni KRL Commuter Line",
      icon: "🚊",
      waktu: Math.round(jarakAsli * 2.5), 
      biaya: biayaKRL,
      detail_rute: [
        `Tap in di ${tempatAsal}`,
        `Naik KRL arah tujuan`,
        `Tap out di ${tempatTujuan}`
      ],
      detail_biaya: [
        { keterangan: `Tiket KRL (${jarakAsli.toFixed(1)} km)`, harga: biayaKRL }
      ]
    };
  }

  if (!asal.includes("stasiun") && tujuan.includes("stasiun")) {
    const stasiunTerdekat = deteksiStasiunTerdekat(namaAsal);
    const biayaKRL = hitungTarifKRL(jarakAsli);
    const biayaOjol = 9000;

    return {
      moda: "ojol_krl",
      label: "Ojek Online + KRL Commuter Line",
      icon: "🛵",
      waktu: Math.round(waktuAsli / 4) + 10,
      biaya: biayaOjol + biayaKRL,
      detail_rute: [
        `Naik Ojek dari ${tempatAsal} ke ${stasiunTerdekat.name}`,
        `Transit dan naik KRL`,
        `Turun di ${tempatTujuan}`
      ],
      detail_biaya: [
        { keterangan: "Ojek ke Stasiun", harga: biayaOjol },
        { keterangan: `Tiket KRL (${jarakAsli.toFixed(1)} km)`, harga: biayaKRL }
      ],
      transitName: stasiunTerdekat.name,
      transitCoord: stasiunTerdekat.coord
    };
  }

  if (asal.includes("stasiun") && !tujuan.includes("stasiun")) {
    const biayaKRL = hitungTarifKRL(jarakAsli);
    const biayaOjol = 9000;

    return {
      moda: "krl_ojol",
      label: "KRL Commuter Line + Sambungan Ojek",
      icon: "🚊",
      waktu: Math.round(waktuAsli / 4) + 10,
      biaya: biayaKRL + biayaOjol,
      detail_rute: [
        `Naik KRL dari ${tempatAsal}`,
        `Turun di stasiun terdekat`,
        `Sambung Ojek Online ke ${tempatTujuan}`
      ],
      detail_biaya: [
        { keterangan: `Tiket KRL (${jarakAsli.toFixed(1)} km)`, harga: biayaKRL },
        { keterangan: "Ojek ke Tujuan", harga: biayaOjol }
      ]
    };
  }

  if (!asal.includes("stasiun") && !tujuan.includes("stasiun") && jarakAsli > 5) {
    const stasiunTerdekatAsal = deteksiStasiunTerdekat(namaAsal);

    const biayaOjolAwal = 9000;
    const perkiraanJarakKRL = jarakAsli * 0.7; 
    const biayaKRL = hitungTarifKRL(perkiraanJarakKRL);
    const biayaOjolAkhir = 9000;

    const totalBiaya = biayaOjolAwal + biayaKRL + biayaOjolAkhir;
    const totalWaktu = Math.round(waktuAsli * 0.6) + 20;

    return {
      moda: "multimoda_ojol_krl_ojol",
      label: "Multimoda (Ojek + KRL + Ojek)",
      icon: "🚆",
      waktu: totalWaktu,
      biaya: totalBiaya,
      detail_rute: [
        `1️⃣ Naik Ojek Online dari ${tempatAsal} ke ${stasiunTerdekatAsal.name}`,
        `2️⃣ Naik KRL Commuter Line menuju stasiun terdekat dari tujuan`,
        `3️⃣ Sambung Ojek Online dari stasiun turun menuju ${tempatTujuan}`
      ],
      detail_biaya: [
        { keterangan: "Ojek ke Stasiun Awal", harga: biayaOjolAwal },
        { keterangan: `Tiket KRL (${perkiraanJarakKRL.toFixed(1)} km)`, harga: biayaKRL },
        { keterangan: "Ojek dari Stasiun ke Tujuan", harga: biayaOjolAkhir }
      ],
      transitName: stasiunTerdekatAsal.name,
      transitCoord: stasiunTerdekatAsal.coord
    };
  }

  // ========================================================
  // ALTERNATIF 3: LOKASI TIDAK TERAKOMODIR / LUAR DKI
  // ========================================================
  return buatSkenarioWilayah(jarakAsli, waktuAsli, tempatAsal, tempatTujuan, namaAsal, namaTujuan);
}

// ========================================================
// JEMBATAN UTAMA SPK SAW
// ========================================================
export function rekomendasikanTransportasi(
  dataMentah: any[], 
  namaAsal: string = "", 
  namaTujuan: string = ""
): DetailTransportasi[] {
  
  // Memetakan dan otomatis membuang skenario yang bernilai null (tidak logis)
  const dataSkenarioLokal = dataMentah.map((item) => {
    const skenario = buatSkenarioSponge(item.moda, item.jarak_km, item.waktu_menit, namaAsal, namaTujuan);
    if (!skenario) return null;
    
    return {
      moda: skenario.moda,
      label: skenario.label,
      icon: skenario.icon,
      jarak_km: item.jarak_km,
      waktu_menit: skenario.waktu,
      estimasi_biaya: skenario.biaya,
      detail_rute: skenario.detail_rute,
      detail_biaya: skenario.detail_biaya,
      transitName: skenario.transitName,
      transitCoord: skenario.transitCoord
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  if (dataSkenarioLokal.length === 0) return [];

  const daftarKriteria = [
    { name: "Jarak", weight: 0.2, type: "cost" },
    { name: "Waktu Tempuh", weight: 0.4, type: "cost" },
    { name: "Biaya", weight: 0.4, type: "cost" },
  ];

  const daftarAlternatif = dataSkenarioLokal.map((item) => ({
    name: item.moda,
    values: [item.jarak_km, item.waktu_menit, item.estimasi_biaya],
  }));

  // Normalisasi SAW Kriteria Cost
  const normalized: number[][] = daftarAlternatif.map((alt) => {
    return alt.values.map((value, j) => {
      const col = daftarAlternatif.map((a) => a.values[j]);
      const min = Math.min(...col);
      
      if (value === 0) return 1;
      if (min === 0) return 0.1 / value; 

      return min / value;
    });
  });

  // Hitung Skor Akhir
  const hasilSAW = normalized.map((row, i) => {
    let total = row.reduce((acc, val, j) => acc + val * daftarKriteria[j].weight, 0);
    return { name: daftarAlternatif[i].name, score: total };
  });

  // Gabungkan skor preferensi dan urutkan dari ranking tertinggi
  return dataSkenarioLokal.map((item) => {
    const s = hasilSAW.find((res) => res.name === item.moda);
    return { 
      ...item, 
      skor_spk: s ? parseFloat((s.score * 100).toFixed(2)) : 0 
    };
  }).sort((a, b) => b.skor_spk - a.skor_spk);
}