const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const pool = require("../src/config/database");

const SENHA = "SenhaTeste123!";

let admin;
let morador;
let inativo;

let adminToken;
let moradorToken;
let tokenInativo;

let apartamentoTesteId;

async function criarUsuario({
  nome,
  email,
  senha,
  papel,
  ativo = true,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const senhaHash = await bcrypt.hash(senha, 10);

    const resultado = await client.query(
      `INSERT INTO "USUARIOS"
         (usrnam, usrphn, usreml, usrpsw, usract)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING usrid`,
      [nome, "21999999999", email, senhaHash, ativo]
    );

    const usrid = resultado.rows[0].usrid;

    // Cria o perfil do morador, quando necessário.
    if (papel === "USUARIO") {
      await client.query(
        `INSERT INTO "MORADORES" (usrid, aptid)
         VALUES ($1, $2)`,
        [usrid, apartamentoTesteId]
      );
    }

    // Atribui o papel ao usuário.
    await client.query(
      `INSERT INTO "USUARIO_ROLES" (usrid, roleid)
       SELECT $1, roleid
       FROM "ROLES"
       WHERE rolenam = $2`,
      [usrid, papel]
    );

    await client.query("COMMIT");

    return usrid;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

describe("Autenticação e autorização", () => {
    beforeAll(async () => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET não configurado para os testes.");
    }

    const apartamento = await pool.query(
        `INSERT INTO "APARTAMENTOS" (aptnum, aptflr, aptblk)
        VALUES ('999', '99', 'T')
        RETURNING aptid`
    );

    apartamentoTesteId = apartamento.rows[0].aptid;

    admin = await criarUsuario({
        nome: "Admin Teste",
        email: "admin.teste@condofix.local",
        senha: SENHA,
        papel: "ADMIN",
    });

    morador = await criarUsuario({
        nome: "Morador Teste",
        email: "morador.teste@condofix.local",
        senha: SENHA,
        papel: "USUARIO",
    });

    inativo = await criarUsuario({
        nome: "Usuario Inativo",
        email: "inativo.teste@condofix.local",
        senha: SENHA,
        papel: "ADMIN",
        ativo: false,
    });

    adminToken = jwt.sign(
        { sub: String(admin) },
        process.env.JWT_SECRET,
        { expiresIn: "15m", algorithm: "HS256" }
    );

    moradorToken = jwt.sign(
        { sub: String(morador) },
        process.env.JWT_SECRET,
        { expiresIn: "15m", algorithm: "HS256" }
    );

    tokenInativo = jwt.sign(
        { sub: String(inativo) },
        process.env.JWT_SECRET,
        { expiresIn: "15m", algorithm: "HS256" }
    );
    });

  describe("POST /api/auth/login", () => {
    it("deve realizar login com credenciais válidas", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "admin.teste@condofix.local",
          senha: SENHA,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.usuario).toMatchObject({
        id: admin,
        nome: "Admin Teste",
        email: "admin.teste@condofix.local",
        papeis: ["ADMIN"],
      });
    });

    it("deve aceitar e-mail sem diferenciar maiúsculas e minúsculas", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "ADMIN.TESTE@CONDOFIX.LOCAL",
          senha: SENHA,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("deve rejeitar senha incorreta", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "admin.teste@condofix.local",
          senha: "SenhaErrada123!",
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_LOGIN");
    });

    it("deve rejeitar e-mail inexistente", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "inexistente@condofix.local",
          senha: SENHA,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_LOGIN");
    });

    it("deve rejeitar usuário inativo", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "inativo.teste@condofix.local",
          senha: SENHA,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_LOGIN");
    });

    it("deve rejeitar requisição com dados ausentes", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(
        "INVALID_CREDENTIALS_FORMAT"
      );
    });
  });

  describe("Proteção das rotas", () => {
    it("deve rejeitar acesso sem token", async () => {
      const response = await request(app)
        .get("/api/dashboard/resumo");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("TOKEN_REQUIRED");
    });

    it("deve rejeitar token inválido", async () => {
      const response = await request(app)
        .get("/api/dashboard/resumo")
        .set("Authorization", "Bearer token-invalido");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });

    it("deve permitir acesso de ADMIN ao dashboard", async () => {
      const response = await request(app)
        .get("/api/dashboard/resumo")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("deve impedir que morador acesse o dashboard", async () => {
      const response = await request(app)
        .get("/api/dashboard/resumo")
        .set("Authorization", `Bearer ${moradorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("deve rejeitar token de usuário desativado", async () => {
      const response = await request(app)
        .get("/api/dashboard/resumo")
        .set("Authorization", `Bearer ${tokenInativo}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INACTIVE_USER");
    });
  });
});
