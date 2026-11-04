
const express = require("express");
const authService = require("../services/auth.service");

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, senha } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof senha !== "string" ||
      !email.trim() ||
      !senha
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS_FORMAT",
          message: "Informe e-mail e senha.",
        },
      });
    }

    const resultado = await authService.login(
      email.trim(),
      senha
    );

    if (!resultado) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_LOGIN",
          message: "E-mail ou senha incorretos.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
