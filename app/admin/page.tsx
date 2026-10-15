'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Estabelecimento {
  id: string;
  nome: string;
  endereco: string;
  whatsapp: string;
  latitude: number;
  longitude: number;
}

interface ItemEstoque {
  estoque_id: string;
  produto_id: string;
  produto_nome: string;
  categoria: string;
  preco: number | null;
  disponivel: boolean;
}

export default function AdminPage() {
  const [pin, setPin] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  
  // Lista de lojas cadastradas
  const [lojas, setLojas] = useState<Estabelecimento[]>([]);
  const [lojaSelecionadaId, setLojaSelecionadaId] = useState<string>('NOVA');

  // Dados do Estabelecimento
  const [nomeLoja, setNomeLoja] = useState('');
  const [endereco, setEndereco] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [statusGps, setStatusGps] = useState('');

  // Estoque da Loja Selecionada
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);

  // Novo Produto
  const [produtoNome, setProdutoNome] = useState('');
  const [categoria, setCategoria] = useState('Sem Glúten');
  const [outraCategoria, setOutraCategoria] = useState('');
  const [preco, setPreco] = useState('');
  
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Carregar lista de lojas
  const carregarLojas = async () => {
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select('*')
      .order('nome', { ascending: true });

    if (!error && data) {
      setLojas(data);
    }
  };

  useEffect(() => {
    if (autenticado) {
      carregarLojas();
    }
  }, [autenticado]);

  // Carregar dados de uma loja existente
  const selecionarLoja = async (id: string) => {
    setLojaSelecionadaId(id);
    setMensagem('');

    if (id === 'NOVA') {
      setNomeLoja('');
      setEndereco('');
      setWhatsapp('');
      setLatitude(null);
      setLongitude(null);
      setStatusGps('');
      setItensEstoque([]);
      return;
    }

    const loja = lojas.find((l) => l.id === id);
    if (loja) {
      setNomeLoja(loja.nome);
      setEndereco(loja.endereco);
      setWhatsapp(loja.whatsapp || '');
      setLatitude(loja.latitude);
      setLongitude(loja.longitude);
      setStatusGps('Coordenadas originais carregadas.');
      carregarEstoqueLoja(id);
    }
  };

  // Carregar itens do estoque da loja selecionada
  const carregarEstoqueLoja = async (estabelecimentoId: string) => {
    const { data, error } = await supabase
      .from('estoque_loja')
      .select(`
        id,
        preco,
        disponivel,
        produto_id,
        produtos (
          nome,
          categoria
        )
      `)
      .eq('estabelecimento_id', estabelecimentoId);

    if (!error && data) {
      const formatados: ItemEstoque[] = data.map((item: any) => ({
        estoque_id: item.id,
        produto_id: item.produto_id,
        produto_nome: item.produtos?.nome || 'Produto sem nome',
        categoria: item.produtos?.categoria || 'Geral',
        preco: item.preco,
        disponivel: item.disponivel
      }));
      setItensEstoque(formatados);
    }
  };

  // Autenticação por PIN
  const verificarPin = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (pin === '2026') {
      setAutenticado(true);
    } else {
      alert('Senha/PIN incorreto.');
    }
  };

  // Capturar posição GPS atual
  const capturarGps = () => {
    setStatusGps('Obtendo sinal do GPS...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setStatusGps('Novas coordenadas GPS capturadas!');
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

  // Salvar Nova Loja ou Atualizar Existente
  const salvarOuAtualizarLoja = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!latitude || !longitude) {
      alert('Capture as coordenadas via GPS antes de salvar.');
      return;
    }

    setCarregando(true);

    if (lojaSelecionadaId === 'NOVA') {
      // Criação
      const { data, error } = await supabase
        .from('estabelecimentos')
        .insert([{ nome: nomeLoja, endereco, whatsapp, latitude, longitude, ativo: true }])
        .select();

      if (error) {
        setMensagem('Erro ao criar loja: ' + error.message);
      } else if (data && data.length > 0) {
        const novaId = data[0].id;
        setMensagem('Nova loja cadastrada com sucesso!');
        await carregarLojas();
        setLojaSelecionadaId(novaId);
      }
    } else {
      // Atualização
      const { error } = await supabase
        .from('estabelecimentos')
        .update({ nome: nomeLoja, endereco, whatsapp, latitude, longitude })
        .eq('id', lojaSelecionadaId);

      if (error) {
        setMensagem('Erro ao atualizar loja: ' + error.message);
      } else {
        setMensagem('Dados da loja atualizados!');
        await carregarLojas();
      }
    }
    setCarregando(false);
  };

  // Adicionar novo produto ao estoque da loja
  const adicionarProduto = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (lojaSelecionadaId === 'NOVA') {
      alert('Salve as informações da loja antes de incluir produtos.');
      return;
    }

    setCarregando(true);
    const categoriaFinal = categoria === 'Outra' ? outraCategoria.trim() : categoria;

    if (!categoriaFinal) {
      setMensagem('Informe uma categoria válida.');
      setCarregando(false);
      return;
    }

    // 1. Cadastrar produto na tabela geral
    const { data: prodData, error: prodError } = await supabase
      .from('produtos')
      .insert([{ nome: produtoNome, categoria: categoriaFinal }])
      .select();

    if (prodError) {
      setMensagem('Erro ao cadastrar produto: ' + prodError.message);
      setCarregando(false);
      return;
    }

    const produtoId = prodData[0].id;
    const precoNum = preco ? parseFloat(preco.replace(',', '.')) : null;

    // 2. Vincular produto ao estoque da loja
    const { error: estqError } = await supabase
      .from('estoque_loja')
      .insert([{ estabelecimento_id: lojaSelecionadaId, produto_id: produtoId, preco: precoNum, disponivel: true }]);

    if (estqError) {
      setMensagem('Erro ao vincular estoque: ' + estqError.message);
    } else {
      setMensagem(`Produto "${produtoNome}" adicionado!`);
      setProdutoNome('');
      setPreco('');
      if (categoria === 'Outra') setOutraCategoria('');
      carregarEstoqueLoja(lojaSelecionadaId);
    }
    setCarregando(false);
  };

  // Alternar disponibilidade do item
  const alternarDisponibilidade = async (item: ItemEstoque) => {
    const { error } = await supabase
      .from('estoque_loja')
      .update({ disponivel: !item.disponivel })
      .eq('id', item.estoque_id);

    if (!error) {
      carregarEstoqueLoja(lojaSelecionadaId);
    }
  };

  // Excluir item do estoque
  const removerItemEstoque = async (estoqueId: string) => {
    if (confirm('Deseja remover este produto do estoque desta loja?')) {
      const { error } = await supabase
        .from('estoque_loja')
        .delete()
        .eq('id', estoqueId);

      if (!error) {
        carregarEstoqueLoja(lojaSelecionadaId);
      }
    }
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
      <header style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
        <h1 style={{ color: '#2e7d32', margin: 0 }}>Painel de Campo NutriMapa</h1>
        <p style={{ color: '#666', margin: '4px 0 0 0' }}>Cadastro e atualização em tempo real</p>
      </header>

      {mensagem && (
        <div style={{ padding: '12px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', marginBottom: '16px' }}>
          {mensagem}
        </div>
      )}

      {/* SELEÇÃO DE LOJA */}
      <section style={{ marginBottom: '20px', background: '#f0f4f8', padding: '16px', borderRadius: '8px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
          Selecione uma loja para atualizar ou escolha cadastrar nova:
        </label>
        <select 
          value={lojaSelecionadaId} 
          onChange={(e) => selecionarLoja(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #1976D2', fontSize: '15px' }}
        >
          <option value="NOVA">+ Cadastrar Nova Loja</option>
          {lojas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome} ({l.endereco})
            </option>
          ))}
        </select>
      </section>

      {/* ETAPA 1: DADOS DA LOJA */}
      <section style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>{lojaSelecionadaId === 'NOVA' ? '1. Dados da Nova Loja' : '1. Editar Dados da Loja'}</h2>
        <form onSubmit={salvarOuAtualizarLoja} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input 
            type="text" 
            placeholder="Nome da Loja" 
            value={nomeLoja} 
            onChange={(e) => setNomeLoja(e.target.value)} 
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
          <input 
            type="text" 
            placeholder="Endereço Completo" 
            value={endereco} 
            onChange={(e) => setEndereco(e.target.value)} 
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
          <input 
            type="text" 
            placeholder="WhatsApp (ex: 21999998888)" 
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
              📍 Capturar / Atualizar Posição GPS
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
            {carregando ? 'Salvando...' : lojaSelecionadaId === 'NOVA' ? 'Salvar Nova Loja' : 'Atualizar Dados da Loja'}
          </button>
        </form>
      </section>

      {/* ETAPA 2: ESTOQUE E NOVOS PRODUTOS */}
      {lojaSelecionadaId !== 'NOVA' && (
        <section style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
          <h2>2. Gerenciar Estoque da Loja ({itensEstoque.length} itens)</h2>

          {/* LISTA DE PRODUTOS JÁ CADASTRADOS */}
          <div style={{ marginBottom: '20px' }}>
            {itensEstoque.map((item) => (
              <div 
                key={item.estoque_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fff',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  border: '1px solid #e0e0e0'
                }}
              >
                <div>
                  <strong>{item.produto_nome}</strong>
                  <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>({item.categoria})</span>
                  <br />
                  <span style={{ fontSize: '13px', color: '#2e7d32', fontWeight: 'bold' }}>
                    {item.preco ? `R$ ${item.preco.toFixed(2)}` : 'Preço sob consulta'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => alternarDisponibilidade(item)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: 'none',
                      background: item.disponivel ? '#c8e6c9' : '#ffcdd2',
                      color: item.disponivel ? '#2e7d32' : '#c62828',
                      cursor: 'pointer'
                    }}
                  >
                    {item.disponivel ? 'Disponível' : 'Esgotado'}
                  </button>
                  <button 
                    onClick={() => removerItemEstoque(item.estoque_id)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: 'none',
                      background: '#ffebee',
                      color: '#d32f2f',
                      cursor: 'pointer'
                    }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ADICIONAR NOVO PRODUTO */}
          <h3 style={{ borderTop: '1px solid #ddd', paddingTop: '16px' }}>Adicionar Novo Item ao Estoque</h3>
          <form onSubmit={adicionarProduto} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Nome do Produto" 
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
              <option value="Orgânico">Orgânico</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Proteico">Proteico</option>
              <option value="Outra">+ Nova Categoria (digitar)...</option>
            </select>

            {categoria === 'Outra' && (
              <input 
                type="text" 
                placeholder="Digite a nova categoria" 
                value={outraCategoria} 
                onChange={(e) => setOutraCategoria(e.target.value)} 
                required
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #2e7d32', background: '#f0f8f0' }}
              />
            )}

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
              {carregando ? 'Adicionando...' : 'Cadastrar Item no Estoque'}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}