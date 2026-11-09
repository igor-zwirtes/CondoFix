import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './styles.css';

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
      const res = await api.post('/api/auth/login', {
        email: email.trim(),
        senha
      });

      const { token, usuario } = res.data?.data || res.data || {};

      if (!token || !usuario) {
        return setErro('Resposta inválida do servidor.');
      }

      localStorage.setItem('@CondoFix:token', token);
      localStorage.setItem('@CondoFix:user', JSON.stringify(usuario));

      const role = usuario.papeis?.[0]?.toUpperCase();
      navigate(ROTAS[role] || '/painel');

    } catch (err) {
      setErro(err.response?.data?.message || 'E-mail ou senha incorretos.');
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">

        <h1 className="login-logo">
          CondoFix<span>.</span>
        </h1>

        <div className="login-heading">
          <h2>Bem-vindo!</h2>
          <p>Entre na sua conta para continuar.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">

          <div className="login-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
            />
          </div>

          {erro && (
            <p className="login-error">{erro}</p>
          )}

          <button type="submit" className="login-button">
            Entrar
          </button>

        </form>
      </section>
    </main>
  );
}
