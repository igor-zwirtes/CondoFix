const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const autenticar = require("../middlewares/auth.middleware");
const exigirPapel = require("../middlewares/require-role.middleware");

const router = express.Router();

router.use(autenticar, exigirPapel("ADMIN", "ADMINISTRADOR"));

const PAPEIS_VALIDOS = ["USUARIO", "PRESTADOR_SERVICO", "ADMINISTRADOR"];
const PAPEIS_CONSULTAVEIS = [...PAPEIS_VALIDOS, "ADMIN"];

function respostaErro(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

function ehAdmin(req) {
  return req.usuario.papeis.includes("ADMIN");
}

function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let soma = 0;

  for (let i = 0; i < 9; i++) {
    soma += Number(cpf[i]) * (10 - i);
  }

  let digito = (soma * 10) % 11;
  if (digito === 10) digito = 0;

  if (digito !== Number(cpf[9])) return false;

  soma = 0;

  for (let i = 0; i < 10; i++) {
    soma += Number(cpf[i]) * (11 - i);
  }

  digito = (soma * 10) % 11;
  if (digito === 10) digito = 0;

  return digito === Number(cpf[10]);
}

function idValido(id) {
  return /^\d+$/.test(String(id)) && Number(id) > 0;
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Consulta os dados públicos de um usuário.
const SELECT_USUARIO = `
  SELECT
    u.usrid AS id,
    u.usrnam AS nome,
    u.usrphn AS telefone,
    u.usreml AS email,
    u.usract AS ativo,

    COALESCE(
      (
        SELECT json_agg(r.rolenam ORDER BY r.rolenam)
        FROM "USUARIO_ROLES" ur
        JOIN "ROLES" r ON r.roleid = ur.roleid
        WHERE ur.usrid = u.usrid
      ),
      '[]'::json
    ) AS papeis,

    (
      SELECT json_build_object(
        'id', a.aptid,
        'numero', a.aptnum,
        'andar', a.aptflr,
        'bloco', a.aptblk
      )
      FROM "MORADORES" m
      JOIN "APARTAMENTOS" a ON a.aptid = m.aptid
      WHERE m.usrid = u.usrid
    ) AS apartamento,

    (
      SELECT json_build_object(
        'cpf', p.pvdcpf,
        'empresaId', e.cmpid,
        'empresaNome', e.cmpnam
      )
      FROM "PRESTADORES_SERVICO" p
      LEFT JOIN "EMPRESAS" e ON e.cmpid = p.pvdcmp
      WHERE p.usrid = u.usrid
    ) AS prestador

  FROM "USUARIOS" u
`;

// GET /api/usuarios
// Lista usuários. Permite filtrar por ativo e papel.
router.get("/", async (req, res, next) => {
  try {
    const { ativo, papel } = req.query;

    let filtroAtivo = null;

    if (ativo !== undefined) {
      if (ativo !== "true" && ativo !== "false") {
        return respostaErro(
          res,
          400,
          "INVALID_ACTIVE_FILTER",
          "O filtro ativo deve ser true ou false."
        );
      }

      filtroAtivo = ativo === "true";
    }

    if (
      papel !== undefined &&
      !PAPEIS_CONSULTAVEIS.includes(papel)
    ) {
      return respostaErro(
        res,
        400,
        "INVALID_ROLE_FILTER",
        "Papel informado inválido."
      );
    }

    const resultado = await pool.query(
      `
        ${SELECT_USUARIO}
        WHERE ($1::boolean IS NULL OR u.usract = $1)
          AND (
            $2::varchar IS NULL
            OR EXISTS (
              SELECT 1
              FROM "USUARIO_ROLES" ur
              JOIN "ROLES" r ON r.roleid = ur.roleid
              WHERE ur.usrid = u.usrid
                AND r.rolenam = $2
            )
          )
          AND (
            $3::boolean = TRUE
            OR NOT EXISTS (
              SELECT 1
              FROM "USUARIO_ROLES" ur
              JOIN "ROLES" r ON r.roleid = ur.roleid
              WHERE ur.usrid = u.usrid
                AND r.rolenam IN ('ADMIN', 'ADMINISTRADOR')
            )
          )
        ORDER BY u.usrnam
      `,
      [filtroAtivo, papel || null, ehAdmin(req)]
    );

    return res.status(200).json({
      success: true,
      data: resultado.rows,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/usuarios/:id
// Consulta um usuário específico.
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return respostaErro(
        res,
        400,
        "INVALID_USER_ID",
        "Identificador de usuário inválido."
      );
    }

    const resultado = await pool.query(
      `${SELECT_USUARIO} WHERE u.usrid = $1`,
      [id]
    );

    if (resultado.rowCount === 0) {
      return respostaErro(
        res,
        404,
        "USER_NOT_FOUND",
        "Usuário não encontrado."
      );
    }

    const usuario = resultado.rows[0];

    if (
      !ehAdmin(req) &&
      usuario.papeis.some((papel) => ["ADMIN", "ADMINISTRADOR"].includes(papel))
    ) {
      return respostaErro(
        res,
        403,
        "FORBIDDEN",
        "Você não tem permissão para consultar esta conta."
      );
    }

    return res.status(200).json({
      success: true,
      data: usuario,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/usuarios
// Cria um morador, prestador ou administrador do condomínio.
router.post("/", async (req, res, next) => {
  const {
    nome,
    telefone,
    email,
    senha,
    papel,
    apartamentoId,
    cpf,
    empresaId,
  } = req.body || {};

  const nomeNormalizado = typeof nome === "string" ? nome.trim() : "";
  const emailNormalizado =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const papelNormalizado =
    typeof papel === "string" ? papel.trim().toUpperCase() : "";
  const telefoneNormalizado =
    typeof telefone === "string" ? telefone.trim() : null;

  if (
    !nomeNormalizado ||
    !emailNormalizado ||
    !senha ||
    !papelNormalizado
  ) {
    return respostaErro(
      res,
      400,
      "MISSING_REQUIRED_FIELDS",
      "Informe nome, e-mail, senha e papel."
    );
  }

  if (!emailValido(emailNormalizado)) {
    return respostaErro(res, 400, "INVALID_EMAIL", "E-mail inválido.");
  }

  if (typeof senha !== "string" || senha.length < 8) {
    return respostaErro(
      res,
      400,
      "INVALID_PASSWORD",
      "A senha deve ter pelo menos 8 caracteres."
    );
  }

  if (!PAPEIS_VALIDOS.includes(papelNormalizado)) {
    return respostaErro(
      res,
      400,
      "INVALID_ROLE",
      "Papel inválido. ADMIN não pode ser atribuído por esta API."
    );
  }

  if (papelNormalizado === "ADMINISTRADOR" && !ehAdmin(req)) {
    return respostaErro(
      res,
      403,
      "FORBIDDEN",
      "Somente ADMIN pode cadastrar um ADMINISTRADOR."
    );
  }

  if (
    papelNormalizado === "USUARIO" &&
    !idValido(apartamentoId)
  ) {
    return respostaErro(
      res,
      400,
      "INVALID_APARTMENT",
      "Informe um apartamento válido para o morador."
    );
  }

  const cpfNormalizado =
    typeof cpf === "string" ? cpf.replace(/\D/g, "") : "";

  if (
    papelNormalizado === "PRESTADOR_SERVICO" &&
    !cpfValido(cpfNormalizado)
  ) {
    return respostaErro(
      res,
      400,
      "INVALID_CPF",
      "Informe um CPF válido para o prestador."
    );
  }

  if (
    empresaId !== undefined &&
    empresaId !== null &&
    empresaId !== "" &&
    !idValido(empresaId)
  ) {
    return respostaErro(
      res,
      400,
      "INVALID_COMPANY",
      "Identificador de empresa inválido."
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const emailExistente = await client.query(
      `SELECT usrid FROM "USUARIOS" WHERE LOWER(usreml) = $1`,
      [emailNormalizado]
    );

    if (emailExistente.rowCount > 0) {
      await client.query("ROLLBACK");
      return respostaErro(
        res,
        409,
        "EMAIL_ALREADY_REGISTERED",
        "Já existe um usuário cadastrado com este e-mail."
      );
    }

    const papelResult = await client.query(
      `SELECT roleid FROM "ROLES" WHERE rolenam = $1`,
      [papelNormalizado]
    );

    if (papelResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return respostaErro(
        res,
        500,
        "ROLE_NOT_CONFIGURED",
        "O papel solicitado não está cadastrado no sistema."
      );
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const novoUsuario = await client.query(
      `
        INSERT INTO "USUARIOS"
          (usrnam, usrphn, usreml, usrpsw, usract)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING usrid
      `,
      [
        nomeNormalizado,
        telefoneNormalizado || null,
        emailNormalizado,
        senhaHash,
      ]
    );

    const usuarioId = novoUsuario.rows[0].usrid;
    const papelId = papelResult.rows[0].roleid;

    await client.query(
      `
        INSERT INTO "USUARIO_ROLES" (usrid, roleid)
        VALUES ($1, $2)
      `,
      [usuarioId, papelId]
    );

    if (papelNormalizado === "USUARIO") {
      await client.query(
        `
          INSERT INTO "MORADORES" (usrid, aptid)
          VALUES ($1, $2)
        `,
        [usuarioId, Number(apartamentoId)]
      );
    }

    if (papelNormalizado === "PRESTADOR_SERVICO") {
      await client.query(
        `
          INSERT INTO "PRESTADORES_SERVICO" (usrid, pvdcpf, pvdcmp)
          VALUES ($1, $2, $3)
        `,
        [
          usuarioId,
          cpfNormalizado,
          empresaId ? Number(empresaId) : null,
        ]
      );
    }

    await client.query("COMMIT");

    const usuarioCriado = await pool.query(
      `${SELECT_USUARIO} WHERE u.usrid = $1`,
      [usuarioId]
    );

    return res.status(201).json({
      success: true,
      message: "Usuário cadastrado com sucesso.",
      data: usuarioCriado.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return respostaErro(
        res,
        409,
        "DUPLICATE_DATA",
        "Já existe um usuário ou prestador com os dados informados."
      );
    }

    if (error.code === "23503") {
      return respostaErro(
        res,
        400,
        "INVALID_REFERENCE",
        "Apartamento ou empresa informados não existem."
      );
    }

    next(error);
  } finally {
    client.release();
  }
});

// PATCH /api/usuarios/:id
// Atualiza dados básicos e, opcionalmente, a senha.
router.patch("/:id", async (req, res, next) => {
  const { id } = req.params;
  const { nome, telefone, email, senha } = req.body || {};

  if (!idValido(id)) {
    return respostaErro(
      res,
      400,
      "INVALID_USER_ID",
      "Identificador de usuário inválido."
    );
  }

  if (
    nome === undefined &&
    telefone === undefined &&
    email === undefined &&
    senha === undefined
  ) {
    return respostaErro(
      res,
      400,
      "EMPTY_UPDATE",
      "Informe pelo menos um campo para atualizar."
    );
  }

  if (nome !== undefined && (typeof nome !== "string" || !nome.trim())) {
    return respostaErro(res, 400, "INVALID_NAME", "Nome inválido.");
  }

  if (
    telefone !== undefined &&
    telefone !== null &&
    typeof telefone !== "string"
  ) {
    return respostaErro(res, 400, "INVALID_PHONE", "Telefone inválido.");
  }

  const emailNormalizado =
    typeof email === "string" ? email.trim().toLowerCase() : email;

  if (
    email !== undefined &&
    (typeof email !== "string" || !emailValido(emailNormalizado))
  ) {
    return respostaErro(res, 400, "INVALID_EMAIL", "E-mail inválido.");
  }

  if (
    senha !== undefined &&
    (typeof senha !== "string" || senha.length < 8)
  ) {
    return respostaErro(
      res,
      400,
      "INVALID_PASSWORD",
      "A senha deve ter pelo menos 8 caracteres."
    );
  }

  try {
    const usuarioResult = await pool.query(
      `
        SELECT
          u.usrid,
          COALESCE(
            array_agg(r.rolenam) FILTER (WHERE r.rolenam IS NOT NULL),
            ARRAY[]::varchar[]
          ) AS papeis
        FROM "USUARIOS" u
        LEFT JOIN "USUARIO_ROLES" ur ON ur.usrid = u.usrid
        LEFT JOIN "ROLES" r ON r.roleid = ur.roleid
        WHERE u.usrid = $1
        GROUP BY u.usrid
      `,
      [id]
    );

    if (usuarioResult.rowCount === 0) {
      return respostaErro(res, 404, "USER_NOT_FOUND", "Usuário não encontrado.");
    }

    const papeisAlvo = usuarioResult.rows[0].papeis;
    const contaAdministrativa = papeisAlvo.some((p) =>
      ["ADMIN", "ADMINISTRADOR"].includes(p)
    );

    if (!ehAdmin(req) && contaAdministrativa) {
      return respostaErro(
        res,
        403,
        "FORBIDDEN",
        "Somente ADMIN pode editar contas administrativas."
      );
    }

    if (emailNormalizado !== undefined) {
      const emailExistente = await pool.query(
        `
          SELECT usrid
          FROM "USUARIOS"
          WHERE LOWER(usreml) = $1 AND usrid <> $2
        `,
        [emailNormalizado, id]
      );

      if (emailExistente.rowCount > 0) {
        return respostaErro(
          res,
          409,
          "EMAIL_ALREADY_REGISTERED",
          "Já existe outro usuário com este e-mail."
        );
      }
    }

    const campos = [];
    const valores = [];
    let indice = 1;

    function adicionarCampo(coluna, valor) {
      campos.push(`${coluna} = $${indice++}`);
      valores.push(valor);
    }

    if (nome !== undefined) adicionarCampo("usrnam", nome.trim());
    if (telefone !== undefined) {
      adicionarCampo("usrphn", telefone ? telefone.trim() : null);
    }
    if (emailNormalizado !== undefined) {
      adicionarCampo("usreml", emailNormalizado);
    }
    if (senha !== undefined) {
      adicionarCampo("usrpsw", await bcrypt.hash(senha, 10));
    }

    valores.push(id);

    await pool.query(
      `
        UPDATE "USUARIOS"
        SET ${campos.join(", ")}
        WHERE usrid = $${indice}
      `,
      valores
    );

    const atualizado = await pool.query(
      `${SELECT_USUARIO} WHERE u.usrid = $1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Usuário atualizado com sucesso.",
      data: atualizado.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return respostaErro(
        res,
        409,
        "EMAIL_ALREADY_REGISTERED",
        "Já existe um usuário com este e-mail."
      );
    }

    next(error);
  }
});

// Desativa ou reativa uma conta.
async function alterarAtivo(req, res, next, ativo) {
  const { id } = req.params;

  if (!idValido(id)) {
    return respostaErro(
      res,
      400,
      "INVALID_USER_ID",
      "Identificador de usuário inválido."
    );
  }

  if (!ativo && Number(id) === req.usuario.id) {
    return respostaErro(
      res,
      400,
      "SELF_DEACTIVATION",
      "Você não pode desativar sua própria conta."
    );
  }

  try {
    const usuarioResult = await pool.query(
      `
        SELECT
          u.usrid,
          u.usract,
          COALESCE(
            array_agg(r.rolenam) FILTER (WHERE r.rolenam IS NOT NULL),
            ARRAY[]::varchar[]
          ) AS papeis
        FROM "USUARIOS" u
        LEFT JOIN "USUARIO_ROLES" ur ON ur.usrid = u.usrid
        LEFT JOIN "ROLES" r ON r.roleid = ur.roleid
        WHERE u.usrid = $1
        GROUP BY u.usrid
      `,
      [id]
    );

    if (usuarioResult.rowCount === 0) {
      return respostaErro(res, 404, "USER_NOT_FOUND", "Usuário não encontrado.");
    }

    const usuario = usuarioResult.rows[0];
    const contaAdministrativa = usuario.papeis.some((p) =>
      ["ADMIN", "ADMINISTRADOR"].includes(p)
    );

    if (!ehAdmin(req) && contaAdministrativa) {
      return respostaErro(
        res,
        403,
        "FORBIDDEN",
        "Somente ADMIN pode alterar o status de contas administrativas."
      );
    }

    if (!ativo && usuario.papeis.includes("ADMIN")) {
      const adminsAtivos = await pool.query(
        `
          SELECT COUNT(DISTINCT u.usrid)::integer AS total
          FROM "USUARIOS" u
          JOIN "USUARIO_ROLES" ur ON ur.usrid = u.usrid
          JOIN "ROLES" r ON r.roleid = ur.roleid
          WHERE r.rolenam = 'ADMIN' AND u.usract = TRUE
        `
      );

      if (adminsAtivos.rows[0].total <= 1) {
        return respostaErro(
          res,
          409,
          "LAST_ACTIVE_ADMIN",
          "Não é possível desativar o último ADMIN ativo do sistema."
        );
      }
    }

    if (usuario.usract === ativo) {
      return res.status(200).json({
        success: true,
        message: ativo
          ? "O usuário já está ativo."
          : "O usuário já está desativado.",
      });
    }

    await pool.query(
      `UPDATE "USUARIOS" SET usract = $1 WHERE usrid = $2`,
      [ativo, id]
    );

    return res.status(200).json({
      success: true,
      message: ativo
        ? "Usuário reativado com sucesso."
        : "Usuário desativado com sucesso.",
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/usuarios/:id/desativar
router.patch("/:id/desativar", (req, res, next) =>
  alterarAtivo(req, res, next, false)
);

// PATCH /api/usuarios/:id/ativar
router.patch("/:id/ativar", (req, res, next) =>
  alterarAtivo(req, res, next, true)
);

module.exports = router;
