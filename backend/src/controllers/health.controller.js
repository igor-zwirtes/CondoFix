const healthService = require("../services/health.service");

// GET /api/health

const checkHealth = async (req, res, next) => {
  try {
    await healthService.checkDatabase();

    return res.status(200).json({
      success: true,
      data: {
        status: "ok",
        database: "connected",
      },
    });
  } catch (error) {
    const err = new Error("Não foi possível conectar ao banco de dados.");
    err.status = 503;
    err.code = "DATABASE_UNAVAILABLE";

    return next(err);
  }
};

module.exports = {
  checkHealth,
};
