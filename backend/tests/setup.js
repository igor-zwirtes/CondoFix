const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

// Os testes executados no computador acessam o PostgreSQL
// pela porta publicada pelo Docker.
process.env.DB_HOST = "localhost";

// Impede que os testes utilizem o banco de desenvolvimento.
process.env.DB_NAME = "condofix_test";

const pool = require("../src/config/database");

afterAll(async () => {
  await pool.end();
});