'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';

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

const MapWithNoSSR = dynamic<MapProps>(
  () => import('@/components/Map'),
  { 
    ssr: false,
    loading: () => (
      <div style={{ height: '380px', width: '100%', background: '#e0e0e0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        Carregando mapa do Recreio...
      </div>
    )
  }
);

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: -23.0182, lng: -43.4683 });
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<ItemResultado[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        () => console.log('Utilizando coordenadas centrais do Recreio dos Bandeirantes.')
      );
    }
  }, []);

  const executarBusca = async () => {
    setCarregando(true);
    const { data, error } = await supabase.rpc('buscar_produtos_proximos', {
      lat_user: userLocation.lat,
      lng_user: userLocation.lng,
      termo_busca: busca,
      raio_km: 10.0
    });

    if (error) {
      console.error('Erro de busca no Supabase:', error);
    } else {
      setResultados((data as ItemResultado[]) || []);
    }
    setCarregando(false);
  };

  return (
    <main style={{ padding: '16px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1 style={{ color: '#2e7d32', margin: '0 0 8px 0' }}>NutriMapa</h1>
        <p style={{ color: '#666', margin: 0 }}>Radar de produtos saudáveis no Recreio</p>
      </header>

      <section style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input 
          type="text" 
          placeholder="Procure por pão sem glúten, kombucha, sem açúcar..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
        />
        <button 
          onClick={executarBusca}
          style={{ padding: '12px 20px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
        >
          {carregando ? 'Buscando...' : 'Buscar'}
        </button>
      </section>

      <section style={{ marginBottom: '20px' }}>
        {mounted ? (
          <MapWithNoSSR userLocation={userLocation} itens={resultados} />
        ) : (
          <div style={{ height: '380px', width: '100%', background: '#e0e0e0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
            Carregando mapa...
          </div>
        )}
      </section>

      <section>
        <h2>Produtos no Bairro ({resultados.length})</h2>
        {resultados.map((item, idx) => (
          <div 
            key={`${item.produto_nome}-${item.estabelecimento_nome}-${idx}`} 
            style={{ border: '1px solid #e0e0e0', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}
          >
            <h3 style={{ margin: '0 0 4px 0' }}>{item.produto_nome}</h3>
            <p style={{ margin: '0 0 4px 0', color: '#2e7d32', fontWeight: 'bold' }}>R$ {item.preco.toFixed(2)}</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
              {item.estabelecimento_nome} (Endereço: {item.endereco}) (Distância: {item.distancia_km.toFixed(1)} km)
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}