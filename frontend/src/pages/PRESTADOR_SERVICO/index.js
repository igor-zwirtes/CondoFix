
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles.css';

export default function PainelPrestador() {
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

  function handleLogout() {
    localStorage.removeItem('@CondoFix:token');
    localStorage.removeItem('@CondoFix:user');
    navigate('/');
  }

  return (
    <div className="prestador-layout">
      <header className="prestador-header">
        <h1>
          CondoFix<span>.</span>
        </h1>

        <div className="prestador-header-user">
          <span>{nomeUsuario}</span>
          <div className="prestador-avatar">{inicial}</div>
        </div>
      </header>

      <div className="prestador-container">
        <aside className="prestador-sidebar">
          <span className="prestador-sidebar-title">MENU</span>

          <button className="prestador-sidebar-link active">
            <span>▦</span>
            Painel
          </button>

          <button
            className="prestador-sidebar-link"
            onClick={() => navigate('/solicitacoes')}
          >
            <span>▤</span>
            Solicitações
          </button>

          <div className="prestador-sidebar-bottom">
            <button
              className="prestador-sidebar-link"
              onClick={handleLogout}
            >
              <span>↪</span>
              Sair
            </button>
          </div>
        </aside>

        <main className="prestador-content">
          <section className="prestador-welcome">
            <div>
              <h2>Bem-vindo, {nomeUsuario}!</h2>
              <p>
                Acompanhe os serviços atribuídos a você e atualize
                o andamento dos atendimentos.
              </p>
            </div>
          </section>

          <section className="prestador-cards">
            <div className="prestador-card">
              <div className="prestador-card-icon">▤</div>

              <div>
                <h3>Meus serviços</h3>
                <p>
                  Consulte os serviços atribuídos a você,
                  acompanhe suas prioridades e visualize os
                  detalhes de cada solicitação.
                </p>
              </div>

              <button
                className="prestador-card-button"
                onClick={() => navigate('/solicitacoes')}
              >
                Consultar serviços
                <span>→</span>
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
