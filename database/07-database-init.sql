
-- =====================================================
-- 1. APARTAMENTOS
-- =====================================================

INSERT INTO "APARTAMENTOS" (aptnum, aptflr, aptblk)
VALUES
    ('101', '1', 'A'),
    ('102', '1', 'A'),
    ('201', '2', 'A'),
    ('202', '2', 'A'),
    ('301', '3', 'B'),
    ('302', '3', 'B')
ON CONFLICT (aptnum, aptflr, aptblk) DO NOTHING;


-- =====================================================
-- 2. EMPRESAS
-- CNPJs fictícios e válidos para testes de formato.
-- =====================================================

INSERT INTO "EMPRESAS" (cmpnam, cmpcnpj)
VALUES
    ('EletroSol Manutencoes', '11222333000181'),
    ('HidroTech Servicos', '11444777000161'),
    ('Manutencao Predial LTDA', '27865757000102')
ON CONFLICT (cmpcnpj) DO NOTHING;


-- =====================================================
-- 3. USUARIOS
-- Senhas de teste: trocar na aplicação em produção.
-- =====================================================

INSERT INTO "USUARIOS" (usrnam, usrphn, usreml, usrpsw)
VALUES
    ('Administrador do Sistema', '21990000001',
     'admin@condofix.local', 'admin123'),

    ('Sindico do Condominio', '21990000002',
     'sindico@condofix.local', 'sindico123'),

    ('Joao da Silva', '21990000003',
     'morador@condofix.local', 'morador123'),

    ('Maria Oliveira', '21990000004',
     'maria@condofix.local', 'maria123'),

    ('Carlos Souza', '21990000005',
     'prestador@condofix.local', 'prestador123'),

    ('Ana Costa', '21990000006',
     'ana.prestador@condofix.local', 'ana123')
ON CONFLICT (usreml) DO NOTHING;


-- =====================================================
-- 4. PERFIS DE MORADORES
-- =====================================================

INSERT INTO "MORADORES" (usrid, aptid)
SELECT u.usrid, a.aptid
FROM (
    VALUES
        ('morador@condofix.local', '101', '1', 'A'),
        ('maria@condofix.local', '102', '1', 'A')
) AS dados(email, numero, andar, bloco)
JOIN "USUARIOS" u ON u.usreml = dados.email
JOIN "APARTAMENTOS" a
    ON a.aptnum = dados.numero
    AND a.aptflr = dados.andar
    AND a.aptblk = dados.bloco
ON CONFLICT (usrid) DO NOTHING;


-- =====================================================
-- 5. PERFIS DE PRESTADORES
-- CPF fictício e válido para testes de formato.
-- =====================================================

INSERT INTO "PRESTADORES_SERVICO" (usrid, pvdcpf, pvdcmp)
SELECT
    u.usrid,
    dados.cpf,
    e.cmpid
FROM (
    VALUES
        ('prestador@condofix.local', '52998224725',
         'EletroSol Manutencoes'),
        ('ana.prestador@condofix.local', '11144477735',
         'HidroTech Servicos')
) AS dados(email, cpf, empresa)
JOIN "USUARIOS" u ON u.usreml = dados.email
JOIN "EMPRESAS" e ON e.cmpnam = dados.empresa
ON CONFLICT (usrid) DO NOTHING;


-- =====================================================
-- 6. ASSOCIACAO DE PAPEIS
-- =====================================================

INSERT INTO "USUARIO_ROLES" (usrid, roleid)
SELECT u.usrid, r.roleid
FROM (
    VALUES
        ('admin@condofix.local', 'ADMIN'),
        ('sindico@condofix.local', 'ADMINISTRADOR'),
        ('morador@condofix.local', 'USUARIO'),
        ('maria@condofix.local', 'USUARIO'),
        ('prestador@condofix.local', 'PRESTADOR_SERVICO'),
        ('ana.prestador@condofix.local', 'PRESTADOR_SERVICO')
) AS dados(email, papel)
JOIN "USUARIOS" u ON u.usreml = dados.email
JOIN "ROLES" r ON r.rolenam = dados.papel
ON CONFLICT (usrid, roleid) DO NOTHING;


-- =====================================================
-- 7. SOLICITACOES
-- =====================================================

INSERT INTO "SOLICITACOES"
    (usrid, sotit, aptid, pvdid, sodcp, catid, priid, stsid)
SELECT
    u.usrid,
    dados.titulo,
    a.aptid,
    p.usrid,
    dados.descricao,
    c.catid,
    pr.priid,
    st.stsid
FROM (
    VALUES
        ('morador@condofix.local',
         'Vazamento na pia',
         '101', '1', 'A',
         'prestador@condofix.local',
         'Vazamento de agua na conexao da pia da cozinha.',
         'Hidraulica', 'Alta', 'Finalizada'),

        ('morador@condofix.local',
         'Lampada queimada',
         '101', '1', 'A',
         'prestador@condofix.local',
         'Lampada do corredor do apartamento nao funciona.',
         'Eletrica', 'Normal', 'Em andamento'),

        ('maria@condofix.local',
         'Porta do quarto com defeito',
         '102', '1', 'A',
         NULL,
         'A porta do quarto apresenta dificuldade para fechar.',
         'Marcenaria', 'Baixa', 'Aberta'),

        ('maria@condofix.local',
         'Tomada sem energia',
         '102', '1', 'A',
         'ana.prestador@condofix.local',
         'Tomada da sala parou de funcionar.',
         'Eletrica', 'Urgente', 'Atribuida'),

        ('morador@condofix.local',
         'Torneira com vazamento',
         '101', '1', 'A',
         NULL,
         'Torneira do banheiro apresenta vazamento.',
         'Hidraulica', 'Normal', 'Cancelada')
) AS dados(email, titulo, numero, andar, bloco,
           prestador_email, descricao, categoria,
           prioridade, status)
JOIN "USUARIOS" u ON u.usreml = dados.email
JOIN "APARTAMENTOS" a
    ON a.aptnum = dados.numero
    AND a.aptflr = dados.andar
    AND a.aptblk = dados.bloco
LEFT JOIN "USUARIOS" p ON p.usreml = dados.prestador_email
LEFT JOIN "PRESTADORES_SERVICO" ps ON ps.usrid = p.usrid
LEFT JOIN "CATEGORIAS_SOLICITACAO" c
    ON c.catnom = dados.categoria
JOIN "PRIORIDADES_SOLICITACAO" pr
    ON pr.prinom = dados.prioridade
JOIN "STATUS_SOLICITACAO" st
    ON st.stsnom = dados.status
LEFT JOIN "PRESTADORES_SERVICO" p
    ON p.usrid = ps.usrid
WHERE (dados.prestador_email IS NULL OR p.usrid IS NOT NULL)
AND NOT EXISTS (
    SELECT 1
    FROM "SOLICITACOES" s
    WHERE s.usrid = u.usrid
      AND s.sotit = dados.titulo
);


-- =====================================================
-- 8. HISTORICO DE ALTERACOES
-- =====================================================

INSERT INTO "ALTERACOES" (soid, usrid, typid, altdcp)
SELECT
    s.soid,
    u.usrid,
    t.typid,
    dados.descricao
FROM (
    VALUES
        ('morador@condofix.local',
         'Vazamento na pia',
         'morador@condofix.local',
         'Descricao',
         'Solicitacao criada pelo morador.'),

        ('morador@condofix.local',
         'Vazamento na pia',
         'sindico@condofix.local',
         'Prioridade',
         'Prioridade alterada para Alta.'),

        ('morador@condofix.local',
         'Vazamento na pia',
         'sindico@condofix.local',
         'Atribuicao',
         'Prestador designado para realizar o servico.'),

        ('morador@condofix.local',
         'Vazamento na pia',
         'prestador@condofix.local',
         'Conclusao',
         'Reparo realizado com sucesso.')
) AS dados(email_solicitante, titulo, email_responsavel,
           tipo, descricao)
JOIN "USUARIOS" u ON u.usreml = dados.email_responsavel
JOIN "SOLICITACOES" s
    ON s.sotit = dados.titulo
JOIN "USUARIOS" solicitante
    ON solicitante.usreml = dados.email_solicitante
    AND s.usrid = solicitante.usrid
JOIN "TIPOS_ALTERACAO" t ON t.typnom = dados.tipo
WHERE NOT EXISTS (
    SELECT 1
    FROM "ALTERACOES" alt
    WHERE alt.soid = s.soid
      AND alt.usrid = u.usrid
      AND alt.altdcp = dados.descricao
);


-- =====================================================
-- 9. AVALIACOES
-- =====================================================

INSERT INTO "AVALIACOES" (soid, evascr, evanot)
SELECT s.soid, 5, 'Servico realizado com qualidade.'
FROM "SOLICITACOES" s
JOIN "USUARIOS" u ON u.usrid = s.usrid
WHERE u.usreml = 'morador@condofix.local'
  AND s.sotit = 'Vazamento na pia'
  AND NOT EXISTS (
      SELECT 1
      FROM "AVALIACOES" av
      WHERE av.soid = s.soid
  );
