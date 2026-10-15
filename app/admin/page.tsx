'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const [pin, setPin] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  
  // Dados do Estabelecimento
  const [nomeLoja, setNomeLoja] = useState('');
  const [endereco, setEndereco] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [statusGps, setStatusGps] = useState('');

  // Estado do Cadastro
  const [lojaIdCriada, setLojaIdCriada] = useState<string | null>(null);
  const [produtoNome, setProdutoNome] = useState('');
  const [categoria, setCategoria] = useState('Sem Glúten');
  const [preco, setPreco] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Validação simples de senha de acesso
  const verificarPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '2026') { // Altere este PIN para a senha desejada
      setAutenticado(true);
    } else {
      alert('Senha/PIN incorreto.');
    }
  };

  // Captura automática de coordenadas GPS do celular
  const capturarGps = () => {
    setStatusGps('Obtendo sinal do GPS...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setStatusGps('Coordenadas capturadas com sucesso!');
        },
        (err) => {
          setStatusGps('Erro ao obter GPS: ' + err.message);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setStatusGps('Geolocalização não suportada neste aparelho.');
    }
  };

  // Cadastrar Estabelecimento
  const salvarLoja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latitude || !longitude) {
      alert('Capture a posição via GPS antes de salvar a loja.');
      return;
    }

    setCarregando(true);
    const { data, error } = await supabase
      .from('estabelecimentos')
      .insert([
        {
          nome: nomeLoja,
          endereco: endereco,
          whatsapp: whatsapp,
          latitude: latitude,
          longitude: longitude,
          ativo: true
        }
      ])
      .select();

    if (error) {
      setMensagem('Erro ao salvar loja: ' + error.message);
    } else if (data && data.length > 0) {
      setLojaIdCriada(data[0].id);
      setMensagem('Loja cadastrada! Agora adicione os produtos do estoque abaixo.');
    }
    setCarregando(false);
  };

  // Cadastrar Produto e Vincular ao Estoque da Loja
  const adicionarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaIdCriada) return;

    setCarregando(true);
    
    // 1. Inserir ou buscar produto na tabela central
    const { data: prodData, error: prodError } = await supabase
      .from('produtos')
      .insert([{ nome: produtoNome, categoria: categoria }])
      .select();

    if (prodError) {
      setMensagem('Erro ao cadastrar produto: ' + prodError.message);
      setCarregando(false);
      return;
    }

    const produtoId = prodData[0].id;
    const precoNum = preco ? parseFloat(preco.replace(',', '.')) : null;

    // 2. Vincular ao estoque da loja recém-criada
    const { error: estqError } = await supabase
      .from('estoque_loja')
      .insert([
        {
          estabelecimento_id: lojaIdCriada,
          produto_id: produtoId,
          preco: precoNum,
          disponivel: true
        }
      ]);

    if (estqError) {
      setMensagem('Erro ao vincular estoque: ' + estqError.message);
    } else {
      setMensagem(`Produto "${produtoNome}" adicionado com sucesso!`);
      setProdutoNome('');
      setPreco('');
    }
    setCarregando(false);
  };

  if (!autenticado) {
    return (
      <main style={{ padding: '32px 16px', maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <h2>Acesso Administrativo NutriMapa</h2>
        <form onSubmit={verificarPin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label>Digite o PIN de acesso:</label>
          <input 
            type="password" 
            value={pin} 
            onChange={(e) => setPin(e.target.value)} 
            placeholder="Senha de acesso"
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
          />
          <button type="submit" style={{ padding: '12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '20px', borderBottom: '1px solid #eee', pb: '12px' }}>
        <h1 style={{ color: '#2e7d32', margin: 0 }}>Painel de Campo NutriMapa</h1>
        <p style={{ color: '#666', margin: '4px 0 0 0' }}>Cadastro presencial de lojas e estoque</p>
      </header>

      {mensagem && (
        <div style={{ padding: '12px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', marginBottom: '16px' }}>
          {mensagem}
        </div>
      )}

      {/* ETAPA 1: CADASTRO DA LOJA */}
      {!lojaIdCriada ? (
        <section style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <h2>1. Dados do Estabelecimento</h2>
          <form onSubmit={salvarLoja} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Nome da Loja (ex: Empório Natural Recreio)" 
              value={nomeLoja} 
              onChange={(e) => setNomeLoja(e.target.value)} 
              required
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <input 
              type="text" 
              placeholder="Endereço Completo (ex: Av. Guiomar de Novaes, 80)" 
              value={endereco} 
              onChange={(e) => setEndereco(e.target.value)} 
              required
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <input 
              type="text" 
              placeholder="WhatsApp (apenas números, ex: 21999998888)" 
              value={whatsapp} 
              onChange={(e) => setWhatsapp(e.target.value)} 
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />

            <div style={{ border: '1px dashed #2e7d32', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={capturarGps}
                style={{ padding: '10px 16px', background: '#1976D2', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📍 Capturar Posição GPS Atual
              </button>
              {statusGps && <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#333' }}>{statusGps}</p>}
              {latitude && longitude && (
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#2e7d32', fontWeight: 'bold' }}>
                  Lat: {latitude.toFixed(5)} | Lng: {longitude.toFixed(5)}
                </p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={carregando}
              style={{ padding: '12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
            >
              {carregando ? 'Salvando...' : 'Salvar Loja e Iniciar Estoque'}
            </button>
          </form>
        </section>
      ) : (
        /* ETAPA 2: ADIÇÃO DE PRODUTOS PARA A LOJA CADASTRADA */
        <section style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
          <h2>2. Adicionar Produtos ({nomeLoja})</h2>
          <form onSubmit={adicionarProduto} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Nome do Produto (ex: Pão Sem Glúten Artesanal)" 
              value={produtoNome} 
              onChange={(e) => setProdutoNome(e.target.value)} 
              required
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            
            <select 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="Sem Glúten">Sem Glúten</option>
              <option value="Sem Lactose">Sem Lactose</option>
              <option value="Sem Açúcar">Sem Açúcar</option>
              <option value="Vegano">Vegano</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Proteico">Proteico</option>
            </select>

            <input 
              type="text" 
              placeholder="Preço R$ (opcional, ex: 28.90)" 
              value={preco} 
              onChange={(e) => setPreco(e.target.value)} 
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />

            <button 
              type="submit" 
              disabled={carregando}
              style={{ padding: '12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
            >
              {carregando ? 'Adicionando...' : 'Cadastrar Produto no Estoque'}
            </button>
          </form>

          <button 
            type="button"
            onClick={() => {
              setLojaIdCriada(null);
              setNomeLoja('');
              setEndereco('');
              setWhatsapp('');
              setLatitude(null);
              setLongitude(null);
              setStatusGps('');
              setMensagem('');
            }}
            style={{ marginTop: '16px', padding: '8px 12px', background: '#666', color: '#fff', border: 'none', borderRadius: '6px', width: '100%' }}
          >
            Finalizar e Cadastrar Outra Loja
          </button>
        </section>
      )}
    </main>
  );
}