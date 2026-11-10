import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './styles.css';

const FORMULARIO_INICIAL = {
  nome: '',
  email: '',
  telefone: '',
  senha: '',
  papel: 'USUARIO',
  apartamentoId: '',
  cpf: '',
  empresaId: ''
};

export default function Usuarios() {
  const navigate = useNavigate();

  const dadosUsuario = JSON.parse(
    localStorage.getItem('@CondoFix:user') || '{}'
  );

  const nomeUsuario =
    dadosUsuario.nome ||
    dadosUsuario.usrnam ||
    dadosUsuario.name ||
    'Usuário';

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState(FORMULARIO_INICIAL);
  const [apartamentos, setApartamentos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');
  const [sucesso, setSucesso] = useState('');

  async function carregarUsuarios() {
    try {
      setCarregando(true);
      setErro('');

      const resposta = await api.get('/api/usuarios');
      setUsuarios(resposta.data.data || []);
    } catch (error) {
      setErro(
        error.response?.data?.error?.message ||
        'Não foi possível carregar os usuários.'
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  function handleChange(campo, valor) {
    setNovoUsuario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function abrirFormulario() {
    setMostrarFormulario(true);
    setErroFormulario('');
    setSucesso('');

    try {
      const resposta = await api.get('/api/usuarios/opcoes');
      setApartamentos(resposta.data.data.apartamentos || []);
      setEmpresas(resposta.data.data.empresas || []);
    } catch (error) {
      setErroFormulario(
        error.response?.data?.error?.message ||
        'Não foi possível carregar os dados do formulário.'
      );
    }
  }

  function fecharFormulario() {
    setMostrarFormulario(false);
    setNovoUsuario(FORMULARIO_INICIAL);
    setErroFormulario('');
  }

  async function handleCriarUsuario(e) {
    e.preventDefault();
    setErroFormulario('');
    setSucesso('');

    const dados = {
      nome: novoUsuario.nome.trim(),
      email: novoUsuario.email.trim(),
      telefone: novoUsuario.telefone.trim() || undefined,
      senha: novoUsuario.senha,
      papel: novoUsuario.papel
    };

    if (novoUsuario.papel === 'USUARIO') {
      dados.apartamentoId = Number(novoUsuario.apartamentoId);
    }

    if (novoUsuario.papel === 'PRESTADOR_SERVICO') {
      dados.cpf = novoUsuario.cpf.replace(/\D/g, '');

      if (novoUsuario.empresaId) {
        dados.empresaId = Number(novoUsuario.empresaId);
      }
    }

    try {
      setEnviando(true);

      const resposta = await api.post('/api/usuarios', dados);

      fecharFormulario();
      setSucesso(resposta.data.message || 'Usuário cadastrado com sucesso.');
      carregarUsuarios();
    } catch (error) {
      setErroFormulario(
        error.response?.data?.error?.message ||
        'Não foi possível cadastrar o usuário.'
      );
    } finally {
      setEnviando(false);
    }
  }

  function formatarPapel(papeis = []) {
    const nomesPapeis = {
      ADMIN: 'Admin',
      ADMINISTRADOR: 'Administrador',
      USUARIO: 'Morador',
      PRESTADOR_SERVICO: 'Prestador de Serviço'
    };

    return papeis
      .map((papel) => nomesPapeis[papel] || papel)
      .join(', ') || '-';
  }

  function handleLogout() {
    localStorage.removeItem('@CondoFix:token');
    localStorage.removeItem('@CondoFix:user');
    navigate('/');
  }

  return (
    <div className="usuarios-layout">

      {/* Cabeçalho */}
      <header className="usuarios-header">
        <h1>CondoFix<span>.</span></h1>

        <div className="usuarios-header-user">
          <span>{nomeUsuario}</span>

          <div className="usuarios-avatar">
            {nomeUsuario.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="usuarios-container">

        {/* Menu lateral */}
        <aside className="usuarios-sidebar">
          <span className="usuarios-sidebar-title">MENU</span>

          <button
            className="usuarios-sidebar-link"
            onClick={() => navigate('/administrador')}
          >
            <span>▦</span>
            Painel
          </button>

          <button
            className="usuarios-sidebar-link"
            onClick={() => navigate('/dashboard')}
          >
            <span>▥</span>
            Dashboard
          </button>

          <button
            className="usuarios-sidebar-link"
            onClick={() => navigate('/solicitacoes')}
          >
            <span>▤</span>
            Solicitações
          </button>

          <button className="usuarios-sidebar-link active">
            <span>◎</span>
            Usuários
          </button>

          <div className="usuarios-sidebar-bottom">
            <button
              className="usuarios-sidebar-link"
              onClick={handleLogout}
            >
              <span>↪</span>
              Sair
            </button>
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main className="usuarios-content">

          <div className="usuarios-welcome">
            <div>
              <h2>Gerenciamento de usuários</h2>

              <p>
                Cadastre e consulte os usuários do sistema.
              </p>
            </div>

            <div className="usuarios-welcome-actions">
              <button
                className="usuarios-refresh"
                onClick={mostrarFormulario ? fecharFormulario : abrirFormulario}
              >
                + Novo usuário
              </button>
            </div>
          </div>

          {sucesso && (
            <p className="usuarios-form-success">{sucesso}</p>
          )}

          {/* Formulário de cadastro */}
          {mostrarFormulario && (
            <section className="usuarios-panel usuarios-form-panel">

              <div className="usuarios-panel-heading">
                <h3>Novo usuário</h3>

                <button
                  type="button"
                  className="usuarios-close-form"
                  onClick={fecharFormulario}
                >
                  Fechar
                </button>
              </div>

              <form onSubmit={handleCriarUsuario} className="usuarios-form">
                <div className="usuarios-form-grid">

                  <div className="usuarios-field">
                    <label>Nome</label>
                    <input
                      type="text"
                      value={novoUsuario.nome}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      maxLength={255}
                      placeholder="Ex.: Maria Souza"
                      required
                    />
                  </div>

                  <div className="usuarios-field">
                    <label>E-mail</label>
                    <input
                      type="email"
                      value={novoUsuario.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      maxLength={255}
                      placeholder="Ex.: maria@email.com"
                      required
                    />
                  </div>

                  <div className="usuarios-field">
                    <label>Telefone</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={novoUsuario.telefone}
                      onChange={(e) =>
                        handleChange(
                          'telefone',
                          e.target.value.replace(/\D/g, '').slice(0, 11)
                        )
                      }
                      maxLength={11}
                      minLength={11}
                      pattern="\d{11}"
                      title="Informe 11 dígitos (DDD + número)"
                      placeholder="Ex.: 21999999999"
                      required
                    />
                  </div>

                  <div className="usuarios-field">
                    <label>Senha</label>
                    <input
                      type="password"
                      value={novoUsuario.senha}
                      onChange={(e) => handleChange('senha', e.target.value)}
                      placeholder="Digite a senha"
                      required
                    />
                  </div>

                  <div className="usuarios-field">
                    <label>Perfil</label>
                    <select
                      value={novoUsuario.papel}
                      onChange={(e) => handleChange('papel', e.target.value)}
                      required
                    >
                      <option value="USUARIO">Morador</option>
                      <option value="PRESTADOR_SERVICO">Prestador de Serviço</option>
                      <option value="ADMINISTRADOR">Administrador</option>
                    </select>
                  </div>

                  {novoUsuario.papel === 'USUARIO' && (
                    <div className="usuarios-field">
                      <label>Apartamento</label>
                      <select
                        value={novoUsuario.apartamentoId}
                        onChange={(e) =>
                          handleChange('apartamentoId', e.target.value)
                        }
                        required
                      >
                        <option value="">Selecione um apartamento</option>

                        {apartamentos.map((apt) => (
                          <option key={apt.id} value={apt.id}>
                            Bloco {apt.bloco} - Andar {apt.andar} - Apto {apt.numero}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {novoUsuario.papel === 'PRESTADOR_SERVICO' && (
                    <>
                      <div className="usuarios-field">
                        <label>CPF</label>
                        <input
                          type="text"
                          value={novoUsuario.cpf}
                          onChange={(e) => handleChange('cpf', e.target.value)}
                          maxLength={14}
                          placeholder="Somente números"
                          required
                        />
                      </div>

                      <div className="usuarios-field">
                        <label>Empresa (opcional)</label>
                        <select
                          value={novoUsuario.empresaId}
                          onChange={(e) =>
                            handleChange('empresaId', e.target.value)
                          }
                        >
                          <option value="">Sem empresa</option>

                          {empresas.map((empresa) => (
                            <option key={empresa.id} value={empresa.id}>
                              {empresa.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {erroFormulario && (
                  <p className="usuarios-form-error">{erroFormulario}</p>
                )}

                <button
                  type="submit"
                  className="usuarios-refresh"
                  disabled={enviando}
                >
                  {enviando ? 'Cadastrando...' : 'Cadastrar usuário'}
                </button>
              </form>

            </section>
          )}

          {/* Listagem */}
          <section className="usuarios-panel">

            <div className="usuarios-panel-heading">
              <h3>Todos os usuários</h3>

              <span className="usuarios-count">
                {usuarios.length}
                {' '}
                {usuarios.length === 1 ? 'usuário' : 'usuários'}
              </span>
            </div>

            {carregando ? (
              <p className="usuarios-message">
                Carregando usuários...
              </p>
            ) : erro ? (
              <p className="usuarios-message usuarios-error">
                {erro}
              </p>
            ) : usuarios.length === 0 ? (
              <p className="usuarios-message">
                Nenhum usuário encontrado.
              </p>
            ) : (
              <div className="usuarios-table-container">
                <table className="usuarios-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Telefone</th>
                      <th>Perfil</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {usuarios.map((usuario) => (
                      <tr key={usuario.id}>
                        <td className="usuarios-name">
                          {usuario.nome}
                        </td>

                        <td>{usuario.email}</td>

                        <td>{usuario.telefone || '-'}</td>

                        <td>{formatarPapel(usuario.papeis)}</td>

                        <td>
                          <span
                            className={`usuarios-status ${
                              usuario.ativo
                                ? 'usuario-ativo'
                                : 'usuario-inativo'
                            }`}
                          >
                            {usuario.ativo ? 'Ativo' : 'Desativado'}
                          </span>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </section>

        </main>
      </div>
    </div>
  );
}