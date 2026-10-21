'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Correção dos ícones padrão do Leaflet no Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

export interface LocalMapa {
  nome: string;
  produto: string;
  lat: number;
  lng: number;
  nota?: number;
}

export interface MapProps {
  userLat: number;
  userLng: number;
  locais: LocalMapa[];
}

export default function Map({ userLat, userLng, locais }: MapProps) {
  return (
    <div style={{ height: '280px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ccc' }}>
      <MapContainer
        center={[userLat, userLng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcador do Usuário */}
        <Marker position={[userLat, userLng]}>
          <Popup>📍 Sua localização aproximada</Popup>
        </Marker>

        {/* Marcadores dos Estabelecimentos */}
        {locais.map((local, idx) => (
          <Marker key={idx} position={[local.lat, local.lng]}>
            <Popup>
              <strong>{local.nome}</strong><br />
              {local.produto}<br />
              {local.nota && local.nota > 0 ? `★ ${local.nota.toFixed(1)}` : '★ Novo'}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}