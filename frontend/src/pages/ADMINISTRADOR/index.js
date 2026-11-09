import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles.css';

export default function PainelSindico() {
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
    <div className="sindico-layout">
      <header className="sindico-header">
        <h1>
          CondoFix<span>.</span>
        </h1>

        <div className="sindico-header-user">
          <span>{nomeUsuario}</span>
          <div className="sindico-avatar">{inicial}</div>
        </div>
      </header>

      <div className="sindico-container">
        <aside className="sindico-sidebar">
          <span className="sindico-sidebar-title">MENU</span>

          <button className="sindico-sidebar-link active">
            <span>▦</span>
            Painel
          </button>

          <button
            className="sindico-sidebar-link"
            onClick={() => navigate('/solicitacoes')}
          >
            <span>▤</span>
            Solicitações
          </button>

          <div className="sindico-sidebar-bottom">
            <button
              className="sindico-sidebar-link"
              onClick={handleLogout}
            >
              <span>↪</span>
              Sair
            </button>
          </div>
        </aside>

        <main className="sindico-content">
          <section className="sindico-welcome">
            <div>
              <h2>Bem-vindo, {nomeUsuario}!</h2>
              <p>
                Acompanhe e gerencie as solicitações do seu condomínio.
              </p>
            </div>
          </section>

          <section className="sindico-cards">
            <div className="sindico-card">
              <div className="sindico-card-icon">▤</div>

              <div>
                <h3>Solicitações</h3>
                <p>
                  Consulte as solicitações de manutenção e acompanhe seus status.
                </p>
              </div>

              <button
                className="sindico-card-button"
                onClick={() => navigate('/solicitacoes')}
              >
                Ver solicitações
                <span>→</span>
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
