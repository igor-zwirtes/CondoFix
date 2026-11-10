import React from 'react';
import { Routes, Route } from 'react-router-dom';

import SignIn from '../pages/SignIn';
import Painel from '../pages/Painel';
import Admin from '../pages/ADMIN';
import Administrador from '../pages/ADMINISTRADOR';
import Usuario from '../pages/USUARIO';
import PrestadorServico from '../pages/PRESTADOR_SERVICO';
import PrivateRoute from './PrivateRoute';
import Solicitacoes from '../pages/Solicitacoes';
import SolicitacaoDetalhes from '../pages/SolicitacaoDetalhes';
import Usuarios from '../pages/Usuarios';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SignIn />} />

      <Route element={<PrivateRoute />}>
        <Route path="/painel" element={<Painel />} />
        <Route path="/solicitacoes" element={<Solicitacoes />} />
        <Route path="/solicitacoes/:id" element={<SolicitacaoDetalhes />}/>
      </Route>

      <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin" element={<Admin />} />
        <Route path="/usuarios" element={<Usuarios />} />
      </Route>

      <Route element={<PrivateRoute allowedRoles={['ADMINISTRADOR']} />}>
        <Route path="/administrador" element={<Administrador />} />
      </Route>

      <Route element={<PrivateRoute allowedRoles={['USUARIO']} />}>
        <Route path="/usuario" element={<Usuario />} />
      </Route>

      <Route element={<PrivateRoute allowedRoles={['PRESTADOR_SERVICO']} />}>
        <Route path="/prestador_servico" element={<PrestadorServico />} />
      </Route>
      
    </Routes>
  );
}