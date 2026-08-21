"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";

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

function ChangeMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

interface MapProps {
  position: [number, number];
  originCoord: [number, number] | null;
  destinationCoord: [number, number] | null;
  origin: string;
  destination: string;
}

export default function MapAlternatif({
  position,
  originCoord,
  destinationCoord,
  origin,
  destination,
}: MapProps) {
  return (
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
  );
}