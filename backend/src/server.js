require("dotenv").config();

const app = require("./app");
const pool = require("./config/database");

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    // Confirma que o banco está acessível antes de iniciar a API.
    await pool.query("SELECT 1");

    const server = app.listen(PORT, () => {
      console.log(`CondoFix API disponível em http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });

    // Encerramento controlado para evitar conexões abertas.
    function shutdown(signal) {
      console.log(`${signal} recebido. Encerrando servidor...`);

      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    }

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Não foi possível iniciar a API:", error.message);
    await pool.end();
    process.exit(1);
  }
}

startServer();