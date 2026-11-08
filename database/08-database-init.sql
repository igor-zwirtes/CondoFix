
BEGIN;

-- Adia os constraint triggers adiáveis até o fim da transação.
SET CONSTRAINTS ALL DEFERRED;

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
-- =====================================================

INSERT INTO "EMPRESAS" (cmpnam, cmpcnpj)
VALUES
    ('EletroSol Manutencoes', '11222333000181'),
    ('HidroTech Servicos', '11444777000161'),
    ('Manutencao Predial LTDA', '27865757000102')
ON CONFLICT (cmpcnpj) DO NOTHING;


-- =====================================================
-- 3. USUARIOS
-- Senhas em texto puro apenas para ambiente local de teste.
-- =====================================================

INSERT INTO "USUARIOS" (usrnam, usrphn, usreml, usrpsw)
VALUES
    ('Administrador do Sistema', '21990000001',
     'admin@condofix.local', '$2b$12$Q7/WzN9rbvkfeeAlaeeo6eU09/ngQ2Athe7zO7tPuzCehaexz1JrS'),

    ('Sindico do Condominio', '21990000002',
     'sindico@condofix.local', '$2b$12$cwf/9PdaLEs4X6T5K5/vheRNkQvbzURia9tj/Eczm5I2mAqHix3ya'),

    ('Joao da Silva', '21990000003',
     'morador@condofix.local', '$2b$12$MbKGx6X/psEx8OZuul9WVOfAhAYHrshsCwsh./OafAp7a.kLQmHxi'),

    ('Maria Oliveira', '21990000004',
     'maria@condofix.local', '$2b$12$TGJwZW6vYVsalaGhqNT9uuSfo.ouxou.2oCu7s8nn6lj.gFkkNIp6'),

    ('Carlos Souza', '21990000005',
     'prestador@condofix.local', '$2b$12$Jj6QvmGsJPkNPbmWfCxHX.VRUo.5SvsWcRc4juBnfmNILj.NtQRea'),

    ('Ana Costa', '21990000006',
     'ana.prestador@condofix.local', '$2b$12$pWebT.bbwM0TC8ANLf4XDe/7CC2EtGpHdmA4BmbclaNQQ09Vb9X/a')
ON CONFLICT (usreml) DO NOTHING;


-- =====================================================
-- 4. ASSOCIACAO DE PAPEIS
-- Os papéis são associados antes da criação dos perfis.
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
JOIN "USUARIOS" u
    ON u.usreml = dados.email
JOIN "ROLES" r
    ON r.rolenam = dados.papel
ON CONFLICT (usrid, roleid) DO NOTHING;


-- =====================================================
-- 5. PERFIS DE MORADORES
-- =====================================================

INSERT INTO "MORADORES" (usrid, aptid)
SELECT u.usrid, a.aptid
FROM (
    VALUES
        ('morador@condofix.local', '101', '1', 'A'),
        ('maria@condofix.local', '102', '1', 'A')
) AS dados(email, numero, andar, bloco)
JOIN "USUARIOS" u
    ON u.usreml = dados.email
JOIN "APARTAMENTOS" a
    ON a.aptnum = dados.numero
   AND a.aptflr = dados.andar
   AND a.aptblk = dados.bloco
ON CONFLICT (usrid) DO NOTHING;


-- =====================================================
-- 6. PERFIS DE PRESTADORES
-- =====================================================

INSERT INTO "PRESTADORES_SERVICO" (usrid, pvdcpf, pvdcmp)
SELECT
    u.usrid,
    dados.cpf,
    e.cmpid
FROM (
    VALUES
        ('prestador@condofix.local',
         '52998224725',
         'EletroSol Manutencoes'),

        ('ana.prestador@condofix.local',
         '11144477735',
         'HidroTech Servicos')
) AS dados(email, cpf, empresa)
JOIN "USUARIOS" u
    ON u.usreml = dados.email
JOIN "EMPRESAS" e
    ON e.cmpnam = dados.empresa
ON CONFLICT (usrid) DO NOTHING;


-- =====================================================
-- 7. SOLICITACOES
-- =====================================================

INSERT INTO "SOLICITACOES"
    (usrid, sotit, aptid, pvdid, sodcp,
     catid, priid, stsid)
SELECT
    u.usrid,
    dados.titulo,
    a.aptid,
    ps.usrid,
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
         'Hidraulica', 'Alta', 'Concluida'),

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
) AS dados(
    email, titulo, numero, andar, bloco,
    prestador_email, descricao, categoria,
    prioridade, status
)
JOIN "USUARIOS" u
    ON u.usreml = dados.email
JOIN "APARTAMENTOS" a
    ON a.aptnum = dados.numero
   AND a.aptflr = dados.andar
   AND a.aptblk = dados.bloco
LEFT JOIN "USUARIOS" up
    ON up.usreml = dados.prestador_email
LEFT JOIN "PRESTADORES_SERVICO" ps
    ON ps.usrid = up.usrid
JOIN "CATEGORIAS_SOLICITACAO" c
    ON c.catnom = dados.categoria
JOIN "PRIORIDADES_SOLICITACAO" pr
    ON pr.prinom = dados.prioridade
JOIN "STATUS_SOLICITACAO" st
    ON st.stsnom = dados.status
WHERE
    (dados.prestador_email IS NULL OR ps.usrid IS NOT NULL)
    AND NOT EXISTS (
        SELECT 1
        FROM "SOLICITACOES" s
        WHERE s.usrid = u.usrid
          AND s.sotit = dados.titulo
    );

-- =====================================================
-- 8. FATURAMENTOS
-- =====================================================

INSERT INTO "FATURAMENTOS"
    (soid, fatval, fatdcp, fatdat, usrid)
SELECT
    s.soid,
    250.00,
    'Reparo de vazamento na conexao da pia da cozinha.',
    CURRENT_TIMESTAMP,
    prestador.usrid
FROM "SOLICITACOES" s
JOIN "USUARIOS" solicitante
    ON solicitante.usrid = s.usrid
JOIN "USUARIOS" prestador
    ON prestador.usreml = 'prestador@condofix.local'
JOIN "STATUS_SOLICITACAO" st
    ON st.stsid = s.stsid
WHERE solicitante.usreml = 'morador@condofix.local'
  AND s.sotit = 'Vazamento na pia'
  AND st.stsnom = 'Finalizada'
  AND s.pvdid = prestador.usrid
ON CONFLICT (soid) DO NOTHING;

-- =====================================================
-- 9. HISTORICO DE ALTERACOES
-- =====================================================

INSERT INTO "ALTERACOES" (soid, usrid, typid, altdcp)
SELECT
    s.soid,
    responsavel.usrid,
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
         'Reparo realizado com sucesso.'),

        ('morador@condofix.local',
         'Lampada queimada',
         'morador@condofix.local',
         'Criacao',
         'Solicitacao criada pelo morador.'),

        ('morador@condofix.local',
         'Lampada queimada',
         'sindico@condofix.local',
         'Prestador',
         'Prestador designado para realizar o servico.'),

        ('morador@condofix.local',
         'Lampada queimada',
         'prestador@condofix.local',
         'Status',
         'Status alterado para Em andamento.'),

        ('morador@condofix.local',
         'Torneira com vazamento',
         'morador@condofix.local',
         'Criacao',
         'Solicitacao criada pelo morador.'),

        ('morador@condofix.local',
         'Torneira com vazamento',
         'sindico@condofix.local',
         'Status',
         'Status alterado para Cancelada.')
) AS dados(
    email_solicitante, titulo, email_responsavel,
    tipo, descricao
)
JOIN "USUARIOS" solicitante
    ON solicitante.usreml = dados.email_solicitante
JOIN "SOLICITACOES" s
    ON s.usrid = solicitante.usrid
   AND s.sotit = dados.titulo
JOIN "USUARIOS" responsavel
    ON responsavel.usreml = dados.email_responsavel
JOIN "TIPOS_ALTERACAO" t
    ON t.typnom = dados.tipo
WHERE NOT EXISTS (
    SELECT 1
    FROM "ALTERACOES" alt
    WHERE alt.soid = s.soid
      AND alt.usrid = responsavel.usrid
      AND alt.typid = t.typid
      AND alt.altdcp = dados.descricao
);


-- =====================================================
-- 10. AVALIACOES
-- =====================================================

INSERT INTO "AVALIACOES" (soid, evascr, evanot)
SELECT
    s.soid,
    5,
    'Servico realizado com qualidade.'
FROM "SOLICITACOES" s
JOIN "USUARIOS" u
    ON u.usrid = s.usrid
JOIN "STATUS_SOLICITACAO" st
    ON st.stsid = s.stsid
WHERE u.usreml = 'morador@condofix.local'
  AND s.sotit = 'Vazamento na pia'
  AND st.stsnom = 'Concluida'
ON CONFLICT (soid) DO NOTHING;


COMMIT;
