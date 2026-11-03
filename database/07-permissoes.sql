-- =====================================================
-- 1. CADASTRO DOS MODULOS
-- =====================================================

INSERT INTO "FUNCOES" (funnom, fundcp)
VALUES
    ('Solicitacoes',
     'Consulta e acompanhamento das solicitacoes do condominio'),

    ('Minhas Solicitacoes',
     'Acompanhamento das solicitacoes do morador'),

    ('Servicos',
     'Consulta dos servicos atribuidos ao prestador'),

    ('Historico',
     'Consulta do historico de alteracoes das solicitacoes'),

    ('Indicadores',
     'Indicadores operacionais e gerenciais do condominio'),

    ('Administracao',
     'Administracao tecnica do sistema e dos acessos')

ON CONFLICT (funnom) DO NOTHING;


-- =====================================================
-- 2. ABAS E VIEWS DO MODULO SOLICITACOES
-- =====================================================

INSERT INTO "FUNCOES_VIEWS" (funid, fvnom, fvview, fvord)
SELECT f.funid, v.fvnom, v.fvview, v.fvord
FROM "FUNCOES" f
CROSS JOIN (
    VALUES
        ('Todas as solicitacoes',
         'VW_SOLICITACOES_DETALHADAS', 1),

        ('Solicitacoes abertas',
         'VW_SOLICITACOES_ABERTAS', 2),

        ('Sem prestador',
         'VW_SOLICITACOES_SEM_PRESTADOR', 3)
) AS v(fvnom, fvview, fvord)
WHERE f.funnom = 'Solicitacoes'
ON CONFLICT (funid, fvnom) DO UPDATE
SET fvview = EXCLUDED.fvview,
    fvord = EXCLUDED.fvord;


-- =====================================================
-- 3. ABAS E VIEWS DO MODULO MINHAS SOLICITACOES
-- =====================================================

INSERT INTO "FUNCOES_VIEWS" (funid, fvnom, fvview, fvord)
SELECT f.funid, v.fvnom, v.fvview, v.fvord
FROM "FUNCOES" f
CROSS JOIN (
    VALUES
        ('Acompanhamento',
         'VW_SOLICITACOES_POR_MORADOR', 1),

        ('Avaliacoes',
         'VW_AVALIACOES_MORADOR', 2)
) AS v(fvnom, fvview, fvord)
WHERE f.funnom = 'Minhas Solicitacoes'
ON CONFLICT (funid, fvnom) DO UPDATE
SET fvview = EXCLUDED.fvview,
    fvord = EXCLUDED.fvord;


-- =====================================================
-- 4. ABA DO MODULO SERVICOS
-- =====================================================

INSERT INTO "FUNCOES_VIEWS" (funid, fvnom, fvview, fvord)
SELECT f.funid, v.fvnom, v.fvview, v.fvord
FROM "FUNCOES" f
CROSS JOIN (
    VALUES
        ('Servicos atribuidos',
         'VW_SOLICITACOES_POR_PRESTADOR', 1)
) AS v(fvnom, fvview, fvord)
WHERE f.funnom = 'Servicos'
ON CONFLICT (funid, fvnom) DO UPDATE
SET fvview = EXCLUDED.fvview,
    fvord = EXCLUDED.fvord;


-- =====================================================
-- 5. ABA DO MODULO HISTORICO
-- =====================================================

INSERT INTO "FUNCOES_VIEWS" (funid, fvnom, fvview, fvord)
SELECT f.funid, v.fvnom, v.fvview, v.fvord
FROM "FUNCOES" f
CROSS JOIN (
    VALUES
        ('Alteracoes das solicitacoes',
         'VW_HISTORICO_SOLICITACOES', 1)
) AS v(fvnom, fvview, fvord)
WHERE f.funnom = 'Historico'
ON CONFLICT (funid, fvnom) DO UPDATE
SET fvview = EXCLUDED.fvview,
    fvord = EXCLUDED.fvord;


-- =====================================================
-- 6. ABAS DO MODULO INDICADORES
-- =====================================================

INSERT INTO "FUNCOES_VIEWS" (funid, fvnom, fvview, fvord)
SELECT f.funid, v.fvnom, v.fvview, v.fvord
FROM "FUNCOES" f
CROSS JOIN (
    VALUES
        ('Solicitacoes por status',
         'VW_DASHBOARD_SOLICITACOES', 1),

        ('Solicitacoes por prioridade',
         'VW_DASHBOARD_PRIORIDADES', 2),

        ('Solicitacoes por categoria',
         'VW_DASHBOARD_CATEGORIAS', 3),

        ('Desempenho dos prestadores',
         'VW_DESEMPENHO_PRESTADORES', 4)
) AS v(fvnom, fvview, fvord)
WHERE f.funnom = 'Indicadores'
ON CONFLICT (funid, fvnom) DO UPDATE
SET fvview = EXCLUDED.fvview,
    fvord = EXCLUDED.fvord;


-- =====================================================
-- ADMIN: administracao tecnica
-- =====================================================

INSERT INTO "ROLES_FUNCOES" (roleid, funid)
SELECT r.roleid, f.funid
FROM "ROLES" r
CROSS JOIN "FUNCOES" f
WHERE r.rolenam = 'ADMIN'
  AND f.funnom = 'Administracao'
ON CONFLICT DO NOTHING;


-- =====================================================
-- ADMINISTRADOR: gestao do condominio
-- =====================================================

INSERT INTO "ROLES_FUNCOES" (roleid, funid)
SELECT r.roleid, f.funid
FROM "ROLES" r
CROSS JOIN "FUNCOES" f
WHERE r.rolenam = 'ADMINISTRADOR'
  AND f.funnom IN (
      'Solicitacoes',
      'Historico',
      'Indicadores'
  )
ON CONFLICT DO NOTHING;


-- =====================================================
-- USUARIO: morador
-- =====================================================

INSERT INTO "ROLES_FUNCOES" (roleid, funid)
SELECT r.roleid, f.funid
FROM "ROLES" r
CROSS JOIN "FUNCOES" f
WHERE r.rolenam = 'USUARIO'
  AND f.funnom IN (
      'Minhas Solicitacoes',
      'Historico'
  )
ON CONFLICT DO NOTHING;


-- =====================================================
-- PRESTADOR_SERVICO: prestador
-- =====================================================

INSERT INTO "ROLES_FUNCOES" (roleid, funid)
SELECT r.roleid, f.funid
FROM "ROLES" r
CROSS JOIN "FUNCOES" f
WHERE r.rolenam = 'PRESTADOR_SERVICO'
  AND f.funnom IN (
      'Servicos',
      'Historico'
  )
ON CONFLICT DO NOTHING;