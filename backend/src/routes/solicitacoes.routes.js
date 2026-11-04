const express = require("express");
const pool = require("../config/database");
const autenticar = require("../middlewares/auth.middleware");
const exigirPapel = require("../middlewares/require-role.middleware");

const router = express.Router();

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

module.exports = router;
