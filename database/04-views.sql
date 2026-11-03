-- Visao detalhada das solicitacoes
CREATE VIEW "VW_SOLICITACOES_DETALHADAS" AS
SELECT
    s.soid AS solicitacao_id,
    s.sotit AS titulo,
    s.sodcp AS descricao,
    s.soopn AS data_abertura,
    s.socls AS data_fechamento,

    u.usrid AS morador_id,
    u.usrnam AS solicitante,

    a.aptnum AS apartamento,
    a.aptflr AS andar,
    a.aptblk AS bloco,

    c.catnom AS categoria,
    p.prinom AS prioridade,
    st.stsnom AS status,

    ps.usrid AS prestador_id,
    up.usrnam AS nome_prestador,
    e.cmpnam AS empresa_prestadora

FROM "SOLICITACOES" s

JOIN "USUARIOS" u
    ON u.usrid = s.usrid

JOIN "APARTAMENTOS" a
    ON a.aptid = s.aptid

JOIN "CATEGORIAS_SOLICITACAO" c
    ON c.catid = s.catid

JOIN "PRIORIDADES_SOLICITACAO" p
    ON p.priid = s.priid

JOIN "STATUS_SOLICITACAO" st
    ON st.stsid = s.stsid

LEFT JOIN "PRESTADORES_SERVICO" ps
    ON ps.usrid = s.pvdid

LEFT JOIN "USUARIOS" up
    ON up.usrid = ps.usrid

LEFT JOIN "EMPRESAS" e
    ON e.cmpid = ps.pvdcmp;


-- Indicadores para o painel administrativo
CREATE OR REPLACE VIEW "VW_DASHBOARD_SOLICITACOES" AS
SELECT
    st.stsid AS status_id,
    st.stsnom AS status,
    COUNT(s.soid) AS quantidade
FROM "STATUS_SOLICITACAO" st
LEFT JOIN "SOLICITACOES" s
    ON s.stsid = st.stsid
GROUP BY
    st.stsid,
    st.stsnom;


-- Solicitações ainda não encerradas
CREATE OR REPLACE VIEW "VW_SOLICITACOES_ABERTAS" AS
SELECT
    solicitacao_id,
    titulo,
    descricao,
    data_abertura,
    data_fechamento,
    morador_id,
    solicitante,
    apartamento,
    andar,
    bloco,
    categoria,
    prioridade,
    status,
    prestador_id,
    nome_prestador,
    empresa_prestadora
FROM "VW_SOLICITACOES_DETALHADAS"
WHERE status NOT IN ('Concluida', 'Finalizada', 'Cancelada');


-- Indicadores de desempenho dos prestadores
CREATE OR REPLACE VIEW "VW_DESEMPENHO_PRESTADORES" AS
SELECT
    ps.usrid AS prestador_id,
    up.usrnam AS nome_prestador,
    e.cmpnam AS empresa,

    COUNT(s.soid) AS total_atribuido,

    COUNT(s.soid) FILTER (
        WHERE st.stsnom IN ('Concluida', 'Finalizada')
    ) AS total_concluido,

    COUNT(s.soid) FILTER (
        WHERE st.stsnom = 'Em andamento'
    ) AS total_em_andamento,

    COUNT(s.soid) FILTER (
        WHERE st.stsnom IN ('Aberta', 'Aprovada', 'Atribuida')
    ) AS total_pendente,

    COUNT(s.soid) FILTER (
        WHERE st.stsnom = 'Cancelada'
    ) AS total_cancelado,

    ROUND(
        100.0 * COUNT(s.soid) FILTER (
            WHERE st.stsnom IN ('Concluida', 'Finalizada')
        ) / NULLIF(
            COUNT(s.soid) FILTER (
                WHERE st.stsnom <> 'Cancelada'
            ),
            0
        ),
        2
    ) AS taxa_conclusao_pct

FROM "PRESTADORES_SERVICO" ps

JOIN "USUARIOS" up
    ON up.usrid = ps.usrid

LEFT JOIN "EMPRESAS" e
    ON e.cmpid = ps.pvdcmp

LEFT JOIN "SOLICITACOES" s
    ON s.pvdid = ps.usrid

LEFT JOIN "STATUS_SOLICITACAO" st
    ON st.stsid = s.stsid

GROUP BY
    ps.usrid,
    up.usrnam,
    e.cmpnam;


-- Solicitações associadas a cada morador
CREATE OR REPLACE VIEW "VW_SOLICITACOES_POR_MORADOR" AS
SELECT
    d.solicitacao_id,
    d.titulo,
    d.descricao,
    d.data_abertura,
    d.data_fechamento,
    d.morador_id,
    d.solicitante,
    d.apartamento,
    d.andar,
    d.bloco,
    d.categoria,
    d.prioridade,
    d.status,
    d.prestador_id,
    d.nome_prestador,
    d.empresa_prestadora
FROM "VW_SOLICITACOES_DETALHADAS" d;


CREATE OR REPLACE VIEW "VW_AVALIACOES_MORADOR" AS
SELECT
    a.soid AS solicitacao_id,
    s.sotit AS titulo,
    s.usrid AS morador_id,
    a.evascr AS nota,
    a.evanot AS comentario,
    s.socls AS data_fechamento
FROM "AVALIACOES" a
JOIN "SOLICITACOES" s
    ON s.soid = a.soid;


CREATE OR REPLACE VIEW "VW_SOLICITACOES_POR_PRESTADOR" AS
SELECT
    d.solicitacao_id,
    d.titulo,
    d.descricao,
    d.data_abertura,
    d.data_fechamento,
    d.morador_id,
    d.solicitante,
    d.apartamento,
    d.andar,
    d.bloco,
    d.categoria,
    d.prioridade,
    d.status,
    d.prestador_id,
    d.nome_prestador,
    d.empresa_prestadora
FROM "VW_SOLICITACOES_DETALHADAS" d
WHERE d.prestador_id IS NOT NULL;


CREATE OR REPLACE VIEW "VW_HISTORICO_SOLICITACOES" AS
SELECT
    alt.altid AS alteracao_id,
    alt.soid AS solicitacao_id,
    s.sotit AS titulo_solicitacao,
    alt.alttim AS data_alteracao,
    u.usrid AS usuario_id,
    u.usrnam AS nome_usuario,
    t.typnom AS tipo_alteracao,
    alt.altdcp AS descricao_alteracao
FROM "ALTERACOES" alt
JOIN "SOLICITACOES" s
    ON s.soid = alt.soid
JOIN "USUARIOS" u
    ON u.usrid = alt.usrid
JOIN "TIPOS_ALTERACAO" t
    ON t.typid = alt.typid;


CREATE OR REPLACE VIEW "VW_SOLICITACOES_SEM_PRESTADOR" AS
SELECT
    d.solicitacao_id,
    d.titulo,
    d.descricao,
    d.data_abertura,
    d.solicitante,
    d.apartamento,
    d.andar,
    d.bloco,
    d.categoria,
    d.prioridade,
    d.status
FROM "VW_SOLICITACOES_DETALHADAS" d
WHERE d.prestador_id IS NULL
  AND d.status = 'Aprovada';


CREATE OR REPLACE VIEW "VW_DASHBOARD_PRIORIDADES" AS
SELECT
    p.priid AS prioridade_id,
    p.prinom AS prioridade,
    COUNT(s.soid) AS total_solicitacoes,
    COUNT(s.soid) FILTER (
        WHERE st.stsnom NOT IN (
            'Concluida', 'Finalizada', 'Cancelada'
        )
    ) AS total_pendentes
FROM "PRIORIDADES_SOLICITACAO" p
LEFT JOIN "SOLICITACOES" s
    ON s.priid = p.priid
LEFT JOIN "STATUS_SOLICITACAO" st
    ON st.stsid = s.stsid
GROUP BY
    p.priid,
    p.prinom;


CREATE OR REPLACE VIEW "VW_DASHBOARD_CATEGORIAS" AS
SELECT
    c.catid AS categoria_id,
    c.catnom AS categoria,
    COUNT(s.soid) AS total_solicitacoes,
    COUNT(s.soid) FILTER (
        WHERE st.stsnom NOT IN (
            'Concluida', 'Finalizada', 'Cancelada'
        )
    ) AS total_pendentes
FROM "CATEGORIAS_SOLICITACAO" c
LEFT JOIN "SOLICITACOES" s
    ON s.catid = c.catid
LEFT JOIN "STATUS_SOLICITACAO" st
    ON st.stsid = s.stsid
GROUP BY
    c.catid,
    c.catnom;


