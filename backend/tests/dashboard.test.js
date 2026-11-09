const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const pool = require("../src/config/database");

const SENHA = "SenhaTeste123!";

let adminToken;
let sindicoToken;
let moradorToken;
let apartamentoId;
let categoriaId;
let solicitacoesCriadas = [];

async function criarUsuario({ nome, email, papel, aptid = null }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const senhaHash = await bcrypt.hash(SENHA, 10);

    const usuario = await client.query(
      `
        INSERT INTO "USUARIOS"
          (usrnam, usrphn, usreml, usrpsw, usract)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING usrid
      `,
      [nome, "21999999999", email, senhaHash]
    );

    const usuarioId = usuario.rows[0].usrid;

    const papelResult = await client.query(
      `SELECT roleid FROM "ROLES" WHERE rolenam = $1`,
      [papel]
    );

    if (papelResult.rows.length === 0) {
      throw new Error(`Papel ${papel} não encontrado.`);
    }

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
        [usuarioId, aptid]
      );
    }

    await client.query("COMMIT");

    return usuarioId;
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

async function criarSolicitacao(titulo) {
  const response = await request(app)
    .post("/api/solicitacoes")
    .set("Authorization", `Bearer ${moradorToken}`)
    .send({
      titulo,
      descricao: "Solicitação criada para testar o dashboard.",
      apartamentoId,
      categoriaId,
    });

  if (response.status !== 201) {
    throw new Error(
      `Falha ao criar solicitação de teste: ${JSON.stringify(response.body)}`
    );
  }

  solicitacoesCriadas.push(response.body.data.id);

  return response.body.data.id;
}

describe("Dashboard", () => {
  beforeAll(async () => {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET não configurado nos testes.");
    }

    const sufixo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const apartamento = await pool.query(
      `
        INSERT INTO "APARTAMENTOS" (aptnum, aptflr, aptblk)
        VALUES ($1, '98', 'D')
        RETURNING aptid
      `,
      [sufixo.slice(-8)]
    );

    apartamentoId = apartamento.rows[0].aptid;

    const categoria = await pool.query(
      `
        SELECT catid
        FROM "CATEGORIAS_SOLICITACAO"
        WHERE catnom = 'Eletrica'
      `
    );

    if (categoria.rows.length === 0) {
      throw new Error('Categoria "Eletrica" não encontrada.');
    }

    categoriaId = categoria.rows[0].catid;

    const adminId = await criarUsuario({
      nome: "Admin Dashboard",
      email: `admin.dashboard.${sufixo}@condofix.test`,
      papel: "ADMIN",
    });

    const sindicoId = await criarUsuario({
      nome: "Síndico Dashboard",
      email: `sindico.dashboard.${sufixo}@condofix.test`,
      papel: "ADMINISTRADOR",
    });

    const moradorId = await criarUsuario({
      nome: "Morador Dashboard",
      email: `morador.dashboard.${sufixo}@condofix.test`,
      papel: "USUARIO",
      aptid: apartamentoId,
    });

    adminToken = gerarToken(adminId);
    sindicoToken = gerarToken(sindicoId);
    moradorToken = gerarToken(moradorId);

    // Cria solicitações próprias para testar os indicadores e recentes.
    for (let i = 1; i <= 12; i++) {
      await criarSolicitacao(`Solicitação Dashboard ${i}`);
    }
  });

  describe("Autorização", () => {
    const endpoints = [
      "/api/dashboard/resumo",
      "/api/dashboard/categorias",
      "/api/dashboard/faturamento",
      "/api/dashboard/recentes",
    ];

    test.each(endpoints)(
      "deve impedir acesso sem autenticação a %s",
      async (endpoint) => {
        const response = await request(app).get(endpoint);

        expect(response.status).toBe(401);
      }
    );

    test.each(endpoints)(
      "deve impedir acesso de morador a %s",
      async (endpoint) => {
        const response = await request(app)
          .get(endpoint)
          .set("Authorization", `Bearer ${moradorToken}`);

        expect(response.status).toBe(403);
      }
    );

    test.each(endpoints)(
      "deve permitir acesso de ADMIN a %s",
      async (endpoint) => {
        const response = await request(app)
          .get(endpoint)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
      }
    );

    test.each(endpoints)(
      "deve permitir acesso de ADMINISTRADOR a %s",
      async (endpoint) => {
        const response = await request(app)
          .get(endpoint)
          .set("Authorization", `Bearer ${sindicoToken}`);

        expect(response.status).toBe(200);
      }
    );
  });

  describe("Resumo", () => {
    test("deve retornar os indicadores gerais do sistema", async () => {
      const response = await request(app)
        .get("/api/dashboard/resumo")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          totalSolicitacoes: expect.any(Number),
          usuariosAtivos: expect.any(Number),
          solicitacoesPorStatus: expect.any(Array),
        })
      );

      expect(
        response.body.data.avaliacaoMedia === null ||
        typeof response.body.data.avaliacaoMedia === "string" ||
        typeof response.body.data.avaliacaoMedia === "number"
      ).toBe(true);
    });

    test("deve contabilizar as solicitações criadas", async () => {
      const response = await request(app)
        .get("/api/dashboard/resumo")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalSolicitacoes).toBeGreaterThanOrEqual(
        solicitacoesCriadas.length
      );
    });

    test("deve retornar a quantidade de solicitações por status", async () => {
      const response = await request(app)
        .get("/api/dashboard/resumo")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const status = response.body.data.solicitacoesPorStatus;

      expect(status.length).toBeGreaterThan(0);

      for (const item of status) {
        expect(item).toEqual({
          status: expect.any(String),
          quantidade: expect.any(Number),
        });
      }

      expect(status.some((item) => item.status === "Aberta")).toBe(true);
    });
  });

  describe("Categorias", () => {
    test("deve retornar as categorias e suas quantidades", async () => {
      const response = await request(app)
        .get("/api/dashboard/categorias")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: categoriaId,
            categoria: "Eletrica",
            quantidade: expect.any(Number),
          }),
        ])
      );
    });

    test("deve incluir categorias sem solicitações", async () => {
      const response = await request(app)
        .get("/api/dashboard/categorias")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const categorias = response.body.data;

      expect(categorias.every((item) => item.quantidade >= 0)).toBe(true);
    });

    test("deve ordenar categorias por quantidade decrescente", async () => {
      const response = await request(app)
        .get("/api/dashboard/categorias")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const quantidades = response.body.data.map(
        (item) => item.quantidade
      );

      expect(quantidades).toEqual(
        [...quantidades].sort((a, b) => b - a)
      );
    });
  });

  describe("Faturamento", () => {
    it("deve retornar os indicadores de faturamento", async () => {
    const response = await request(app)
        .get("/api/dashboard/faturamento")
        .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data).toEqual(
        expect.objectContaining({
        quantidadeFaturamentos: expect.any(Number),
        totalFaturado: expect.any(String),
        })
    );

    expect(
        response.body.data.ticketMedio === null ||
        typeof response.body.data.ticketMedio === "string" ||
        typeof response.body.data.ticketMedio === "number"
    ).toBe(true);
    });

    test("deve retornar valores não negativos", async () => {
      const response = await request(app)
        .get("/api/dashboard/faturamento")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      expect(response.body.data.quantidadeFaturamentos).toBeGreaterThanOrEqual(0);
      expect(Number(response.body.data.totalFaturado)).toBeGreaterThanOrEqual(0);

      if (response.body.data.ticketMedio !== null) {
        expect(Number(response.body.data.ticketMedio)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Solicitações recentes", () => {
    test("deve retornar as solicitações recentes", async () => {
      const response = await request(app)
        .get("/api/dashboard/recentes")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            titulo: expect.any(String),
            status: expect.any(String),
            categoria: expect.any(String),
            morador: expect.any(String),
          }),
        ])
      );
    });

    test("deve limitar o resultado a dez solicitações", async () => {
      const response = await request(app)
        .get("/api/dashboard/recentes")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
    });

    test("deve incluir as solicitações criadas nos resultados recentes", async () => {
      const response = await request(app)
        .get("/api/dashboard/recentes")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const ids = response.body.data.map((item) => item.id);

      expect(ids).toContain(solicitacoesCriadas[11]);
      expect(ids).toContain(solicitacoesCriadas[10]);
    });

    test("deve ordenar as solicitações por data de abertura decrescente", async () => {
      const response = await request(app)
        .get("/api/dashboard/recentes")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const datas = response.body.data.map(
        (item) => new Date(item.data_abertura).getTime()
      );

      expect(datas).toEqual(
        [...datas].sort((a, b) => b - a)
      );
    });

    test("deve retornar os dados do apartamento", async () => {
      const response = await request(app)
        .get("/api/dashboard/recentes")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const solicitacao = response.body.data.find(
        (item) => solicitacoesCriadas.includes(item.id)
      );

      expect(solicitacao).toBeDefined();
      expect(solicitacao.apartamento).toBeDefined();
      expect(solicitacao.andar).toBeDefined();
      expect(solicitacao.bloco).toBeDefined();
    });
  });
});
