import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import './styles.css';

export default function SolicitacaoDetalhes() {
  const navigate = useNavigate();
  const { id } = useParams();

  const usuario = JSON.parse(
    localStorage.getItem('@CondoFix:user') || '{}'
  );

  const nomeUsuario =
    usuario.nome || usuario.usrnam || usuario.name || 'Usuário';

  const ehAdministrador = usuario.papeis?.some((papel) =>
    ['ADMIN', 'ADMINISTRADOR'].includes(papel.toUpperCase())
  );

  const ehPrestador = usuario.papeis?.some((papel) =>
    papel.toUpperCase() === 'PRESTADOR_SERVICO'
  );

  const ehMorador = usuario.papeis?.some((papel) =>
    papel.toUpperCase() === 'USUARIO'
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

  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [erroStatus, setErroStatus] = useState('');
  const [sucessoStatus, setSucessoStatus] = useState('');

  const [salvandoCancelamento, setSalvandoCancelamento] = useState(false);
  const [erroCancelamento, setErroCancelamento] = useState('');
  const [sucessoCancelamento, setSucessoCancelamento] = useState('');

  const [descricaoSolucao, setDescricaoSolucao] = useState('');
  const [salvandoConclusao, setSalvandoConclusao] = useState(false);
  const [erroConclusao, setErroConclusao] = useState('');
  const [sucessoConclusao, setSucessoConclusao] = useState('');

  const [notaAvaliacao, setNotaAvaliacao] = useState('');
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState('');
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false);
  const [erroAvaliacao, setErroAvaliacao] = useState('');
  const [sucessoAvaliacao, setSucessoAvaliacao] = useState('');

  const [editandoPrioridade, setEditandoPrioridade] = useState(false);
  const [prestadores, setPrestadores] = useState([]);
  const [novoPrestador, setNovoPrestador] = useState('');
  const [editandoPrestador, setEditandoPrestador] = useState(false);
  const [carregandoPrestadores, setCarregandoPrestadores] = useState(false);
  const [salvandoPrestador, setSalvandoPrestador] = useState(false);
  const [erroPrestador, setErroPrestador] = useState('');
  const [sucessoPrestador, setSucessoPrestador] = useState('');

  const solicitacaoEncerrada = [
    'Concluida',
    'Cancelada',
    'Finalizada'
  ].includes(solicitacao?.status);

  const prestadorAtualId =
    solicitacao?.prestadorId ??
    solicitacao?.pvdid ??
    solicitacao?.prestador_id ??
    null;

  // Carregar detalhes.
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

  // Carregar histórico.
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

  async function atualizarDados() {
    const resposta = await api.get(`/api/solicitacoes/${id}`);
    setSolicitacao(resposta.data.data);

    const respostaHistorico = await api.get(
      `/api/solicitacoes/${id}/historico`
    );
    setHistorico(respostaHistorico.data.data);
    setErroHistorico('');
  }

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

    if (
      solicitacaoEncerrada ||
      !novaPrioridade ||
      novaPrioridade === solicitacao.prioridade
    ) {
      return;
    }

    try {
      setSalvandoPrioridade(true);

      await api.patch(`/api/solicitacoes/${id}/prioridade`, {
        prioridade: novaPrioridade
      });

      await atualizarDados();

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

  async function alterarStatus() {
    setErroStatus('');
    setSucessoStatus('');

    if (!ehPrestador || solicitacao.status !== 'Atribuida') {
      return;
    }

    try {
      setSalvandoStatus(true);

      await api.patch(`/api/solicitacoes/${id}/status`, {
        status: 'Em andamento'
      });

      setSolicitacao((anterior) => ({
        ...anterior,
        status: 'Em andamento'
      }));

      setSucessoStatus('Status atualizado com sucesso!');

      try {
        await atualizarDados();
      } catch (error) {
        setErroHistorico(
          'O status foi atualizado, mas não foi possível atualizar o histórico na tela.'
        );
      }
    } catch (error) {
      setErroStatus(
        error.response?.data?.error?.message ||
        'Não foi possível atualizar o status.'
      );
    } finally {
      setSalvandoStatus(false);
    }
  }

  async function cancelarSolicitacao() {
    setErroCancelamento('');
    setSucessoCancelamento('');

    if (
      !['Aberta', 'Atribuida'].includes(solicitacao.status) ||
      (!ehMorador && !ehAdministrador)
    ) {
      return;
    }

    const confirmar = window.confirm(
      'Tem certeza de que deseja cancelar esta solicitação?'
    );

    if (!confirmar) return;

    try {
      setSalvandoCancelamento(true);

      await api.patch(`/api/solicitacoes/${id}/cancelar`);
      await atualizarDados();

      setSucessoCancelamento('Solicitação cancelada com sucesso!');
    } catch (error) {
      setErroCancelamento(
        error.response?.data?.error?.message ||
        'Não foi possível cancelar a solicitação.'
      );
    } finally {
      setSalvandoCancelamento(false);
    }
  }

  async function concluirServico() {
    setErroConclusao('');
    setSucessoConclusao('');

    if (
      !ehPrestador ||
      solicitacao.status !== 'Em andamento'
    ) {
      return;
    }

    if (!descricaoSolucao.trim()) {
      setErroConclusao(
        'Informe a solução realizada antes de concluir o serviço.'
      );
      return;
    }

    try {
      setSalvandoConclusao(true);

      await api.patch(`/api/solicitacoes/${id}/status`, {
        status: 'Concluida',
        descricao: descricaoSolucao
      });

      await atualizarDados();

      setDescricaoSolucao('');
      setSucessoConclusao('Serviço concluído com sucesso!');
    } catch (error) {
      setErroConclusao(
        error.response?.data?.error?.message ||
        'Não foi possível concluir o serviço.'
      );
    } finally {
      setSalvandoConclusao(false);
    }
  }

  async function avaliarServico() {
    setErroAvaliacao('');
    setSucessoAvaliacao('');

    if (!ehMorador || solicitacao.status !== 'Concluida') {
      return;
    }

    if (!notaAvaliacao) {
      setErroAvaliacao('Selecione uma nota para o serviço.');
      return;
    }

    try {
      setSalvandoAvaliacao(true);

      await api.patch(`/api/solicitacoes/${id}/aceitar`, {
        nota: Number(notaAvaliacao),
        comentario: comentarioAvaliacao
      });

      await atualizarDados();

      setNotaAvaliacao('');
      setComentarioAvaliacao('');
      setSucessoAvaliacao('Avaliação registrada com sucesso!');
    } catch (error) {
      setErroAvaliacao(
        error.response?.data?.erro ||
        error.response?.data?.error?.message ||
        'Não foi possível registrar a avaliação.'
      );
    } finally {
      setSalvandoAvaliacao(false);
    }
  }

  async function atribuirPrestador() {
    setErroPrestador('');
    setSucessoPrestador('');

    if (solicitacaoEncerrada) return;

    if (!novoPrestador) {
      setErroPrestador('Selecione um prestador.');
      return;
    }

    if (
      prestadorAtualId !== null &&
      String(novoPrestador) === String(prestadorAtualId)
    ) {
      setErroPrestador(
        'Este prestador já está atribuído à solicitação.'
      );
      return;
    }

    const jaPossuiPrestador = prestadorAtualId !== null;

    try {
      setSalvandoPrestador(true);

      await api.patch(`/api/solicitacoes/${id}/prestador`, {
        prestadorId: Number(novoPrestador)
      });

      await atualizarDados();

      setEditandoPrestador(false);
      setNovoPrestador('');

      setSucessoPrestador(
        jaPossuiPrestador
          ? 'Prestador alterado com sucesso!'
          : 'Prestador atribuído com sucesso!'
      );
    } catch (error) {
      setErroPrestador(
        error.response?.data?.error?.message ||
        'Não foi possível atribuir o prestador.'
      );
    } finally {
      setSalvandoPrestador(false);
    }
  }

  async function confirmarAlteracoes() {
    if (editandoPrioridade) {
      await alterarPrioridade();
    } else if (editandoPrestador) {
      await atribuirPrestador();
    }
  }

  function formatarData(data) {
    if (!data) return 'Não informada';
    return new Date(data).toLocaleDateString('pt-BR');
  }

  function formatarDataHora(data) {
    if (!data) return 'Data não informada';
    return new Date(data).toLocaleString('pt-BR');
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

  if (carregando) {
    return (
      <div className="detalhes-loading">
        Carregando detalhes da solicitação...
      </div>
    );
  }

  if (erro || !solicitacao) {
    return (
      <div className="detalhes-layout">
        <header className="detalhes-header">
          <h1>CondoFix<span>.</span></h1>
        </header>

        <div className="detalhes-container">
          <aside className="detalhes-sidebar">
            <span className="detalhes-sidebar-title">MENU</span>
            <button
              className="detalhes-sidebar-link"
              onClick={() => navigate('/solicitacoes')}
            >
              <span>▤</span>
              Solicitações
            </button>
            <div className="detalhes-sidebar-bottom">
              <button
                className="detalhes-sidebar-link"
                onClick={handleLogout}
              >
                <span>↪</span>
                Sair
              </button>
            </div>
          </aside>

          <main className="detalhes-content">
            <section className="detalhes-panel">
              <h2>{erro ? 'Erro' : 'Solicitação não encontrada'}</h2>
              {erro && <p className="message-error">{erro}</p>}
              <button
                className="secondary-button"
                onClick={() => navigate('/solicitacoes')}
              >
                Voltar para solicitações
              </button>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="detalhes-layout">
      {/* Cabeçalho fixo */}
      <header className="detalhes-header">
        <h1>CondoFix<span>.</span></h1>

        <div className="detalhes-header-user">
          <span>{nomeUsuario}</span>
          <div className="detalhes-avatar">
            {nomeUsuario.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="detalhes-container">
        {/* Menu lateral fixo */}
        <aside className="detalhes-sidebar">
          <span className="detalhes-sidebar-title">MENU</span>

          <button
            className="detalhes-sidebar-link"
            onClick={() => navigate('/')}
          >
            <span>▦</span>
            Painel
          </button>

          <button
            className="detalhes-sidebar-link active"
            onClick={() => navigate('/solicitacoes')}
          >
            <span>▤</span>
            Solicitações
          </button>

          <div className="detalhes-sidebar-bottom">
            <button
              className="detalhes-sidebar-link"
              onClick={handleLogout}
            >
              <span>↪</span>
              Sair
            </button>
          </div>
        </aside>

        {/* Somente esta área terá rolagem */}
        <main className="detalhes-content">
          <div className="detalhes-welcome">
            <div>
              <h2>Detalhes da solicitação</h2>
              <p>Acompanhe as informações e atualizações do serviço.</p>
            </div>
          </div>

          {/* Informações principais */}
          <section className="detalhes-panel">
            <div className="detalhes-panel-heading">
              <h3>{solicitacao.titulo}</h3>
              <span className={`status-badge status-${classeStatus(solicitacao.status)}`}>
                {solicitacao.status}
              </span>
            </div>

            <div className="detalhes-info-section">
              <span className="details-label">Descrição</span>
              <p className="details-description">
                {solicitacao.descricao || 'Nenhuma descrição informada.'}
              </p>
            </div>

            <div className="details-grid">
              <div className="details-field">
                <span className="details-label">Prioridade</span>
                <strong>{solicitacao.prioridade}</strong>
              </div>

              <div className="details-field">
                <span className="details-label">Categoria</span>
                <strong>{solicitacao.categoria}</strong>
              </div>

              <div className="details-field">
                <span className="details-label">Solicitante</span>
                <strong>{solicitacao.solicitante || 'Não informado'}</strong>
              </div>

              <div className="details-field">
                <span className="details-label">Prestador responsável</span>
                <strong>
                  {solicitacao.prestador || 'Ainda não atribuído'}
                </strong>
              </div>

              <div className="details-field">
                <span className="details-label">Data de abertura</span>
                <strong>{formatarData(solicitacao.data_abertura)}</strong>
              </div>

              <div className="details-field">
                <span className="details-label">Data de fechamento</span>
                <strong>{formatarData(solicitacao.data_fechamento)}</strong>
              </div>
            </div>

            {/* Avaliação já registrada */}
            {solicitacao.nota_avaliacao != null && (
              <div className="evaluation-display">
                <h4>Avaliação do serviço</h4>
                <p>
                  <strong>{solicitacao.nota_avaliacao}/5</strong>
                  {' '}
                </p>
                {solicitacao.comentario_avaliacao && (
                  <p>{solicitacao.comentario_avaliacao}</p>
                )}
              </div>
            )}
          </section>

          {/* Cancelamento */}
          {(ehMorador || ehAdministrador) &&
            ['Aberta', 'Atribuida'].includes(solicitacao.status) && (
              <section className="detalhes-panel action-panel">
                <h3>Cancelar solicitação</h3>
                <p>
                  Se não deseja mais continuar com esta solicitação,
                  você pode cancelá-la.
                </p>

                <button
                  className="danger-button"
                  onClick={cancelarSolicitacao}
                  disabled={salvandoCancelamento}
                >
                  {salvandoCancelamento
                    ? 'Cancelando...'
                    : 'Cancelar solicitação'}
                </button>

                {erroCancelamento && (
                  <p className="message-error">{erroCancelamento}</p>
                )}
                {sucessoCancelamento && (
                  <p className="message-success">{sucessoCancelamento}</p>
                )}
              </section>
            )}

          {/* Ação do prestador: iniciar */}
          {ehPrestador && solicitacao.status === 'Atribuida' && (
            <section className="detalhes-panel action-panel">
              <h3>Iniciar serviço</h3>
              <p>Esta solicitação está atribuída a você.</p>

              <button
                className="primary-button"
                onClick={alterarStatus}
                disabled={salvandoStatus}
              >
                {salvandoStatus ? 'Atualizando...' : 'Iniciar serviço'}
              </button>

              {erroStatus && (
                <p className="message-error">{erroStatus}</p>
              )}
              {sucessoStatus && (
                <p className="message-success">{sucessoStatus}</p>
              )}
            </section>
          )}

          {/* Ação do prestador: concluir */}
          {ehPrestador && solicitacao.status === 'Em andamento' && (
            <section className="detalhes-panel action-panel">
              <h3>Concluir serviço</h3>
              <p>
                Informe a solução realizada para registrar a conclusão
                desta solicitação.
              </p>

              <div className="details-form-field">
                <label>Descrição da solução</label>
                <textarea
                  value={descricaoSolucao}
                  onChange={(e) => setDescricaoSolucao(e.target.value)}
                  placeholder="Descreva a solução realizada..."
                  rows={4}
                />
              </div>

              <button
                className="primary-button"
                onClick={concluirServico}
                disabled={salvandoConclusao || !descricaoSolucao.trim()}
              >
                {salvandoConclusao
                  ? 'Concluindo...'
                  : 'Concluir serviço'}
              </button>

              {erroConclusao && (
                <p className="message-error">{erroConclusao}</p>
              )}
              {sucessoConclusao && (
                <p className="message-success">{sucessoConclusao}</p>
              )}
            </section>
          )}

          {/* Avaliação do morador */}
          {ehMorador && solicitacao.status === 'Concluida' && (
            <section className="detalhes-panel action-panel">
              <h3>Avaliar serviço</h3>
              <p>
                O serviço foi concluído. Informe sua nota e, se desejar,
                deixe um comentário sobre o atendimento.
              </p>

              <div className="details-form-field">
                <label>Nota</label>
                <select
                  value={notaAvaliacao}
                  onChange={(e) => setNotaAvaliacao(e.target.value)}
                >
                  <option value="">Selecione uma nota</option>
                  <option value="1">1 - Muito ruim</option>
                  <option value="2">2 - Ruim</option>
                  <option value="3">3 - Regular</option>
                  <option value="4">4 - Bom</option>
                  <option value="5">5 - Muito bom</option>
                </select>
              </div>

              <div className="details-form-field">
                <label>Comentário (opcional)</label>
                <textarea
                  value={comentarioAvaliacao}
                  onChange={(e) => setComentarioAvaliacao(e.target.value)}
                  placeholder="Escreva um comentário sobre o serviço..."
                  rows={4}
                />
              </div>

              <button
                className="primary-button"
                onClick={avaliarServico}
                disabled={salvandoAvaliacao || !notaAvaliacao}
              >
                {salvandoAvaliacao
                  ? 'Enviando avaliação...'
                  : 'Enviar avaliação'}
              </button>

              {erroAvaliacao && (
                <p className="message-error">{erroAvaliacao}</p>
              )}
              {sucessoAvaliacao && (
                <p className="message-success">{sucessoAvaliacao}</p>
              )}
            </section>
          )}

          {/* Ações administrativas */}
          {ehAdministrador && !solicitacaoEncerrada && (
            <section className="detalhes-panel action-panel">
              <h3>Gerenciar solicitação</h3>

              {!editandoPrioridade && !editandoPrestador && (
                <div className="admin-actions">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setNovaPrioridade(solicitacao.prioridade);
                      setEditandoPrioridade(true);
                      setErroPrioridade('');
                      setSucessoPrioridade('');
                    }}
                  >
                    Alterar prioridade
                  </button>

                  <button
                    className="secondary-button"
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
                </div>
              )}

              {editandoPrioridade && (
                <div className="details-form-field">
                  <label>Nova prioridade</label>
                  <select
                    value={novaPrioridade}
                    onChange={(e) => setNovaPrioridade(e.target.value)}
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Normal">Normal</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              )}

              {editandoPrestador && (
                <div className="details-form-field">
                  <label>Prestador responsável</label>

                  {carregandoPrestadores ? (
                    <p>Carregando prestadores...</p>
                  ) : (
                    <select
                      value={novoPrestador}
                      onChange={(e) => setNovoPrestador(e.target.value)}
                    >
                      <option value="">Selecione um prestador</option>
                      {prestadores.map((prestador) => {
                        const jaAtribuido =
                          String(prestador.id) === String(prestadorAtualId);

                        return (
                          <option
                            key={prestador.id}
                            value={prestador.id}
                            disabled={jaAtribuido}
                          >
                            {prestador.nome}
                            {jaAtribuido ? ' (já atribuído)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              )}

              {(editandoPrioridade || editandoPrestador) && (
                <div className="admin-actions">
                  <button
                    className="primary-button"
                    onClick={confirmarAlteracoes}
                    disabled={
                      salvandoPrioridade ||
                      salvandoPrestador ||
                      (editandoPrioridade &&
                        novaPrioridade === solicitacao.prioridade) ||
                      (editandoPrestador &&
                        (
                          !novoPrestador ||
                          String(novoPrestador) === String(prestadorAtualId) ||
                          carregandoPrestadores
                        ))
                    }
                  >
                    {salvandoPrioridade || salvandoPrestador
                      ? 'Salvando...'
                      : 'Confirmar alteração'}
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => {
                      setEditandoPrioridade(false);
                      setEditandoPrestador(false);
                      setNovaPrioridade('');
                      setNovoPrestador('');
                      setErroPrioridade('');
                      setErroPrestador('');
                    }}
                    disabled={salvandoPrioridade || salvandoPrestador}
                  >
                    Voltar
                  </button>
                </div>
              )}

              {erroPrioridade && (
                <p className="message-error">{erroPrioridade}</p>
              )}
              {sucessoPrioridade && (
                <p className="message-success">{sucessoPrioridade}</p>
              )}
              {erroPrestador && (
                <p className="message-error">{erroPrestador}</p>
              )}
              {sucessoPrestador && (
                <p className="message-success">{sucessoPrestador}</p>
              )}
            </section>
          )}

          {/* Histórico */}
          <section className="detalhes-panel">
            <div className="detalhes-panel-heading">
              <h3>Histórico de alterações</h3>
            </div>

            {carregandoHistorico ? (
              <p className="details-empty">Carregando histórico...</p>
            ) : erroHistorico ? (
              <p className="message-error">{erroHistorico}</p>
            ) : historico.length === 0 ? (
              <p className="details-empty">
                Nenhuma alteração registrada.
              </p>
            ) : (
              <div className="history-list">
                {historico.map((alteracao) => (
                  <article className="history-item" key={alteracao.id}>
                    <h4>{alteracao.tipo}</h4>
                    <p>{alteracao.descricao}</p>

                    <div className="history-meta">
                      <span>
                        <strong>Responsável:</strong>{' '}
                        {alteracao.usuario || 'Não informado'}
                      </span>
                      <span>
                        <strong>Data:</strong>{' '}
                        {formatarDataHora(alteracao.data)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
}
