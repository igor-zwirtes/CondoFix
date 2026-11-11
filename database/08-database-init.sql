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
    ('302', '3', 'B'),
    ('401', '4', 'B'),
    ('402', '4', 'B'),
    ('501', '5', 'C'),
    ('502', '5', 'C')
ON CONFLICT (aptnum, aptflr, aptblk) DO NOTHING;


-- =====================================================
-- 2. EMPRESAS
-- =====================================================

INSERT INTO "EMPRESAS" (cmpnam, cmpcnpj)
VALUES
    ('EletroSol Manutencoes', '11222333000181'),
    ('HidroTech Servicos', '11444777000161'),
    ('Manutencao Predial LTDA', '27865757000102'),
    ('ReparaMais Servicos', '12345678000195'),
    ('Predial Total LTDA', '98765432000198')
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
     'ana.prestador@condofix.local', '$2b$12$pWebT.bbwM0TC8ANLf4XDe/7CC2EtGpHdmA4BmbclaNQQ09Vb9X/a'),

    ('Pedro Almeida', '21990000007',
     'pedro@condofix.local', '$2b$12$2AZf7kXjUoWL5.TTxxKBJuaNDRM9vq87lC2/g3uQWY7drJsN4BWgm'),

    ('Roberto Lima', '21990000008',
     'roberto.prestador@condofix.local', '$2b$12$OZLRB/8CIxVgaA4lhQQIOe.ATHTSaW1KsGLcrHn3/86JbwHCXsFSS'),

    ('Administrador Auxiliar', '21990000009',
     'admin2@condofix.local', '$2b$12$etfpqLR4cy2P8.OTKQweFerJJ1cKIoLOOIuyArXsH0Gd0YbcfdkDG'),

    ('Sindica do Bloco B', '21990000010',
     'sindica2@condofix.local', '$2b$12$5WXwq1qQyEeIW/Ub3tYf8eCbz72jl7FxWquhKnJXmAK6GCqLcGnE')
ON CONFLICT (usreml) DO NOTHING;

-- =====================================================
-- 3.1 CPF DOS USUARIOS
-- =====================================================

UPDATE "USUARIOS" u
SET usrcpf = dados.cpf
FROM (
    VALUES
        ('admin@condofix.local', '11122233396'),
        ('sindico@condofix.local', '22233344405'),
        ('morador@condofix.local', '33344455508'),
        ('maria@condofix.local', '44455566619'),
        ('prestador@condofix.local', '52998224725'),
        ('ana.prestador@condofix.local', '11144477735'),
        ('pedro@condofix.local', '55566677720'),
        ('roberto.prestador@condofix.local', '12345678909'),
        ('admin2@condofix.local', '66677788830'),
        ('sindica2@condofix.local', '77788899941')
) AS dados(email, cpf)
WHERE u.usreml = dados.email
  AND u.usrcpf IS NULL;


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
        ('ana.prestador@condofix.local', 'PRESTADOR_SERVICO'),
        ('pedro@condofix.local', 'USUARIO'),
        ('roberto.prestador@condofix.local', 'PRESTADOR_SERVICO'),
        ('admin2@condofix.local', 'ADMIN'),
        ('sindica2@condofix.local', 'ADMINISTRADOR')
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
        ('maria@condofix.local', '102', '1', 'A'),
        ('pedro@condofix.local', '201', '2', 'A')
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
         'HidroTech Servicos'),

        ('roberto.prestador@condofix.local',
         '12345678909',
         'ReparaMais Servicos')
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
         'Hidraulica', 'Normal', 'Cancelada'),

        ('pedro@condofix.local',
         'Infiltracao no teto',
         '201', '2', 'A',
         NULL,
         'Mancha de umidade apareceu no teto da sala.',
         'Hidraulica', 'Urgente', 'Aberta'),

        ('pedro@condofix.local',
         'Pintura descascando',
         '201', '2', 'A',
         NULL,
         'A pintura da parede proxima a janela esta descascando.',
         'Marcenaria', 'Baixa', 'Aprovada'),

        ('pedro@condofix.local',
         'Disjuntor desarmando',
         '201', '2', 'A',
         'roberto.prestador@condofix.local',
         'O disjuntor do apartamento desarma frequentemente.',
         'Eletrica', 'Alta', 'Atribuida'),

        ('maria@condofix.local',
         'Registro do banheiro',
         '102', '1', 'A',
         'ana.prestador@condofix.local',
         'Registro apresenta vazamento mesmo fechado.',
         'Hidraulica', 'Alta', 'Em andamento'),

        ('pedro@condofix.local',
         'Fechadura da entrada',
         '201', '2', 'A',
         'roberto.prestador@condofix.local',
         'Fechadura foi ajustada e voltou a funcionar.',
         'Marcenaria', 'Normal', 'Concluida'),

        ('maria@condofix.local',
         'Troca de luminaria',
         '102', '1', 'A',
         'prestador@condofix.local',
         'Luminaria substituida e funcionamento testado.',
         'Eletrica', 'Normal', 'Aceita'),

        ('pedro@condofix.local',
         'Reparo no quadro eletrico',
         '201', '2', 'A',
         'roberto.prestador@condofix.local',
         'Revisao do quadro eletrico concluida.',
         'Eletrica', 'Urgente', 'Faturada'),

        ('maria@condofix.local',
         'Ajuste de porta',
         '102', '1', 'A',
         'ana.prestador@condofix.local',
         'Dobradiças ajustadas e porta alinhada.',
         'Marcenaria', 'Baixa', 'Finalizada'),

        ('pedro@condofix.local',
         'Vazamento no tanque',
         '201', '2', 'A',
         NULL,
         'Solicitacao cancelada pelo morador antes da atribuicao.',
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
-- Cria faturamentos para solicitações já faturadas ou finalizadas.
-- O prestador responsável fica registrado como responsável pelo lançamento.

INSERT INTO "FATURAMENTOS"
    (soid, fatval, fatdcp, fatdat, usrid)
SELECT
    s.soid,
    CASE
        WHEN pr.prinom = 'Urgente' THEN 450.00
        WHEN pr.prinom = 'Alta' THEN 320.00
        WHEN pr.prinom = 'Normal' THEN 220.00
        ELSE 150.00
    END,
    'Servico executado: ' || s.sotit,
    CURRENT_TIMESTAMP,
    s.pvdid
FROM "SOLICITACOES" s
JOIN "STATUS_SOLICITACAO" st
    ON st.stsid = s.stsid
JOIN "PRIORIDADES_SOLICITACAO" pr
    ON pr.priid = s.priid
WHERE st.stsnom IN ('Faturada', 'Finalizada')
  AND s.pvdid IS NOT NULL
ON CONFLICT (soid) DO NOTHING;

-- =====================================================
-- 9. HISTORICO DE ALTERACOES
-- =====================================================

INSERT INTO "ALTERACOES" (soid, usrid, typid, altdcp, alttim)
SELECT
    s.soid,
    responsavel.usrid,
    t.typid,
    dados.descricao,
    dados.data_alteracao
FROM (
    VALUES
        ('morador@condofix.local',
         'Vazamento na pia',
         'morador@condofix.local',
         'Criacao',
         'Solicitacao criada pelo morador.',
         TIMESTAMP '2026-01-01 10:00:00'),

        ('morador@condofix.local',
         'Vazamento na pia',
         'sindico@condofix.local',
         'Prioridade',
         'Prioridade alterada para Alta.',
         TIMESTAMP '2026-01-01 10:05:00'),

        ('morador@condofix.local',
         'Vazamento na pia',
         'sindico@condofix.local',
         'Prestador',
         'Prestador Carlos Souza atribuído à solicitação.',
         TIMESTAMP '2026-01-01 10:10:00'),

        ('morador@condofix.local',
         'Vazamento na pia',
         'prestador@condofix.local',
         'Conclusao',
         'Reparo realizado com sucesso.',
         TIMESTAMP '2026-01-01 10:30:00'),

        ('morador@condofix.local',
        'Vazamento na pia',
        'morador@condofix.local',
        'Status',
        'Avaliação registrada pelo morador.',
        TIMESTAMP '2026-01-01 10:35:00'),

        ('morador@condofix.local',
         'Lampada queimada',
         'morador@condofix.local',
         'Criacao',
         'Solicitacao criada pelo morador.',
         TIMESTAMP '2026-01-02 10:00:00'),

        ('morador@condofix.local',
         'Lampada queimada',
         'sindico@condofix.local',
         'Prestador',
         'Prestador Carlos Souza atribuído à solicitação.',
         TIMESTAMP '2026-01-02 10:05:00'),

        ('morador@condofix.local',
         'Lampada queimada',
         'prestador@condofix.local',
         'Status',
         'Status alterado para Em andamento.',
         TIMESTAMP '2026-01-02 10:10:00'),

        ('morador@condofix.local',
         'Torneira com vazamento',
         'morador@condofix.local',
         'Criacao',
         'Solicitacao criada pelo morador.',
         TIMESTAMP '2026-01-03 10:00:00'),

        ('morador@condofix.local',
         'Torneira com vazamento',
         'sindico@condofix.local',
         'Status',
         'Status alterado para Cancelada.',
         TIMESTAMP '2026-01-03 10:05:00'),

        ('maria@condofix.local',
         'Tomada sem energia',
         'maria@condofix.local',
         'Criacao',
         'Solicitacao criada pela moradora Maria Oliveira.',
         TIMESTAMP '2026-11-08 09:00:00'),

        ('maria@condofix.local',
         'Tomada sem energia',
         'sindico@condofix.local',
         'Prioridade',
         'Prioridade alterada para Urgente.',
         TIMESTAMP '2026-11-08 09:15:00'),

        ('maria@condofix.local',
         'Tomada sem energia',
         'sindico@condofix.local',
         'Prestador',
         'Prestador Ana Costa atribuído à solicitação.',
         TIMESTAMP '2026-11-08 09:30:00'),

        ('maria@condofix.local',
         'Porta do quarto com defeito',
         'maria@condofix.local',
         'Criacao',
         'Solicitacao criada pela moradora Maria Oliveira.',
         TIMESTAMP '2026-11-08 10:00:00'),

        ('pedro@condofix.local',
         'Infiltracao no teto',
         'pedro@condofix.local',
         'Criacao',
         'Solicitacao criada pelo morador Pedro Almeida.',
         TIMESTAMP '2026-11-09 08:00:00'),

        ('pedro@condofix.local',
         'Infiltracao no teto',
         'sindico@condofix.local',
         'Prioridade',
         'Prioridade definida como Urgente.',
         TIMESTAMP '2026-11-09 08:10:00'),

        ('pedro@condofix.local',
         'Pintura descascando',
         'pedro@condofix.local',
         'Criacao',
         'Solicitacao criada pelo morador Pedro Almeida.',
         TIMESTAMP '2026-11-09 08:20:00'),

        ('pedro@condofix.local',
         'Pintura descascando',
         'sindica2@condofix.local',
         'Status',
         'Solicitacao aprovada pela administracao.',
         TIMESTAMP '2026-11-09 08:30:00'),

        ('pedro@condofix.local',
         'Disjuntor desarmando',
         'pedro@condofix.local',
         'Criacao',
         'Solicitacao criada pelo morador Pedro Almeida.',
         TIMESTAMP '2026-11-09 09:00:00'),

        ('pedro@condofix.local',
         'Disjuntor desarmando',
         'sindico@condofix.local',
         'Prestador',
         'Prestador Roberto Lima atribuido a solicitacao.',
         TIMESTAMP '2026-11-09 09:10:00'),

        ('maria@condofix.local',
         'Registro do banheiro',
         'ana.prestador@condofix.local',
         'Status',
         'Servico iniciado pela prestadora Ana Costa.',
         TIMESTAMP '2026-11-09 09:30:00'),

        ('pedro@condofix.local',
         'Fechadura da entrada',
         'roberto.prestador@condofix.local',
         'Conclusao',
         'Fechadura ajustada e testada.',
         TIMESTAMP '2026-11-09 10:00:00'),

        ('maria@condofix.local',
         'Troca de luminaria',
         'ana.prestador@condofix.local',
         'Conclusao',
         'Luminaria substituida e testada.',
         TIMESTAMP '2026-11-09 10:20:00'),

        ('pedro@condofix.local',
         'Reparo no quadro eletrico',
         'roberto.prestador@condofix.local',
         'Conclusao',
         'Revisao do quadro eletrico concluida.',
         TIMESTAMP '2026-11-09 11:00:00'),

        ('pedro@condofix.local',
         'Reparo no quadro eletrico',
         'admin2@condofix.local',
         'Status',
         'Solicitacao encaminhada para faturamento.',
         TIMESTAMP '2026-11-09 11:15:00'),

        ('maria@condofix.local',
         'Ajuste de porta',
         'ana.prestador@condofix.local',
         'Conclusao',
         'Dobradiças ajustadas e porta alinhada.',
         TIMESTAMP '2026-11-09 11:30:00'),

        ('pedro@condofix.local',
         'Vazamento no tanque',
         'pedro@condofix.local',
         'Criacao',
         'Solicitacao criada e posteriormente cancelada pelo morador.',
         TIMESTAMP '2026-11-09 12:00:00'),

        ('pedro@condofix.local',
         'Vazamento no tanque',
         'pedro@condofix.local',
         'Status',
         'Solicitacao cancelada pelo morador.',
         TIMESTAMP '2026-11-09 12:10:00')

) AS dados(
    email_solicitante,
    titulo,
    email_responsavel,
    tipo,
    descricao,
    data_alteracao
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
-- Registra avaliações em solicitações já aceitas/faturadas/finalizadas
-- e preserva uma avaliação na solicitação original de exemplo.
-- "Fechadura da entrada" permanece Concluida e sem avaliação para a demo.

INSERT INTO "AVALIACOES" (soid, evascr, evanot)
SELECT
    s.soid,
    CASE
        WHEN s.sotit = 'Reparo no quadro eletrico' THEN 4
        ELSE 5
    END,
    CASE
        WHEN s.sotit = 'Reparo no quadro eletrico'
            THEN 'Servico concluido adequadamente, com pequeno atraso.'
        ELSE 'Servico realizado com qualidade e dentro do esperado.'
    END
FROM "SOLICITACOES" s
JOIN "STATUS_SOLICITACAO" st
    ON st.stsid = s.stsid
WHERE st.stsnom = 'Concluida'
ON CONFLICT (soid) DO NOTHING;

-- Solicitações concluídas e avaliadas passam para o status Aceita.
UPDATE "SOLICITACOES" s
SET stsid = st_aceita.stsid
FROM "STATUS_SOLICITACAO" st_atual,
     "STATUS_SOLICITACAO" st_aceita,
     "AVALIACOES" a
WHERE st_atual.stsid = s.stsid
  AND st_atual.stsnom = 'Concluida'
  AND st_aceita.stsnom = 'Aceita'
  AND a.soid = s.soid;


COMMIT;
