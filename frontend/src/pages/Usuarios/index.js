import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './styles.css';

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
                Consulte os usuários cadastrados no sistema.
              </p>
            </div>

            <button
              className="usuarios-refresh"
              onClick={carregarUsuarios}
              disabled={carregando}
            >
              Atualizar lista
            </button>
          </div>

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