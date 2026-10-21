'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';

// Carregamento dinâmico do componente de Mapa para evitar erros de renderização no servidor (SSR)
const MapaDinamico = dynamic(() => import('@/components/Mapa'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '280px', width: '100%', background: '#f5f5f5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '14px' }}>
      📍 Carregando mapa interativo...
    </div>
  )
});

// Interface de tipo para os resultados retornados pela função RPC do Supabase
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
  nota_media: number;        // Média de avaliação da loja
  total_avaliacoes: number;  // Quantidade total de avaliações
}

export default function HomePage() {
  // Coordenadas padrão para inicialização (Recreio dos Bandeirantes, Rio de Janeiro - RJ)
  const [userLat, setUserLat] = useState<number>(-23.0123);
  const [userLng, setUserLng] = useState<number>(-43.4654);
  const [statusGps, setStatusGps] = useState<string>('Localização inicial: Recreio dos Bandeirantes');

  // Estados para busca, distância e resultados
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [raioKm, setRaioKm] = useState<number>(10);
  const [resultados, setResultados] = useState<ItemResultado[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);

  // Obter localização real do usuário via GPS do navegador ao abrir a página
  useEffect(() => {
    obterLocalizacaoAtual();
  }, []);

  const obterLocalizacaoAtual = () => {
    if ('geolocation' in navigator) {
      setStatusGps('Obtendo sua localização...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setStatusGps('📍 Sua localização atual foi atualizada!');
        },
        (err) => {
          console.warn('Erro ao obter GPS:', err.message);
          setStatusGps('📍 Usando localização padrão: Recreio dos Bandeirantes');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // Consulta de produtos próximos via RPC no Supabase
  const buscarProdutos = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase.rpc('buscar_produtos_proximos', {
        lat_user: userLat,
        lng_user: userLng,
        termo_busca: termoBusca.trim(),
        raio_km: raioKm
      });

      if (error) {
        console.error('Erro ao executar busca RPC:', error);
      } else if (data) {
        setResultados(data as ItemResultado[]);
      }
    } catch (err) {
      console.error('Exceção durante a busca:', err);
    } finally {
      setCarregando(false);
    }
  };

  // Re-executar busca automaticamente quando mudar localização ou raio selecionado
  useEffect(() => {
    buscarProdutos();
  }, [userLat, userLng, raioKm]);

  // Submissão manual do formulário de pesquisa
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    buscarProdutos();
  };

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '16px', fontFamily: 'var(--font-nunito), sans-serif', color: '#333' }}>
      {/* CABEÇALHO DA APLICAÇÃO */}
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#2e7d32', margin: '0 0 4px 0', fontSize: '28px', fontWeight: 'bold' }}>
          NutriMapa
        </h1>
        <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
          Mapeamento hiperlocal de alimentos saudáveis e especiais
        </p>
      </header>

      {/* BARRA DE PESQUISA E FILTROS */}
      <section style={{ background: '#f9f9f9', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #eee' }}>
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Buscar (ex: Sem Glúten, Pão, Vegano, Orgânico)..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              style={{ flex: 1, padding: '12px 14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }}
            />
            <button
              type="submit"
              disabled={carregando}
              style={{ padding: '12px 18px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
            >
              {carregando ? '...' : 'Buscar'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#555' }}>
            <div>
              <label htmlFor="raioSelect" style={{ fontWeight: 'bold', marginRight: '6px' }}>Raio:</label>
              <select
                id="raioSelect"
                value={raioKm}
                onChange={(e) => setRaioKm(Number(e.target.value))}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #ccc' }}
              >
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
              </select>
            </div>

            <button
              type="button"
              onClick={obterLocalizacaoAtual}
              style={{ background: 'none', border: 'none', color: '#1976D2', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', textDecoration: 'underline' }}
            >
              🔄 Atualizar GPS
            </button>
          </div>

          {statusGps && (
            <p style={{ margin: 0, fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
              {statusGps}
            </p>
          )}
        </form>
      </section>

      {/* MAPA INTERATIVO COM PONTOS DAS LOJAS */}
      <section style={{ marginBottom: '20px' }}>
        <MapaDinamico
          userLat={userLat}
          userLng={userLng}
          locais={resultados.map((r) => ({
            nome: r.estabelecimento_nome,
            produto: r.produto_nome,
            lat: r.latitude,
            lng: r.longitude,
            nota: r.nota_media
          }))}
        />
      </section>

      {/* CABEÇALHO DA LISTAGEM DE RESULTADOS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', color: '#2e7d32', margin: 0 }}>
          Produtos Encontrados ({resultados.length})
        </h2>
      </div>

      {/* LISTA DE RESULTADOS DA BUSCA */}
      {resultados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', background: '#fff', borderRadius: '8px', border: '1px dashed #ccc', color: '#666' }}>
          {carregando ? (
            <p>Buscando lojas e produtos próximos...</p>
          ) : (
            <p>Nenhum produto encontrado neste raio de distância. Tente expandir o raio ou buscar outro termo.</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {resultados.map((item, index) => (
            <div
              key={index}
              style={{
                background: '#fff',
                padding: '16px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                border: '1px solid #eee'
              }}
            >
              {/* NOME DO PRODUTO E TAG DE CATEGORIA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: '0 0 4px 0', color: '#2e7d32', fontSize: '18px' }}>
                  {item.produto_nome}
                </h3>
                <span style={{ fontSize: '12px', background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                  {item.categoria}
                </span>
              </div>

              {/* LINHA COM NOME DA LOJA, ESTRELAS DE AVALIAÇÃO, ENDEREÇO E DISTÂNCIA */}
              <p style={{ margin: '6px 0', fontSize: '14px', color: '#555' }}>
                <strong>{item.estabelecimento_nome}</strong> &bull;{' '}
                <span style={{ color: '#f57c00', fontWeight: 'bold' }}>
                  ★ {item.nota_media > 0 ? Number(item.nota_media).toFixed(1) : 'Novo'}
                </span>
                {item.total_avaliacoes > 0 && ` (${item.total_avaliacoes})`}
                {' '}&bull; {item.endereco} ({item.distancia_km.toFixed(1)} km)
              </p>

              {/* PREÇO E BOTÕES DE AÇÃO */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2e7d32' }}>
                  {item.preco ? `R$ ${Number(item.preco).toFixed(2)}` : 'Preço sob consulta'}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {item.whatsapp && (
                    <a
                      href={`https://wa.me/55${item.whatsapp.replace(/\D/g, '')}?text=Olá,%20vi%20o%20produto%20${encodeURIComponent(item.produto_nome)}%20no%20NutriMapa!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '6px 12px', background: '#25D366', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}
                    >
                      WhatsApp
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: '6px 12px', background: '#1976D2', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}
                  >
                    Como Chegar
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}