import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PainelPrestador() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.clear();
    navigate('/');
  }

  return (
    <div style={{ padding: '40px' }}>
      <h1>Prestador de Serviço</h1>
      <button onClick={handleLogout}>Sair</button>
    </div>
  );
}