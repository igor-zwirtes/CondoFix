import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './styles.css';

export default function PainelMorador() {
  const navigate = useNavigate();

  const dadosUsuario = JSON.parse(
    localStorage.getItem('@CondoFix:user') || '{}'
  );

  const nomeUsuario =
    dadosUsuario.nome ||
    dadosUsuario.usrnam ||
    dadosUsuario.name ||
    'Usuário';

  const [solicitacoes, setSolicitacoes] = useState([]);
  const [apartamento, setApartamento] = useState(null);
  const [categorias, setCategorias] = useState([]);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [erro, setErro] = useState('');
  const [erroLista, setErroLista] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Carregar apartamento e categorias.
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

  // Carregar solicitações do morador.
  useEffect(() => {
    async function carregarSolicitacoes() {
      try {
        const resposta = await api.get('/api/solicitacoes');
        setSolicitacoes(resposta.data.data);
      } catch (error) {
        setErroLista(
          error.response?.data?.error?.message ||
          'Não foi possível carregar suas solicitações.'
        );
      } finally {
        setCarregandoSolicitacoes(false);
      }
    }

    carregarSolicitacoes();
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

      const resposta = await api.get('/api/solicitacoes');
      setSolicitacoes(resposta.data.data);

      setSucesso('Solicitação criada com sucesso!');

      setTitulo('');
      setDescricao('');
      setCategoriaId('');

      setMostrarFormulario(false);

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

  function formatarData(data) {
    if (!data) return 'Data não informada';

    return new Date(data).toLocaleDateString('pt-BR');
  }

  function classeStatus(status = '') {
    return status
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  const solicitacoesRecentes = solicitacoes.slice(0, 3);

  return (
    <div className="morador-layout">

      {/* Cabeçalho */}
      <header className="morador-header">
        <h1>CondoFix<span>.</span></h1>

        <div className="morador-header-user">
          <span className="morador-user-name">{nomeUsuario}</span>

          <div className="morador-avatar">
            {nomeUsuario.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="morador-container">

        {/* Menu lateral */}
        <aside className="morador-sidebar">
          <span className="sidebar-title">MENU</span>

          <button className="sidebar-link active">
            <span>▦</span>
            Painel
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate('/solicitacoes')}
          >
            <span>▤</span>
            Solicitações
          </button>

          <div className="sidebar-bottom">
            <button
              className="sidebar-link"
              onClick={handleLogout}
            >
              <span>↪</span>
              Sair
            </button>
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main className="morador-content">

          <div className="morador-welcome">
            <div>
              <h2>Olá, {nomeUsuario}!</h2>
              <p>Acompanhe o que acontece no condomínio.</p>
            </div>

            <button
              className="new-request-button"
              onClick={() => {
                setMostrarFormulario(!mostrarFormulario);
                setErro('');
                setSucesso('');
              }}
            >
              + Nova solicitação
            </button>
          </div>

          {/* Formulário de criação */}
          {mostrarFormulario && (
            <section className="morador-panel request-form-panel">
              <div className="panel-heading">
                <h3>Nova solicitação</h3>

                <button
                  className="close-form-button"
                  onClick={() => setMostrarFormulario(false)}
                >
                  Fechar
                </button>
              </div>

              {carregando ? (
                <p>Carregando dados do formulário...</p>
              ) : (
                <form
                  onSubmit={handleCriarSolicitacao}
                  className="morador-form"
                >
                  <div className="form-field">
                    <label>Título</label>
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      maxLength={255}
                      placeholder="Ex.: Vazamento na cozinha"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Descrição do problema</label>
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descreva o problema encontrado..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Categoria</label>
                    <select
                      value={categoriaId}
                      onChange={(e) => setCategoriaId(e.target.value)}
                      required
                    >
                      <option value="">Selecione uma categoria</option>

                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Localização</label>
                    <input
                      type="text"
                      value={
                        apartamento
                          ? `Bloco ${apartamento.bloco} - Andar ${apartamento.andar} - Apartamento ${apartamento.numero}`
                          : ''
                      }
                      readOnly
                    />
                  </div>

                  {erro && <p className="form-error">{erro}</p>}

                  <button
                    type="submit"
                    className="new-request-button"
                    disabled={enviando || !apartamento}
                  >
                    {enviando ? 'Enviando...' : 'Criar solicitação'}
                  </button>
                </form>
              )}
            </section>
          )}

          {sucesso && (
            <p className="form-success">{sucesso}</p>
          )}

          {/* Solicitações recentes */}
          <section className="morador-panel">
            <div className="panel-heading">
              <h3>Solicitações recentes</h3>
            </div>

            {carregandoSolicitacoes ? (
              <p>Carregando solicitações...</p>
            ) : erroLista ? (
              <p className="form-error">{erroLista}</p>
            ) : solicitacoesRecentes.length === 0 ? (
              <p className="empty-message">
                Você ainda não possui solicitações.
              </p>
            ) : (
              <div className="recent-list">
                {solicitacoesRecentes.map((solicitacao) => (
                  <button
                    type="button"
                    className="recent-item"
                    key={solicitacao.id}
                    onClick={() => navigate(`/solicitacoes/${solicitacao.id}`)}
                  >
                    <div className="recent-info">
                      <h4>{solicitacao.titulo}</h4>
                      <span>
                        {solicitacao.categoria} · {formatarData(solicitacao.data_abertura)}
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
