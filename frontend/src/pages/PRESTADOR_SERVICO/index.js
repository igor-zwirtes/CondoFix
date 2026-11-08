import React from 'react';
import { useNavigate } from 'react-router-dom';

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

  function handleLogout() {
    localStorage.clear();
    navigate('/');
  }

  return (
    <div style={{ padding: '40px' }}>
      <h1>Prestador de Serviço</h1>

      <h2>Bem-vindo, {nomeUsuario}!</h2>

      <button onClick={() => navigate('/solicitacoes')}>
        Consultar serviços atribuídos
      </button>

      <button onClick={handleLogout}>Sair</button>
    </div>
  );
}