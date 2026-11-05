const express = require("express");
const pool = require("../config/database");
const autenticar = require("../middlewares/auth.middleware");
const exigirPapel = require("../middlewares/require-role.middleware");

const router = express.Router();

router.get(
  "/",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO", "PRESTADOR_SERVICO"),
  async (req, res, next) => {
    try {
      const papeis = req.usuario.papeis;
      const acessoTotal = papeis.some((papel) =>
        ["ADMIN", "ADMINISTRADOR"].includes(papel)
      );

      const filtros = [];
      const parametros = [];

      if (!acessoTotal) {
        if (papeis.includes("USUARIO")) {
          parametros.push(req.usuario.id);
          filtros.push(`s.usrid = $${parametros.length}`);
        }

        if (papeis.includes("PRESTADOR_SERVICO")) {
          parametros.push(req.usuario.id);
          filtros.push(`s.pvdid = $${parametros.length}`);
        }

        if (filtros.length === 0) {
          return res.status(403).json({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Você não tem permissão para acessar este recurso.",
            },
          });
        }
      }

      let sql = `
        SELECT
          s.soid AS id,
          s.sotit AS titulo,
          s.sodcp AS descricao,
          s.soopn AS data_abertura,
          s.socls AS data_fechamento,
          st.stsnom AS status,
          pr.prinom AS prioridade,
          c.catnom AS categoria,
          s.usrid AS solicitante_id,
          solicitante.usrnam AS solicitante,
          s.pvdid AS prestador_id,
          prestador.usrnam AS prestador
        FROM "SOLICITACOES" s
        JOIN "STATUS_SOLICITACAO" st
          ON st.stsid = s.stsid
        JOIN "PRIORIDADES_SOLICITACAO" pr
          ON pr.priid = s.priid
        JOIN "CATEGORIAS_SOLICITACAO" c
          ON c.catid = s.catid
        JOIN "USUARIOS" solicitante
          ON solicitante.usrid = s.usrid
        LEFT JOIN "USUARIOS" prestador
          ON prestador.usrid = s.pvdid
      `;

      if (!acessoTotal) {
        sql += ` WHERE (${filtros.join(" OR ")})`;
      }

      sql += " ORDER BY s.soopn DESC, s.soid DESC";

      const resultado = await pool.query(sql, parametros);

      return res.status(200).json({
        success: true,
        quantidade: resultado.rows.length,
        data: resultado.rows,
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/:id",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO", "PRESTADOR_SERVICO"),
  async (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    try {
      const papeis = req.usuario.papeis;
      const acessoTotal = papeis.some((papel) =>
        ["ADMIN", "ADMINISTRADOR"].includes(papel)
      );

      const filtros = [];
      const parametros = [id];

      if (!acessoTotal) {
        if (papeis.includes("USUARIO")) {
          parametros.push(req.usuario.id);
          filtros.push(`s.usrid = $${parametros.length}`);
        }

        if (papeis.includes("PRESTADOR_SERVICO")) {
          parametros.push(req.usuario.id);
          filtros.push(`s.pvdid = $${parametros.length}`);
        }

        if (filtros.length === 0) {
          return res.status(403).json({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Você não tem permissão para acessar este recurso.",
            },
          });
        }
      }

      let sql = `
        SELECT s.soid, s.sotit, s.sodcp, s.soopn, s.socls
        FROM "SOLICITACOES" s
        WHERE s.soid = $1
      `;

      if (!acessoTotal) {
        sql += ` AND (${filtros.join(" OR ")})`;
      }

      const resultado = await pool.query(sql, parametros);

      if (resultado.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: resultado.rows[0],
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/:id/historico",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO", "PRESTADOR_SERVICO"),
  async (req, res, next) => {
    const solicitacaoId = Number(req.params.id);
    const usuarioId = req.usuario.id;
    const papeis = req.usuario.papeis;

    if (!Number.isSafeInteger(solicitacaoId) || solicitacaoId <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    try {
      // Busca a solicitação e verifica se o usuário pode acessá-la.
      const solicitacao = await pool.query(
        `SELECT soid, usrid, pvdid
         FROM "SOLICITACOES"
         WHERE soid = $1`,
        [solicitacaoId]
      );

      if (solicitacao.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const registro = solicitacao.rows[0];
      const ehAdministrador =
        papeis.includes("ADMIN") || papeis.includes("ADMINISTRADOR");
      const ehSolicitante = registro.usrid === usuarioId;
      const ehPrestador =
        registro.pvdid !== null && registro.pvdid === usuarioId;

      if (!ehAdministrador && !ehSolicitante && !ehPrestador) {
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      // Recupera o histórico em ordem cronológica.
      const historico = await pool.query(
        `SELECT
           a.altid AS id,
           a.soid AS solicitacao_id,
           a.usrid AS usuario_id,
           u.usrnam AS usuario,
           ta.typnom AS tipo,
           a.altdcp AS descricao,
           a.alttim AS data
         FROM "ALTERACOES" a
         JOIN "USUARIOS" u ON u.usrid = a.usrid
         JOIN "TIPOS_ALTERACAO" ta ON ta.typid = a.typid
         WHERE a.soid = $1
         ORDER BY a.alttim ASC, a.altid ASC`,
        [solicitacaoId]
      );

      return res.status(200).json({
        success: true,
        quantidade: historico.rows.length,
        data: historico.rows,
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.patch(
  "/:id/status",
  autenticar,
  exigirPapel("PRESTADOR_SERVICO"),
  async (req, res, next) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    const transicoesPermitidas = {
      Atribuida: "Em andamento",
      "Em andamento": "Concluida",
    };

    if (typeof status !== "string" ||
        !Object.values(transicoesPermitidas).includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: "Status solicitado inválido.",
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const consulta = await client.query(
        `SELECT s.soid, s.pvdid, s.stsid, st.stsnom
         FROM "SOLICITACOES" s
         JOIN "STATUS_SOLICITACAO" st ON st.stsid = s.stsid
         WHERE s.soid = $1
         FOR UPDATE OF s`,
        [id]
      );

      if (consulta.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const solicitacao = consulta.rows[0];

      if (solicitacao.pvdid !== req.usuario.id) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      if (transicoesPermitidas[solicitacao.stsnom] !== status) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: "Esta transição de status não é permitida.",
          },
        });
      }

      const novoStatus = await client.query(
        `SELECT stsid
         FROM "STATUS_SOLICITACAO"
         WHERE stsnom = $1`,
        [status]
      );

      if (novoStatus.rows.length === 0) {
        throw new Error(`Status não cadastrado: ${status}`);
      }

      await client.query(
        `UPDATE "SOLICITACOES"
         SET stsid = $1
         WHERE soid = $2`,
        [novoStatus.rows[0].stsid, id]
      );

      await client.query(
        `INSERT INTO "ALTERACOES" (soid, usrid, typid, altdcp)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          req.usuario.id,
          6,
          `Status alterado de "${solicitacao.stsnom}" para "${status}".`,
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        data: {
          id,
          statusAnterior: solicitacao.stsnom,
          statusAtual: status,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  }
);


router.patch(
  "/:id/prestador",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR"),
  async (req, res, next) => {
    const id = Number(req.params.id);
    const { prestadorId } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    if (
      !Number.isSafeInteger(prestadorId) ||
      prestadorId <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PROVIDER_ID",
          message: "O ID do prestador deve ser um inteiro positivo.",
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const consulta = await client.query(
        `SELECT s.soid, s.pvdid, s.stsid, st.stsnom
         FROM "SOLICITACOES" s
         JOIN "STATUS_SOLICITACAO" st
           ON st.stsid = s.stsid
         WHERE s.soid = $1
         FOR UPDATE OF s`,
        [id]
      );

      if (consulta.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const solicitacao = consulta.rows[0];

      if (
        solicitacao.stsnom !== "Aprovada" ||
        solicitacao.pvdid !== null
      ) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: {
            code: "REQUEST_NOT_ASSIGNABLE",
            message:
              "A solicitação precisa estar aprovada e sem prestador atribuído.",
          },
        });
      }

      const prestador = await client.query(
        `SELECT p.usrid
         FROM "PRESTADORES_SERVICO" p
         WHERE p.usrid = $1`,
        [prestadorId]
      );

      if (prestador.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "PROVIDER_NOT_FOUND",
            message: "Prestador de serviço não encontrado.",
          },
        });
      }

      const statusAtribuida = await client.query(
        `SELECT stsid
         FROM "STATUS_SOLICITACAO"
         WHERE stsnom = $1`,
        ["Atribuida"]
      );

      if (statusAtribuida.rows.length === 0) {
        throw new Error('Status "Atribuida" não cadastrado.');
      }

      await client.query(
        `UPDATE "SOLICITACOES"
         SET pvdid = $1,
             stsid = $2
         WHERE soid = $3`,
        [prestadorId, statusAtribuida.rows[0].stsid, id]
      );

      await client.query(
        `INSERT INTO "ALTERACOES" (soid, usrid, typid, altdcp)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          req.usuario.id,
          3,
          `Prestador atribuído: usuário ${prestadorId}.`,
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        data: {
          id,
          prestadorId,
          statusAnterior: solicitacao.stsnom,
          statusAtual: "Atribuida",
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  }
);

router.post(
  "/",
  autenticar,
  exigirPapel("USUARIO"),
  async (req, res, next) => {
    const { titulo, descricao, apartamentoId, categoriaId } = req.body;
    const usuarioId = req.usuario.id;

    if (
      typeof titulo !== "string" ||
      !titulo.trim() ||
      titulo.trim().length > 255 ||
      typeof descricao !== "string" ||
      !descricao.trim() ||
      !Number.isSafeInteger(apartamentoId) ||
      apartamentoId <= 0 ||
      !Number.isSafeInteger(categoriaId) ||
      categoriaId <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_DATA",
          message:
            "Informe título, descrição, apartamentoId e categoriaId válidos.",
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Confirma que o apartamento pertence ao morador autenticado.
      const apartamento = await client.query(
        `SELECT 1
         FROM "MORADORES"
         WHERE usrid = $1 AND aptid = $2`,
        [usuarioId, apartamentoId]
      );

      if (apartamento.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          success: false,
          error: {
            code: "APARTMENT_NOT_ACCESSIBLE",
            message: "Você não está vinculado a esse apartamento.",
          },
        });
      }

      // Confirma que a categoria existe.
      const categoria = await client.query(
        `SELECT catid
         FROM "CATEGORIAS_SOLICITACAO"
         WHERE catid = $1`,
        [categoriaId]
      );

      if (categoria.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CATEGORY",
            message: "A categoria informada não existe.",
          },
        });
      }

      // A prioridade inicial é definida pelo backend.
      const prioridade = await client.query(
        `SELECT priid
         FROM "PRIORIDADES_SOLICITACAO"
         WHERE prinom = $1`,
        ["Normal"]
      );

      if (prioridade.rows.length === 0) {
        throw new Error('Prioridade "Normal" não cadastrada.');
      }

      const status = await client.query(
        `SELECT stsid
         FROM "STATUS_SOLICITACAO"
         WHERE stsnom = $1`,
        ["Aberta"]
      );

      if (status.rows.length === 0) {
        throw new Error('Status "Aberta" não cadastrado.');
      }

      const criacao = await client.query(
        `INSERT INTO "SOLICITACOES" (
           usrid,
           sotit,
           aptid,
           sodcp,
           catid,
           priid,
           stsid
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING soid, sotit, aptid, sodcp, catid,
                   priid, stsid, soopn, socls, pvdid`,
        [
          usuarioId,
          titulo.trim(),
          apartamentoId,
          descricao.trim(),
          categoriaId,
          prioridade.rows[0].priid,
          status.rows[0].stsid,
        ]
      );

      const solicitacao = criacao.rows[0];

      // Busca o tipo de alteração correspondente à criação.
      const tipoCriacao = await client.query(
        `SELECT typid
        FROM "TIPOS_ALTERACAO"
        WHERE typnom = $1`,
        ["Criacao"]
        );

        if (tipoCriacao.rows.length === 0) {
        throw new Error('Tipo de alteração "Criacao" não cadastrado.');
        }

        // Registra a criação no histórico.
        await client.query(
        `INSERT INTO "ALTERACOES" (soid, usrid, typid, altdcp)
        VALUES ($1, $2, $3, $4)`,
        [
            solicitacao.soid,
            usuarioId,
            tipoCriacao.rows[0].typid,
            "Solicitação criada pelo usuário.",
        ]
        );

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        data: {
          id: solicitacao.soid,
          titulo: solicitacao.sotit,
          apartamentoId: solicitacao.aptid,
          descricao: solicitacao.sodcp,
          categoriaId: solicitacao.catid,
          prioridadeId: solicitacao.priid,
          statusId: solicitacao.stsid,
          dataAbertura: solicitacao.soopn,
          dataFechamento: solicitacao.socls,
          prestadorId: solicitacao.pvdid,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  }
);

router.patch(
  "/:id/cancelar",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO"),
  async (req, res, next) => {
    const solicitacaoId = Number(req.params.id);
    const usuarioId = req.usuario.id;
    const papeis = req.usuario.papeis;

    if (!Number.isSafeInteger(solicitacaoId) || solicitacaoId <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    const ehAdministrador =
      papeis.includes("ADMIN") || papeis.includes("ADMINISTRADOR");

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Bloqueia a solicitação para evitar alterações concorrentes.
      const resultado = await client.query(
        `SELECT s.soid, s.usrid, s.stsid, st.stsnom
         FROM "SOLICITACOES" s
         JOIN "STATUS_SOLICITACAO" st ON st.stsid = s.stsid
         WHERE s.soid = $1
         FOR UPDATE OF s`,
        [solicitacaoId]
      );

      if (resultado.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const solicitacao = resultado.rows[0];

      // Moradores só podem cancelar as próprias solicitações.
      if (!ehAdministrador && solicitacao.usrid !== usuarioId) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      // Só permite cancelar solicitações abertas ou atribuídas.
      if (!["Aberta", "Atribuida"].includes(solicitacao.stsnom)) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message:
              "Somente solicitações abertas ou atribuídas podem ser canceladas.",
          },
        });
      }

      const statusCancelada = await client.query(
        `SELECT stsid
         FROM "STATUS_SOLICITACAO"
         WHERE stsnom = $1`,
        ["Cancelada"]
      );

      if (statusCancelada.rows.length === 0) {
        throw new Error('Status "Cancelada" não cadastrado.');
      }

      const tipoStatus = await client.query(
        `SELECT typid
         FROM "TIPOS_ALTERACAO"
         WHERE typnom = $1`,
        ["Status"]
      );

      if (tipoStatus.rows.length === 0) {
        throw new Error('Tipo de alteração "Status" não cadastrado.');
      }

      await client.query(
        `UPDATE "SOLICITACOES"
         SET stsid = $1
         WHERE soid = $2`,
        [statusCancelada.rows[0].stsid, solicitacaoId]
      );

      await client.query(
        `INSERT INTO "ALTERACOES" (soid, usrid, typid, altdcp)
         VALUES ($1, $2, $3, $4)`,
        [
          solicitacaoId,
          usuarioId,
          tipoStatus.rows[0].typid,
          `Status alterado de ${solicitacao.stsnom} para Cancelada.`,
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Solicitação cancelada com sucesso.",
        data: {
          id: solicitacaoId,
          status: "Cancelada",
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  }
);

router.patch(
  "/:id/aprovar",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR"),
  async (req, res, next) => {
    const solicitacaoId = Number(req.params.id);
    const usuarioId = req.usuario.id;

    if (!Number.isSafeInteger(solicitacaoId) || solicitacaoId <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const resultado = await client.query(
        `SELECT s.soid, s.stsid, st.stsnom
         FROM "SOLICITACOES" s
         JOIN "STATUS_SOLICITACAO" st ON st.stsid = s.stsid
         WHERE s.soid = $1
         FOR UPDATE OF s`,
        [solicitacaoId]
      );

      if (resultado.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const solicitacao = resultado.rows[0];

      if (solicitacao.stsnom !== "Aberta") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: "Somente solicitações abertas podem ser aprovadas.",
          },
        });
      }

      const statusAprovada = await client.query(
        `SELECT stsid
         FROM "STATUS_SOLICITACAO"
         WHERE stsnom = $1`,
        ["Aprovada"]
      );

      if (statusAprovada.rows.length === 0) {
        throw new Error('Status "Aprovada" não cadastrado.');
      }

      const tipoStatus = await client.query(
        `SELECT typid
         FROM "TIPOS_ALTERACAO"
         WHERE typnom = $1`,
        ["Status"]
      );

      if (tipoStatus.rows.length === 0) {
        throw new Error('Tipo de alteração "Status" não cadastrado.');
      }

      await client.query(
        `UPDATE "SOLICITACOES"
         SET stsid = $1
         WHERE soid = $2`,
        [statusAprovada.rows[0].stsid, solicitacaoId]
      );

      await client.query(
        `INSERT INTO "ALTERACOES" (soid, usrid, typid, altdcp)
         VALUES ($1, $2, $3, $4)`,
        [
          solicitacaoId,
          usuarioId,
          tipoStatus.rows[0].typid,
          "Status alterado de Aberta para Aprovada.",
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Solicitação aprovada com sucesso.",
        data: {
          id: solicitacaoId,
          status: "Aprovada",
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  }
);

router.patch(
  "/:id/aceitar",
  autenticar,
  exigirPapel("USUARIO"),
  async (req, res, next) => {
    const { id } = req.params;
    const { nota, comentario } = req.body;
    const usuarioId = req.usuario.id;

    // Validar o ID da solicitação.
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        erro: "ID da solicitação inválido.",
      });
    }

    // Validar a nota.
    if (
      !Number.isInteger(nota) ||
      nota < 1 ||
      nota > 5
    ) {
      return res.status(400).json({
        erro: "A nota deve ser um número inteiro entre 1 e 5.",
      });
    }

    // Validar o comentário, que é opcional.
    if (
      comentario !== undefined &&
      comentario !== null &&
      typeof comentario !== "string"
    ) {
      return res.status(400).json({
        erro: "O comentário deve ser um texto.",
      });
    }

    const comentarioFinal =
      comentario == null || comentario.trim() === ""
        ? null
        : comentario.trim();

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Bloquear a solicitação para evitar operações concorrentes.
      const resultado = await client.query(
        `
        SELECT s.soid, s.usrid, s.stsid, ss.stsnom
        FROM "SOLICITACOES" s
        JOIN "STATUS_SOLICITACAO" ss
          ON ss.stsid = s.stsid
        WHERE s.soid = $1
        FOR UPDATE OF s
        `,
        [Number(id)]
      );

      if (resultado.rowCount === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          erro: "Solicitação não encontrada.",
        });
      }

      const solicitacao = resultado.rows[0];

      // Garantir que o morador seja o proprietário.
      if (solicitacao.usrid !== usuarioId) {
        await client.query("ROLLBACK");

        return res.status(403).json({
          erro: "Você não pode aceitar esta solicitação.",
        });
      }

      // Somente solicitações concluídas podem ser aceitas.
      if (solicitacao.stsnom !== "Concluida") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          erro: "A solicitação precisa estar concluída para ser aceita.",
        });
      }

      // Buscar o tipo de alteração pelo nome, sem depender do ID.
      const tipoResultado = await client.query(
        `
        SELECT typid
        FROM "TIPOS_ALTERACAO"
        WHERE typnom = 'Status'
        `
      );

      if (tipoResultado.rowCount === 0) {
        throw new Error(
          "Tipo de alteração 'Status' não cadastrado."
        );
      }

      const tipoStatusId = tipoResultado.rows[0].typid;

      // Registrar a avaliação enquanto o status ainda é Concluida.
      // A trigger FN_VALIDAR_AVALIACAO exige esse status.
      await client.query(
        `
        INSERT INTO "AVALIACOES" (soid, evascr, evanot)
        VALUES ($1, $2, $3)
        `,
        [Number(id), nota, comentarioFinal]
      );

      // Alterar o status para Aceita.
      const statusResultado = await client.query(
        `
        SELECT stsid
        FROM "STATUS_SOLICITACAO"
        WHERE stsnom = 'Aceita'
        `
      );

      if (statusResultado.rowCount === 0) {
        throw new Error(
          "Status 'Aceita' não cadastrado."
        );
      }

      const statusAceitaId = statusResultado.rows[0].stsid;

      await client.query(
        `
        UPDATE "SOLICITACOES"
        SET stsid = $1
        WHERE soid = $2
        `,
        [statusAceitaId, Number(id)]
      );

      // Registrar a mudança no histórico.
      await client.query(
        `
        INSERT INTO "ALTERACOES"
          (soid, usrid, typid, altdcp)
        VALUES ($1, $2, $3, $4)
        `,
        [
          Number(id),
          usuarioId,
          tipoStatusId,
          "Solicitação aceita pelo morador e avaliação registrada. Status: Concluida -> Aceita.",
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        mensagem: "Solicitação aceita e avaliação registrada com sucesso.",
        solicitacao: {
          id: Number(id),
          status: "Aceita",
          avaliacao: {
            nota,
            comentario: comentarioFinal,
          },
        },
      });
    } catch (erro) {
      await client.query("ROLLBACK");

      // A PK de AVALIACOES impede mais de uma avaliação por solicitação.
      if (erro.code === "23505") {
        return res.status(409).json({
          erro: "Esta solicitação já possui uma avaliação.",
        });
      }

      // A nota também é protegida pela constraint do banco.
      if (erro.code === "23514") {
        return res.status(400).json({
          erro: "A avaliação não atende às regras de validação.",
        });
      }

      return next(erro);
    } finally {
      client.release();
    }
  }
);

router.post(
  "/:id/faturamento",
  autenticar,
  exigirPapel("PRESTADOR_SERVICO"),
  async (req, res, next) => {
    const id = Number(req.params.id);
    const { valor, descricao } = req.body;
    const usuarioId = req.usuario.id;

    // Validar ID da solicitação.
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    // Validar valor.
    if (
      typeof valor !== "number" ||
      !Number.isFinite(valor) ||
      valor <= 0 ||
      !Number.isFinite(Math.round(valor * 100) / 100) ||
      Math.round(valor * 100) / 100 !== valor
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_BILLING_VALUE",
          message: "O valor deve ser numérico, positivo e ter no máximo duas casas decimais.",
        },
      });
    }

    // Validar descrição.
    if (
      typeof descricao !== "string" ||
      !descricao.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_BILLING_DESCRIPTION",
          message: "A descrição do faturamento é obrigatória.",
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Bloquear a solicitação para evitar operações concorrentes.
      const resultado = await client.query(
        `SELECT s.soid, s.pvdid, s.stsid, st.stsnom
         FROM "SOLICITACOES" s
         JOIN "STATUS_SOLICITACAO" st
           ON st.stsid = s.stsid
         WHERE s.soid = $1
         FOR UPDATE OF s`,
        [id]
      );

      if (resultado.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const solicitacao = resultado.rows[0];

      // Verificar se o prestador está atribuído à solicitação.
      if (solicitacao.pvdid !== usuarioId) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      // Somente solicitações aceitas podem ser faturadas.
      if (solicitacao.stsnom !== "Aceita") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: "Somente solicitações aceitas podem ser faturadas.",
          },
        });
      }

      // Buscar o status Faturada.
      const statusResultado = await client.query(
        `SELECT stsid
         FROM "STATUS_SOLICITACAO"
         WHERE stsnom = 'Faturada'`
      );

      if (statusResultado.rows.length === 0) {
        throw new Error('Status "Faturada" não cadastrado.');
      }

      // Buscar o tipo de alteração Status.
      const tipoResultado = await client.query(
        `SELECT typid
         FROM "TIPOS_ALTERACAO"
         WHERE typnom = 'Status'`
      );

      if (tipoResultado.rows.length === 0) {
        throw new Error('Tipo de alteração "Status" não cadastrado.');
      }

      // Registrar o faturamento.
      const faturamento = await client.query(
        `INSERT INTO "FATURAMENTOS"
           (soid, fatval, fatdcp, usrid)
         VALUES ($1, $2, $3, $4)
         RETURNING soid, fatval, fatdcp, fatdat, usrid`,
        [id, valor, descricao.trim(), usuarioId]
      );

      // Alterar o status para Faturada.
      await client.query(
        `UPDATE "SOLICITACOES"
         SET stsid = $1
         WHERE soid = $2`,
        [statusResultado.rows[0].stsid, id]
      );

      // Registrar a mudança no histórico.
      await client.query(
        `INSERT INTO "ALTERACOES"
           (soid, usrid, typid, altdcp)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          usuarioId,
          tipoResultado.rows[0].typid,
          `Status alterado de Aceita para Faturada. Faturamento registrado no valor de R$ ${valor.toFixed(2)}.`,
        ]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Faturamento registrado com sucesso.",
        data: {
          solicitacaoId: id,
          status: "Faturada",
          faturamento: {
            valor: Number(faturamento.rows[0].fatval),
            descricao: faturamento.rows[0].fatdcp,
            data: faturamento.rows[0].fatdat,
            prestadorId: faturamento.rows[0].usrid,
          },
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          error: {
            code: "BILLING_ALREADY_EXISTS",
            message: "Esta solicitação já possui um faturamento.",
          },
        });
      }

      return next(error);
    } finally {
      client.release();
    }
  }
);

router.patch(
  "/:id/finalizar",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR"),
  async (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const resultado = await client.query(
        `SELECT
           s.soid,
           s.stsid,
           st.stsnom,
           f.soid AS faturamento_id
         FROM "SOLICITACOES" s
         JOIN "STATUS_SOLICITACAO" st
           ON st.stsid = s.stsid
         LEFT JOIN "FATURAMENTOS" f
           ON f.soid = s.soid
         WHERE s.soid = $1
         FOR UPDATE OF s`,
        [id]
      );

      if (resultado.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const solicitacao = resultado.rows[0];

      if (solicitacao.stsnom !== "Faturada") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: "Somente solicitações faturadas podem ser finalizadas.",
          },
        });
      }

      if (solicitacao.faturamento_id === null) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          error: {
            code: "BILLING_NOT_FOUND",
            message: "Não existe faturamento registrado para esta solicitação.",
          },
        });
      }

      const statusResultado = await client.query(
        `SELECT stsid
         FROM "STATUS_SOLICITACAO"
         WHERE stsnom = 'Finalizada'`
      );

      if (statusResultado.rows.length === 0) {
        throw new Error('Status "Finalizada" não cadastrado.');
      }

      const tipoResultado = await client.query(
        `SELECT typid
         FROM "TIPOS_ALTERACAO"
         WHERE typnom = 'Status'`
      );

      if (tipoResultado.rows.length === 0) {
        throw new Error('Tipo de alteração "Status" não cadastrado.');
      }

      await client.query(
        `UPDATE "SOLICITACOES"
         SET stsid = $1
         WHERE soid = $2`,
        [statusResultado.rows[0].stsid, id]
      );

      await client.query(
        `INSERT INTO "ALTERACOES"
           (soid, usrid, typid, altdcp)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          req.usuario.id,
          tipoResultado.rows[0].typid,
          "Solicitação finalizada após conferência do faturamento. Status alterado de Faturada para Finalizada.",
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Solicitação finalizada com sucesso.",
        data: {
          solicitacaoId: id,
          status: "Finalizada",
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  }
);

router.get(
  "/:id/faturamento",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO", "PRESTADOR_SERVICO"),
  async (req, res, next) => {
    const solicitacaoId = Number(req.params.id);
    const usuarioId = req.usuario.id;
    const papeis = req.usuario.papeis;

    if (!Number.isSafeInteger(solicitacaoId) || solicitacaoId <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    try {
      const ehAdministrador = papeis.some((papel) =>
        ["ADMIN", "ADMINISTRADOR"].includes(papel)
      );

      const resultado = await pool.query(
        `SELECT
           f.soid AS solicitacao_id,
           f.fatval AS valor,
           f.fatdcp AS descricao,
           f.fatdat AS data_registro,
           f.usrid AS prestador_id,
           u.usrnam AS prestador
         FROM "SOLICITACOES" s
         LEFT JOIN "FATURAMENTOS" f
           ON f.soid = s.soid
         LEFT JOIN "USUARIOS" u
           ON u.usrid = f.usrid
         WHERE s.soid = $1
           AND (
             $3::boolean = TRUE
             OR s.usrid = $2
             OR s.pvdid = $2
           )`,
        [solicitacaoId, usuarioId, ehAdministrador]
      );

      if (resultado.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const faturamento = resultado.rows[0];

      if (faturamento.valor === null) {
        return res.status(404).json({
          success: false,
          error: {
            code: "BILLING_NOT_FOUND",
            message: "Esta solicitação ainda não possui faturamento.",
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          solicitacaoId: faturamento.solicitacao_id,
          valor: faturamento.valor,
          descricao: faturamento.descricao,
          dataRegistro: faturamento.data_registro,
          prestadorId: faturamento.prestador_id,
          prestador: faturamento.prestador,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.patch(
  "/:id/reabrir",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR", "USUARIO"),
  async (req, res, next) => {
    const solicitacaoId = Number(req.params.id);
    const usuarioId = req.usuario.id;
    const papeis = req.usuario.papeis;

    // Validar ID.
    if (!Number.isSafeInteger(solicitacaoId) || solicitacaoId <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    const ehAdministrador = papeis.some((papel) =>
      ["ADMIN", "ADMINISTRADOR"].includes(papel)
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Busca e bloqueia a solicitação para evitar alterações concorrentes.
      const resultado = await client.query(
        `SELECT
           s.soid,
           s.usrid,
           s.stsid,
           st.stsnom
         FROM "SOLICITACOES" s
         JOIN "STATUS_SOLICITACAO" st
           ON st.stsid = s.stsid
         WHERE s.soid = $1
         FOR UPDATE OF s`,
        [solicitacaoId]
      );

      if (resultado.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const solicitacao = resultado.rows[0];

      // Moradores só podem reabrir as próprias solicitações.
      if (!ehAdministrador && solicitacao.usrid !== usuarioId) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      // Somente solicitações concluídas podem ser reabertas.
      if (solicitacao.stsnom !== "Concluida") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message:
              "Somente solicitações concluídas podem ser reabertas.",
          },
        });
      }

      // Busca o status de destino.
      const statusResultado = await client.query(
        `SELECT stsid
         FROM "STATUS_SOLICITACAO"
         WHERE stsnom = $1`,
        ["Em andamento"]
      );

      if (statusResultado.rows.length === 0) {
        throw new Error('Status "Em andamento" não cadastrado.');
      }

      // Busca o tipo de alteração.
      const tipoResultado = await client.query(
        `SELECT typid
         FROM "TIPOS_ALTERACAO"
         WHERE typnom = $1`,
        ["Status"]
      );

      if (tipoResultado.rows.length === 0) {
        throw new Error('Tipo de alteração "Status" não cadastrado.');
      }

      // Atualiza o status. A trigger de fechamento deverá limpar socls.
      await client.query(
        `UPDATE "SOLICITACOES"
         SET stsid = $1
         WHERE soid = $2`,
        [statusResultado.rows[0].stsid, solicitacaoId]
      );

      // Registra a reabertura no histórico.
      await client.query(
        `INSERT INTO "ALTERACOES"
           (soid, usrid, typid, altdcp)
         VALUES ($1, $2, $3, $4)`,
        [
          solicitacaoId,
          usuarioId,
          tipoResultado.rows[0].typid,
          `Solicitação reaberta por ${ehAdministrador ? "administrador/síndico" : "morador"}. Status alterado de Concluida para Em andamento.`,
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Solicitação reaberta com sucesso.",
        data: {
          id: solicitacaoId,
          statusAnterior: "Concluida",
          statusAtual: "Em andamento",
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  }
);

router.patch(
  "/:id/prioridade",
  autenticar,
  exigirPapel("ADMIN", "ADMINISTRADOR"),
  async (req, res, next) => {
    const solicitacaoId = Number(req.params.id);
    const { prioridade } = req.body;
    const usuarioId = req.usuario.id;

    // Validar o ID.
    if (!Number.isSafeInteger(solicitacaoId) || solicitacaoId <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "O ID da solicitação deve ser um inteiro positivo.",
        },
      });
    }

    // Validar a prioridade.
    const prioridadesPermitidas = [
      "Baixa",
      "Normal",
      "Alta",
      "Urgente",
    ];

    if (
      typeof prioridade !== "string" ||
      !prioridadesPermitidas.includes(prioridade)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PRIORITY",
          message:
            "A prioridade deve ser Baixa, Normal, Alta ou Urgente.",
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Bloquear a solicitação para evitar alterações concorrentes.
      const consulta = await client.query(
        `SELECT
           s.soid,
           s.priid,
           p.prinom AS prioridade_atual
         FROM "SOLICITACOES" s
         JOIN "PRIORIDADES_SOLICITACAO" p
           ON p.priid = s.priid
         WHERE s.soid = $1
         FOR UPDATE OF s`,
        [solicitacaoId]
      );

      if (consulta.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Solicitação não encontrada.",
          },
        });
      }

      const solicitacao = consulta.rows[0];

      // Não registrar alteração se a prioridade já for a mesma.
      if (solicitacao.prioridade_atual === prioridade) {
        await client.query("ROLLBACK");

        return res.status(200).json({
          success: true,
          message: "A solicitação já possui essa prioridade.",
          data: {
            id: solicitacaoId,
            prioridadeAnterior: prioridade,
            prioridadeAtual: prioridade,
          },
        });
      }

      // Buscar o ID da nova prioridade.
      const novaPrioridade = await client.query(
        `SELECT priid
         FROM "PRIORIDADES_SOLICITACAO"
         WHERE prinom = $1`,
        [prioridade]
      );

      if (novaPrioridade.rows.length === 0) {
        throw new Error(
          `Prioridade "${prioridade}" não cadastrada no banco.`
        );
      }

      // Buscar o tipo de alteração do histórico.
      const tipoAlteracao = await client.query(
        `SELECT typid
         FROM "TIPOS_ALTERACAO"
         WHERE typnom = $1`,
        ["Status"]
      );

      if (tipoAlteracao.rows.length === 0) {
        throw new Error(
          'Tipo de alteração "Status" não cadastrado.'
        );
      }

      // Atualizar a prioridade.
      await client.query(
        `UPDATE "SOLICITACOES"
         SET priid = $1
         WHERE soid = $2`,
        [novaPrioridade.rows[0].priid, solicitacaoId]
      );

      // Registrar a mudança no histórico.
      await client.query(
        `INSERT INTO "ALTERACOES"
           (soid, usrid, typid, altdcp)
         VALUES ($1, $2, $3, $4)`,
        [
          solicitacaoId,
          usuarioId,
          tipoAlteracao.rows[0].typid,
          `Prioridade alterada de "${solicitacao.prioridade_atual}" para "${prioridade}".`,
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Prioridade atualizada com sucesso.",
        data: {
          id: solicitacaoId,
          prioridadeAnterior: solicitacao.prioridade_atual,
          prioridadeAtual: prioridade,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
