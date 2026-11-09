const express = require("express");
const healthRoutes = require("./health.routes");
const solicitacoesRoutes = require("./solicitacoes.routes");
const authRoutes = require("./auth.routes");
const usuariosRoutes = require("./usuarios.routes");
const dashboardRoutes = require("./dashboard.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/solicitacoes", solicitacoesRoutes);
router.use("/auth", authRoutes);
router.use("/usuarios", usuariosRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
