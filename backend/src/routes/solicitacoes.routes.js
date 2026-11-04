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

module.exports = router;
