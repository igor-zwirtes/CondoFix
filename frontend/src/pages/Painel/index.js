import React from 'react';
import { Navigate } from 'react-router-dom';

const ROTAS = {
  ADMIN: '/admin',
  ADMINISTRADOR: '/administrador',
  USUARIO: '/usuario',
  PRESTADOR_SERVICO: '/prestador_servico'
};

export default function Painel() {
  const user = JSON.parse(localStorage.getItem('@CondoFix:user') || 'null');
  if (!user) return <Navigate to="/" replace />;

  const role = user.papeis?.[0]?.toUpperCase();
  return <Navigate to={ROTAS[role] || '/'} replace />;
}