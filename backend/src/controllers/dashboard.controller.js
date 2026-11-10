const dashboardService = require("../services/dashboard.service");
// GET /api/dashboard/resumo

const getResumo = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await dashboardService.getResumo(),
    });
  } catch (error) {
    next(error);
  }
};

const getCategorias = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await dashboardService.getCategorias(),
    });
  } catch (error) {
    next(error);
  }
};

const getFaturamento = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await dashboardService.getFaturamento(),
    });
  } catch (error) {
    next(error);
  }
};

const getRecentes = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await dashboardService.getRecentes(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResumo,
  getCategorias,
  getFaturamento,
  getRecentes,
};
