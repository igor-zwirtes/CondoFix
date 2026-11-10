const express = require("express");
const controller = require("../controllers/dashboard.controller");
const autenticar = require("../middlewares/auth.middleware");
const exigirPapel = require("../middlewares/require-role.middleware");

const router = express.Router();

router.use(autenticar, exigirPapel("ADMIN", "ADMINISTRADOR"));

router.get(
  "/resumo",
  controller.getResumo
);

router.get(
  "/categorias",
  controller.getCategorias
);

router.get(
  "/faturamento",
  controller.getFaturamento
);

router.get(
  "/recentes",
  controller.getRecentes
);

module.exports = router;
