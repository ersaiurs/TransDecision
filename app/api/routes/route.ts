// app/api/routes/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { origin, destination } = body;

    // 1. Validasi input
    if (!origin || !destination || origin.length < 2 || destination.length < 2) {
      return NextResponse.json(
        { error: 'Format origin atau destination tidak valid' }, 
        { status: 400 }
      );
    }

    // 2. Gunakan Secret Key Server (Jangan gunakan NEXT_PUBLIC_)
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key Google Maps tidak ditemukan di server environment' }, 
        { status: 500 }
      );
    }

    // 3. Request ke Google Routes API
    const response = await fetch('https://routes.googleapis.com/v1/computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Ditambahkan FieldMask agar mendapat detail leg jika polyline utama tidak tersedia
        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.legs'
      },
      // Mengabaikan cache internal Next.js agar selalu fetch rute terbaru
      cache: 'no-store',
      body: JSON.stringify({
        origin: {
          location: {
            latLng: { latitude: Number(origin[0]), longitude: Number(origin[1]) }
          }
        },
        destination: {
          location: {
            latLng: { latitude: Number(destination[0]), longitude: Number(destination[1]) }
          }
        },
        travelMode: "TRANSIT",
        transitPreferences: { routingPreference: "LESS_WALKING" }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Gagal mengambil rute dari Google' }, 
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error pada routes API:", error);
    return NextResponse.json({ error: 'Gagal memproses rute' }, { status: 500 });
  }
}