import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function PainelMorador() {
  const navigate = useNavigate();

  const [apartamento, setApartamento] = useState(null);
  const [categorias, setCategorias] = useState([]);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Carregar apartamento e categorias ao abrir a tela.
  useEffect(() => {
    async function carregarOpcoes() {
      try {
        const resposta = await api.get('/api/solicitacoes/opcoes');

        setApartamento(resposta.data.data.apartamento);
        setCategorias(resposta.data.data.categorias);
      } catch (error) {
        setErro(
          error.response?.data?.error?.message ||
          'Não foi possível carregar os dados do formulário.'
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarOpcoes();
  }, []);

  // Criar solicitação.
  async function handleCriarSolicitacao(e) {
    e.preventDefault();

    setErro('');
    setSucesso('');

    if (!apartamento || !categoriaId) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setEnviando(true);

      await api.post('/api/solicitacoes', {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        apartamentoId: Number(apartamento.id),
        categoriaId: Number(categoriaId)
      });

      setSucesso('Solicitação criada com sucesso!');

      // Limpar formulário após o cadastro.
      setTitulo('');
      setDescricao('');
      setCategoriaId('');

    } catch (error) {
      setErro(
        error.response?.data?.error?.message ||
        'Não foi possível criar a solicitação.'
      );
    } finally {
      setEnviando(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('@CondoFix:token');
    localStorage.removeItem('@CondoFix:user');

    navigate('/');
  }

  if (carregando) {
    return <p>Carregando formulário...</p>;
  }

  return (
    <div style={{
      maxWidth: '700px',
      margin: '40px auto',
      padding: '30px'
    }}>

      <h1>CondoFix</h1>

      <h2>Criar solicitação de manutenção</h2>

      <button
        onClick={() => navigate('/solicitacoes')}
        style={{ marginBottom: '20px' }}
      >
        Minhas solicitações
      </button>

      <form
        onSubmit={handleCriarSolicitacao}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}
      >

        <div>
          <label>Título</label>

          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={255}
            placeholder="Ex.: Vazamento na cozinha"
            required
            style={{ width: '100%', padding: '10px' }}
          />
        </div>

        <div>
          <label>Descrição do problema</label>

          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o problema encontrado..."
            required
            rows={5}
            style={{ width: '100%', padding: '10px' }}
          />
        </div>

        <div>
          <label>Categoria</label>

          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            required
            style={{ width: '100%', padding: '10px' }}
          >
            <option value="">Selecione uma categoria</option>

            {categorias.map((categoria) => (
              <option
                key={categoria.id}
                value={categoria.id}
              >
                {categoria.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Localização (apartamento)</label>

          <input
            type="text"
            value={
              apartamento
                ? `Bloco ${apartamento.bloco} - Andar ${apartamento.andar} - Apartamento ${apartamento.numero}`
                : ''
            }
            readOnly
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#eeeeee'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={enviando || !apartamento}
        >
          {enviando ? 'Enviando...' : 'Criar solicitação'}
        </button>

      </form>

      {erro && (
        <p style={{ color: 'red', marginTop: '15px' }}>
          {erro}
        </p>
      )}

      {sucesso && (
        <p style={{ color: 'green', marginTop: '15px' }}>
          {sucesso}
        </p>
      )}

      <button
        onClick={handleLogout}
        style={{ marginTop: '25px' }}
      >
        Sair
      </button>

    </div>
  );
}