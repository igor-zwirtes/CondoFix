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

  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

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

  function handleLogout() {
    localStorage.removeItem('@CondoFix:token');
    localStorage.removeItem('@CondoFix:user');
    navigate('/');
  }

  function handleVerDetalhes(id) {
    navigate(`/solicitacoes/${id}`);
  }

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

          <button className="solicitacoes-sidebar-link active">
            <span>▤</span>
            Solicitações
          </button>

          <button
            className="solicitacoes-sidebar-link"
            onClick={() => navigate('/usuarios')}
          >
            <span>♙</span>
            Usuários
          </button>

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

              <span className="solicitacoes-count">
                {solicitacoes.length}
                {' '}
                {solicitacoes.length === 1 ? 'solicitação' : 'solicitações'}
              </span>
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
                {solicitacoes.map((solicitacao) => (
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

                      <span>
                        Prioridade: {solicitacao.prioridade}
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