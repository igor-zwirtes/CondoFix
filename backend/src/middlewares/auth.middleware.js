const jwt = require("jsonwebtoken");
const pool = require("../config/database");

async function autenticar(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: {
        code: "TOKEN_REQUIRED",
        message: "Token de autenticação não informado.",
      },
    });
  }

  const token = authorization.slice(7);

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token inválido ou expirado.",
      },
    });
  }

  const usuarioId = Number(payload.sub);

  if (
    typeof payload.sub !== "string" ||
    !Number.isSafeInteger(usuarioId) ||
    usuarioId <= 0
  ) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token inválido.",
      },
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT
         u.usrid,
         COALESCE(
           array_agg(r.rolenam)
             FILTER (WHERE r.rolenam IS NOT NULL),
           ARRAY[]::varchar[]
         ) AS papeis
       FROM "USUARIOS" u
       LEFT JOIN "USUARIO_ROLES" ur
         ON ur.usrid = u.usrid
       LEFT JOIN "ROLES" r
         ON r.roleid = ur.roleid
       WHERE u.usrid = $1
         AND u.usract = TRUE
       GROUP BY u.usrid`,
      [usuarioId]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INACTIVE_USER",
          message: "Usuário inexistente ou desativado.",
        },
      });
    }

    req.usuario = {
      id: resultado.rows[0].usrid,
      papeis: resultado.rows[0].papeis,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = autenticar;