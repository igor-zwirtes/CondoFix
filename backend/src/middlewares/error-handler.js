function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err.status) ? err.status : 500;

  const isServerError = status >= 500;

  if (isServerError) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    error: {
      code: err.code || (isServerError ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR"),
      message: isServerError
        ? "Ocorreu um erro interno no servidor."
        : err.message,
    },
  });
}

module.exports = errorHandler;