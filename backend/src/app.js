const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const apiRoutes = require("./routes");
const requestLogger = require("./middlewares/request-logger");
const notFound = require("./middlewares/not-found");
const errorHandler = require("./middlewares/error-handler");

const app = express();

// Cabeçalhos HTTP de segurança.
app.use(helmet());

// Permite requisições do frontend configurado no .env.
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Converte corpos JSON em objetos JavaScript.
app.use(express.json({ limit: "1mb" }));

// Registra método, caminho, status e duração das requisições.
app.use(requestLogger);

// Todas as rotas da API ficam sob /api.
app.use("/api", apiRoutes);

// Middleware de rota inexistente: precisa vir depois das rotas.
app.use(notFound);

// Tratamento centralizado de erros: precisa ser o último middleware.
app.use(errorHandler);

module.exports = app;