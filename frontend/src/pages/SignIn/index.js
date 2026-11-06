import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();

    try {
      setErro('');

      
      const response = await api.post('/api/auth/login', { 
      email: email.trim(), 
      senha 
      });

      const token = response.data?.data?.token || response.data?.token;

      if (token) {
        localStorage.setItem('@CondoFix:token', token);
      }

      navigate('/painel'); 
    } catch (error) {
      const mensagemErro = error.response?.data?.error?.message || 'Dados inválidos';
      setErro(mensagemErro);
    }
  }

  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>CondoFix</h1>
      <h2>Iniciar Sessão</h2>
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="E-mail" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <input 
          type="password" 
          placeholder="Senha" 
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        
        <button type="submit">Entrar</button>
      </form>

      {erro && <p style={{ color: 'red' }}>{erro}</p>}
    </div>
  );
}