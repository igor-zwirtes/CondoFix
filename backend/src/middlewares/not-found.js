function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
}

module.exports = notFound;