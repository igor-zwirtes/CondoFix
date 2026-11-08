
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Solicitacoes() {
  const navigate = useNavigate();

  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Carregar solicitações ao abrir a tela.
  useEffect(() => {
    async function carregarSolicitacoes() {
      try {
        const resposta = await api.get('/api/solicitacoes');

        setSolicitacoes(resposta.data.data);
      } catch (error) {
        setErro(
          error.response?.data?.error?.message ||
          'Não foi possível carregar as solicitações.'
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarSolicitacoes();
  }, []);

  // Formatar a data de abertura.
  function formatarData(data) {
    if (!data) {
      return 'Não informada';
    }

    return new Date(data).toLocaleDateString('pt-BR');
  }

  // Abrir os detalhes de uma solicitação.
  function handleVerDetalhes(id) {
    navigate(`/solicitacoes/${id}`);
  }

  if (carregando) {
    return <p>Carregando solicitações...</p>;
  }

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '40px auto',
        padding: '30px'
      }}
    >
      <h1>CondoFix</h1>

      <h2>Solicitações de manutenção</h2>

      {erro && (
        <p style={{ color: 'red', marginTop: '15px' }}>
          {erro}
        </p>
      )}

      {!erro && solicitacoes.length === 0 && (
        <p>Nenhuma solicitação encontrada.</p>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          marginTop: '25px'
        }}
      >
        {solicitacoes.map((solicitacao) => (
          <div
            key={solicitacao.id}
            style={{
              border: '1px solid #cccccc',
              borderRadius: '8px',
              padding: '20px'
            }}
          >
            <h3>{solicitacao.titulo}</h3>

            <p>
              <strong>Status:</strong> {solicitacao.status}
            </p>

            <p>
              <strong>Prioridade:</strong> {solicitacao.prioridade}
            </p>

            <p>
              <strong>Categoria:</strong> {solicitacao.categoria}
            </p>

            <p>
              <strong>Data de abertura:</strong>{' '}
              {formatarData(solicitacao.data_abertura)}
            </p>

            <button
              onClick={() => handleVerDetalhes(solicitacao.id)}
            >
              Ver detalhes
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate(-1)}
        style={{ marginTop: '25px' }}
      >
        Voltar
      </button>
    </div>
  );
}
