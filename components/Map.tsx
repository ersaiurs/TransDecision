"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export default function Map() {
  return (
    <MapContainer
      center={[-6.2, 106.816666]} // Jakarta
      zoom={12}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Marker contoh */}
      <Marker position={[-6.2, 106.816666]}>
        <Popup>Lokasi Kamu 🚗</Popup>
      </Marker>
    </MapContainer>
  );
}