const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const pool = require("../src/config/database");

const SENHA = "SenhaTeste123!";

let admin;
let sindico;
let morador;
let outroMorador;
let prestador;
let outroPrestador;

let adminToken;
let sindicoToken;
let moradorToken;
let outroMoradorToken;
let prestadorToken;
let outroPrestadorToken;

let apartamentoId;
let categoriaId;

async function criarApartamento() {
  const sufixo = Date.now().toString().slice(-8);

  const resultado = await pool.query(
    `
      INSERT INTO "APARTAMENTOS" (aptnum, aptflr, aptblk)
      VALUES ($1, '99', 'T')
      RETURNING aptid
    `,
    [sufixo]
  );

  return resultado.rows[0].aptid;
}


async function criarUsuario({
  nome,
  email,
  papel,
  aptid = null,
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
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING usrid
      `,
      [nome, "21999999999", email, senhaHash]
    );

    const usuarioId = usuarioResult.rows[0].usrid;

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

async function criarSolicitacao({
  token = moradorToken,
  titulo = "Vazamento no banheiro",
  descricao = "Há um vazamento no registro do banheiro.",
  apartamento = apartamentoId,
  categoria = categoriaId,
} = {}) {
  return request(app)
    .post("/api/solicitacoes")
    .set("Authorization", `Bearer ${token}`)
    .send({
      titulo,
      descricao,
      apartamentoId: apartamento,
      categoriaId: categoria,
    });
}


async function aprovarSolicitacao(solicitacaoId) {
  return request(app)
    .patch(`/api/solicitacoes/${solicitacaoId}/aprovar`)
    .set("Authorization", `Bearer ${adminToken}`);
}

async function atribuirPrestador(
  solicitacaoId,
  prestadorId = prestador.id,
  token = adminToken
) {
  return request(app)
    .patch(`/api/solicitacoes/${solicitacaoId}/prestador`)
    .set("Authorization", `Bearer ${token}`)
    .send({ prestadorId });
}

async function criarSolicitacaoAprovada() {
  const criacao = await criarSolicitacao();

  if (criacao.status !== 201) {
    throw new Error("Não foi possível criar solicitação de teste.");
  }

  const aprovacao = await aprovarSolicitacao(criacao.body.data.id);

  if (aprovacao.status !== 200) {
    throw new Error("Não foi possível aprovar solicitação de teste.");
  }

  return criacao.body.data.id;
}

async function consultarStatus(solicitacaoId) {
  const resultado = await pool.query(
    `
      SELECT
        st.stsnom AS status,
        s.pvdid AS prestador_id
      FROM "SOLICITACOES" s
      JOIN "STATUS_SOLICITACAO" st ON st.stsid = s.stsid
      WHERE s.soid = $1
    `,
    [solicitacaoId]
  );

  return resultado.rows[0];
}

describe("Solicitações", () => {
  beforeAll(async () => {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET não configurado nos testes.");
    }

    apartamentoId = await criarApartamento();

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

    admin = await criarUsuario({
      nome: "Admin Solicitações",
      email: "admin.solicitacoes@condofix.test",
      papel: "ADMIN",
    });

    sindico = await criarUsuario({
      nome: "Síndico Solicitações",
      email: "sindico.solicitacoes@condofix.test",
      papel: "ADMINISTRADOR",
    });

    morador = await criarUsuario({
      nome: "Morador Solicitações",
      email: "morador.solicitacoes@condofix.test",
      papel: "USUARIO",
      aptid: apartamentoId,
    });

    outroMorador = await criarUsuario({
      nome: "Outro Morador Solicitações",
      email: "outro.morador.solicitacoes@condofix.test",
      papel: "USUARIO",
      aptid: apartamentoId,
    });

    prestador = await criarUsuario({
        nome: "Prestador Solicitações",
        email: "prestador.solicitacoes@condofix.test",
        papel: "PRESTADOR_SERVICO",
        cpf: "93541134780",
    });

    outroPrestador = await criarUsuario({
        nome: "Outro Prestador Solicitações",
        email: "outro.prestador.solicitacoes@condofix.test",
        papel: "PRESTADOR_SERVICO",
        cpf: "16899535009",
    });

    adminToken = gerarToken(admin.id);
    sindicoToken = gerarToken(sindico.id);
    moradorToken = gerarToken(morador.id);
    outroMoradorToken = gerarToken(outroMorador.id);
    prestadorToken = gerarToken(prestador.id);
    outroPrestadorToken = gerarToken(outroPrestador.id);
  });

  describe("Criação de solicitações", () => {
    it("deve criar uma solicitação com dados válidos", async () => {
      const response = await criarSolicitacao();

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.titulo).toBe("Vazamento no banheiro");
      expect(response.body.data.apartamentoId).toBe(apartamentoId);
      expect(response.body.data.descricao).toBe(
        "Há um vazamento no registro do banheiro."
      );
      expect(response.body.data.prestadorId).toBeNull();

      const banco = await pool.query(
        `
          SELECT
            s.sotit,
            st.stsnom AS status,
            p.prinom AS prioridade,
            s.pvdid
          FROM "SOLICITACOES" s
          JOIN "STATUS_SOLICITACAO" st ON st.stsid = s.stsid
          JOIN "PRIORIDADES_SOLICITACAO" p ON p.priid = s.priid
          WHERE s.soid = $1
        `,
        [response.body.data.id]
      );

      expect(banco.rows).toHaveLength(1);
      expect(banco.rows[0].sotit).toBe("Vazamento no banheiro");
      expect(banco.rows[0].status).toBe("Aberta");
      expect(banco.rows[0].prioridade).toBe("Normal");
      expect(banco.rows[0].pvdid).toBeNull();

      const historico = await pool.query(
        `
          SELECT a.altdcp, ta.typnom
          FROM "ALTERACOES" a
          JOIN "TIPOS_ALTERACAO" ta ON ta.typid = a.typid
          WHERE a.soid = $1
        `,
        [response.body.data.id]
      );

      expect(historico.rows).toHaveLength(1);
      expect(historico.rows[0].typnom).toBe("Criacao");
    });

    it("deve impedir criação sem autenticação", async () => {
      const response = await request(app)
        .post("/api/solicitacoes")
        .send({
          titulo: "Solicitação sem autenticação",
          descricao: "Descrição de teste.",
          apartamentoId,
          categoriaId,
        });

      expect(response.status).toBe(401);
    });

    it("deve impedir que ADMIN crie uma solicitação", async () => {
      const response = await criarSolicitacao({
        token: adminToken,
      });

      expect(response.status).toBe(403);
    });

    it("deve impedir que ADMINISTRADOR crie uma solicitação", async () => {
      const response = await criarSolicitacao({
        token: sindicoToken,
      });

      expect(response.status).toBe(403);
    });

    it("deve rejeitar dados obrigatórios ausentes", async () => {
      const response = await request(app)
        .post("/api/solicitacoes")
        .set("Authorization", `Bearer ${moradorToken}`)
        .send({
          titulo: "",
          descricao: "Descrição de teste.",
          apartamentoId,
          categoriaId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST_DATA");
    });

    it("deve rejeitar título com mais de 255 caracteres", async () => {
      const response = await criarSolicitacao({
        titulo: "A".repeat(256),
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST_DATA");
    });

    it("deve impedir solicitação para apartamento não vinculado ao morador", async () => {
      const outroApartamentoId = await criarApartamento();

      const response = await criarSolicitacao({
        apartamento: outroApartamentoId,
      });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("APARTMENT_NOT_ACCESSIBLE");
    });

    it("deve rejeitar categoria inexistente", async () => {
      const response = await criarSolicitacao({
        categoria: 999999,
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_CATEGORY");
    });

    it("deve remover espaços externos do título e da descrição", async () => {
      const response = await criarSolicitacao({
        titulo: "  Teste de espaços  ",
        descricao: "  Descrição com espaços.  ",
      });

      expect(response.status).toBe(201);
      expect(response.body.data.titulo).toBe("Teste de espaços");
      expect(response.body.data.descricao).toBe("Descrição com espaços.");
    });
  });

  describe("Consulta de solicitações", () => {
    let solicitacaoMorador;
    let solicitacaoOutroMorador;

    beforeAll(async () => {
      const primeira = await criarSolicitacao({
        titulo: "Solicitação do primeiro morador",
      });

      const segunda = await criarSolicitacao({
        token: outroMoradorToken,
        titulo: "Solicitação do segundo morador",
      });

      solicitacaoMorador = primeira.body.data.id;
      solicitacaoOutroMorador = segunda.body.data.id;
    });

    it("deve permitir que ADMIN consulte todas as solicitações", async () => {
      const response = await request(app)
        .get("/api/solicitacoes")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      const ids = response.body.data.map((item) => item.id);

      expect(ids).toContain(solicitacaoMorador);
      expect(ids).toContain(solicitacaoOutroMorador);
    });

    it("deve permitir que ADMINISTRADOR consulte todas as solicitações", async () => {
      const response = await request(app)
        .get("/api/solicitacoes")
        .set("Authorization", `Bearer ${sindicoToken}`);

      expect(response.status).toBe(200);

      const ids = response.body.data.map((item) => item.id);

      expect(ids).toContain(solicitacaoMorador);
      expect(ids).toContain(solicitacaoOutroMorador);
    });

    it("deve retornar apenas as solicitações do morador autenticado", async () => {
      const response = await request(app)
        .get("/api/solicitacoes")
        .set("Authorization", `Bearer ${moradorToken}`);

      expect(response.status).toBe(200);

      const ids = response.body.data.map((item) => item.id);

      expect(ids).toContain(solicitacaoMorador);
      expect(ids).not.toContain(solicitacaoOutroMorador);
    });

    it("deve retornar apenas as solicitações do outro morador", async () => {
      const response = await request(app)
        .get("/api/solicitacoes")
        .set("Authorization", `Bearer ${outroMoradorToken}`);

      expect(response.status).toBe(200);

      const ids = response.body.data.map((item) => item.id);

      expect(ids).toContain(solicitacaoOutroMorador);
      expect(ids).not.toContain(solicitacaoMorador);
    });

    it("deve impedir consulta sem autenticação", async () => {
      const response = await request(app).get("/api/solicitacoes");

      expect(response.status).toBe(401);
    });

    it("deve consultar uma solicitação específica", async () => {
      const response = await request(app)
        .get(`/api/solicitacoes/${solicitacaoMorador}`)
        .set("Authorization", `Bearer ${moradorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.soid).toBe(solicitacaoMorador);
    });

    it("deve permitir que ADMIN consulte solicitação de qualquer morador", async () => {
      const response = await request(app)
        .get(`/api/solicitacoes/${solicitacaoOutroMorador}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.soid).toBe(solicitacaoOutroMorador);
    });

    it("deve impedir que morador consulte solicitação de outro morador", async () => {
      const response = await request(app)
        .get(`/api/solicitacoes/${solicitacaoOutroMorador}`)
        .set("Authorization", `Bearer ${moradorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    it("deve retornar 404 para solicitação inexistente", async () => {
      const response = await request(app)
        .get("/api/solicitacoes/999999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    it("deve rejeitar ID inválido", async () => {
      const response = await request(app)
        .get("/api/solicitacoes/abc")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST_ID");
    });
  });

  describe("Histórico de solicitações", () => {
    let solicitacaoId;

    beforeAll(async () => {
      const response = await criarSolicitacao({
        titulo: "Solicitação para testar histórico",
      });

      solicitacaoId = response.body.data.id;
    });

    it("deve retornar o histórico de uma solicitação", async () => {
      const response = await request(app)
        .get(`/api/solicitacoes/${solicitacaoId}/historico`)
        .set("Authorization", `Bearer ${moradorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.quantidade).toBe(1);
      expect(response.body.data[0].tipo).toBe("Criacao");
      expect(response.body.data[0].descricao).toBe(
        "Solicitação criada pelo usuário."
      );
    });

    it("deve permitir que ADMIN consulte o histórico", async () => {
      const response = await request(app)
        .get(`/api/solicitacoes/${solicitacaoId}/historico`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it("deve impedir que outro morador consulte o histórico", async () => {
      const response = await request(app)
        .get(`/api/solicitacoes/${solicitacaoId}/historico`)
        .set("Authorization", `Bearer ${outroMoradorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    it("deve retornar 404 para histórico de solicitação inexistente", async () => {
      const response = await request(app)
        .get("/api/solicitacoes/999999/historico")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    it("deve rejeitar ID inválido no histórico", async () => {
      const response = await request(app)
        .get("/api/solicitacoes/abc/historico")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUEST_ID");
    });
  });

  
  describe("Atribuição de prestadores", () => {
    it("deve permitir que ADMIN atribua prestador a solicitação aprovada", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const response = await atribuirPrestador(solicitacaoId);

        expect(response.status).toBe(200);
        expect(response.body.data.prestadorId).toBe(prestador.id);
        expect(response.body.data.statusAtual).toBe("Atribuida");

        const banco = await consultarStatus(solicitacaoId);

        expect(banco.status).toBe("Atribuida");
        expect(banco.prestador_id).toBe(prestador.id);
    });

    it("deve permitir que ADMINISTRADOR atribua prestador", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const response = await atribuirPrestador(
        solicitacaoId,
        prestador.id,
        sindicoToken
        );

        expect(response.status).toBe(200);
        expect(response.body.data.prestadorId).toBe(prestador.id);
    });

    it("deve impedir que morador atribua prestador", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const response = await atribuirPrestador(
        solicitacaoId,
        prestador.id,
        moradorToken
        );

        expect(response.status).toBe(403);
    });

    it("deve rejeitar ID de prestador inválido", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const response = await atribuirPrestador(solicitacaoId, 0);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_PROVIDER_ID");
    });

    it("deve retornar 404 para prestador inexistente", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const response = await atribuirPrestador(solicitacaoId, 999999);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("PROVIDER_NOT_FOUND");
    });

    it("deve retornar 404 para solicitação inexistente", async () => {
        const response = await atribuirPrestador(999999);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    it("deve impedir atribuição de solicitação ainda não aprovada", async () => {
        const criacao = await criarSolicitacao();

        const response = await atribuirPrestador(criacao.body.data.id);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("REQUEST_NOT_ASSIGNABLE");
    });

    it("deve impedir atribuição de segundo prestador à mesma solicitação", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        await atribuirPrestador(solicitacaoId);

        const response = await atribuirPrestador(
        solicitacaoId,
        outroPrestador.id
        );

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("REQUEST_NOT_ASSIGNABLE");
    });

    it("deve registrar a atribuição no histórico", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        await atribuirPrestador(solicitacaoId);

        const response = await request(app)
        .get(`/api/solicitacoes/${solicitacaoId}/historico`)
        .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);

        const atribuicao = response.body.data.find(
        (item) => item.descricao ===
            `Prestador atribuído: usuário ${prestador.id}.`
        );

        expect(atribuicao).toBeDefined();
    });
    });


  describe("Transições de status pelo prestador", () => {
    async function criarSolicitacaoAtribuida() {
        const solicitacaoId = await criarSolicitacaoAprovada();
        const atribuicao = await atribuirPrestador(solicitacaoId);

        if (atribuicao.status !== 200) {
        throw new Error("Não foi possível atribuir prestador de teste.");
        }

        return solicitacaoId;
    }

    async function alterarStatus(solicitacaoId, status, token = prestadorToken) {
        return request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status });
    }

    it("deve permitir transição de Atribuida para Em andamento", async () => {
        const solicitacaoId = await criarSolicitacaoAtribuida();

        const response = await alterarStatus(
        solicitacaoId,
        "Em andamento"
        );

        expect(response.status).toBe(200);
        expect(response.body.data.statusAnterior).toBe("Atribuida");
        expect(response.body.data.statusAtual).toBe("Em andamento");

        const banco = await consultarStatus(solicitacaoId);
        expect(banco.status).toBe("Em andamento");
    });

    it("deve permitir transição de Em andamento para Concluida", async () => {
        const solicitacaoId = await criarSolicitacaoAtribuida();

        await alterarStatus(solicitacaoId, "Em andamento");

        const response = await alterarStatus(
        solicitacaoId,
        "Concluida"
        );

        expect(response.status).toBe(200);
        expect(response.body.data.statusAnterior).toBe("Em andamento");
        expect(response.body.data.statusAtual).toBe("Concluida");

        const banco = await consultarStatus(solicitacaoId);
        expect(banco.status).toBe("Concluida");
    });

    it("deve rejeitar status inválido", async () => {
        const solicitacaoId = await criarSolicitacaoAtribuida();

        const response = await alterarStatus(
        solicitacaoId,
        "Finalizada"
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_STATUS");
    });

    it("deve rejeitar transição de Atribuida diretamente para Concluida", async () => {
        const solicitacaoId = await criarSolicitacaoAtribuida();

        const response = await alterarStatus(
        solicitacaoId,
        "Concluida"
        );

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("deve impedir que prestador não atribuído altere o status", async () => {
        const solicitacaoId = await criarSolicitacaoAtribuida();

        const response = await alterarStatus(
        solicitacaoId,
        "Em andamento",
        outroPrestadorToken
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    it("deve impedir que morador altere o status", async () => {
        const solicitacaoId = await criarSolicitacaoAtribuida();

        const response = await alterarStatus(
        solicitacaoId,
        "Em andamento",
        moradorToken
        );

        expect(response.status).toBe(403);
    });

    it("deve retornar 404 para solicitação inexistente", async () => {
        const response = await alterarStatus(
        999999,
        "Em andamento"
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    it("deve rejeitar ID inválido", async () => {
        const response = await alterarStatus(
        "abc",
        "Em andamento"
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_REQUEST_ID");
    });

    it("deve registrar as transições no histórico", async () => {
        const solicitacaoId = await criarSolicitacaoAtribuida();

        await alterarStatus(solicitacaoId, "Em andamento");
        await alterarStatus(solicitacaoId, "Concluida");

        const response = await request(app)
        .get(`/api/solicitacoes/${solicitacaoId}/historico`)
        .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);

        const descricoes = response.body.data.map(
        (item) => item.descricao
        );

        expect(descricoes).toContain(
        'Status alterado de "Atribuida" para "Em andamento".'
        );

        expect(descricoes).toContain(
        'Status alterado de "Em andamento" para "Concluida".'
        );
    });
    });


  describe("Aprovação de solicitações", () => {
    it("deve permitir que ADMIN aprove uma solicitação aberta", async () => {
        const criacao = await criarSolicitacao();

        const response = await aprovarSolicitacao(criacao.body.data.id);

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("Aprovada");

        const banco = await consultarStatus(criacao.body.data.id);
        expect(banco.status).toBe("Aprovada");
    });

    it("deve permitir que ADMINISTRADOR aprove uma solicitação", async () => {
        const criacao = await criarSolicitacao();

        const response = await request(app)
        .patch(`/api/solicitacoes/${criacao.body.data.id}/aprovar`)
        .set("Authorization", `Bearer ${sindicoToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("Aprovada");
    });

    it("deve impedir que morador aprove uma solicitação", async () => {
        const criacao = await criarSolicitacao();

        const response = await request(app)
        .patch(`/api/solicitacoes/${criacao.body.data.id}/aprovar`)
        .set("Authorization", `Bearer ${moradorToken}`);

        expect(response.status).toBe(403);
    });

    it("deve impedir que prestador aprove uma solicitação", async () => {
        const criacao = await criarSolicitacao();

        const response = await request(app)
        .patch(`/api/solicitacoes/${criacao.body.data.id}/aprovar`)
        .set("Authorization", `Bearer ${prestadorToken}`);

        expect(response.status).toBe(403);
    });

    it("deve impedir aprovação de solicitação que não esteja aberta", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const response = await aprovarSolicitacao(solicitacaoId);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("deve retornar 404 ao aprovar solicitação inexistente", async () => {
        const response = await aprovarSolicitacao(999999);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    it("deve rejeitar ID inválido na aprovação", async () => {
        const response = await request(app)
        .patch("/api/solicitacoes/abc/aprovar")
        .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_REQUEST_ID");
    });

    it("deve registrar a aprovação no histórico", async () => {
        const criacao = await criarSolicitacao();

        await aprovarSolicitacao(criacao.body.data.id);

        const response = await request(app)
        .get(`/api/solicitacoes/${criacao.body.data.id}/historico`)
        .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);

        const aprovacao = response.body.data.find(
        (item) =>
            item.descricao === "Status alterado de Aberta para Aprovada."
        );

        expect(aprovacao).toBeDefined();
    });
    });


  describe("Cancelamento de solicitações", () => {
    async function cancelarSolicitacao(
        solicitacaoId,
        token = adminToken
    ) {
        return request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/cancelar`)
        .set("Authorization", `Bearer ${token}`);
    }

    async function criarSolicitacaoAtribuidaParaCancelamento() {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const atribuicao = await atribuirPrestador(solicitacaoId);

        if (atribuicao.status !== 200) {
        throw new Error("Não foi possível atribuir prestador de teste.");
        }

        return solicitacaoId;
    }

    it("deve permitir que ADMIN cancele uma solicitação aberta", async () => {
        const criacao = await criarSolicitacao();

        const response = await cancelarSolicitacao(criacao.body.data.id);

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("Cancelada");

        const banco = await consultarStatus(criacao.body.data.id);
        expect(banco.status).toBe("Cancelada");
    });

    it("deve permitir que ADMINISTRADOR cancele uma solicitação", async () => {
        const criacao = await criarSolicitacao();

        const response = await cancelarSolicitacao(
        criacao.body.data.id,
        sindicoToken
        );

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("Cancelada");
    });

    it("deve permitir que morador cancele a própria solicitação", async () => {
        const criacao = await criarSolicitacao();

        const response = await cancelarSolicitacao(
        criacao.body.data.id,
        moradorToken
        );

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("Cancelada");

        const banco = await consultarStatus(criacao.body.data.id);
        expect(banco.status).toBe("Cancelada");
    });

    it("deve permitir que morador cancele solicitação atribuída", async () => {
        const solicitacaoId =
        await criarSolicitacaoAtribuidaParaCancelamento();

        const response = await cancelarSolicitacao(
        solicitacaoId,
        moradorToken
        );

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("Cancelada");
    });

    it("deve impedir que morador cancele solicitação de outro morador", async () => {
        const criacao = await criarSolicitacao({
        token: outroMoradorToken,
        });

        const response = await cancelarSolicitacao(
        criacao.body.data.id,
        moradorToken
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    it("deve impedir que prestador cancele uma solicitação", async () => {
        const criacao = await criarSolicitacao();

        const response = await cancelarSolicitacao(
        criacao.body.data.id,
        prestadorToken
        );

        expect(response.status).toBe(403);
    });

    it("deve impedir cancelamento de solicitação aprovada", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const response = await cancelarSolicitacao(solicitacaoId);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("deve impedir cancelamento de solicitação em andamento", async () => {
        const solicitacaoId =
        await criarSolicitacaoAtribuidaParaCancelamento();

        await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ status: "Em andamento" });

        const response = await cancelarSolicitacao(solicitacaoId);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("deve retornar 404 ao cancelar solicitação inexistente", async () => {
        const response = await cancelarSolicitacao(999999);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    it("deve rejeitar ID inválido no cancelamento", async () => {
        const response = await cancelarSolicitacao("abc");

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_REQUEST_ID");
    });

    it("deve registrar o cancelamento no histórico", async () => {
        const criacao = await criarSolicitacao();

        await cancelarSolicitacao(criacao.body.data.id);

        const response = await request(app)
        .get(`/api/solicitacoes/${criacao.body.data.id}/historico`)
        .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);

        const cancelamento = response.body.data.find(
        (item) =>
            item.descricao === "Status alterado de Aberta para Cancelada."
        );

        expect(cancelamento).toBeDefined();
    });
    });

  describe("Aceitação e avaliação de solicitações", () => {
    async function concluirSolicitacaoParaAvaliacao() {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const atribuicao = await atribuirPrestador(solicitacaoId);
        if (atribuicao.status !== 200) {
        throw new Error("Não foi possível atribuir o prestador.");
        }

        const emAndamento = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ status: "Em andamento" });

        if (emAndamento.status !== 200) {
        throw new Error("Não foi possível iniciar a solicitação.");
        }

        const concluida = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ status: "Concluida" });

        if (concluida.status !== 200) {
        throw new Error("Não foi possível concluir a solicitação.");
        }

        return solicitacaoId;
    }

    async function aceitarSolicitacao(solicitacaoId, dados = { nota: 5 }) {
        return request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/aceitar`)
        .set("Authorization", `Bearer ${moradorToken}`)
        .send(dados);
    }

    test("deve aceitar uma solicitação concluída e registrar a avaliação", async () => {
        const solicitacaoId = await concluirSolicitacaoParaAvaliacao();

        const response = await aceitarSolicitacao(solicitacaoId, {
        nota: 5,
        comentario: "Serviço realizado corretamente.",
        });

        expect(response.status).toBe(200);
        expect(response.body.solicitacao).toMatchObject({
        id: solicitacaoId,
        status: "Aceita",
        avaliacao: {
            nota: 5,
            comentario: "Serviço realizado corretamente.",
        },
        });

        const status = await consultarStatus(solicitacaoId);
        expect(status.status).toBe("Aceita");

        const avaliacao = await pool.query(
        `SELECT evascr, evanot
        FROM "AVALIACOES"
        WHERE soid = $1`,
        [solicitacaoId]
        );

        expect(avaliacao.rows).toHaveLength(1);
        expect(avaliacao.rows[0]).toMatchObject({
        evascr: 5,
        evanot: "Serviço realizado corretamente.",
        });
    });

    test("deve aceitar uma solicitação sem comentário", async () => {
        const solicitacaoId = await concluirSolicitacaoParaAvaliacao();

        const response = await aceitarSolicitacao(solicitacaoId, {
        nota: 4,
        });

        expect(response.status).toBe(200);
        expect(response.body.solicitacao.avaliacao).toEqual({
        nota: 4,
        comentario: null,
        });

        const avaliacao = await pool.query(
        `SELECT evanot
        FROM "AVALIACOES"
        WHERE soid = $1`,
        [solicitacaoId]
        );

        expect(avaliacao.rows[0].evanot).toBeNull();
    });

    test("deve remover espaços extras do comentário", async () => {
        const solicitacaoId = await concluirSolicitacaoParaAvaliacao();

        const response = await aceitarSolicitacao(solicitacaoId, {
        nota: 3,
        comentario: "  Serviço satisfatório.  ",
        });

        expect(response.status).toBe(200);
        expect(response.body.solicitacao.avaliacao.comentario)
        .toBe("Serviço satisfatório.");
    });

    test("não deve aceitar solicitação sem autenticação", async () => {
        const solicitacaoId = await concluirSolicitacaoParaAvaliacao();

        const response = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/aceitar`)
        .send({ nota: 5 });

        expect(response.status).toBe(401);
    });

    test("não deve permitir que um prestador aceite uma solicitação", async () => {
        const solicitacaoId = await concluirSolicitacaoParaAvaliacao();

        const response = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/aceitar`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ nota: 5 });

        expect(response.status).toBe(403);
    });

    test("não deve permitir que outro morador aceite a solicitação", async () => {
        const solicitacaoId = await concluirSolicitacaoParaAvaliacao();

        const response = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/aceitar`)
        .set("Authorization", `Bearer ${outroMoradorToken}`)
        .send({ nota: 5 });

        expect(response.status).toBe(403);
    });

    test("não deve aceitar nota fora do intervalo de 1 a 5", async () => {
        const solicitacaoId = await concluirSolicitacaoParaAvaliacao();

        for (const nota of [0, 6, -1]) {
        const response = await aceitarSolicitacao(solicitacaoId, { nota });

        expect(response.status).toBe(400);
        expect(response.body.erro).toBe(
            "A nota deve ser um número inteiro entre 1 e 5."
        );
        }
    });

    test("não deve aceitar nota que não seja um inteiro", async () => {
        const solicitacaoId = await concluirSolicitacaoParaAvaliacao();

        for (const nota of [4.5, "5", null]) {
        const response = await aceitarSolicitacao(solicitacaoId, { nota });

        expect(response.status).toBe(400);
        }
    });

    test("não deve aceitar comentário que não seja texto", async () => {
        const solicitacaoId = await concluirSolicitacaoParaAvaliacao();

        const response = await aceitarSolicitacao(solicitacaoId, {
        nota: 5,
        comentario: 123,
        });

        expect(response.status).toBe(400);
        expect(response.body.erro).toBe("O comentário deve ser um texto.");
    });

    test("não deve aceitar solicitação que ainda não foi concluída", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const response = await aceitarSolicitacao(solicitacaoId, { nota: 5 });

        expect(response.status).toBe(409);

        const status = await consultarStatus(solicitacaoId);
        expect(status.status).toBe("Aprovada");
    });

    test("deve retornar 404 para solicitação inexistente", async () => {
        const response = await aceitarSolicitacao(999999, { nota: 5 });

        expect(response.status).toBe(404);
    });

    test("deve retornar 400 para ID inválido", async () => {
        const response = await request(app)
        .patch("/api/solicitacoes/abc/aceitar")
        .set("Authorization", `Bearer ${moradorToken}`)
        .send({ nota: 5 });

        expect(response.status).toBe(400);
        expect(response.body.erro).toBe("ID da solicitação inválido.");
    });

    test("deve registrar a aceitação no histórico", async () => {
        const solicitacaoId = await concluirSolicitacaoParaAvaliacao();

        const response = await aceitarSolicitacao(solicitacaoId, {
        nota: 5,
        comentario: "Ótimo serviço.",
        });

        expect(response.status).toBe(200);

        const historico = await pool.query(
        `SELECT a.altdcp, t.typnom
        FROM "ALTERACOES" a
        JOIN "TIPOS_ALTERACAO" t ON t.typid = a.typid
        WHERE a.soid = $1
        ORDER BY a.altid DESC
        LIMIT 1`,
        [solicitacaoId]
        );

        expect(historico.rows).toHaveLength(1);
        expect(historico.rows[0].typnom).toBe("Status");
        expect(historico.rows[0].altdcp).toContain(
        "Solicitação aceita pelo morador"
        );
    });
    });

  describe("Faturamento de solicitações", () => {
    async function criarSolicitacaoAceita() {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const atribuicao = await atribuirPrestador(solicitacaoId);
        if (atribuicao.status !== 200) {
        throw new Error("Não foi possível atribuir o prestador.");
        }

        const emAndamento = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ status: "Em andamento" });

        if (emAndamento.status !== 200) {
        throw new Error("Não foi possível iniciar a solicitação.");
        }

        const concluida = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ status: "Concluida" });

        if (concluida.status !== 200) {
        throw new Error("Não foi possível concluir a solicitação.");
        }

        const aceita = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/aceitar`)
        .set("Authorization", `Bearer ${moradorToken}`)
        .send({ nota: 5, comentario: "Serviço aprovado." });

        if (aceita.status !== 200) {
        throw new Error("Não foi possível aceitar a solicitação.");
        }

        return solicitacaoId;
    }

    async function registrarFaturamento(
        solicitacaoId,
        dados = { valor: 250.5, descricao: "Manutenção hidráulica" },
        token = prestadorToken
    ) {
        return request(app)
        .post(`/api/solicitacoes/${solicitacaoId}/faturamento`)
        .set("Authorization", `Bearer ${token}`)
        .send(dados);
    }

    test("deve registrar faturamento de uma solicitação aceita", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        const response = await registrarFaturamento(solicitacaoId, {
        valor: 250.5,
        descricao: "Manutenção hidráulica",
        });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
        solicitacaoId,
        status: "Faturada",
        faturamento: {
            valor: 250.5,
            descricao: "Manutenção hidráulica",
            prestadorId: prestador.id,
        },
        });

        const status = await consultarStatus(solicitacaoId);
        expect(status.status).toBe("Faturada");

        const faturamento = await pool.query(
        `SELECT fatval, fatdcp, usrid
        FROM "FATURAMENTOS"
        WHERE soid = $1`,
        [solicitacaoId]
        );

        expect(faturamento.rows).toHaveLength(1);
        expect(Number(faturamento.rows[0].fatval)).toBe(250.5);
        expect(faturamento.rows[0].fatdcp).toBe("Manutenção hidráulica");
        expect(faturamento.rows[0].usrid).toBe(prestador.id);
    });

    test("deve remover espaços extras da descrição", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        const response = await registrarFaturamento(solicitacaoId, {
        valor: 100,
        descricao: "  Reparo elétrico  ",
        });

        expect(response.status).toBe(201);
        expect(response.body.data.faturamento.descricao).toBe(
        "Reparo elétrico"
        );
    });

    test("não deve registrar faturamento sem autenticação", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        const response = await request(app)
        .post(`/api/solicitacoes/${solicitacaoId}/faturamento`)
        .send({ valor: 100, descricao: "Serviço" });

        expect(response.status).toBe(401);
    });

    test("não deve permitir que um morador registre faturamento", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        const response = await registrarFaturamento(
        solicitacaoId,
        { valor: 100, descricao: "Serviço" },
        moradorToken
        );

        expect(response.status).toBe(403);
    });

    test("não deve permitir que um administrador registre faturamento", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        const response = await registrarFaturamento(
        solicitacaoId,
        { valor: 100, descricao: "Serviço" },
        adminToken
        );

        expect(response.status).toBe(403);
    });

    test("não deve permitir que outro prestador registre faturamento", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        const response = await registrarFaturamento(
        solicitacaoId,
        { valor: 100, descricao: "Serviço" },
        outroPrestadorToken
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    test("não deve aceitar valor zero ou negativo", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        for (const valor of [0, -10]) {
        const response = await registrarFaturamento(solicitacaoId, {
            valor,
            descricao: "Serviço",
        });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_BILLING_VALUE");
        }
    });

    test("não deve aceitar valor com mais de duas casas decimais", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        const response = await registrarFaturamento(solicitacaoId, {
        valor: 10.123,
        descricao: "Serviço",
        });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_BILLING_VALUE");
    });

    test("não deve aceitar valor que não seja numérico", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        for (const valor of ["100", null, "inválido"]) {
        const response = await registrarFaturamento(solicitacaoId, {
            valor,
            descricao: "Serviço",
        });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_BILLING_VALUE");
        }
    });

    test("não deve aceitar descrição ausente, vazia ou inválida", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        for (const descricao of [undefined, null, "", "   ", 123]) {
        const response = await registrarFaturamento(solicitacaoId, {
            valor: 100,
            descricao,
        });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe(
            "INVALID_BILLING_DESCRIPTION"
        );
        }
    });

    test("não deve faturar solicitação que ainda não foi aceita", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        await atribuirPrestador(solicitacaoId);

        const response = await registrarFaturamento(solicitacaoId);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");

        const status = await consultarStatus(solicitacaoId);
        expect(status.status).toBe("Atribuida");
    });

    test("deve retornar 404 para solicitação inexistente", async () => {
        const response = await registrarFaturamento(999999);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    test("deve retornar 400 para ID inválido", async () => {
        const response = await request(app)
        .post("/api/solicitacoes/abc/faturamento")
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ valor: 100, descricao: "Serviço" });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_REQUEST_ID");
    });

    test("não deve permitir um segundo faturamento para a mesma solicitação", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        const primeiro = await registrarFaturamento(solicitacaoId);
        expect(primeiro.status).toBe(201);

        const segundo = await registrarFaturamento(solicitacaoId, {
        valor: 300,
        descricao: "Segundo faturamento",
        });

        // O status já será Faturada, portanto a transição é bloqueada.
        expect(segundo.status).toBe(409);
        expect(segundo.body.error.code).toBe("INVALID_STATUS_TRANSITION");

        const faturamentos = await pool.query(
        `SELECT soid
        FROM "FATURAMENTOS"
        WHERE soid = $1`,
        [solicitacaoId]
        );

        expect(faturamentos.rows).toHaveLength(1);
    });

    test("deve registrar o faturamento no histórico", async () => {
        const solicitacaoId = await criarSolicitacaoAceita();

        const response = await registrarFaturamento(solicitacaoId);
        expect(response.status).toBe(201);

        const historico = await pool.query(
        `SELECT a.altdcp, t.typnom
        FROM "ALTERACOES" a
        JOIN "TIPOS_ALTERACAO" t ON t.typid = a.typid
        WHERE a.soid = $1
        ORDER BY a.altid DESC
        LIMIT 1`,
        [solicitacaoId]
        );

        expect(historico.rows).toHaveLength(1);
        expect(historico.rows[0].typnom).toBe("Status");
        expect(historico.rows[0].altdcp).toContain(
        "Status alterado de Aceita para Faturada"
        );
    });
    });

  describe("Consulta de faturamento", () => {
    async function criarSolicitacaoFaturada() {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const atribuicao = await atribuirPrestador(solicitacaoId);
        if (atribuicao.status !== 200) {
        throw new Error("Não foi possível atribuir o prestador.");
        }

        const emAndamento = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ status: "Em andamento" });

        if (emAndamento.status !== 200) {
        throw new Error("Não foi possível iniciar a solicitação.");
        }

        const concluida = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ status: "Concluida" });

        if (concluida.status !== 200) {
        throw new Error("Não foi possível concluir a solicitação.");
        }

        const aceita = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/aceitar`)
        .set("Authorization", `Bearer ${moradorToken}`)
        .send({ nota: 5 });

        if (aceita.status !== 200) {
        throw new Error("Não foi possível aceitar a solicitação.");
        }

        const faturamento = await request(app)
        .post(`/api/solicitacoes/${solicitacaoId}/faturamento`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({
            valor: 250.5,
            descricao: "Manutenção hidráulica",
        });

        if (faturamento.status !== 201) {
        throw new Error("Não foi possível registrar o faturamento.");
        }

        return solicitacaoId;
    }

    async function consultarFaturamento(solicitacaoId, token = moradorToken) {
        return request(app)
        .get(`/api/solicitacoes/${solicitacaoId}/faturamento`)
        .set("Authorization", `Bearer ${token}`);
    }

    test("deve permitir que o morador proprietário consulte o faturamento", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await consultarFaturamento(solicitacaoId);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
        solicitacaoId,
        valor: "250.50",
        descricao: "Manutenção hidráulica",
        prestadorId: prestador.id,
        prestador: prestador.nome,
        });
    });

    test("deve permitir que o prestador atribuído consulte o faturamento", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await consultarFaturamento(
        solicitacaoId,
        prestadorToken
        );

        expect(response.status).toBe(200);
        expect(response.body.data.solicitacaoId).toBe(solicitacaoId);
    });

    test("deve permitir que o administrador consulte o faturamento", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await consultarFaturamento(
        solicitacaoId,
        adminToken
        );

        expect(response.status).toBe(200);
        expect(response.body.data.solicitacaoId).toBe(solicitacaoId);
    });

    test("deve permitir que o síndico consulte o faturamento", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await consultarFaturamento(
        solicitacaoId,
        sindicoToken
        );

        expect(response.status).toBe(200);
        expect(response.body.data.solicitacaoId).toBe(solicitacaoId);
    });

    test("não deve permitir que outro morador consulte o faturamento", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await consultarFaturamento(
        solicitacaoId,
        outroMoradorToken
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    test("não deve permitir que outro prestador consulte o faturamento", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await consultarFaturamento(
        solicitacaoId,
        outroPrestadorToken
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    test("não deve consultar faturamento sem autenticação", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await request(app)
        .get(`/api/solicitacoes/${solicitacaoId}/faturamento`);

        expect(response.status).toBe(401);
    });

    test("deve retornar 404 quando a solicitação não possui faturamento", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const response = await consultarFaturamento(solicitacaoId);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("BILLING_NOT_FOUND");
    });

    test("deve retornar 404 para solicitação inexistente", async () => {
        const response = await consultarFaturamento(999999);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    test("deve retornar 400 para ID inválido", async () => {
        const response = await request(app)
        .get("/api/solicitacoes/abc/faturamento")
        .set("Authorization", `Bearer ${moradorToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_REQUEST_ID");
    });
    });

  describe("Finalização de solicitações", () => {
    async function criarSolicitacaoFaturada() {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const atribuicao = await atribuirPrestador(solicitacaoId);
        if (atribuicao.status !== 200) {
        throw new Error("Não foi possível atribuir o prestador.");
        }

        const emAndamento = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ status: "Em andamento" });

        if (emAndamento.status !== 200) {
        throw new Error("Não foi possível iniciar a solicitação.");
        }

        const concluida = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ status: "Concluida" });

        if (concluida.status !== 200) {
        throw new Error("Não foi possível concluir a solicitação.");
        }

        const aceita = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/aceitar`)
        .set("Authorization", `Bearer ${moradorToken}`)
        .send({ nota: 5 });

        if (aceita.status !== 200) {
        throw new Error("Não foi possível aceitar a solicitação.");
        }

        const faturamento = await request(app)
        .post(`/api/solicitacoes/${solicitacaoId}/faturamento`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({
            valor: 250.5,
            descricao: "Manutenção hidráulica",
        });

        if (faturamento.status !== 201) {
        throw new Error("Não foi possível registrar o faturamento.");
        }

        return solicitacaoId;
    }

    async function finalizarSolicitacao(solicitacaoId, token = adminToken) {
        return request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/finalizar`)
        .set("Authorization", `Bearer ${token}`);
    }

    test("deve permitir que o administrador finalize uma solicitação faturada", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await finalizarSolicitacao(solicitacaoId);

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
        solicitacaoId,
        status: "Finalizada",
        });

        const status = await consultarStatus(solicitacaoId);
        expect(status.status).toBe("Finalizada");
    });

    test("deve permitir que o síndico finalize uma solicitação faturada", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await finalizarSolicitacao(
        solicitacaoId,
        sindicoToken
        );

        expect(response.status).toBe(200);

        const status = await consultarStatus(solicitacaoId);
        expect(status.status).toBe("Finalizada");
    });

    test("não deve permitir finalização sem autenticação", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/finalizar`);

        expect(response.status).toBe(401);
    });

    test("não deve permitir que um morador finalize a solicitação", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await finalizarSolicitacao(
        solicitacaoId,
        moradorToken
        );

        expect(response.status).toBe(403);
    });

    test("não deve permitir que um prestador finalize a solicitação", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await finalizarSolicitacao(
        solicitacaoId,
        prestadorToken
        );

        expect(response.status).toBe(403);
    });

    test("não deve finalizar solicitação que ainda não foi faturada", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const response = await finalizarSolicitacao(solicitacaoId);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");

        const status = await consultarStatus(solicitacaoId);
        expect(status.status).toBe("Aprovada");
    });

    test("deve retornar 404 para solicitação inexistente", async () => {
        const response = await finalizarSolicitacao(999999);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    test("deve retornar 400 para ID inválido", async () => {
        const response = await request(app)
        .patch("/api/solicitacoes/abc/finalizar")
        .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_REQUEST_ID");
    });

    test("não deve finalizar solicitação faturada sem registro de faturamento", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        // Simula uma inconsistência no banco para testar a proteção da rota.
        await pool.query(
        `UPDATE "SOLICITACOES"
        SET stsid = (
            SELECT stsid
            FROM "STATUS_SOLICITACAO"
            WHERE stsnom = 'Faturada'
        )
        WHERE soid = $1`,
        [solicitacaoId]
        );

        const response = await finalizarSolicitacao(solicitacaoId);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("BILLING_NOT_FOUND");
    });

    test("deve registrar a finalização no histórico", async () => {
        const solicitacaoId = await criarSolicitacaoFaturada();

        const response = await finalizarSolicitacao(solicitacaoId);
        expect(response.status).toBe(200);

        const historico = await pool.query(
        `SELECT a.altdcp, t.typnom
        FROM "ALTERACOES" a
        JOIN "TIPOS_ALTERACAO" t ON t.typid = a.typid
        WHERE a.soid = $1
        ORDER BY a.altid DESC
        LIMIT 1`,
        [solicitacaoId]
        );

        expect(historico.rows).toHaveLength(1);
        expect(historico.rows[0].typnom).toBe("Status");
        expect(historico.rows[0].altdcp).toContain(
        "Solicitação finalizada após conferência do faturamento"
        );
    });
    });

  describe("Reabertura de solicitações", () => {
    async function criarSolicitacaoConcluida() {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const atribuicao = await atribuirPrestador(solicitacaoId);
        if (atribuicao.status !== 200) {
        throw new Error("Não foi possível atribuir o prestador.");
        }

        const emAndamento = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ status: "Em andamento" });

        if (emAndamento.status !== 200) {
        throw new Error("Não foi possível iniciar a solicitação.");
        }

        const concluida = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/status`)
        .set("Authorization", `Bearer ${prestadorToken}`)
        .send({ status: "Concluida" });

        if (concluida.status !== 200) {
        throw new Error("Não foi possível concluir a solicitação.");
        }

        return solicitacaoId;
    }

    async function reabrirSolicitacao(solicitacaoId, token = moradorToken) {
        return request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/reabrir`)
        .set("Authorization", `Bearer ${token}`);
    }

    test("deve permitir que o morador reabra sua própria solicitação", async () => {
        const solicitacaoId = await criarSolicitacaoConcluida();

        const response = await reabrirSolicitacao(solicitacaoId);

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
        id: solicitacaoId,
        statusAnterior: "Concluida",
        statusAtual: "Em andamento",
        });

        const status = await consultarStatus(solicitacaoId);
        expect(status.status).toBe("Em andamento");
    });

    test("deve permitir que o administrador reabra qualquer solicitação", async () => {
        const solicitacaoId = await criarSolicitacaoConcluida();

        const response = await reabrirSolicitacao(
        solicitacaoId,
        adminToken
        );

        expect(response.status).toBe(200);

        const status = await consultarStatus(solicitacaoId);
        expect(status.status).toBe("Em andamento");
    });

    test("deve permitir que o síndico reabra qualquer solicitação", async () => {
        const solicitacaoId = await criarSolicitacaoConcluida();

        const response = await reabrirSolicitacao(
        solicitacaoId,
        sindicoToken
        );

        expect(response.status).toBe(200);

        const status = await consultarStatus(solicitacaoId);
        expect(status.status).toBe("Em andamento");
    });

    test("não deve permitir que outro morador reabra a solicitação", async () => {
        const solicitacaoId = await criarSolicitacaoConcluida();

        const response = await reabrirSolicitacao(
        solicitacaoId,
        outroMoradorToken
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    test("não deve permitir que um prestador reabra uma solicitação", async () => {
        const solicitacaoId = await criarSolicitacaoConcluida();

        const response = await reabrirSolicitacao(
        solicitacaoId,
        prestadorToken
        );

        expect(response.status).toBe(403);
    });

    test("não deve reabrir solicitação que não esteja concluída", async () => {
        const solicitacaoId = await criarSolicitacaoAprovada();

        const response = await reabrirSolicitacao(solicitacaoId);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");

        const status = await consultarStatus(solicitacaoId);
        expect(status.status).toBe("Aprovada");
    });

    test("não deve reabrir solicitação sem autenticação", async () => {
        const solicitacaoId = await criarSolicitacaoConcluida();

        const response = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/reabrir`);

        expect(response.status).toBe(401);
    });

    test("deve retornar 404 para solicitação inexistente", async () => {
        const response = await reabrirSolicitacao(999999);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    test("deve retornar 400 para ID inválido", async () => {
        const response = await request(app)
        .patch("/api/solicitacoes/abc/reabrir")
        .set("Authorization", `Bearer ${moradorToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_REQUEST_ID");
    });

    test("deve limpar a data de conclusão ao reabrir a solicitação", async () => {
        const solicitacaoId = await criarSolicitacaoConcluida();

        const antes = await pool.query(
        `SELECT socls
        FROM "SOLICITACOES"
        WHERE soid = $1`,
        [solicitacaoId]
        );

        expect(antes.rows[0].socls).toBeNull();

        const response = await reabrirSolicitacao(solicitacaoId);
        expect(response.status).toBe(200);

        const depois = await pool.query(
        `SELECT socls
        FROM "SOLICITACOES"
        WHERE soid = $1`,
        [solicitacaoId]
        );

        expect(depois.rows[0].socls).toBeNull();
    });

    test("deve registrar a reabertura no histórico", async () => {
        const solicitacaoId = await criarSolicitacaoConcluida();

        const response = await reabrirSolicitacao(solicitacaoId);
        expect(response.status).toBe(200);

        const historico = await pool.query(
        `SELECT a.altdcp, t.typnom
        FROM "ALTERACOES" a
        JOIN "TIPOS_ALTERACAO" t ON t.typid = a.typid
        WHERE a.soid = $1
        ORDER BY a.altid DESC
        LIMIT 1`,
        [solicitacaoId]
        );

        expect(historico.rows).toHaveLength(1);
        expect(historico.rows[0].typnom).toBe("Status");
        expect(historico.rows[0].altdcp).toContain(
        "Solicitação reaberta por morador"
        );
        expect(historico.rows[0].altdcp).toContain(
        "Concluida para Em andamento"
        );
    });
    });

  describe("Alteração de prioridade", () => {
    async function alterarPrioridade(
        solicitacaoId,
        prioridade,
        token = adminToken
    ) {
        return request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/prioridade`)
        .set("Authorization", `Bearer ${token}`)
        .send({ prioridade });
    }

    async function consultarPrioridade(solicitacaoId) {
        const resultado = await pool.query(
        `SELECT p.prinom
        FROM "SOLICITACOES" s
        JOIN "PRIORIDADES_SOLICITACAO" p
            ON p.priid = s.priid
        WHERE s.soid = $1`,
        [solicitacaoId]
        );

        return resultado.rows[0]?.prinom;
    }

    test.each(["Baixa", "Normal", "Alta", "Urgente"])(
        "deve permitir alterar a prioridade para %s",
        async (prioridade) => {
        const criacao = await criarSolicitacao();
        const solicitacaoId = criacao.body.data.id;

        const response = await alterarPrioridade(
            solicitacaoId,
            prioridade
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            id: solicitacaoId,
            prioridadeAtual: prioridade,
        });

        expect(await consultarPrioridade(solicitacaoId)).toBe(prioridade);
        }
    );

    test("deve permitir que o síndico altere a prioridade", async () => {
        const criacao = await criarSolicitacao();
        const solicitacaoId = criacao.body.data.id;

        const response = await alterarPrioridade(
        solicitacaoId,
        "Urgente",
        sindicoToken
        );

        expect(response.status).toBe(200);
        expect(await consultarPrioridade(solicitacaoId)).toBe("Urgente");
    });

    test("não deve permitir que um morador altere a prioridade", async () => {
        const criacao = await criarSolicitacao();
        const solicitacaoId = criacao.body.data.id;

        const response = await alterarPrioridade(
        solicitacaoId,
        "Alta",
        moradorToken
        );

        expect(response.status).toBe(403);
    });

    test("não deve permitir que um prestador altere a prioridade", async () => {
        const criacao = await criarSolicitacao();
        const solicitacaoId = criacao.body.data.id;

        const response = await alterarPrioridade(
        solicitacaoId,
        "Alta",
        prestadorToken
        );

        expect(response.status).toBe(403);
    });

    test("não deve alterar para uma prioridade inválida", async () => {
        const criacao = await criarSolicitacao();
        const solicitacaoId = criacao.body.data.id;

        for (const prioridade of ["Média", "Crítica", "", null, 123]) {
        const response = await alterarPrioridade(
            solicitacaoId,
            prioridade
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_PRIORITY");
        }
    });

    test("não deve alterar a prioridade sem autenticação", async () => {
        const criacao = await criarSolicitacao();
        const solicitacaoId = criacao.body.data.id;

        const response = await request(app)
        .patch(`/api/solicitacoes/${solicitacaoId}/prioridade`)
        .send({ prioridade: "Alta" });

        expect(response.status).toBe(401);
    });

    test("deve retornar 404 para solicitação inexistente", async () => {
        const response = await alterarPrioridade(999999, "Alta");

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("REQUEST_NOT_FOUND");
    });

    test("deve retornar 400 para ID inválido", async () => {
        const response = await request(app)
        .patch("/api/solicitacoes/abc/prioridade")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ prioridade: "Alta" });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_REQUEST_ID");
    });

    test("não deve criar histórico quando a prioridade já é a mesma", async () => {
        const criacao = await criarSolicitacao();
        const solicitacaoId = criacao.body.data.id;

        const historicoAntes = await pool.query(
        `SELECT COUNT(*)::integer AS total
        FROM "ALTERACOES"
        WHERE soid = $1`,
        [solicitacaoId]
        );

        const response = await alterarPrioridade(
        solicitacaoId,
        "Normal"
        );

        expect(response.status).toBe(200);
        expect(response.body.message).toBe(
        "A solicitação já possui essa prioridade."
        );

        const historicoDepois = await pool.query(
        `SELECT COUNT(*)::integer AS total
        FROM "ALTERACOES"
        WHERE soid = $1`,
        [solicitacaoId]
        );

        expect(historicoDepois.rows[0].total).toBe(
        historicoAntes.rows[0].total
        );
    });

    test("deve registrar a alteração de prioridade no histórico", async () => {
        const criacao = await criarSolicitacao();
        const solicitacaoId = criacao.body.data.id;

        const response = await alterarPrioridade(
        solicitacaoId,
        "Urgente"
        );

        expect(response.status).toBe(200);

        const historico = await pool.query(
        `SELECT a.altdcp, t.typnom
        FROM "ALTERACOES" a
        JOIN "TIPOS_ALTERACAO" t ON t.typid = a.typid
        WHERE a.soid = $1
        ORDER BY a.altid DESC
        LIMIT 1`,
        [solicitacaoId]
        );

        expect(historico.rows).toHaveLength(1);
        expect(historico.rows[0].typnom).toBe("Status");
        expect(historico.rows[0].altdcp).toContain(
        'Prioridade alterada de "Normal" para "Urgente".'
        );
    });
    });
});
