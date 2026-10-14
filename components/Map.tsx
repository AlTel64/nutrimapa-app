'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface ItemResultado {
  produto_nome: string;
  categoria: string;
  preco: number;
  estabelecimento_nome: string;
  endereco: string;
  whatsapp: string;
  latitude: number;
  longitude: number;
  distancia_km: number;
}

interface MapProps {
  userLocation: { lat: number; lng: number };
  itens: ItemResultado[];
}

export default function Map({ userLocation, itens }: MapProps) {
  const [icon, setIcon] = useState<L.Icon | null>(null);

  useEffect(() => {
    const customIcon = new L.Icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    setIcon(customIcon);
  }, []);

  if (!icon) {
    return (
      <div style={{ height: '380px', width: '100%', background: '#f5f5f5', borderRadius: '12px' }} />
    );
  }

  return (
    <div style={{ height: '380px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer 
        center={[userLocation.lat, userLocation.lng]} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={[userLocation.lat, userLocation.lng]} icon={icon}>
          <Popup>Sua localização</Popup>
        </Marker>

        {itens.map((item, idx) => (
          <Marker 
            key={`${item.estabelecimento_nome}-${idx}`} 
            position={[item.latitude, item.longitude]} 
            icon={icon}
          >
            <Popup>
              <strong>{item.estabelecimento_nome}</strong><br />
              {item.produto_nome} (R$ {item.preco.toFixed(2)})<br />
              <small>{item.endereco} ({item.distancia_km.toFixed(1)} km)</small><br />
              {item.whatsapp && (
                <a 
                  href={`https://wa.me/55${item.whatsapp}?text=Olá! Vi o produto ${item.produto_nome} no NutriMapa.`}
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: '#25D366', fontWeight: 'bold' }}
                >
                  Contato via WhatsApp
                </a>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}