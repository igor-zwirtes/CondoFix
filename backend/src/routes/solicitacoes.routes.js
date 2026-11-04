
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
      const resultado = await pool.query(
        `SELECT soid, sotit, sodcp, soopn, socls
         FROM "SOLICITACOES"
         WHERE soid = $1`,
        [id]
      );

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
