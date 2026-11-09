const express = require("express");
const pool = require("../config/database");
const autenticar = require("../middlewares/auth.middleware");
const exigirPapel = require("../middlewares/require-role.middleware");

const router = express.Router();

router.use(autenticar, exigirPapel("ADMIN", "ADMINISTRADOR"));

// GET /api/dashboard/resumo
router.get("/resumo", async (req, res, next) => {
  try {
    const [resumo, status] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::integer AS total_solicitacoes,
          (
            SELECT COUNT(*)::integer
            FROM "USUARIOS"
            WHERE usract = TRUE
          ) AS usuarios_ativos,
          (
            SELECT ROUND(AVG(evascr)::numeric, 2)
            FROM "AVALIACOES"
          ) AS avaliacao_media
        FROM "SOLICITACOES"
      `),

      pool.query(`
        SELECT
          st.stsnom AS status,
          COUNT(s.soid)::integer AS quantidade
        FROM "STATUS_SOLICITACAO" st
        LEFT JOIN "SOLICITACOES" s
          ON s.stsid = st.stsid
        GROUP BY st.stsid, st.stsnom
        ORDER BY st.stsid
      `),
    ]);

    const dados = resumo.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        totalSolicitacoes: dados.total_solicitacoes,
        usuariosAtivos: dados.usuarios_ativos,
        avaliacaoMedia: dados.avaliacao_media,
        solicitacoesPorStatus: status.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/categorias
router.get("/categorias", async (req, res, next) => {
  try {
    const resultado = await pool.query(`
      SELECT
        c.catid AS id,
        c.catnom AS categoria,
        COUNT(s.soid)::integer AS quantidade
      FROM "CATEGORIAS_SOLICITACAO" c
      LEFT JOIN "SOLICITACOES" s
        ON s.catid = c.catid
      GROUP BY c.catid, c.catnom
      ORDER BY quantidade DESC, c.catnom
    `);

    return res.status(200).json({
      success: true,
      data: resultado.rows,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/faturamento
router.get("/faturamento", async (req, res, next) => {
  try {
    const resultado = await pool.query(`
      SELECT
        COUNT(*)::integer AS quantidade_faturamentos,
        COALESCE(SUM(fatval), 0)::numeric(12, 2) AS total_faturado,
        ROUND(AVG(fatval), 2) AS ticket_medio
      FROM "FATURAMENTOS"
    `);

    const dados = resultado.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        quantidadeFaturamentos: dados.quantidade_faturamentos,
        totalFaturado: dados.total_faturado,
        ticketMedio: dados.ticket_medio,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/recentes
router.get("/recentes", async (req, res, next) => {
  try {
    const resultado = await pool.query(`
      SELECT
        s.soid AS id,
        s.sotit AS titulo,
        st.stsnom AS status,
        c.catnom AS categoria,
        u.usrnam AS morador,
        a.aptnum AS apartamento,
        a.aptflr AS andar,
        a.aptblk AS bloco,
        s.soopn AS data_abertura
      FROM "SOLICITACOES" s
      JOIN "STATUS_SOLICITACAO" st
        ON st.stsid = s.stsid
      JOIN "CATEGORIAS_SOLICITACAO" c
        ON c.catid = s.catid
      JOIN "USUARIOS" u
        ON u.usrid = s.usrid
      JOIN "APARTAMENTOS" a
        ON a.aptid = s.aptid
      ORDER BY s.soopn DESC, s.soid DESC
      LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      data: resultado.rows,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
