"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapDashboardProps {
  apiKey: string;
  defaultCenter: { lat: number; lng: number };
  setUserCoords: (coords: { lat: number; lng: number }) => void;
  setLocationStatus: (status: string) => void;
}

export default function MapDashboard({
  apiKey,
  defaultCenter,
  setUserCoords,
  setLocationStatus,
}: MapDashboardProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let isMounted = true;

    const map = L.map(mapRef.current).setView(
      [defaultCenter.lat, defaultCenter.lng],
      13
    );
    mapInstance.current = map;

    L.tileLayer(
      `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`,
      {
        attribution:
          'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        maxZoom: 20,
      }
    ).addTo(map);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted || !mapInstance.current) return;

          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });

          mapInstance.current.setView([latitude, longitude], 14);

          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          const marker = L.marker([latitude, longitude])
            .addTo(mapInstance.current)
            .bindPopup("<b>Lokasi Anda Saat Ini</b>")
            .openPopup();

          userMarkerRef.current = marker;
          setLocationStatus("Lokasi terdeteksi secara presisi");
        },
        (error) => {
          if (!isMounted) return;
          console.warn("Gagal mendapatkan lokasi:", error.message);
          setLocationStatus("Lokasi default digunakan");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationStatus("Browser tidak mendukung Geolocation.");
    }

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [apiKey, defaultCenter, setUserCoords, setLocationStatus]);

  return <div ref={mapRef} className="w-full h-full" />;
}