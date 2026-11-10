import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './styles.css';

const STATUS_OCULTOS = ['Aprovada'];

function ListaBarras({ itens, vazio }) {
  if (itens.length === 0) {
    return <p className="dashboard-empty">{vazio}</p>;
  }

  const maximo = Math.max(...itens.map((item) => item.valor), 1);

  return (
    <div className="dashboard-bar-list">
      {itens.map((item) => (
        <div key={item.chave}>
          <div className="dashboard-bar-row-header">
            <span>{item.rotulo}</span>
            <strong>{item.valor}</strong>
          </div>

          <div className="dashboard-bar-track">
            <div
              className={`dashboard-bar-fill ${item.classe || ''}`}
              style={{ width: `${(item.valor / maximo) * 100}%` }}
            />
          </div>

          {item.detalhe && (
            <div className="dashboard-bar-extra">{item.detalhe}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const dadosUsuario = JSON.parse(
    localStorage.getItem('@CondoFix:user') || '{}'
  );

  const nomeUsuario =
    dadosUsuario.nome ||
    dadosUsuario.usrnam ||
    dadosUsuario.name ||
    'Usuário';

  const inicial = nomeUsuario.charAt(0).toUpperCase();

  const ehAdmin = dadosUsuario.papeis?.includes('ADMIN');

  const [resumo, setResumo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [prioridades, setPrioridades] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregarIndicadores() {
      try {
        const [
          respostaResumo,
          respostaCategorias,
          respostaPrioridades,
          respostaPrestadores,
        ] = await Promise.all([
          api.get('/api/dashboard/resumo'),
          api.get('/api/dashboard/categorias'),
          api.get('/api/dashboard/prioridades'),
          api.get('/api/dashboard/prestadores'),
        ]);

        setResumo(respostaResumo.data.data);
        setCategorias(respostaCategorias.data.data);
        setPrioridades(respostaPrioridades.data.data);
        setPrestadores(respostaPrestadores.data.data);
      } catch (error) {
        setErro(
          error.response?.data?.error?.message ||
          'Não foi possível carregar os indicadores.'
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarIndicadores();
  }, []);

  function handleLogout() {
    localStorage.removeItem('@CondoFix:token');
    localStorage.removeItem('@CondoFix:user');
    navigate('/');
  }

  const itensStatus = (resumo?.solicitacoesPorStatus || [])
    .filter((item) => !STATUS_OCULTOS.includes(item.status))
    .map((item) => ({
      chave: item.status,
      rotulo: item.status,
      valor: item.quantidade,
      classe: item.status === 'Cancelada' ? 'cancelada' : '',
  }));

  const itensCategorias = categorias.map((item) => ({
    chave: item.id,
    rotulo: item.categoria,
    valor: item.quantidade,
  }));

  const itensPrioridades = prioridades.map((item) => ({
    chave: item.id,
    rotulo: item.prioridade,
    valor: item.quantidade,
        detalhe: `${item.abertas} aberta(s) · ${item.pendentes} pendente(s)`,
  }));

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <h1>
          CondoFix<span>.</span>
        </h1>

        <div className="dashboard-header-user">
          <span>{nomeUsuario}</span>
          <div className="dashboard-avatar">{inicial}</div>
        </div>
      </header>

      <div className="dashboard-container">
        <aside className="dashboard-sidebar">
          <span className="dashboard-sidebar-title">MENU</span>

          <button
            className="dashboard-sidebar-link"
            onClick={() => navigate('/painel')}
          >
            <span>▦</span>
            Painel
          </button>

          <button className="dashboard-sidebar-link active">
            <span>▥</span>
            Dashboard
          </button>

          <button
            className="dashboard-sidebar-link"
            onClick={() => navigate('/solicitacoes')}
          >
            <span>▤</span>
            Solicitações
          </button>

          {ehAdmin && (
            <button
              className="dashboard-sidebar-link"
              onClick={() => navigate('/usuarios')}
            >
              <span>◎</span>
              Usuários
            </button>
          )}

          <div className="dashboard-sidebar-bottom">
            <button
              className="dashboard-sidebar-link"
              onClick={handleLogout}
            >
              <span>↪</span>
              Sair
            </button>
          </div>
        </aside>

        <main className="dashboard-content">
          <section className="dashboard-welcome">
            <div>
              <h2>Dashboard</h2>
              <p>
                Acompanhe o volume, o estado das solicitações e o desempenho
                dos prestadores de serviço.
              </p>
            </div>
          </section>

          {carregando && (
            <p className="dashboard-loading">Carregando indicadores...</p>
          )}

          {erro && <div className="dashboard-error">{erro}</div>}

          {!carregando && !erro && resumo && (
            <>
              <section className="dashboard-summary">
                <div className="dashboard-summary-card">
                  <span className="dashboard-summary-label">Total</span>
                  <strong>{resumo.totalSolicitacoes}</strong>
                  <small>Todas as solicitações registradas</small>
                </div>

                <div className="dashboard-summary-card">
                  <span className="dashboard-summary-label">Abertas</span>
                  <strong>{resumo.solicitacoesAbertas}</strong>
                  <small>Aguardando análise</small>
                </div>

                <div className="dashboard-summary-card">
                  <span className="dashboard-summary-label">Pendentes</span>
                  <strong>{resumo.solicitacoesPendentes}</strong>
                  <small>Em atendimento, ainda não concluídas</small>
                </div>

                <div className="dashboard-summary-card">
                  <span className="dashboard-summary-label">Concluídas</span>
                  <strong>{resumo.solicitacoesConcluidas}</strong>
                  <small>Concluídas ou finalizadas</small>
                </div>

                <div className="dashboard-summary-card">
                  <span className="dashboard-summary-label">Canceladas</span>
                  <strong>{resumo.solicitacoesCanceladas}</strong>
                  <small>Encerradas sem execução</small>
                </div>
              </section>

              <section className="dashboard-grid">
                <div className="dashboard-panel">
                  <h3>Solicitações por status</h3>
                  <p className="dashboard-panel-subtitle">
                    Situação atual de todas as solicitações.
                  </p>
                  <ListaBarras
                    itens={itensStatus}
                    vazio="Nenhuma solicitação registrada."
                  />
                </div>

                <div className="dashboard-panel">
                  <h3>Solicitações por categoria</h3>
                  <p className="dashboard-panel-subtitle">
                    Distribuição das solicitações por tipo de serviço.
                  </p>
                  <ListaBarras
                    itens={itensCategorias}
                    vazio="Nenhuma categoria cadastrada."
                  />
                </div>

                <div className="dashboard-panel">
                  <h3>Solicitações por prioridade</h3>
                  <p className="dashboard-panel-subtitle">
                    Distribuição das solicitações por nível de prioridade.
                  </p>
                  <ListaBarras
                    itens={itensPrioridades}
                    vazio="Nenhuma prioridade cadastrada."
                  />
                </div>
              </section>

              <section className="dashboard-panel">
                <h3>Desempenho dos prestadores</h3>
                <p className="dashboard-panel-subtitle">
                  Serviços atribuídos e taxa de conclusão de cada prestador
                  (solicitações canceladas não entram no cálculo da taxa).
                </p>

                {prestadores.length === 0 ? (
                  <p className="dashboard-empty">
                    Nenhum prestador de serviço cadastrado.
                  </p>
                ) : (
                  <div className="dashboard-table-wrapper">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>Prestador</th>
                          <th className="num">Atribuídas</th>
                          <th className="num">Pendentes</th>
                          <th className="num">Em andamento</th>
                          <th className="num">Em fechamento</th>
                          <th className="num">Concluídas</th>
                          <th className="num">Canceladas</th>
                          <th>Taxa de conclusão</th>
                        </tr>
                      </thead>

                      <tbody>
                        {prestadores.map((prestador) => (
                          <tr key={prestador.id}>
                            <td>
                              <div className="dashboard-prestador-nome">
                                <strong>{prestador.nome}</strong>
                                <small>
                                  {prestador.empresa || 'Autônomo'}
                                </small>
                              </div>
                            </td>
                            <td className="num">{prestador.totalAtribuido}</td>
                            <td className="num">{prestador.totalPendente}</td>
                            <td className="num">
                              {prestador.totalEmAndamento}
                            </td>
                            <td className="num">
                              {prestador.totalEmFechamento}
                            </td>
                            <td className="num">{prestador.totalConcluido}</td>
                            <td className="num">{prestador.totalCancelado}</td>
                            <td>
                              {prestador.taxaConclusao === null ? (
                                <span className="dashboard-empty">—</span>
                              ) : (
                                <div className="dashboard-taxa">
                                  <div className="dashboard-bar-track">
                                    <div
                                      className="dashboard-bar-fill"
                                      style={{
                                        width: `${prestador.taxaConclusao}%`,
                                      }}
                                    />
                                  </div>
                                  <strong>
                                    {prestador.taxaConclusao.toLocaleString(
                                      'pt-BR',
                                      { maximumFractionDigits: 1 }
                                    )}
                                    %
                                  </strong>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}