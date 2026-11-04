
const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
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

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      !Array.isArray(payload.papeis) ||
      !payload.papeis.every((papel) => typeof papel === "string")
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Token inválido.",
        },
      });
    }

    req.usuario = {
      id: Number(payload.sub),
      papeis: payload.papeis,
    };

    if (!Number.isSafeInteger(req.usuario.id) || req.usuario.id <= 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Token inválido.",
        },
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token inválido ou expirado.",
      },
    });
  }
}

module.exports = autenticar;
