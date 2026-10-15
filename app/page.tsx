'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';

interface ItemResultado {
  produto_nome: string;
  categoria: string;
  preco: number | null;
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
        Carregando mapa...
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
  const [avisoGps, setAvisoGps] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          setAvisoGps(false);
        },
        (error) => {
          console.log('Permissão de geolocalização negada ou indisponível:', error.message);
          setAvisoGps(true);
        }
      );
    } else {
      setAvisoGps(true);
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
      <header style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          justifyContent: 'center' 
        }}>
          <img 
            src="/logo.png" 
            alt="NutriMapa Logo" 
            style={{ height: '48px', width: 'auto', objectFit: 'contain' }} 
          />
          <h1 style={{ 
            color: '#2e7d32', 
            margin: 0, 
            fontSize: '32px', 
            fontWeight: '800',
            fontFamily: 'var(--font-nunito), sans-serif'
          }}>
            NutriMapa
          </h1>
        </div>
        <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: '14px' }}>
          Radar de produtos saudáveis perto de você
        </p>
      </header>

      {avisoGps && (
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          border: '1px solid #ffeeba',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px'
        }}>
          <span>
            <strong>Localização não ativada:</strong> Exibindo resultados com base na região padrão. Permita o acesso à localização no seu navegador para ver os produtos mais próximos de você.
          </span>
          <button 
            onClick={() => setAvisoGps(false)}
            style={{
              background: 'transparent',
              border: 'none',
              fontWeight: 'bold',
              color: '#856404',
              cursor: 'pointer',
              marginLeft: '12px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      <section style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input 
          id="campo-busca"
          name="busca"
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
        <h2>Produtos Encontrados ({resultados.length})</h2>
        {resultados.map((item, idx) => (
          <div 
            key={`${item.produto_nome}-${item.estabelecimento_nome}-${idx}`} 
            style={{ border: '1px solid #e0e0e0', padding: '12px', borderRadius: '8px', marginBottom: '12px', background: '#fff' }}
          >
            <h3 style={{ margin: '0 0 4px 0' }}>{item.produto_nome}</h3>
            <p style={{ margin: '0 0 4px 0', color: '#2e7d32', fontWeight: 'bold' }}>
              {item.preco ? `R$ ${item.preco.toFixed(2)}` : 'Preço sob consulta'}
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
              <strong>{item.estabelecimento_nome}</strong> &bull; {item.endereco} ({item.distancia_km.toFixed(1)} km)
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px', fontSize: '14px' }}>
              {item.whatsapp && (
                <a 
                  href={`https://wa.me/55${item.whatsapp}?text=Olá! Vi o produto ${item.produto_nome} no NutriMapa.`}
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: '#25D366', fontWeight: 'bold', textDecoration: 'none' }}
                >
                  WhatsApp da Loja
                </a>
              )}
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`}
                target="_blank" 
                rel="noreferrer"
                style={{ color: '#1976D2', fontWeight: 'bold', textDecoration: 'none' }}
              >
                Como Chegar (Rota)
              </a>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}