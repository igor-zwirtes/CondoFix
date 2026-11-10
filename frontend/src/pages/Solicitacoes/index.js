import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './styles.css';

export default function Solicitacoes() {
  const navigate = useNavigate();

  const dadosUsuario = JSON.parse(
    localStorage.getItem('@CondoFix:user') || '{}'
  );

  const nomeUsuario =
    dadosUsuario.nome ||
    dadosUsuario.usrnam ||
    dadosUsuario.name ||
    'Usuário';

  const ehPrestador = dadosUsuario.papeis?.includes('PRESTADOR_SERVICO');

  const ehAdmin = dadosUsuario.papeis?.includes('ADMIN');
  
  const ehAdministrador = dadosUsuario.papeis?.includes('ADMINISTRADOR');

  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [ordenacao, setOrdenacao] = useState('recentes');

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

  function formatarData(data) {
    if (!data) return 'Não informada';
    return new Date(data).toLocaleDateString('pt-BR');
  }

  function classeStatus(status = '') {
    return status
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  function classePrioridade(prioridade = '') {
    return prioridade
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  function handleLogout() {
    localStorage.removeItem('@CondoFix:token');
    localStorage.removeItem('@CondoFix:user');
    navigate('/');
  }

  function handleVerDetalhes(id) {
    navigate(`/solicitacoes/${id}`);
  }

  function normalizarPrioridade(prioridade = '') {
    return prioridade
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  const solicitacoesOrdenadas = [...solicitacoes].sort((a, b) => {
    // Ordem de pedido
    if (ordenacao === 'antigas') {
      return new Date(a.data_abertura || 0) -
        new Date(b.data_abertura || 0);
    }

    if (ordenacao === 'recentes') {
      return new Date(b.data_abertura || 0) -
        new Date(a.data_abertura || 0);
    }

    // Ordem de prioridade
    const prioridades = {
      baixa: 1,
      normal: 2,
      alta: 3,
      urgente: 4
    };

    const prioridadeA =
      prioridades[normalizarPrioridade(a.prioridade)] ?? 99;

    const prioridadeB =
      prioridades[normalizarPrioridade(b.prioridade)] ?? 99;

    if (ordenacao === 'prioridade-crescente') {
      return prioridadeA - prioridadeB;
    }

    if (ordenacao === 'prioridade-decrescente') {
      return prioridadeB - prioridadeA;
    }

    return 0;
  });

  return (
    <div className="solicitacoes-layout">

      {/* Cabeçalho */}
      <header className="solicitacoes-header">
        <h1>CondoFix<span>.</span></h1>

        <div className="solicitacoes-header-user">
          <span>{nomeUsuario}</span>

          <div className="solicitacoes-avatar">
            {nomeUsuario.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="solicitacoes-container">

        {/* Menu lateral */}
        <aside className="solicitacoes-sidebar">
          <span className="solicitacoes-sidebar-title">MENU</span>

          <button
            className="solicitacoes-sidebar-link"
            onClick={() => navigate('/administrador')}
          >
            <span>▦</span>
            Painel
          </button>

          {(ehAdmin || ehAdministrador) && (
            <button
              className="solicitacoes-sidebar-link"
              onClick={() => navigate('/dashboard')}
            >
              <span>▥</span>
              Dashboard
            </button>
          )}

          <button className="solicitacoes-sidebar-link active">
            <span>▤</span>
            Solicitações
          </button>

          {ehAdmin && (
            <button
              className="solicitacoes-sidebar-link"
              onClick={() => navigate('/usuarios')}
            >
              <span>◎</span> Usuários
            </button>
          )}

          <div className="solicitacoes-sidebar-bottom">
            <button
              className="solicitacoes-sidebar-link"
              onClick={handleLogout}
            >
              <span>↪</span>
              Sair
            </button>
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main className="solicitacoes-content">

          <div className="solicitacoes-welcome">
            <div>
              <h2>Solicitações</h2>

              <p>
                {ehPrestador
                  ? 'Acompanhe os serviços atribuídos a você.'
                  : 'Consulte e acompanhe suas solicitações de manutenção.'}
              </p>
            </div>
          </div>

          {/* Listagem */}
          <section className="solicitacoes-panel">

            <div className="solicitacoes-panel-heading">
              <h3>
                {ehPrestador
                  ? 'Serviços atribuídos a mim'
                  : 'Todas as solicitações'}
              </h3>

              <div className="solicitacoes-controls">

                <select
                  className="solicitacoes-sort"
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value)}
                >
                  <option value="recentes">Mais recentes primeiro</option>
                  <option value="antigas">Mais antigas primeiro</option>
                  <option value="prioridade-crescente">
                    Prioridade crescente
                  </option>
                  <option value="prioridade-decrescente">
                    Prioridade decrescente
                  </option>
                </select>
              </div>
            </div>

            {carregando ? (
              <p className="solicitacoes-message">
                Carregando solicitações...
              </p>
            ) : erro ? (
              <p className="solicitacoes-message solicitacoes-error">
                {erro}
              </p>
            ) : solicitacoes.length === 0 ? (
              <p className="solicitacoes-message">
                {ehPrestador
                  ? 'Você não possui serviços atribuídos no momento.'
                  : 'Nenhuma solicitação encontrada.'}
              </p>
            ) : (
              <div className="solicitacoes-list">
                {solicitacoesOrdenadas.map((solicitacao) => (
                  <button
                    type="button"
                    className="solicitacao-item"
                    key={solicitacao.id}
                    onClick={() => handleVerDetalhes(solicitacao.id)}
                  >
                    <div className="solicitacao-item-info">
                      <h4>{solicitacao.titulo}</h4>

                      <span>
                        {solicitacao.categoria}
                        {' · '}
                        {formatarData(solicitacao.data_abertura)}
                      </span>

                      {ehPrestador && (
                        <span>
                          Solicitante: {solicitacao.solicitante}
                        </span>
                      )}

                      <span className="solicitacao-prioridade">
                        Prioridade: 
                        <span
                          className={`prioridade-badge prioridade-${classePrioridade(solicitacao.prioridade)}`}
                        >
                          {solicitacao.prioridade}
                        </span>
                      </span>
                    </div>

                    <span
                      className={`status-badge status-${classeStatus(solicitacao.status)}`}
                    >
                      {solicitacao.status}
                    </span>
                  </button>
                ))}
              </div>
            )}

          </section>

        </main>
      </div>
    </div>
  );
}