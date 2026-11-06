import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function PrivateRoute({ allowedRoles }) {
  const token = localStorage.getItem('@CondoFix:token');
  const user = JSON.parse(localStorage.getItem('@CondoFix:user') || 'null');

  if (!token || !user) return <Navigate to="/" replace />;

  if (allowedRoles) {
    const role = user.papeis?.[0]?.toUpperCase();
    if (!allowedRoles.includes(role)) return <Navigate to="/painel" replace />;
  }

  return <Outlet />;
}