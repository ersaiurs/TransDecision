"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

const transitMarkerIcon = new L.DivIcon({
  className: "custom-transit-marker",
  html: `<div style="background-color: #f59e0b; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">🚉</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
}

interface MapMainProps {
  coords: {
    origin: [number, number] | null;
    transit: [number, number] | null;
    destination: [number, number] | null;
  };
  infoRute: { asal: string; transitName: string; tujuan: string };
  routeGeometry: [number, number][];
  allMarkerPositions: [number, number][];
  hasTransit: boolean;
  apiKey: string;
}

export default function MapMain({
  coords,
  infoRute,
  routeGeometry,
  allMarkerPositions,
  hasTransit,
  apiKey,
}: MapMainProps) {
  const defaultCenter: [number, number] = coords.origin || [-6.4025, 106.8186];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      className="z-0"
      style={{ height: "100%", width: "100%" }}
    >
      <FitBounds positions={allMarkerPositions} />
      <TileLayer
        attribution='Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`}
        maxZoom={20}
      />

      {coords.origin && (
        <Marker position={coords.origin} icon={originMarkerIcon}>
          <Popup>
            <strong className="text-red-600">📍 Lokasi Asal</strong>
            <br />
            {infoRute.asal || "Titik Keberangkatan"}
          </Popup>
        </Marker>
      )}

      {hasTransit && coords.transit && (
        <Marker position={coords.transit} icon={transitMarkerIcon}>
          <Popup>
            <strong className="text-amber-600">🚉 Titik Transit</strong>
            <br />
            {infoRute.transitName}
          </Popup>
        </Marker>
      )}

      {coords.destination && (
        <Marker position={coords.destination} icon={destinationMarkerIcon}>
          <Popup>
            <strong className="text-blue-600">🏁 Lokasi Tujuan</strong>
            <br />
            {infoRute.tujuan || "Titik Tujuan"}
          </Popup>
        </Marker>
      )}

      {routeGeometry.length > 0 && (
        <Polyline
          positions={routeGeometry}
          pathOptions={{ color: "#0284c7", weight: 5, opacity: 0.8 }}
        />
      )}
    </MapContainer>
  );
}