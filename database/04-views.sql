-- Visao detalhada das solicitacoes
CREATE OR REPLACE VIEW "VW_SOLICITACOES_DETALHADAS" AS
SELECT
    s.soid,
    s.sodcp,
    s.soopn,
    s.socls,
    u.usrid,
    u.usrnam AS solicitante,
    a.aptnum,
    a.aptflr,
    a.aptblk,
    c.catnom AS categoria,
    p.prinom AS prioridade,
    st.stsnom AS status,
    ps.pvdcmp AS prestador
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
    ON ps.usrid = s.pvdid;


-- Indicadores para o painel administrativo
CREATE OR REPLACE VIEW "VW_DASHBOARD_SOLICITACOES" AS
SELECT
    st.stsnom AS status,
    COUNT(s.soid) AS quantidade
FROM "STATUS_SOLICITACAO" st
LEFT JOIN "SOLICITACOES" s
    ON s.stsid = st.stsid
GROUP BY st.stsid, st.stsnom;


-- Solicitacoes ainda nao encerradas
CREATE OR REPLACE VIEW "VW_SOLICITACOES_ABERTAS" AS
SELECT *
FROM "VW_SOLICITACOES_DETALHADAS"
WHERE status NOT IN ('Concluida', 'Finalizada', 'Cancelada');


-- Desempenho dos prestadores de serviço
CREATE OR REPLACE VIEW "VW_DESEMPENHO_PRESTADORES" AS
SELECT
    ps.usrid AS prestador_id,
    ps.pvdcmp AS prestador,

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

LEFT JOIN "SOLICITACOES" s
    ON s.pvdid = ps.usrid

LEFT JOIN "STATUS_SOLICITACAO" st
    ON st.stsid = s.stsid

GROUP BY
    ps.usrid,
    ps.pvdcmp;
