const express = require("express");
const healthRoutes = require("./health.routes");
const solicitacoesRoutes = require("./solicitacoes.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/solicitacoes", solicitacoesRoutes);

module.exports = router;
