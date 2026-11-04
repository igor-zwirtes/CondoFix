
function exigirPapel(...papeisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Autenticação necessária.",
        },
      });
    }

    const autorizado = req.usuario.papeis.some((papel) =>
      papeisPermitidos.includes(papel)
    );

    if (!autorizado) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Você não tem permissão para acessar este recurso.",
        },
      });
    }

    next();
  };
}

module.exports = exigirPapel;
