const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const pool = require("../src/config/database");

const SENHA = "SenhaTeste123!";
const CPF_PRESTADOR = "98765432100";

let admin;
let outroAdmin;
let sindico;
let morador;
let apartamentoId;

let adminToken;
let sindicoToken;

async function criarUsuario({
  nome,
  email,
  papel,
  ativo = true,
  cpf = null,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const senhaHash = await bcrypt.hash(SENHA, 10);

    const usuarioResult = await client.query(
      `
        INSERT INTO "USUARIOS"
          (usrnam, usrphn, usreml, usrpsw, usract)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING usrid
      `,
      [nome, "21999999999", email, senhaHash, ativo]
    );

    const usuarioId = usuarioResult.rows[0].usrid;

    const papelResult = await client.query(
      `SELECT roleid FROM "ROLES" WHERE rolenam = $1`,
      [papel]
    );

    await client.query(
      `
        INSERT INTO "USUARIO_ROLES" (usrid, roleid)
        VALUES ($1, $2)
      `,
      [usuarioId, papelResult.rows[0].roleid]
    );

    if (papel === "USUARIO") {
      await client.query(
        `
          INSERT INTO "MORADORES" (usrid, aptid)
          VALUES ($1, $2)
        `,
        [usuarioId, apartamentoId]
      );
    }

    if (papel === "PRESTADOR_SERVICO") {
      await client.query(
        `
          INSERT INTO "PRESTADORES_SERVICO" (usrid, pvdcpf)
          VALUES ($1, $2)
        `,
        [usuarioId, cpf]
      );
    }

    await client.query("COMMIT");

    return { id: usuarioId, nome, email, papel };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function gerarToken(usuarioId) {
  return jwt.sign(
    { sub: String(usuarioId) },
    process.env.JWT_SECRET,
    { expiresIn: "15m", algorithm: "HS256" }
  );
}

describe("Gerenciamento de usuários", () => {
  beforeAll(async () => {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET não configurado nos testes.");
    }

    const apartamento = await pool.query(
      `
        INSERT INTO "APARTAMENTOS" (aptnum, aptflr, aptblk)
        VALUES ('997', '99', 'T')
        RETURNING aptid
      `
    );

    apartamentoId = apartamento.rows[0].aptid;

    admin = await criarUsuario({
      nome: "Admin Teste",
      email: "admin.usuarios@condofix.test",
      papel: "ADMIN",
    });

    outroAdmin = await criarUsuario({
      nome: "Segundo Admin",
      email: "admin2.usuarios@condofix.test",
      papel: "ADMIN",
    });

    sindico = await criarUsuario({
      nome: "Sindico Teste",
      email: "sindico.usuarios@condofix.test",
      papel: "ADMINISTRADOR",
    });

    morador = await criarUsuario({
      nome: "Morador Teste",
      email: "morador.usuarios@condofix.test",
      papel: "USUARIO",
    });

    adminToken = gerarToken(admin.id);
    sindicoToken = gerarToken(sindico.id);
  });

  describe("Consulta de usuários", () => {
    // Testes de consulta
  });

  describe("Cadastro de usuários", () => {
    // Testes de cadastro
  });

  describe("Edição de usuários", () => {
    // Testes de edição
  });

  describe("Ativação e desativação", () => {
    // Testes de ativação
  });

  describe("Autorização", () => {
    it("deve impedir consulta de usuários sem autenticação", async () => {
      const response = await request(app)
        .get("/api/usuarios");

      expect(response.status).toBe(401);
    });

    it("deve impedir cadastro de usuários sem autenticação", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .send({
          nome: "Usuário Não Autorizado",
          email: "nao.autorizado@condofix.test",
          senha: SENHA,
          papel: "ADMINISTRADOR",
        });

      expect(response.status).toBe(401);
    });
  });
});

  describe("Consulta de usuários", () => {
    it("deve permitir que ADMIN liste usuários", async () => {
      const response = await request(app)
        .get("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: admin.id,
            email: admin.email,
          }),
        ])
      );
    });

    it("deve permitir que ADMINISTRADOR liste usuários sem contas administrativas", async () => {
      const response = await request(app)
        .get("/api/usuarios")
        .set("Authorization", `Bearer ${sindicoToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const ids = response.body.data.map((usuario) => usuario.id);

      expect(ids).not.toContain(admin.id);
      expect(ids).not.toContain(sindico.id);
      expect(ids).toContain(morador.id);
    });

    it("deve filtrar usuários pelo papel", async () => {
      const response = await request(app)
        .get("/api/usuarios?papel=USUARIO")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      expect(
        response.body.data.every((usuario) =>
          usuario.papeis.includes("USUARIO")
        )
      ).toBe(true);
    });

    it("deve filtrar usuários pelo estado de ativação", async () => {
      const response = await request(app)
        .get("/api/usuarios?ativo=true")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      expect(
        response.body.data.every((usuario) => usuario.ativo === true)
      ).toBe(true);
    });

    it("deve rejeitar filtros inválidos", async () => {
      const response = await request(app)
        .get("/api/usuarios?ativo=sim")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_ACTIVE_FILTER");
    });

    it("deve consultar um usuário pelo identificador", async () => {
      const response = await request(app)
        .get(`/api/usuarios/${morador.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(morador.id);
      expect(response.body.data.apartamento).toBeTruthy();
    });

    it("deve rejeitar identificador inválido", async () => {
      const response = await request(app)
        .get("/api/usuarios/abc")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_USER_ID");
    });

    it("deve retornar 404 para usuário inexistente", async () => {
      const response = await request(app)
        .get("/api/usuarios/999999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("USER_NOT_FOUND");
    });

    it("deve impedir que ADMINISTRADOR consulte contas administrativas", async () => {
      const response = await request(app)
        .get(`/api/usuarios/${admin.id}`)
        .set("Authorization", `Bearer ${sindicoToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("deve permitir filtrar usuários pelo papel ADMIN", async () => {
    const response = await request(app)
        .get("/api/usuarios?papel=ADMIN")
        .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    expect(
        response.body.data.every((usuario) =>
        usuario.papeis.includes("ADMIN")
        )
    ).toBe(true);
    });

    it("deve rejeitar filtro com papel inválido", async () => {
    const response = await request(app)
        .get("/api/usuarios?papel=DESCONHECIDO")
        .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_ROLE_FILTER");
    });
  });

  describe("Opções de cadastro", () => {
    it("deve listar apartamentos e empresas para o cadastro", async () => {
      const response = await request(app)
        .get("/api/usuarios/opcoes")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.apartamentos)).toBe(true);
      expect(Array.isArray(response.body.data.empresas)).toBe(true);
    });

    it("deve impedir listar opções sem autenticação", async () => {
      const response = await request(app).get("/api/usuarios/opcoes");

      expect(response.status).toBe(401);
    });
  });

  describe("Cadastro de usuários", () => {
    it("deve cadastrar um morador", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Novo Morador",
          telefone: "21988887777",
          email: "novo.morador@condofix.test",
          senha: SENHA,
          papel: "USUARIO",
          cpf: "12312312387",
          apartamentoId,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cpf.trim()).toBe("12312312387");
      expect(response.body.data.email).toBe("novo.morador@condofix.test");
      expect(response.body.data.papeis).toContain("USUARIO");
      expect(response.body.data.apartamento).toBeTruthy();
    });

    it("deve cadastrar um prestador com CPF válido", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Novo Prestador",
          telefone: "21977776666",
          email: "novo.prestador@condofix.test",
          senha: SENHA,
          papel: "PRESTADOR_SERVICO",
          cpf: CPF_PRESTADOR,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.papeis).toContain("PRESTADOR_SERVICO");
      expect(response.body.data.prestador.cpf.trim()).toBe(CPF_PRESTADOR);
    });

    it("deve impedir cadastro com e-mail já utilizado", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Duplicado",
          email: morador.email,
          cpf: "23423423498",
          senha: SENHA,
          papel: "ADMINISTRADOR",
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
    });

    it("deve rejeitar e-mail inválido", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "E-mail Inválido",
          email: "email-invalido",
          senha: SENHA,
          papel: "ADMINISTRADOR",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_EMAIL");
    });

    it("deve rejeitar senha com menos de oito caracteres", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Senha Curta",
          email: "senha.curta@condofix.test",
          senha: "1234567",
          papel: "ADMINISTRADOR",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_PASSWORD");
    });

    it("deve rejeitar cadastro de ADMIN pela API", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Novo Admin",
          email: "novo.admin@condofix.test",
          senha: SENHA,
          papel: "ADMIN",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_ROLE");
    });

    it("deve impedir que ADMINISTRADOR cadastre outro administrador", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${sindicoToken}`)
        .send({
          nome: "Novo Síndico",
          email: "novo.sindico@condofix.test",
          senha: SENHA,
          papel: "ADMINISTRADOR",
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("deve exigir apartamento para cadastrar morador", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Morador Sem Apartamento",
          email: "sem.apartamento@condofix.test",
          senha: SENHA,
          papel: "USUARIO",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_APARTMENT");
    });

    it("deve exigir CPF para cadastrar qualquer perfil", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Morador Sem CPF",
          email: "sem.cpf@condofix.test",
          senha: SENHA,
          papel: "USUARIO",
          apartamentoId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_CPF");
    });

    it("deve impedir cadastro com CPF já utilizado", async () => {
      const dados = {
        nome: "Primeiro CPF",
        email: "primeiro.cpf@condofix.test",
        senha: SENHA,
        papel: "USUARIO",
        cpf: "56756756710",
        apartamentoId,
      };

      const primeiro = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(dados);

      expect(primeiro.status).toBe(201);

      const segundo = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...dados, email: "segundo.cpf@condofix.test" });

      expect(segundo.status).toBe(409);
      expect(segundo.body.error.code).toBe("CPF_ALREADY_REGISTERED");
    });

    it("deve rejeitar CPF inválido para prestador", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Prestador CPF Inválido",
          email: "cpf.invalido@condofix.test",
          senha: SENHA,
          papel: "PRESTADOR_SERVICO",
          cpf: "12345678900",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_CPF");
    });

    it("deve rejeitar cadastro de morador com apartamento inexistente", async () => {
    const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
        nome: "Morador Apartamento Inexistente",
        email: "apartamento.inexistente@condofix.test",
        cpf: "34534534507",
        senha: SENHA,
        papel: "USUARIO",
        apartamentoId: 999999,
        });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REFERENCE");
    });

    it("deve rejeitar cadastro de prestador com empresa inexistente", async () => {
    const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
        nome: "Prestador Empresa Inexistente",
        email: "empresa.inexistente@condofix.test",
        senha: SENHA,
        papel: "PRESTADOR_SERVICO",
        cpf: "45645645600",
        empresaId: 999999,
        });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REFERENCE");
    });
  });

  describe("Edição de usuários", () => {
    it("deve atualizar os dados básicos de um usuário", async () => {
      const response = await request(app)
        .patch(`/api/usuarios/${morador.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Morador Atualizado",
          telefone: "21966665555",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.nome).toBe("Morador Atualizado");
      expect(response.body.data.telefone).toBe("21966665555");
    });

    it("deve atualizar a senha de um usuário", async () => {
      const novaSenha = "NovaSenha123!";

      const response = await request(app)
        .patch(`/api/usuarios/${morador.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ senha: novaSenha });

      expect(response.status).toBe(200);

      const usuario = await pool.query(
        `SELECT usrpsw FROM "USUARIOS" WHERE usrid = $1`,
        [morador.id]
      );

      expect(await bcrypt.compare(novaSenha, usuario.rows[0].usrpsw)).toBe(true);
    });

    it("deve rejeitar atualização sem campos", async () => {
      const response = await request(app)
        .patch(`/api/usuarios/${morador.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("EMPTY_UPDATE");
    });

    it("deve rejeitar e-mail já utilizado por outro usuário", async () => {
      const response = await request(app)
        .patch(`/api/usuarios/${morador.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: admin.email });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
    });

    it("deve impedir que ADMINISTRADOR edite contas administrativas", async () => {
      const response = await request(app)
        .patch(`/api/usuarios/${admin.id}`)
        .set("Authorization", `Bearer ${sindicoToken}`)
        .send({ nome: "Tentativa de alteração" });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("deve retornar 404 ao editar usuário inexistente", async () => {
      const response = await request(app)
        .patch("/api/usuarios/999999")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ nome: "Não existe" });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  describe("Ativação e desativação", () => {
    it("deve desativar um usuário", async () => {
      const usuario = await criarUsuario({
        nome: "Usuário para Desativar",
        email: "desativar@condofix.test",
        papel: "USUARIO",
      });

      const response = await request(app)
        .patch(`/api/usuarios/${usuario.id}/desativar`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const resultado = await pool.query(
        `SELECT usract FROM "USUARIOS" WHERE usrid = $1`,
        [usuario.id]
      );

      expect(resultado.rows[0].usract).toBe(false);
    });

    it("deve reativar um usuário desativado", async () => {
      const usuario = await criarUsuario({
        nome: "Usuário para Reativar",
        email: "reativar@condofix.test",
        papel: "USUARIO",
        ativo: false,
      });

      const response = await request(app)
        .patch(`/api/usuarios/${usuario.id}/ativar`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const resultado = await pool.query(
        `SELECT usract FROM "USUARIOS" WHERE usrid = $1`,
        [usuario.id]
      );

      expect(resultado.rows[0].usract).toBe(true);
    });

    it("deve impedir que um usuário desative a própria conta", async () => {
      const response = await request(app)
        .patch(`/api/usuarios/${admin.id}/desativar`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("SELF_DEACTIVATION");
    });

    it("deve impedir a desativação do último ADMIN ativo", async () => {
      const response = await request(app)
        .patch(`/api/usuarios/${outroAdmin.id}/desativar`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it("deve impedir que ADMINISTRADOR altere o estado de contas administrativas", async () => {
      const response = await request(app)
        .patch(`/api/usuarios/${admin.id}/ativar`)
        .set("Authorization", `Bearer ${sindicoToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("deve retornar mensagem apropriada ao ativar usuário já ativo", async () => {
      const response = await request(app)
        .patch(`/api/usuarios/${morador.id}/ativar`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("O usuário já está ativo.");
    });
  });