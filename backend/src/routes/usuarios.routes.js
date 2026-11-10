const express = require("express");
const controller = require("../controllers/usuarios.controller");
const autenticar = require("../middlewares/auth.middleware");
const exigirPapel = require("../middlewares/require-role.middleware");

const router = express.Router();

router.use(autenticar, exigirPapel("ADMIN", "ADMINISTRADOR"));

router.get(
  "/",
  controller.listar
);

router.get(
  "/opcoes",
  controller.listarOpcoes
);

router.get(
  "/:id",
  controller.obterPorId
);

router.post(
  "/",
  controller.criar
);

router.patch(
  "/:id",
  controller.atualizar
);

router.patch(
  "/:id/desativar",
  controller.desativar
);

router.patch(
  "/:id/ativar",
  controller.ativar
);

module.exports = router;
