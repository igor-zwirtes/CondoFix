const express = require("express");
const pool = require("../config/database");
const autenticar = require("../middlewares/auth.middleware");
const exigirPapel = require("../middlewares/require-role.middleware");

const router = express.Router();

router.get(
  "/",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO", "PRESTADOR_SERVICO"),
  async (req, res, next) => {
    try {
      const papeis = req.usuario.papeis;
      const acessoTotal = papeis.some((papel) =>
        ["ADMIN", "ADMINISTRADOR"].includes(papel)
      );

      const filtros = [];
      const parametros = [];

      if (!acessoTotal) {
        if (papeis.includes("USUARIO")) {
          parametros.push(req.usuario.id);
          filtros.push(`s.usrid = $${parametros.length}`);
        }

        if (papeis.includes("PRESTADOR_SERVICO")) {
          parametros.push(req.usuario.id);
          filtros.push(`s.pvdid = $${parametros.length}`);
        }

        if (filtros.length === 0) {
          return res.status(403).json({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Você não tem permissão para acessar este recurso.",
            },
          });
        }
      }

      let sql = `
        SELECT
          s.soid AS id,
          s.sotit AS titulo,
          s.sodcp AS descricao,
          s.soopn AS data_abertura,
          s.socls AS data_fechamento,
          st.stsnom AS status,
          pr.prinom AS prioridade,
          c.catnom AS categoria,
          s.usrid AS solicitante_id,
          solicitante.usrnam AS solicitante,
          s.pvdid AS prestador_id,
          prestador.usrnam AS prestador
        FROM "SOLICITACOES" s
        JOIN "STATUS_SOLICITACAO" st
          ON st.stsid = s.stsid
        JOIN "PRIORIDADES_SOLICITACAO" pr
          ON pr.priid = s.priid
        JOIN "CATEGORIAS_SOLICITACAO" c
          ON c.catid = s.catid
        JOIN "USUARIOS" solicitante
          ON solicitante.usrid = s.usrid
        LEFT JOIN "USUARIOS" prestador
          ON prestador.usrid = s.pvdid
      `;

      if (!acessoTotal) {
        sql += ` WHERE (${filtros.join(" OR ")})`;
      }

      sql += " ORDER BY s.soopn DESC, s.soid DESC";

      const resultado = await pool.query(sql, parametros);

      return res.status(200).json({
        success: true,
        quantidade: resultado.rows.length,
        data: resultado.rows,
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/:id",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO", "PRESTADOR_SERVICO"),
  async (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    try {
      const papeis = req.usuario.papeis;
      const acessoTotal = papeis.some((papel) =>
        ["ADMIN", "ADMINISTRADOR"].includes(papel)
      );

      const filtros = [];
      const parametros = [id];

      if (!acessoTotal) {
        if (papeis.includes("USUARIO")) {
          parametros.push(req.usuario.id);
          filtros.push(`s.usrid = $${parametros.length}`);
        }

        if (papeis.includes("PRESTADOR_SERVICO")) {
          parametros.push(req.usuario.id);
          filtros.push(`s.pvdid = $${parametros.length}`);
        }

        if (filtros.length === 0) {
          return res.status(403).json({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Você não tem permissão para acessar este recurso.",
            },
          });
        }
      }

      let sql = `
        SELECT s.soid, s.sotit, s.sodcp, s.soopn, s.socls
        FROM "SOLICITACOES" s
        WHERE s.soid = $1
      `;

      if (!acessoTotal) {
        sql += ` AND (${filtros.join(" OR ")})`;
      }

      const resultado = await pool.query(sql, parametros);

      if (resultado.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: resultado.rows[0],
      });
    } catch (error) {
      return next(error);
    }
  }
);


router.patch(
  "/:id/status",
  autenticar,
  exigirPapel("PRESTADOR_SERVICO"),
  async (req, res, next) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    const transicoesPermitidas = {
      Atribuida: "Em andamento",
      "Em andamento": "Concluida",
    };

    if (typeof status !== "string" ||
        !Object.values(transicoesPermitidas).includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: "Status solicitado inválido.",
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const consulta = await client.query(
        `SELECT s.soid, s.pvdid, s.stsid, st.stsnom
         FROM "SOLICITACOES" s
         JOIN "STATUS_SOLICITACAO" st ON st.stsid = s.stsid
         WHERE s.soid = $1
         FOR UPDATE OF s`,
        [id]
      );

      if (consulta.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const solicitacao = consulta.rows[0];

      if (solicitacao.pvdid !== req.usuario.id) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      if (transicoesPermitidas[solicitacao.stsnom] !== status) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: "Esta transição de status não é permitida.",
          },
        });
      }

      const novoStatus = await client.query(
        `SELECT stsid
         FROM "STATUS_SOLICITACAO"
         WHERE stsnom = $1`,
        [status]
      );

      if (novoStatus.rows.length === 0) {
        throw new Error(`Status não cadastrado: ${status}`);
      }

      await client.query(
        `UPDATE "SOLICITACOES"
         SET stsid = $1
         WHERE soid = $2`,
        [novoStatus.rows[0].stsid, id]
      );

      await client.query(
        `INSERT INTO "ALTERACOES" (soid, usrid, typid, altdcp)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          req.usuario.id,
          6,
          `Status alterado de "${solicitacao.stsnom}" para "${status}".`,
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        data: {
          id,
          statusAnterior: solicitacao.stsnom,
          statusAtual: status,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  }
);


router.patch(
  "/:id/prestador",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR"),
  async (req, res, next) => {
    const id = Number(req.params.id);
    const { prestadorId } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    if (
      !Number.isSafeInteger(prestadorId) ||
      prestadorId <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PROVIDER_ID",
          message: "O ID do prestador deve ser um inteiro positivo.",
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const consulta = await client.query(
        `SELECT s.soid, s.pvdid, s.stsid, st.stsnom
         FROM "SOLICITACOES" s
         JOIN "STATUS_SOLICITACAO" st
           ON st.stsid = s.stsid
         WHERE s.soid = $1
         FOR UPDATE OF s`,
        [id]
      );

      if (consulta.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const solicitacao = consulta.rows[0];

      if (
        solicitacao.stsnom !== "Aberta" ||
        solicitacao.pvdid !== null
      ) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: {
            code: "REQUEST_NOT_ASSIGNABLE",
            message:
              "A solicitação precisa estar Aberta e sem prestador atribuído.",
          },
        });
      }

      const prestador = await client.query(
        `SELECT p.usrid
         FROM "PRESTADORES_SERVICO" p
         WHERE p.usrid = $1`,
        [prestadorId]
      );

      if (prestador.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "PROVIDER_NOT_FOUND",
            message: "Prestador de serviço não encontrado.",
          },
        });
      }

      const statusAtribuida = await client.query(
        `SELECT stsid
         FROM "STATUS_SOLICITACAO"
         WHERE stsnom = $1`,
        ["Atribuida"]
      );

      if (statusAtribuida.rows.length === 0) {
        throw new Error('Status "Atribuida" não cadastrado.');
      }

      await client.query(
        `UPDATE "SOLICITACOES"
         SET pvdid = $1,
             stsid = $2
         WHERE soid = $3`,
        [prestadorId, statusAtribuida.rows[0].stsid, id]
      );

      await client.query(
        `INSERT INTO "ALTERACOES" (soid, usrid, typid, altdcp)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          req.usuario.id,
          3,
          `Prestador atribuído: usuário ${prestadorId}.`,
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        data: {
          id,
          prestadorId,
          statusAnterior: solicitacao.stsnom,
          statusAtual: "Atribuida",
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
