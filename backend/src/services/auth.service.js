
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

async function login(email, senha) {
  const resultado = await pool.query(
    `SELECT
       u.usrid,
       u.usrnam,
       u.usreml,
       u.usrpsw,
       COALESCE(
         array_agg(r.rolenam)
           FILTER (WHERE r.rolenam IS NOT NULL),
         ARRAY[]::varchar[]
       ) AS papeis
     FROM "USUARIOS" u
     LEFT JOIN "USUARIO_ROLES" ur
       ON ur.usrid = u.usrid
     LEFT JOIN "ROLES" r
       ON r.roleid = ur.roleid
     WHERE LOWER(u.usreml) = LOWER($1)
     GROUP BY u.usrid`,
    [email]
  );

  if (resultado.rows.length === 0) {
    return null;
  }

  const usuario = resultado.rows[0];
  const senhaValida = await bcrypt.compare(
    senha,
    usuario.usrpsw
  );

  if (!senhaValida) {
    return null;
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não configurado.");
  }

  const token = jwt.sign(
    {
      sub: String(usuario.usrid),
      papeis: usuario.papeis,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
      algorithm: "HS256",
    }
  );

  return {
    token,
    usuario: {
      id: usuario.usrid,
      nome: usuario.usrnam,
      email: usuario.usreml,
      papeis: usuario.papeis,
    },
  };
}

module.exports = { login };
