import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

export default function SolicitacaoDetalhes() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [solicitacao, setSolicitacao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Carregar os detalhes da solicitação.
  useEffect(() => {
    async function carregarSolicitacao() {
      try {
        const resposta = await api.get(`/api/solicitacoes/${id}`);

        setSolicitacao(resposta.data.data);
      } catch (error) {
        setErro(
          error.response?.data?.error?.message ||
          'Não foi possível carregar os detalhes da solicitação.'
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarSolicitacao();
  }, [id]);

  // Formatar datas.
  function formatarData(data) {
    if (!data) {
      return 'Não informada';
    }

    return new Date(data).toLocaleDateString('pt-BR');
  }

  if (carregando) {
    return <p>Carregando detalhes da solicitação...</p>;
  }

  if (erro) {
    return (
      <div style={{ maxWidth: '700px', margin: '40px auto', padding: '30px' }}>
        <h2>Erro</h2>

        <p style={{ color: 'red' }}>{erro}</p>

        <button onClick={() => navigate('/solicitacoes')}>
          Voltar para solicitações
        </button>
      </div>
    );
  }

  if (!solicitacao) {
    return <p>Solicitação não encontrada.</p>;
  }

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '40px auto',
        padding: '30px'
      }}
    >
      <h1>CondoFix</h1>

      <h2>Detalhes da solicitação</h2>

      <div
        style={{
          border: '1px solid #cccccc',
          borderRadius: '8px',
          padding: '25px',
          marginTop: '25px'
        }}
      >
        <h3>{solicitacao.titulo}</h3>

        <div style={{ marginTop: '20px' }}>
          <p>
            <strong>Descrição:</strong>
          </p>

          <p>{solicitacao.descricao}</p>
        </div>

        <hr />

        <p>
          <strong>Status:</strong> {solicitacao.status}
        </p>

        <p>
          <strong>Prioridade:</strong> {solicitacao.prioridade}
        </p>

        <p>
          <strong>Categoria:</strong> {solicitacao.categoria}
        </p>

        <hr />

        <p>
          <strong>Solicitante:</strong> {solicitacao.solicitante}
        </p>

        <p>
          <strong>Prestador responsável:</strong>{' '}
          {solicitacao.prestador || 'Ainda não atribuído'}
        </p>

        <hr />

        <p>
          <strong>Data de abertura:</strong>{' '}
          {formatarData(solicitacao.data_abertura)}
        </p>

        <p>
          <strong>Data de fechamento:</strong>{' '}
          {formatarData(solicitacao.data_fechamento)}
        </p>
      </div>

      <button
        onClick={() => navigate('/solicitacoes')}
        style={{ marginTop: '25px' }}
      >
        Voltar para solicitações
      </button>
    </div>
  );
}
