
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

  // Estados da avaliação do serviço.
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

  // Identificar solicitações que não permitem mais alterações administrativas.
  const solicitacaoEncerrada = [
    'Concluida',
    'Cancelada',
    'Finalizada'
  ].includes(solicitacao?.status);

  // Obter o ID do prestador atualmente atribuído.
  const prestadorAtualId =
    solicitacao?.prestadorId ??
    solicitacao?.pvdid ??
    solicitacao?.prestador_id ??
    null;

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

  // Carregar os prestadores disponíveis.
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

  // Alterar a prioridade.
  async function alterarPrioridade() {
    setErroPrioridade('');
    setSucessoPrioridade('');

    if (solicitacaoEncerrada) {
      return;
    }

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

  // Atualizar o status da solicitação.
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
        const respostaHistorico = await api.get(
          `/api/solicitacoes/${id}/historico`
        );

        setHistorico(respostaHistorico.data.data);
        setErroHistorico('');
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

  // Cancelar a solicitação.
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

    if (!confirmar) {
        return;
    }

    try {
        setSalvandoCancelamento(true);

        await api.patch(`/api/solicitacoes/${id}/cancelar`);

        const resposta = await api.get(`/api/solicitacoes/${id}`);
        setSolicitacao(resposta.data.data);

        const respostaHistorico = await api.get(
        `/api/solicitacoes/${id}/historico`
        );
        setHistorico(respostaHistorico.data.data);

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

  // Registrar a conclusão do serviço.
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

      const resposta = await api.get(`/api/solicitacoes/${id}`);
      setSolicitacao(resposta.data.data);

      const respostaHistorico = await api.get(
        `/api/solicitacoes/${id}/historico`
      );

      setHistorico(respostaHistorico.data.data);
      setErroHistorico('');

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

  // Registrar a avaliação do serviço pelo morador.
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

      // Atualizar os detalhes após a avaliação.
      const resposta = await api.get(`/api/solicitacoes/${id}`);
      setSolicitacao(resposta.data.data);

      // Atualizar o histórico.
      const respostaHistorico = await api.get(
        `/api/solicitacoes/${id}/historico`
      );

      setHistorico(respostaHistorico.data.data);
      setErroHistorico('');

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

  // Atribuir ou trocar o prestador.
  async function atribuirPrestador() {
    setErroPrestador('');
    setSucessoPrestador('');

    if (solicitacaoEncerrada) {
      return;
    }

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

      const resposta = await api.get(`/api/solicitacoes/${id}`);
      setSolicitacao(resposta.data.data);

      const respostaHistorico = await api.get(
        `/api/solicitacoes/${id}/historico`
      );
      setHistorico(respostaHistorico.data.data);

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

  // Confirmar a alteração que estiver sendo realizada.
  async function confirmarAlteracoes() {
    if (editandoPrioridade) {
      await alterarPrioridade();
    } else if (editandoPrestador) {
      await atribuirPrestador();
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

        {/* Cancelamento de solicitação */}
        {(ehMorador || ehAdministrador) &&
        ['Aberta', 'Atribuida'].includes(solicitacao.status) && (
            <div style={{ marginTop: '15px', marginBottom: '15px' }}>
            <button
                onClick={cancelarSolicitacao}
                disabled={salvandoCancelamento}
            >
                {salvandoCancelamento ? 'Cancelando...' : 'Cancelar solicitação'}
            </button>

            {erroCancelamento && (
                <p style={{ color: 'red' }}>{erroCancelamento}</p>
            )}

            {sucessoCancelamento && (
                <p style={{ color: 'green' }}>{sucessoCancelamento}</p>
            )}
            </div>
        )}

        {/* Exibir avaliação registrada pelo morador */}
        {solicitacao.nota_avaliacao != null && (
        <div style={{ marginTop: '15px', marginBottom: '15px' }}>
            <p>
            <strong>Avaliação do serviço:</strong>{' '}
            {solicitacao.nota_avaliacao}/5
            </p>

            {solicitacao.comentario_avaliacao && (
            <p>
                <strong>Comentário:</strong>{' '}
                {solicitacao.comentario_avaliacao}
            </p>
            )}
        </div>
        )}

        {/* Atualização de status pelo prestador */}
        {ehPrestador && solicitacao.status === 'Atribuida' && (
          <div style={{ marginTop: '15px', marginBottom: '15px' }}>
            <p>Esta solicitação está atribuída a você</p>

            <button
              onClick={alterarStatus}
              disabled={salvandoStatus}
            >
              {salvandoStatus ? 'Atualizando...' : 'Iniciar serviço'}
            </button>

            {erroStatus && (
              <p style={{ color: 'red' }}>{erroStatus}</p>
            )}

            {sucessoStatus && (
              <p style={{ color: 'green' }}>{sucessoStatus}</p>
            )}
          </div>
        )}

        {/* Registro da conclusão pelo prestador */}
        {ehPrestador && solicitacao.status === 'Em andamento' && (
          <div
            style={{
              marginTop: '20px',
              marginBottom: '20px',
              padding: '15px',
              border: '1px solid #cccccc',
              borderRadius: '8px'
            }}
          >
            <h3>Concluir serviço</h3>

            <p>
              Informe a solução realizada para registrar a conclusão
              desta solicitação.
            </p>

            <textarea
              value={descricaoSolucao}
              onChange={(e) => setDescricaoSolucao(e.target.value)}
              placeholder="Descreva a solução realizada..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '10px',
                marginBottom: '10px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />

            <button
              onClick={concluirServico}
              disabled={salvandoConclusao || !descricaoSolucao.trim()}
            >
              {salvandoConclusao
                ? 'Concluindo...'
                : 'Concluir serviço'}
            </button>

            {erroConclusao && (
              <p style={{ color: 'red' }}>{erroConclusao}</p>
            )}

            {sucessoConclusao && (
              <p style={{ color: 'green' }}>{sucessoConclusao}</p>
            )}
          </div>
        )}

        {/* Avaliação do serviço pelo morador */}
        {ehMorador && solicitacao.status === 'Concluida' && (
          <div
            style={{
              marginTop: '20px',
              marginBottom: '20px',
              padding: '15px',
              border: '1px solid #cccccc',
              borderRadius: '8px'
            }}
          >
            <h3>Avaliar serviço</h3>

            <p>
              O serviço foi concluído. Informe sua nota e, se desejar,
              deixe um comentário sobre o atendimento.
            </p>

            <label>
              <strong>Nota:</strong>
            </label>

            <select
              value={notaAvaliacao}
              onChange={(e) => setNotaAvaliacao(e.target.value)}
              style={{
                display: 'block',
                marginTop: '8px',
                marginBottom: '15px',
                padding: '8px'
              }}
            >
              <option value="">Selecione uma nota</option>
              <option value="1">1 - Muito ruim</option>
              <option value="2">2 - Ruim</option>
              <option value="3">3 - Regular</option>
              <option value="4">4 - Bom</option>
              <option value="5">5 - Muito bom</option>
            </select>

            <label>
              <strong>Comentário (opcional):</strong>
            </label>

            <textarea
              value={comentarioAvaliacao}
              onChange={(e) => setComentarioAvaliacao(e.target.value)}
              placeholder="Escreva um comentário sobre o serviço..."
              rows={4}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px',
                marginTop: '8px',
                marginBottom: '10px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />

            <button
              onClick={avaliarServico}
              disabled={salvandoAvaliacao || !notaAvaliacao}
            >
              {salvandoAvaliacao
                ? 'Enviando avaliação...'
                : 'Enviar avaliação'}
            </button>

            {erroAvaliacao && (
              <p style={{ color: 'red' }}>{erroAvaliacao}</p>
            )}
          </div>
        )}

        {/* Mensagem de sucesso fora do formulário, pois ele desaparece após a avaliação */}
        {sucessoAvaliacao && (
          <p style={{ color: 'green' }}>{sucessoAvaliacao}</p>
        )}

        {/* Prioridade */}
        <div style={{ marginTop: '15px', marginBottom: '15px' }}>
          <p>
            <strong>Prioridade:</strong> {solicitacao.prioridade}
          </p>

          {ehAdministrador &&
            !solicitacaoEncerrada &&
            !editandoPrioridade &&
            !editandoPrestador && (
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

          {ehAdministrador &&
            !solicitacaoEncerrada &&
            editandoPrioridade && (
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
                  onClick={() => {
                    setEditandoPrioridade(false);
                    setNovaPrioridade('');
                    setErroPrioridade('');
                  }}
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

        {/* Prestador responsável */}
        <div style={{ marginTop: '15px', marginBottom: '15px' }}>
          <p>
            <strong>Prestador responsável:</strong>{' '}
            {solicitacao.prestador || 'Ainda não atribuído'}
          </p>

          {ehAdministrador &&
            !solicitacaoEncerrada &&
            !editandoPrestador &&
            !editandoPrioridade && (
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

          {ehAdministrador &&
            !solicitacaoEncerrada &&
            editandoPrestador && (
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

      {/* Botão único para confirmar alterações */}
      {ehAdministrador &&
        !solicitacaoEncerrada &&
        (editandoPrioridade || editandoPrestador) && (
          <button
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
            style={{ marginTop: '15px' }}
          >
            {salvandoPrioridade || salvandoPrestador
              ? 'Salvando...'
              : 'Confirmar alteração'}
          </button>
        )}

      <div style={{ marginTop: '35px' }}>
        <h2>Histórico de alterações</h2>

        {carregandoHistorico && (
          <p>Carregando histórico...</p>
        )}

        {erroHistorico && (
          <p style={{ color: 'red' }}>{erroHistorico}</p>
        )}

        {!carregandoHistorico &&
          !erroHistorico &&
          historico.length === 0 && (
            <p>Nenhuma alteração registrada.</p>
          )}

        {!carregandoHistorico && historico.length > 0 && (
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
