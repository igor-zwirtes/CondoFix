const pool = require("../config/database");

async function checkDatabase() {
  await pool.query("SELECT 1");
}

module.exports = { checkDatabase };
