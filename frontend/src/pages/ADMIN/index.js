import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles.css';

export default function PainelAdmin() {
  const navigate = useNavigate();

  const dadosUsuario = JSON.parse(
    localStorage.getItem('@CondoFix:user') || '{}'
  );

  const nomeUsuario =
    dadosUsuario.nome ||
    dadosUsuario.usrnam ||
    dadosUsuario.name ||
    'Usuário';

  function handleLogout() {
    localStorage.removeItem('@CondoFix:token');
    localStorage.removeItem('@CondoFix:user');
    navigate('/');
  }

  return (
    <div className="admin-layout">

      {/* Cabeçalho */}
      <header className="admin-header">
        <h1>CondoFix<span>.</span></h1>

        <div className="admin-header-user">
          <span>{nomeUsuario}</span>

          <div className="admin-avatar">
            {nomeUsuario.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="admin-container">

        {/* Menu lateral */}
        <aside className="admin-sidebar">
          <span className="admin-sidebar-title">MENU</span>

          <button className="admin-sidebar-link active">
            <span>▦</span>
            Painel
          </button>

          <button
            className="admin-sidebar-link"
            onClick={() => navigate('/dashboard')}
          >
            <span>▥</span>
            Dashboard
          </button>

          <button
            className="admin-sidebar-link"
            onClick={() => navigate('/solicitacoes')}
          >
            <span>▤</span>
            Solicitações
          </button>

          <button
            className="admin-sidebar-link"
            onClick={() => navigate('/usuarios')}
          >
            <span>◎</span>
            Usuários
          </button>

          <div className="admin-sidebar-bottom">
            <button
              className="admin-sidebar-link"
              onClick={handleLogout}
            >
              <span>↪</span>
              Sair
            </button>
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main className="admin-content">

          <div className="admin-welcome">
            <div>
              <h2>Bem-vindo, {nomeUsuario}!</h2>

              <p>
                Gerencie as solicitações e os usuários do condomínio.
              </p>
            </div>
          </div>

          {/* Acessos administrativos */}
          <section className="admin-section">

            <div className="admin-section-heading">
              <h3>Área administrativa</h3>
            </div>

            <div className="admin-cards">

              <button
                className="admin-card"
                onClick={() => navigate('/solicitacoes')}
              >
                <div className="admin-card-icon">▤</div>

                <div className="admin-card-info">
                  <h4>Solicitações</h4>

                  <p>
                    Consulte e acompanhe as solicitações de manutenção.
                  </p>
                </div>

                <span className="admin-card-arrow">→</span>
              </button>

              <button
                className="admin-card"
                onClick={() => navigate('/dashboard')}
              >
                <div className="admin-card-icon">▥</div>

                <div className="admin-card-info">
                  <h4>Dashboard</h4>

                  <p>
                    Veja os indicadores das solicitações e o desempenho dos
                    prestadores de serviço.
                  </p>
                </div>

                <span className="admin-card-arrow">→</span>
              </button>

              <button
                className="admin-card"
                onClick={() => navigate('/usuarios')}
              >
                <div className="admin-card-icon">◎</div>

                <div className="admin-card-info">
                  <h4>Gerenciar usuários</h4>

                  <p>
                    Consulte os usuários cadastrados no sistema.
                  </p>
                </div>

                <span className="admin-card-arrow">→</span>
              </button>

            </div>
          </section>

        </main>
      </div>
    </div>
  );
}