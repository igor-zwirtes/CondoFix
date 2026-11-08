import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

export default function SolicitacaoDetalhes() {
  const navigate = useNavigate();
  const { id } = useParams();

  const usuario = JSON.parse(
    localStorage.getItem('@CondoFix:user') || '{}'
  );

  const ehAdministrador = usuario.papeis?.some((papel) =>
    ['ADMIN', 'ADMINISTRADOR'].includes(papel.toUpperCase())
  );

  const [solicitacao, setSolicitacao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [historico, setHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [erroHistorico, setErroHistorico] = useState('');

  const [novaPrioridade, setNovaPrioridade] = useState('');
  const [salvandoPrioridade, setSalvandoPrioridade] = useState(false);
  const [erroPrioridade, setErroPrioridade] = useState('');
  const [sucessoPrioridade, setSucessoPrioridade] = useState('');

  const [editandoPrioridade, setEditandoPrioridade] = useState(false);
  const [prestadores, setPrestadores] = useState([]);
  const [novoPrestador, setNovoPrestador] = useState('');
  const [editandoPrestador, setEditandoPrestador] = useState(false);
  const [carregandoPrestadores, setCarregandoPrestadores] = useState(false);
  const [salvandoPrestador, setSalvandoPrestador] = useState(false);
  const [erroPrestador, setErroPrestador] = useState('');
  const [sucessoPrestador, setSucessoPrestador] = useState('');

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

  // Carregar o histórico da solicitação.
  useEffect(() => {
  async function carregarHistorico() {
    try {
      const resposta = await api.get(
        `/api/solicitacoes/${id}/historico`
      );

      setHistorico(resposta.data.data);
    } catch (error) {
      setErroHistorico(
          error.response?.data?.error?.message ||
          'Não foi possível carregar o histórico.'
      );
      } finally {
        setCarregandoHistorico(false);
      }
  }

    carregarHistorico();
    }, [id]);

async function carregarPrestadores() {
  try {
    setCarregandoPrestadores(true);
    setErroPrestador('');

    const resposta = await api.get('/api/solicitacoes/prestadores');

    setPrestadores(resposta.data.data);
  } catch (error) {
    setErroPrestador(
      error.response?.data?.error?.message ||
      'Não foi possível carregar os prestadores.'
    );
  } finally {
    setCarregandoPrestadores(false);
  }
}

async function alterarPrioridade() {
  setErroPrioridade('');
  setSucessoPrioridade('');

  if (!novaPrioridade || novaPrioridade === solicitacao.prioridade) {
    return;
  }

  try {
    setSalvandoPrioridade(true);

    await api.patch(`/api/solicitacoes/${id}/prioridade`, {
      prioridade: novaPrioridade
    });

    const resposta = await api.get(`/api/solicitacoes/${id}`);
    setSolicitacao(resposta.data.data);

    const respostaHistorico = await api.get(
      `/api/solicitacoes/${id}/historico`
    );
    setHistorico(respostaHistorico.data.data);

    setEditandoPrioridade(false);
    setNovaPrioridade('');

    setSucessoPrioridade('Prioridade alterada com sucesso!');
  } catch (error) {
    setErroPrioridade(
      error.response?.data?.error?.message ||
      'Não foi possível alterar a prioridade.'
    );
  } finally {
    setSalvandoPrioridade(false);
  }
}

async function atribuirPrestador() {
  setErroPrestador('');
  setSucessoPrestador('');

  if (!novoPrestador) {
    setErroPrestador('Selecione um prestador.');
    return;
  }

  try {
    setSalvandoPrestador(true);

    await api.patch(`/api/solicitacoes/${id}/prestador`, {
      prestadorId: Number(novoPrestador)
    });

    const resposta = await api.get(`/api/solicitacoes/${id}`);
    setSolicitacao(resposta.data.data);

    const respostaHistorico = await api.get(
      `/api/solicitacoes/${id}/historico`
    );
    setHistorico(respostaHistorico.data.data);

    setEditandoPrestador(false);
    setNovoPrestador('');

    setSucessoPrestador('Prestador atribuído com sucesso!');
  } catch (error) {
    setErroPrestador(
      error.response?.data?.error?.message ||
      'Não foi possível atribuir o prestador.'
    );
  } finally {
    setSalvandoPrestador(false);
  }
}

  // Formatar datas.
  function formatarData(data) {
    if (!data) {
      return 'Não informada';
    }

    return new Date(data).toLocaleDateString('pt-BR');
  }

  function formatarDataHora(data) {
    if (!data) {
      return 'Data não informada';
    }

    return new Date(data).toLocaleString('pt-BR');
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

        <div style={{ marginTop: '15px', marginBottom: '15px' }}>
            <p>
                <strong>Prioridade:</strong> {solicitacao.prioridade}
            </p>

            {ehAdministrador && !editandoPrioridade && (
                <button
                onClick={() => {
                    setNovaPrioridade(solicitacao.prioridade);
                    setEditandoPrioridade(true);
                    setErroPrioridade('');
                    setSucessoPrioridade('');
                }}
                >
                Alterar prioridade
                </button>
            )}

            {ehAdministrador && editandoPrioridade && (
                <div style={{ marginTop: '10px' }}>
                <select
                    value={novaPrioridade}
                    onChange={(e) => setNovaPrioridade(e.target.value)}
                >
                    <option value="Baixa">Baixa</option>
                    <option value="Normal">Normal</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                </select>

                <button
                    onClick={() => setEditandoPrioridade(false)}
                    style={{ marginLeft: '10px' }}
                >
                    Cancelar
                </button>
                </div>
            )}

            {erroPrioridade && (
                <p style={{ color: 'red' }}>{erroPrioridade}</p>
            )}

            {sucessoPrioridade && (
                <p style={{ color: 'green' }}>{sucessoPrioridade}</p>
            )}
            </div>

        <p>
          <strong>Categoria:</strong> {solicitacao.categoria}
        </p>

        <hr />

        <p>
          <strong>Solicitante:</strong> {solicitacao.solicitante}
        </p>

        <div style={{ marginTop: '15px', marginBottom: '15px' }}>
            <p>
                <strong>Prestador responsável:</strong>{' '}
                {solicitacao.prestador || 'Ainda não atribuído'}
            </p>

            {ehAdministrador &&
                solicitacao.status !== 'Finalizada' &&
                !editandoPrestador && (
                <button
                    onClick={() => {
                        setEditandoPrestador(true);
                        setNovoPrestador('');
                        setErroPrestador('');
                        setSucessoPrestador('');
                        carregarPrestadores();
                    }}
                >
                    {solicitacao.prestador
                        ? 'Alterar prestador'
                        : 'Atribuir prestador'}
                </button>
            )}

            {ehAdministrador && editandoPrestador && (
                <div style={{ marginTop: '10px' }}>
                {carregandoPrestadores ? (
                    <p>Carregando prestadores...</p>
                ) : (
                    <>
                    <select
                        value={novoPrestador}
                        onChange={(e) => setNovoPrestador(e.target.value)}
                    >
                        <option value="">Selecione um prestador</option>

                        {prestadores.map((prestador) => (
                        <option key={prestador.id} value={prestador.id}>
                            {prestador.nome}
                        </option>
                        ))}
                    </select>

                    <button
                        onClick={atribuirPrestador}
                        disabled={salvandoPrestador || !novoPrestador}
                        style={{ marginLeft: '10px' }}
                    >
                        {salvandoPrestador ? 'Atribuindo...' : 'Confirmar atribuição'}
                    </button>

                    <button
                        onClick={() => {
                        setEditandoPrestador(false);
                        setNovoPrestador('');
                        setErroPrestador('');
                        }}
                        disabled={salvandoPrestador}
                        style={{ marginLeft: '10px' }}
                    >
                        Cancelar
                    </button>
                    </>
                )}
                </div>
            )}

            {erroPrestador && (
                <p style={{ color: 'red' }}>{erroPrestador}</p>
            )}

            {sucessoPrestador && (
                <p style={{ color: 'green' }}>{sucessoPrestador}</p>
            )}
            </div>

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
        
        {ehAdministrador && editandoPrioridade && (
            <button
                onClick={alterarPrioridade}
                disabled={
                salvandoPrioridade ||
                novaPrioridade === solicitacao.prioridade
                }
                style={{ marginTop: '15px' }}
            >
                {salvandoPrioridade ? 'Salvando...' : 'Confirmar alterações'}
            </button>
        )}

      
      <div style={{ marginTop: '35px' }}>
        <h2>Histórico de alterações</h2>

        {carregandoHistorico && (
          <p>Carregando histórico...</p>
        )}

        {erroHistorico && (
          <p style={{ color: 'red' }}>
            {erroHistorico}
          </p>
        )}

        {!carregandoHistorico &&
          !erroHistorico &&
          historico.length === 0 && (
            <p>Nenhuma alteração registrada.</p>
          )}

        {!carregandoHistorico &&
          historico.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                marginTop: '20px'
              }}
            >
              {historico.map((alteracao) => (
                <div
                  key={alteracao.id}
                  style={{
                    border: '1px solid #cccccc',
                    borderRadius: '8px',
                    padding: '20px'
                  }}
                >
                  <h3>{alteracao.tipo}</h3>

                  <p>{alteracao.descricao}</p>

                  <p>
                    <strong>Responsável:</strong>{' '}
                    {alteracao.usuario || 'Não informado'}
                  </p>

                  <p>
                    <strong>Data:</strong>{' '}
                    {formatarDataHora(alteracao.data)}
                  </p>
                </div>
              ))}
            </div>
          )}
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
