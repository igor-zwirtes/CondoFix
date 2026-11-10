const express = require("express");
const controller = require("../controllers/solicitacoes.controller");
const autenticar = require("../middlewares/auth.middleware");
const exigirPapel = require("../middlewares/require-role.middleware");

const router = express.Router();

router.get(
  "/",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO", "PRESTADOR_SERVICO"),
  controller.listar
);

router.get(
  "/opcoes",
  autenticar,
  exigirPapel("USUARIO"),
  controller.obterOpcoes
);

router.get(
  "/prestadores",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR"),
  controller.listarPrestadores
);

router.get(
  "/:id",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO", "PRESTADOR_SERVICO"),
  controller.obterPorId
);

router.get(
  "/:id/historico",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO", "PRESTADOR_SERVICO"),
  controller.obterHistorico
);

router.patch(
  "/:id/status",
  autenticar,
  exigirPapel("PRESTADOR_SERVICO"),
  controller.atualizarStatus
);

router.patch(
  "/:id/prestador",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR"),
  controller.atribuirPrestador
);

router.post(
  "/",
  autenticar,
  exigirPapel("USUARIO"),
  controller.criar
);

router.patch(
  "/:id/cancelar",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO"),
  controller.cancelar
);

router.patch(
  "/:id/aprovar",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR"),
  controller.aprovar
);

router.patch(
  "/:id/aceitar",
  autenticar,
  exigirPapel("USUARIO"),
  controller.aceitar
);

router.post(
  "/:id/faturamento",
  autenticar,
  exigirPapel("PRESTADOR_SERVICO"),
  controller.registrarFaturamento
);

router.patch(
  "/:id/finalizar",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR"),
  controller.finalizar
);

router.get(
  "/:id/faturamento",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO", "PRESTADOR_SERVICO"),
  controller.obterFaturamento
);

router.patch(
  "/:id/reabrir",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO"),
  controller.reabrir
);

router.patch(
  "/:id/prioridade",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR"),
  controller.atualizarPrioridade
);

module.exports = router;
