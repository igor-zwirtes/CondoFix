import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ROTAS = {
  ADMIN: '/admin',
  ADMINISTRADOR: '/administrador',
  USUARIO: '/usuario',
  PRESTADOR_SERVICO: '/prestador_servico'
};

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');

    try {
      const res = await api.post('/api/auth/login', { email: email.trim(), senha });
      const { token, usuario } = res.data?.data || res.data || {};

      if (!token || !usuario) return setErro('Resposta inválida do servidor.');

      localStorage.setItem('@CondoFix:token', token);
      localStorage.setItem('@CondoFix:user', JSON.stringify(usuario));

      const role = usuario.papeis?.[0]?.toUpperCase();
      navigate(ROTAS[role] || '/painel');
    } catch (err) {
      setErro(err.response?.data?.message || 'E-mail ou senha incorretos.');
    }
  }

  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>CondoFix</h1>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} required />
        <button type="submit">Entrar</button>
      </form>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
    </div>
  );
}