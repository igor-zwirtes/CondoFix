import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Usuarios() {
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  async function carregarUsuarios() {
    try {
      setCarregando(true);
      setErro('');

      const resposta = await api.get('/api/usuarios');
      setUsuarios(resposta.data.data);
    } catch (error) {
      setErro(
        error.response?.data?.error?.message ||
        'Não foi possível carregar os usuários.'
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  function formatarPapel(papeis) {
  const nomesPapeis = {
    ADMIN: 'Admin',
    ADMINISTRADOR: 'Administrador',
    USUARIO: 'Morador',
    PRESTADOR_SERVICO: 'Prestador de Serviço'
  };

  return papeis
    .map((papel) => nomesPapeis[papel] || papel)
    .join(', ');
}

  return (
    <div style={{ padding: '40px' }}>
      <h1>Gerenciamento de usuários</h1>

      <button onClick={() => navigate('/administrador')}>
        Voltar ao painel
      </button>

      <button onClick={carregarUsuarios}>
        Atualizar lista
      </button>

      {carregando && <p>Carregando usuários...</p>}

      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      {!carregando && !erro && (
        <table
          border="1"
          cellPadding="10"
          style={{
            borderCollapse: 'collapse',
            marginTop: '20px',
            width: '100%'
          }}
        >
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td>{usuario.nome}</td>
                <td>{usuario.email}</td>
                <td>{usuario.telefone || '-'}</td>
                <td>{formatarPapel(usuario.papeis)}</td>
                <td>{usuario.ativo ? 'Ativo' : 'Desativado'}</td>
                <td>
                  -
                </td>
              </tr>
            ))}

            {usuarios.length === 0 && (
              <tr>
                <td colSpan="6">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
