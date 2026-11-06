import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PainelMorador() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.clear();
    navigate('/');
  }

  return (
    <div style={{ padding: '40px' }}>
      <h1>Usuário</h1>
      <button onClick={handleLogout}>Sair</button>
    </div>
  );
}