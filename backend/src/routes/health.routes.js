const express = require("express");
const pool = require("../config/database");

const router = express.Router();

// GET /api/health
router.get("/", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      success: true,
      data: {
        status: "ok",
        database: "connected",
      },
    });
  } catch (error) {
    const err = new Error("Não foi possível conectar ao banco de dados.");
    err.status = 503;
    err.code = "DATABASE_UNAVAILABLE";

    return next(err);
  }
});

module.exports = router;