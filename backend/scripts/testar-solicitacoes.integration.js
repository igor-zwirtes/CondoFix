require("dotenv").config();

const jwt = require("jsonwebtoken");

process.env.DB_HOST = "localhost";

const pool = require("../src/config/database");

const BASE_URL = (process.env.API_URL || "http://localhost:3000").replace(/\/$/, "");
const API = `${BASE_URL}/api`;

const contas = {
  admin: { email: "admin@condofix.local" },
  sindico: { email: "sindico@condofix.local" },
  morador: { email: "morador@condofix.local" },
  maria: { email: "maria@condofix.local" },
  prestador: { email: "prestador@condofix.local" },
  ana: { email: "ana.prestador@condofix.local" },
};

const tokens = {};
let solicitacaoId;
let aprovados = 0;
let falhas = 0;

function localizarToken(obj) {
  if (!obj || typeof obj !== "object") return null;

  for (const [chave, valor] of Object.entries(obj)) {
    if (
      ["token", "accessToken", "access_token", "jwt"].includes(chave) &&
      typeof valor === "string" &&
      valor.split(".").length === 3
    ) {
      return valor;
    }
  }

  for (const valor of Object.values(obj)) {
    const encontrado = localizarToken(valor);
    if (encontrado) return encontrado;
  }

  return null;
}

async function requisicao(metodo, caminho, usuario, corpo) {
  const headers = { "Content-Type": "application/json" };

  if (usuario && tokens[usuario]) {
    headers.Authorization = `Bearer ${tokens[usuario]}`;
  }

  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers,
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  });

  const texto = await resposta.text();
  let dados = null;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = { resposta: texto };
  }

  return { status: resposta.status, dados };
}

async function requisicaoComToken(metodo, caminho, token, corpo) {
  const headers = { "Content-Type": "application/json" };

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers,
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  });

  const texto = await resposta.text();
  let dados = null;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = { resposta: texto };
  }

  return { status: resposta.status, dados };
}

async function verificar(nome, esperado, operacao, validar) {
  try {
    const resultado = await operacao();

    if (resultado.status !== esperado) {
      throw new Error(
        `HTTP ${resultado.status}; esperado HTTP ${esperado}. ` +
        `Resposta: ${JSON.stringify(resultado.dados)}`
      );
    }

    if (validar) validar(resultado.dados);

    aprovados++;
    console.log(`[PASS] ${nome} (HTTP ${resultado.status})`);

    return resultado.dados;
  } catch (erro) {
    falhas++;
    console.error(`[FAIL] ${nome}: ${erro.message}`);
    throw erro;
  }
}

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

async function main() {
  console.log(`\nCondoFix — teste de integração`);
  console.log(`API: ${API}\n`);

  try {
    // 1. Login nas seis contas.
    for (const [apelido, conta] of Object.entries(contas)) {
      const usuarioSenha =
        apelido === "ana" ? "ana" : conta.email.split("@")[0];

      const dados = await verificar(
        `Login: ${apelido}`,
        200,
        () =>
          requisicao("POST", "/auth/login", null, {
            email: conta.email,
            senha: `${usuarioSenha}123`,
          })
      );

      tokens[apelido] = localizarToken(dados);

      exigir(
        tokens[apelido],
        `Login de ${apelido} não retornou um JWT reconhecível.`
      );
    }

    // SEGURANÇA — autenticação e autorização.

    await verificar(
    "Requisição sem token é bloqueada",
    401,
    () => requisicaoComToken("GET", "/solicitacoes", null)
    );

    await verificar(
    "Token inválido é rejeitado",
    401,
    () => requisicaoComToken("GET", "/solicitacoes", "token-invalido")
    );

    exigir(
    typeof process.env.JWT_SECRET === "string" &&
    process.env.JWT_SECRET.length > 0,
    "JWT_SECRET não está configurado no .env."
    );

    const tokenExpirado = jwt.sign(
    {
        id: 1,
        exp: Math.floor(Date.now() / 1000) - 60,
    },
    process.env.JWT_SECRET
    );

    await verificar(
    "Token expirado é rejeitado",
    401,
    () => requisicaoComToken("GET", "/solicitacoes", tokenExpirado)
    );

    // 2. Buscar IDs reais no banco.
    let apartamento, categoria, prestador;

    try {
    apartamento = await pool.query(
        `
        SELECT a.aptid
        FROM "APARTAMENTOS" a
        JOIN "MORADORES" m ON m.aptid = a.aptid
        JOIN "USUARIOS" u ON u.usrid = m.usrid
        WHERE u.usreml = $1
        `,
        [contas.morador.email]
    );
    console.log("[DEBUG] Apartamento:", apartamento.rows);

    categoria = await pool.query(
        `SELECT catid FROM "CATEGORIAS_SOLICITACAO" WHERE catnom = $1`,
        ["Hidraulica"]
    );
    console.log("[DEBUG] Categoria:", categoria.rows);

    prestador = await pool.query(
        `
        SELECT p.usrid
        FROM "PRESTADORES_SERVICO" p
        JOIN "USUARIOS" u ON u.usrid = p.usrid
        WHERE u.usreml = $1
        `,
        [contas.prestador.email]
    );
    console.log("[DEBUG] Prestador:", prestador.rows);

    } catch (erro) {
    console.error("[ERRO SQL]", erro.message);
    throw erro;
    }

    exigir(
      apartamento.rowCount === 1,
      "Apartamento do morador não encontrado."
    );

    exigir(
      categoria.rowCount === 1,
      "Categoria Hidraulica não encontrada."
    );

    exigir(
      prestador.rowCount === 1,
      "Prestador Carlos não encontrado."
    );

    const apartamentoId = apartamento.rows[0].aptid;
    const categoriaId = categoria.rows[0].catid;
    const prestadorId = prestador.rows[0].usrid;

    // VALIDAÇÃO — dados enviados pelo cliente.

    await verificar(
    "Criação sem título é rejeitada",
    400,
    () => requisicao("POST", "/solicitacoes", "morador", {
        descricao: "Descrição de teste",
        apartamentoId,
        categoriaId,
    })
    );

    await verificar(
    "Criação com tipos incorretos é rejeitada",
    400,
    () => requisicao("POST", "/solicitacoes", "morador", {
        titulo: 12345,
        descricao: 67890,
        apartamentoId: "texto",
        categoriaId: [],
    })
    );

    await verificar(
    "Criação com apartamento inexistente é rejeitada",
    403,
    () => requisicao("POST", "/solicitacoes", "morador", {
        titulo: "Teste de apartamento inválido",
        descricao: "Teste de validação",
        apartamentoId: 99999999,
        categoriaId,
    })
    );

    await verificar(
    "Criação com categoria inexistente é rejeitada",
    400,
    () => requisicao("POST", "/solicitacoes", "morador", {
        titulo: "Teste de categoria inválida",
        descricao: "Teste de validação",
        apartamentoId,
        categoriaId: 99999999,
    })
    );

    await verificar(
    "ID malformado na consulta é rejeitado",
    400,
    () => requisicao("GET", "/solicitacoes/abc", "morador")
    );

    await verificar(
    "ID fora do limite de inteiro seguro é rejeitado",
    400,
    () => requisicao(
        "GET",
        "/solicitacoes/999999999999999999999999999",
        "morador"
    )
    );

    await verificar(
    "Administrador não pode criar solicitação como morador",
    403,
    () => requisicao("POST", "/solicitacoes", "admin", {
        titulo: "Teste de autorização",
        descricao: "Tentativa com papel inadequado",
        apartamentoId,
        categoriaId,
    })
    );

    // 3. Todos os perfis consultam a listagem.
    for (const perfil of [
      "admin",
      "sindico",
      "morador",
      "maria",
      "prestador",
      "ana",
    ]) {
      await verificar(
        `GET /solicitacoes — ${perfil}`,
        200,
        () => requisicao("GET", "/solicitacoes", perfil),
        (d) =>
          exigir(
            d?.success === true && Array.isArray(d.data),
            "Formato inesperado na listagem."
          )
      );
    }

    // 4. João cria uma solicitação nova.
    const titulo = `Teste de integração ${new Date().toISOString()}`;

    const criada = await verificar(
      "João cria uma solicitação",
      201,
      () =>
        requisicao("POST", "/solicitacoes", "morador", {
          titulo,
          descricao:
            "Solicitação criada automaticamente pelo teste de integração.",
          apartamentoId,
          categoriaId,
        }),
      (d) =>
        exigir(
          d?.success === true && d?.data?.id,
          "Resposta de criação não contém data.id."
        )
    );

    solicitacaoId = criada.data.id;
    console.log(`ID criado: ${solicitacaoId}`);

    // 5. Permissões de consulta e histórico.
    await verificar(
      "João consulta a própria solicitação",
      200,
      () => requisicao("GET", `/solicitacoes/${solicitacaoId}`, "morador")
    );

    await verificar(
      "Maria não consulta solicitação de João",
      404,
      () => requisicao("GET", `/solicitacoes/${solicitacaoId}`, "maria")
    );

    await verificar(
      "Carlos não consulta solicitação antes de ser atribuído",
      404,
      () => requisicao("GET", `/solicitacoes/${solicitacaoId}`, "prestador")
    );

    await verificar(
      "Ana não consulta solicitação antes de ser atribuída",
      404,
      () => requisicao("GET", `/solicitacoes/${solicitacaoId}`, "ana")
    );

    await verificar(
      "Admin consulta a solicitação",
      200,
      () => requisicao("GET", `/solicitacoes/${solicitacaoId}`, "admin")
    );

    await verificar(
      "Síndico consulta a solicitação",
      200,
      () => requisicao("GET", `/solicitacoes/${solicitacaoId}`, "sindico")
    );

    await verificar(
      "João consulta o histórico",
      200,
      () =>
        requisicao(
          "GET",
          `/solicitacoes/${solicitacaoId}/historico`,
          "morador"
        )
    );

    await verificar(
      "Maria não consulta o histórico de João",
      404,
      () =>
        requisicao(
          "GET",
          `/solicitacoes/${solicitacaoId}/historico`,
          "maria"
        )
    );

    // 6. Aprovação e atribuição.
    await verificar(
      "Morador não pode aprovar solicitação",
      403,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/aprovar`,
          "morador"
        )
    );

    await verificar(
      "Síndico aprova a solicitação",
      200,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/aprovar`,
          "sindico"
        )
    );

    await verificar(
      "Admin não aprova novamente",
      409,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/aprovar`,
          "admin"
        )
    );

    await verificar(
      "Admin atribui Carlos como prestador",
      200,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/prestador`,
          "admin",
          { prestadorId }
        )
    );

    await verificar(
      "Síndico não atribui novamente",
      409,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/prestador`,
          "sindico",
          { prestadorId }
        )
    );

    // 7. Acesso e transições do prestador.
    await verificar(
      "Carlos consulta solicitação atribuída",
      200,
      () => requisicao("GET", `/solicitacoes/${solicitacaoId}`, "prestador")
    );

    await verificar(
      "Ana não consulta solicitação atribuída a Carlos",
      404,
      () => requisicao("GET", `/solicitacoes/${solicitacaoId}`, "ana")
    );

    await verificar(
      "Ana não altera status de solicitação de Carlos",
      404,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/status`,
          "ana",
          { status: "Em andamento" }
        )
    );

    await verificar(
      "Carlos não pula de Atribuida para Concluida",
      409,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/status`,
          "prestador",
          { status: "Concluida" }
        )
    );

    await verificar(
      "Carlos inicia o serviço",
      200,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/status`,
          "prestador",
          { status: "Em andamento" }
        )
    );

    await verificar(
      "Carlos conclui o serviço",
      200,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/status`,
          "prestador",
          { status: "Concluida" }
        )
    );

    await verificar(
      "Carlos não repete transição já realizada",
      409,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/status`,
          "prestador",
          { status: "Em andamento" }
        )
    );

    // 8. Aceite e avaliação.
    await verificar(
      "Maria não aceita solicitação de João",
      403,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/aceitar`,
          "maria",
          { nota: 5, comentario: "Teste indevido" }
        )
    );

    await verificar(
      "Nota de avaliação inválida é rejeitada",
      400,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/aceitar`,
          "morador",
          { nota: 6, comentario: "Nota inválida" }
        )
    );

    await verificar(
      "João aceita e avalia o serviço",
      200,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/aceitar`,
          "morador",
          {
            nota: 5,
            comentario: "Serviço realizado corretamente.",
          }
        )
    );

    await verificar(
      "João não aceita novamente",
      409,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/aceitar`,
          "morador",
          { nota: 5, comentario: "Avaliação duplicada" }
        )
    );

    // 9. Faturamento.
    await verificar(
      "Faturamento não existe antes do registro",
      404,
      () =>
        requisicao(
          "GET",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "morador"
        )
    );

    await verificar(
      "Solicitação sem faturamento não pode ser finalizada",
      409,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/finalizar`,
          "admin"
        )
    );

    await verificar(
      "Morador não pode registrar faturamento",
      403,
      () =>
        requisicao(
          "POST",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "morador",
          { valor: 325.5, descricao: "Tentativa indevida" }
        )
    );

    await verificar(
      "Valor de faturamento inválido é rejeitado",
      400,
      () =>
        requisicao(
          "POST",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "prestador",
          { valor: -10, descricao: "Valor inválido" }
        )
    );

    await verificar(
      "Descrição de faturamento vazia é rejeitada",
      400,
      () =>
        requisicao(
          "POST",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "prestador",
          { valor: 325.5, descricao: "   " }
        )
    );

    await verificar(
      "Ana não registra faturamento para solicitação de Carlos",
      404,
      () =>
        requisicao(
          "POST",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "ana",
          { valor: 325.5, descricao: "Teste indevido" }
        )
    );

    await verificar(
      "Carlos registra faturamento",
      201,
      () =>
        requisicao(
          "POST",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "prestador",
          {
            valor: 325.5,
            descricao: "Reparo hidráulico — teste de integração.",
          }
        )
    );

    await verificar(
      "Carlos não registra faturamento duplicado",
      409,
      () =>
        requisicao(
          "POST",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "prestador",
          { valor: 325.5, descricao: "Tentativa duplicada." }
        )
    );

    await verificar(
      "João consulta o faturamento",
      200,
      () =>
        requisicao(
          "GET",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "morador"
        )
    );

    await verificar(
      "Maria não consulta o faturamento de João",
      404,
      () =>
        requisicao(
          "GET",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "maria"
        )
    );

    await verificar(
      "Carlos consulta o próprio faturamento",
      200,
      () =>
        requisicao(
          "GET",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "prestador"
        )
    );

    await verificar(
      "Ana não consulta faturamento de Carlos",
      404,
      () =>
        requisicao(
          "GET",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "ana"
        )
    );

    await verificar(
      "Admin consulta o faturamento",
      200,
      () =>
        requisicao(
          "GET",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "admin"
        )
    );

    await verificar(
      "Síndico consulta o faturamento",
      200,
      () =>
        requisicao(
          "GET",
          `/solicitacoes/${solicitacaoId}/faturamento`,
          "sindico"
        )
    );

    // 10. Finalização e verificações finais.
    await verificar(
      "Morador não pode finalizar solicitação",
      403,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/finalizar`,
          "morador"
        )
    );

    await verificar(
      "Síndico finaliza solicitação faturada",
      200,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/finalizar`,
          "sindico"
        )
    );

    await verificar(
      "Admin não finaliza novamente",
      409,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/finalizar`,
          "admin"
        )
    );

    await verificar(
      "João consulta solicitação finalizada",
      200,
      () => requisicao("GET", `/solicitacoes/${solicitacaoId}`, "morador")
    );

    await verificar(
      "Histórico final fica acessível ao morador",
      200,
      () =>
        requisicao(
          "GET",
          `/solicitacoes/${solicitacaoId}/historico`,
          "morador"
        )
    );

    await verificar(
      "Cancelar solicitação finalizada retorna conflito",
      409,
      () =>
        requisicao(
          "PATCH",
          `/solicitacoes/${solicitacaoId}/cancelar`,
          "morador"
        )
    );

    // INTEGRIDADE — consistência dos dados e funcionamento da trigger.

    await verificar(
    "Solicitação finalizada possui avaliação, faturamento e histórico consistentes",
    200,
    async () => {
        const resultado = await pool.query(
        `
        SELECT
            s.soid,
            st.stsnom AS status,
            s.soopn,
            s.socls,

            EXISTS (
            SELECT 1
            FROM "AVALIACOES" a
            WHERE a.soid = s.soid
            ) AS tem_avaliacao,

            EXISTS (
            SELECT 1
            FROM "FATURAMENTOS" f
            WHERE f.soid = s.soid
            ) AS tem_faturamento,

            EXISTS (
            SELECT 1
            FROM "ALTERACOES" a
            JOIN "TIPOS_ALTERACAO" t
                ON t.typid = a.typid
            WHERE a.soid = s.soid
                AND t.typnom = 'Status'
                AND a.altdcp ILIKE '%Finalizada%'
            ) AS tem_historico_final,

            (
            SELECT COUNT(*)
            FROM "ALTERACOES" a
            WHERE a.soid = s.soid
            ) AS total_historico

        FROM "SOLICITACOES" s
        JOIN "STATUS_SOLICITACAO" st
            ON st.stsid = s.stsid
        WHERE s.soid = $1
        `,
        [solicitacaoId]
        );

        return {
        status: 200,
        dados: resultado.rows[0],
        };
    },
    (d) => {
        exigir(d, "Solicitação não encontrada no banco.");
        exigir(d.status === "Finalizada", "Status final incorreto.");
        exigir(d.socls !== null, "Trigger não preencheu a data de fechamento.");
        exigir(
        new Date(d.socls) >= new Date(d.soopn),
        "Data de fechamento anterior à abertura."
        );
        exigir(d.tem_avaliacao, "Avaliação não encontrada.");
        exigir(d.tem_faturamento, "Faturamento não encontrado.");
        exigir(d.tem_historico_final, "Histórico de finalização não encontrado.");
        exigir(
        Number(d.total_historico) >= 5,
        "Histórico incompleto."
        );
    }
    );

    await verificar(
    "Constraints e chaves estrangeiras essenciais existem",
    200,
    async () => {
        const resultado = await pool.query(`
        SELECT
            (
            SELECT COUNT(*)
            FROM pg_constraint
            WHERE conrelid = '"SOLICITACOES"'::regclass
                AND contype = 'f'
            ) AS solicitacoes_fk,

            (
            SELECT COUNT(*)
            FROM pg_constraint
            WHERE conrelid = '"ALTERACOES"'::regclass
                AND contype = 'f'
            ) AS alteracoes_fk,

            (
            SELECT COUNT(*)
            FROM pg_constraint
            WHERE conrelid = '"AVALIACOES"'::regclass
                AND contype = 'f'
            ) AS avaliacoes_fk,

            (
            SELECT COUNT(*)
            FROM pg_constraint
            WHERE conrelid = '"AVALIACOES"'::regclass
                AND contype = 'c'
            ) AS avaliacoes_check,

            (
            SELECT COUNT(*)
            FROM pg_constraint
            WHERE conrelid = '"FATURAMENTOS"'::regclass
                AND contype = 'f'
            ) AS faturamentos_fk,

            (
            SELECT COUNT(*)
            FROM pg_constraint
            WHERE conrelid = '"FATURAMENTOS"'::regclass
                AND contype IN ('p', 'u')
            ) AS faturamentos_unicidade
        `);

        return {
        status: 200,
        dados: resultado.rows[0],
        };
    },
    (d) => {
        exigir(Number(d.solicitacoes_fk) > 0, "SOLICITACOES sem FK.");
        exigir(Number(d.alteracoes_fk) > 0, "ALTERACOES sem FK.");
        exigir(Number(d.avaliacoes_fk) > 0, "AVALIACOES sem FK.");
        exigir(Number(d.avaliacoes_check) > 0, "AVALIACOES sem CHECK.");
        exigir(Number(d.faturamentos_fk) > 0, "FATURAMENTOS sem FK.");
        exigir(
        Number(d.faturamentos_unicidade) > 0,
        "FATURAMENTOS sem constraint de unicidade."
        );
    }
    );

    await verificar(
    "Não existem referências órfãs nos registros relacionados",
    200,
    async () => {
        const resultado = await pool.query(`
        SELECT
            (
            SELECT COUNT(*)
            FROM "ALTERACOES" a
            LEFT JOIN "SOLICITACOES" s ON s.soid = a.soid
            LEFT JOIN "USUARIOS" u ON u.usrid = a.usrid
            LEFT JOIN "TIPOS_ALTERACAO" t ON t.typid = a.typid
            WHERE s.soid IS NULL
                OR u.usrid IS NULL
                OR t.typid IS NULL
            ) AS alteracoes_orfas,

            (
            SELECT COUNT(*)
            FROM "AVALIACOES" a
            LEFT JOIN "SOLICITACOES" s ON s.soid = a.soid
            WHERE s.soid IS NULL
            ) AS avaliacoes_orfas,

            (
            SELECT COUNT(*)
            FROM "FATURAMENTOS" f
            LEFT JOIN "SOLICITACOES" s ON s.soid = f.soid
            LEFT JOIN "USUARIOS" u ON u.usrid = f.usrid
            WHERE s.soid IS NULL
                OR u.usrid IS NULL
            ) AS faturamentos_orfaos
        `);

        return {
        status: 200,
        dados: resultado.rows[0],
        };
    },
    (d) => {
        exigir(Number(d.alteracoes_orfas) === 0, "Existem alterações órfãs.");
        exigir(Number(d.avaliacoes_orfas) === 0, "Existem avaliações órfãs.");
        exigir(Number(d.faturamentos_orfaos) === 0, "Existem faturamentos órfãos.");
    }
    );
  } catch (erro) {
    if (falhas === 0) falhas++;

    console.error("\nFluxo interrompido porque uma etapa falhou.");

    if (solicitacaoId) {
      console.error(
        `Solicitação criada: ${solicitacaoId} (permanece no banco).`
      );
    }
  } finally {
    console.log(
      `\nResultado: ${aprovados} testes aprovados; ${falhas} falhas.`
    );

    if (solicitacaoId) {
      console.log(`Solicitação utilizada: ${solicitacaoId}`);
    }

    await pool.end().catch(() => {});

    if (falhas > 0) process.exitCode = 1;
  }
}

main().catch((erro) => {
  console.error("Erro inesperado no teste:", erro);
  process.exitCode = 1;
});
